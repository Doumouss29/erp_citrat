import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { validateFetchUrl, safeFetch } from "../../shared/validateUrl.ts";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clean = (v) => (v ?? "").toString().trim();
const stripAccents = (s) => clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s) => stripAccents(s).toLowerCase().replace(/\s+/g, " ");
const buildHeaderMap = (headers) => Object.fromEntries(headers.map((h, i) => [norm(h), i]));
const readColumn = (parts, headerMap, names, fallbackIndex = -1) => {
  for (const name of names) {
    const index = headerMap[norm(name)];
    if (index !== undefined) return clean(parts[index]);
  }
  return fallbackIndex >= 0 ? clean(parts[fallbackIndex]) : "";
};
const normalizeDate = (value) => {
  const raw = clean(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) return raw;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const mapStatut = (raw) => {
  const s = norm(raw);
  if (!s) return "Lot en vente";
  if (s.includes("vendu")) return "Lot vendu";
  if (s.includes("reserve") || s.includes("reserved")) return "Lot réservé";
  if (s.includes("non") && s.includes("vendre")) return "Lot non à vendre";
  return "Lot en vente";
};

function parseLine(line, delimiter) {
  const parts = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === delimiter && !inQuotes) {
      parts.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else cur += ch;
  }
  parts.push(cur.trim().replace(/^"|"$/g, ""));
  return parts;
}

function errMsg(e) {
  return e?.message ?? e?.toString?.() ?? "Unknown error";
}
function errStatus(e) {
  return e?.status ?? e?.response?.status ?? e?.cause?.status ?? e?.cause?.response?.status ?? null;
}

/**
 * Limiteur de débit (token bucket simple)
 * ratePerSec = nombre d'opérations max par seconde.
 */
function createRateLimiter(ratePerSec = 8) {
  let next = Date.now();
  const interval = Math.max(1, Math.floor(1000 / ratePerSec));
  return async function throttle() {
    const now = Date.now();
    if (now < next) await sleep(next - now);
    next = Math.max(next + interval, Date.now());
  };
}

async function withRetry(fn, { retries = 6, baseDelayMs = 250 } = {}) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const status = errStatus(e);
      const msg = errMsg(e).toLowerCase();

      const retryable =
        status === 429 ||
        (status >= 500 && status <= 599) ||
        msg.includes("timeout") ||
        msg.includes("connection") ||
        msg.includes("network") ||
        msg.includes("rate");

      if (!retryable || attempt === retries) throw e;

      // backoff plus agressif sur 429
      const mult = status === 429 ? 3.0 : 1.0;
      const delay = Math.round(mult * baseDelayMs * (2 ** attempt) * (0.7 + Math.random() * 0.6));
      await sleep(delay);
    }
  }
  throw last;
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  let ok = 0;
  let fail = 0;

  async function runner() {
    while (idx < items.length) {
      const item = items[idx++];
      try {
        await worker(item);
        ok++;
      } catch (_) {
        fail++;
      }
    }
  }

  const n = Math.max(1, Math.min(concurrency || 8, items.length));
  await Promise.all(Array.from({ length: n }, () => runner()));
  return { ok, fail };
}

async function safeBulkCreate(entityApi, rows, { batchSize = 150, failures, label }) {
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    try {
      await withRetry(() => entityApi.bulkCreate(batch));
      ok += batch.length;
    } catch (e) {
      // fallback item par item
      for (const row of batch) {
        try {
          await withRetry(() => entityApi.create(row));
          ok++;
        } catch (e2) {
          fail++;
          if (failures.length < 20) failures.push({ where: label, message: errMsg(e2), sample: row });
        }
      }
    }
  }

  return { ok, fail };
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  const failures = [];

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const csv_url = body?.csv_url;
    const id_lotissement = body?.id_lotissement;
    const date_attribution = body?.date_attribution;
    if (!csv_url || !id_lotissement) {
      return Response.json({ error: "csv_url et id_lotissement requis" }, { status: 400 });
    }

    const cursor = body?.cursor ?? { lineIndex: 1 };

    // ✅ Traitement par lot de 2 lignes
    const limits = body?.limits ?? {
      linesPerCall: 2,
    };

    // CSV
    validateFetchUrl(csv_url);
    const csvRes = await safeFetch(csv_url);
    if (!csvRes.ok) throw new Error(`Téléchargement CSV impossible: ${csvRes.status}`);

    const csvText = await csvRes.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return Response.json({ error: "CSV vide ou invalide" }, { status: 400 });

    let delimiter = ",";
    const header = lines[0] || "";
    if ((header.match(/;/g) || []).length > (header.match(/,/g) || []).length) delimiter = ";";
    const headerMap = buildHeaderMap(parseLine(header, delimiter));

    // Charger ilots/lots
    const ilots = await withRetry(() => base44.asServiceRole.entities.Ilot.filter({ id_lotissement }));
    const ilotMap = {};
    for (const ilot of ilots) ilotMap[clean(ilot.numero_ilot)] = ilot.id;

    const lots = await withRetry(() => base44.asServiceRole.entities.Lot.filter({ id_lotissement }));
    if (!lots.length) return Response.json({ success: true, done: true, message: "Aucun lot dans ce lotissement" });

    // Auto champs
    const sampleLot = lots[0] || {};
    const STATUT_FIELD =
      ("statut" in sampleLot) ? "statut" :
      ("statut_lot" in sampleLot) ? "statut_lot" :
      ("status" in sampleLot) ? "status" :
      "statut";

    const AFFECT_FIELD =
      ("affectation" in sampleLot) ? "affectation" :
      ("affectation_lot" in sampleLot) ? "affectation_lot" :
      ("type_affectation" in sampleLot) ? "type_affectation" :
      "affectation";

    // index lots par ilot
    const lotsByIlot = {};
    for (const lot of lots) {
      const idIlot = lot.id_ilot;
      if (!lotsByIlot[idIlot]) lotsByIlot[idIlot] = [];
      lotsByIlot[idIlot].push(lot);
    }

    const start = Math.max(1, cursor?.lineIndex ?? 1);
    const end = Math.min(lines.length, start + limits.linesPerCall);

    const attrCreates = [];
    const histCreates = [];
    const lotUpdateMap = new Map();
    const attrDedup = new Set();

    let linesProcessed = 0;
    let lotsTouched = 0;

    for (let i = start; i < end; i++) {
      const parts = parseLine(lines[i], delimiter);

      const nom = readColumn(parts, headerMap, ["nom"], 0);
      const prenom = readColumn(parts, headerMap, ["prenom", "prenoms"], 1);
      const cni = readColumn(parts, headerMap, ["cni", "numero piece identite", "numero_piece_identite"], 2);
      const numeroIlot = readColumn(parts, headerMap, ["ilot", "numero ilot", "numero_ilot"], 3);
      const lotInfo = readColumn(parts, headerMap, ["lot", "numero lot", "numero_lot"], 4);
      const affectation = readColumn(parts, headerMap, ["affectation"], 5);
      const statut = mapStatut(readColumn(parts, headerMap, ["statut", "status"], 6));
      const telephone = readColumn(parts, headerMap, ["tel", "telephone", "contact"]);
      const dateExpirationPiece = normalizeDate(readColumn(parts, headerMap, ["etabli", "établi", "date expiration piece", "date_expiration_piece", "date expiration", "expiration piece"]));
      const etablieA = readColumn(parts, headerMap, ["etablie_a", "établie à", "etablie a", "établie a", "lieu etablissement cni", "lieu d'etablissement", "lieu établissement"]);
      const profession = readColumn(parts, headerMap, ["profession"]);
      const domicile = readColumn(parts, headerMap, ["domicile", "adresse domicile"]);

      if (!nom || !prenom || !numeroIlot || !lotInfo) continue;

      const idIlot = ilotMap[numeroIlot];
      if (!idIlot) continue;

      const lotsIlot = lotsByIlot[idIlot] || [];
      if (!lotsIlot.length) continue;

      let lotsToAssign = [];
      if (lotInfo.toUpperCase() === "ALL") lotsToAssign = lotsIlot;
      else {
        const nums = lotInfo.split(",").map((x) => clean(x));
        lotsToAssign = lotsIlot.filter((l) => nums.includes(clean(l.numero_lot)));
      }
      if (!lotsToAssign.length) continue;

      linesProcessed++;

      for (const lot of lotsToAssign) {
        const k = `${lot.id}|${norm(nom)}|${norm(prenom)}|${clean(cni)}`;
        if (!attrDedup.has(k)) {
          attrDedup.add(k);
          attrCreates.push({
            id_lot: lot.id,
            type_attributaire: "physique",
            nom,
            prenom,
            numero_piece_identite: cni || "",
            nature_piece_identite: cni ? "CNI" : "",
            telephone: telephone || "",
            date_expiration_piece: dateExpirationPiece || "",
            etablie_a: etablieA || "",
            profession: profession || "",
            domicile: domicile || "",
            est_principal: true,
            date_attribution: date_attribution || new Date().toISOString().split("T")[0],
            actif: true,
          });
        }

        if (!lotUpdateMap.has(lot.id)) {
          lotUpdateMap.set(lot.id, {
            [STATUT_FIELD]: statut,
            [AFFECT_FIELD]: affectation || "",
          });
        }

        histCreates.push({
          id_lot: lot.id,
          action: "creation",
          nom_attributaire: `${prenom} ${nom}`.trim(),
          type_attributaire: "physique",
          nouveau_statut: statut,
          utilisateur_action: user.email,
          date_action: new Date().toISOString(),
        });

        lotsTouched++;
      }
    }

    // Récupérer les attestations existantes
    const attestations = await withRetry(() => base44.asServiceRole.entities.Attestation.filter({}));
    const attestationsByLot = {};
    for (const att of attestations) {
      if (!attestationsByLot[att.id_lot]) {
        attestationsByLot[att.id_lot] = att;
      }
    }

    // CRÉER attributaires et les lier aux attestations existantes
    let attrRes = { ok: 0, fail: 0 };
    const createdAttributaires = [];
    const attestationsToUpdate = [];
    
    for (const attr of attrCreates) {
      try {
        const created = await withRetry(() => base44.asServiceRole.entities.Attributaire.create(attr));
        createdAttributaires.push(created);
        attrRes.ok++;
        
        // Mettre à jour l'attestation du lot pour la lier à l'attributaire
        const attestation = attestationsByLot[attr.id_lot];
        if (attestation && !attestation.id_attributaire) {
          attestationsToUpdate.push({
            id: attestation.id,
            id_attributaire: created.id
          });
        }
      } catch (e) {
        attrRes.fail++;
        if (failures.length < 10) failures.push({ where: "Attributaire", message: errMsg(e) });
      }
    }
    
    // Mettre à jour les attestations avec les attributaires
    let attestRes = { ok: 0, fail: 0 };
    for (const update of attestationsToUpdate) {
      try {
        await withRetry(() => base44.asServiceRole.entities.Attestation.update(update.id, { id_attributaire: update.id_attributaire }));
        attestRes.ok++;
      } catch (e) {
        attestRes.fail++;
        if (failures.length < 10) failures.push({ where: "Attestation.update", message: errMsg(e) });
      }
    }

    // METTRE À JOUR les lots
    let lotRes = { ok: 0, fail: 0 };
    for (const [id, data] of lotUpdateMap.entries()) {
      try {
        await withRetry(() => base44.asServiceRole.entities.Lot.update(id, data));
        lotRes.ok++;
      } catch (e) {
        lotRes.fail++;
        if (failures.length < 10) failures.push({ where: "Lot.update", message: errMsg(e) });
      }
    }

    // CRÉER historiques
    let histRes = { ok: 0, fail: 0 };
    for (const hist of histCreates) {
      try {
        await withRetry(() => base44.asServiceRole.entities.HistoriqueAttribution.create(hist));
        histRes.ok++;
      } catch (e) {
        histRes.fail++;
        if (failures.length < 10) failures.push({ where: "HistoriqueAttribution", message: errMsg(e) });
      }
    }

    const nextLineIndex = end;
    const done = nextLineIndex >= lines.length;

    return Response.json({
      success: true,
      done,
      nextCursor: done ? null : { lineIndex: nextLineIndex },
      step: {
        lines_processed: linesProcessed,
        lots_touched: lotsTouched,
        attributaires_ok: attrRes.ok,
        attributaires_fail: attrRes.fail,
        attestations_updated_ok: attestRes.ok,
        attestations_updated_fail: attestRes.fail,
        lots_updated_ok: lotRes.ok,
        lots_updated_fail: lotRes.fail,
        historiques_ok: histRes.ok,
        historiques_fail: histRes.fail,
      },
      failures,
      duration_ms: Date.now() - t0,
    });
  } catch (e) {
    console.error("fatal:", e);
    return Response.json({ error: 'Erreur serveur', status: errStatus(e) ?? 500 }, { status: 500 });
  }
});