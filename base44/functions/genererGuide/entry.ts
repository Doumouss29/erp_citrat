import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";
import { jsPDF } from "npm:jspdf@4.0.0";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { validateFetchUrl, safeFetch } from "../../shared/validateUrl.ts";

// Limites de fusion des PDF externes
const MERGE_LIMITS = {
  MAX_DOCS: 20,
  MAX_TOTAL_BYTES: 15 * 1024 * 1024, // 15MB
  MAX_TOTAL_PAGES: 400,
  FETCH_TIMEOUT_MS: 600000 // 10 minutes
};

/* =========================================================
   Helpers
========================================================= */
function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function safeLoadPdf(bytes) {
  try {
    if (!bytes) return null;
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8.byteLength < 5) return null;
    const head = new TextDecoder().decode(u8.slice(0, 4));
    if (head !== '%PDF') return null;
    return await PDFDocument.load(u8);
  } catch (_) {
    return null;
  }
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(/é/g, "e").replace(/É/g, "E")
    .replace(/è/g, "e").replace(/È/g, "E")
    .replace(/ê/g, "e").replace(/Ê/g, "E")
    .replace(/ë/g, "e").replace(/Ë/g, "E")
    .replace(/à/g, "a").replace(/À/g, "A")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .replace(/ô/g, "o").replace(/Ô/g, "O")
    .replace(/ù/g, "u").replace(/Ù/g, "U")
    .replace(/û/g, "u").replace(/Û/g, "U")
    .replace(/ï/g, "i").replace(/Ï/g, "I")
    .replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/°/g, " ")
    .replace(/²/g, "2")
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(/³/g, "3");
}

function getNumericValue(str) {
  const match = String(str ?? "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function normalizeTf(value) {
  return String(value || "").replace(/^TF\s*/i, "").replace(/\s*[AB]\s*$/i, "").trim();
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatRoundedSurface(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "N/A";
  return String(Math.round(numericValue));
}

function getAttributaireField(attributaire, field) {
  return attributaire?.[field] ?? attributaire?.data?.[field] ?? "";
}

function getAttributaireDisplayName(attributaire) {
  if (!attributaire) return "";
  if (attributaire.type_attributaire === "physique") {
    return `${attributaire.nom || ""} ${attributaire.prenom || ""}`.trim();
  }
  return (attributaire.raison_sociale || attributaire.nom || "").trim();
}

function getWrappedCellLines(doc, values, maxWidth) {
  const list = Array.isArray(values) ? values : [values];
  return list
    .filter((value) => String(value ?? "").trim())
    .flatMap((value) => {
      const text = cleanText(String(value));
      const wrapped = doc.splitTextToSize(text, maxWidth);
      return wrapped.length ? wrapped : [text];
    });
}

function drawCellLines(doc, lines, x, y, { align = "left", cellWidth = 0, paddingX = 2, paddingTop = 4, lineHeight = 4 } = {}) {
  lines.forEach((line, index) => {
    const textY = y + paddingTop + (index * lineHeight);
    if (align === "center") {
      doc.text(line, x + (cellWidth / 2), textY, { align: "center" });
    } else {
      doc.text(line, x + paddingX, textY);
    }
  });
}

// Simple 429 backoff helper to smooth bursts
function isRateLimitError(err) {
  const status = err?.status || err?.response?.status;
  const msg = String(err?.data?.message || err?.message || "").toLowerCase();
  return status === 429 || msg.includes("rate limit");
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function withRetry(fn, retries = 2, delayMs = 300) {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0 && isRateLimitError(e)) {
      await sleep(delayMs);
      return withRetry(fn, retries - 1, Math.min(delayMs * 2, 1500));
    }
    throw e;
  }
}

/* =========================================================
   Détection heuristique d'une "page de garde" déjà existante dans les Documents
   ========================================================= */
function isProbablyCoverDocument(d) {
  const name = String(d?.nom_fichier || '').toLowerCase();
  const desc = String(d?.description || '').toLowerCase();
  const t = String(d?.type_document || '').toLowerCase();
  const hasCoverWord = name.includes('couverture') || name.includes('cover') || name.includes('page_de_garde') || name.includes('page de garde');
  const descCover = desc.includes('couverture') || desc.includes('cover') || desc.includes('page_de_garde') || desc.includes('page de garde') || desc === '__COVER__';
  return t === 'cover' || hasCoverWord || descCover;
}

function isGuideDocument(d) {
  const desc = String(d?.description || '').toLowerCase();
  return desc === '__guide_global__';
}

function isAttestationDocument(d) {
  const desc = String(d?.description || '').toLowerCase();
  const name = String(d?.nom_fichier || '').toLowerCase();
  const type = String(d?.type_document || '').toLowerCase();
  return type === 'attestation'
    || desc === '__attestation_cession__'
    || desc === '__attestation_lot__'
    || desc.includes('attestation_cession')
    || desc.includes('attestation_lot')
    || name.includes('attestation_cession')
    || name.includes('attestation cession')
    || name.includes('attestation_lot')
    || name.includes('attestation lot');
}

function isEligibleSelectedDocument(d, selectedDocumentIdsSet) {
  if (!d?.url_fichier) return false;
  if (isProbablyCoverDocument(d) || isGuideDocument(d) || isAttestationDocument(d)) return false;
  if (selectedDocumentIdsSet) return selectedDocumentIdsSet.has(d.id);
  return true;
}

function isGuideExcludedAttestationRecord(attestation) {
  const type = String(attestation?.type_attestation || '').toLowerCase();
  return type.includes('cession') || type.includes('affectation');
}

/* =========================================================
   Image URL -> dataURL (PNG/JPEG)
   ========================================================= */
async function fetchImageAsDataUrl(url) {
  validateFetchUrl(url);
  const res = await safeFetch(url);
  if (!res.ok) throw new Error(`Fetch image failed (${res.status})`);

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const bytes = new Uint8Array(await res.arrayBuffer());
  const b64 = bytesToBase64(bytes);

  if (contentType.includes("png")) return { dataUrl: `data:image/png;base64,${b64}`, fmt: "PNG" };
  return { dataUrl: `data:image/jpeg;base64,${b64}`, fmt: "JPEG" };
}

/* =========================================================
   Armoirie depuis ConfigurationApp(cle="armoirie")
   Supporte:
   - valeur = { url: "https://..." }
   - valeur = "https://..."
   - valeur = '{"url":"https://..."}'
========================================================= */
function extractUrlFromConfigValue(valeur) {
  if (!valeur) return "";

  if (typeof valeur === "object" && valeur.url) return String(valeur.url).trim();

  if (typeof valeur === "string") {
    const s = valeur.trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;

    try {
      const obj = JSON.parse(s);
      if (obj?.url) return String(obj.url).trim();
      if (obj?.value) return String(obj.value).trim();
    } catch {
      // ignore
    }
  }
  return "";
}

function replacePlaceholders(str, map) {
  if (!str) return '';
  return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (map && k in map ? String(map[k] ?? '') : ''));
}

function addGuidePageNumbers(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${page} / ${totalPages}`, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 12, { align: 'right' });
  }
}

async function addArmoirieFromConfig(doc, base44, { x = 250, y = 5, w = 15, h = 15 } = {}) {
  try {
    const configs = await base44.asServiceRole.entities.ConfigurationApp.filter(
      { cle: "armoirie" },
      "",
      10,
    );

    if (!configs?.length) return false;

    const url = extractUrlFromConfigValue(configs[0].valeur);
    if (!url) return false;

    const img = await fetchImageAsDataUrl(url);
    
    // Utiliser le format détecté (PNG/JPEG) pour éviter toute corruption
    doc.addImage(img.dataUrl, img.fmt, x, y, w, h);
    return true;
  } catch (e) {
    console.error("Armoirie: erreur:", e);
    return false;
  }
}

/* =========================================================
   ENDPOINT: genere_guide
========================================================= */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'lotissement');
    if (denied) return denied;
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id_lotissement = body?.id_lotissement;
    const ilots_ids = Array.isArray(body?.ilots_ids) ? body.ilots_ids : [];
    const attributaires_ids = Array.isArray(body?.attributaires_ids) ? body.attributaires_ids : [];
    const tf_values = Array.isArray(body?.tf_values) ? body.tf_values : [];
    const volume = body?.volume || "";
    const familyName = String(body?.family_name || '').trim().toUpperCase();
    const customFilename = String(body?.custom_filename || '').trim();
    const selectedDocumentIdsSet = Array.isArray(body?.selected_document_ids)
      ? new Set(body.selected_document_ids.filter(Boolean))
      : null;

    // Optional pre-generated guide to avoid re-computation (reduces API calls)
    const guidePdfB64 = body?.guide_pdf_base64;
    let pdfBytes;

    if (!id_lotissement) {
      return Response.json({ error: "Lotissement manquant" }, { status: 400 });
    }

    const lotissement = await withRetry(() => base44.entities.LotissementEguide.get(id_lotissement));

    // Ilots
    const allIlots = await withRetry(() => base44.entities.Ilot.filter({ id_lotissement }, "", 1000));
    const ilots = ilots_ids.length > 0
      ? allIlots.filter((i) => ilots_ids.includes(i.id))
      : allIlots;
    ilots.sort((a, b) => getNumericValue(a.numero_ilot) - getNumericValue(b.numero_ilot));

    // Lots
    const lotsAll = await withRetry(() => base44.entities.Lot.filter({ id_lotissement }, "", 10000));
    const ilotById = Object.fromEntries(ilots.map((i) => [i.id, i]));
    const allLots = lotsAll
      .filter((l) => ilotById[l.id_ilot])
      .map((lot) => ({ ...lot, ilot: ilotById[lot.id_ilot] }));
    allLots.sort((a, b) => {
      const ilotCompare = getNumericValue(a.ilot.numero_ilot) - getNumericValue(b.ilot.numero_ilot);
      if (ilotCompare !== 0) return ilotCompare;
      return getNumericValue(a.numero_lot) - getNumericValue(b.numero_lot);
    });

    const attributaires = await withRetry(() => base44.entities.Attributaire.filter({}, "", 5000));
    const selectedAttributairesSet = new Set(attributaires_ids);
    const getAttributaireKey = (a) => {
      const label = a.type_attributaire === "physique"
        ? `${a.nom || ""} ${a.prenom || ""}`.trim()
        : (a.raison_sociale || a.nom || "").trim();
      return `${a.type_attributaire || ""}::${label.toLowerCase()}`;
    };

    const filteredAttributaires = attributaires_ids.length > 0
      ? attributaires.filter((a) => selectedAttributairesSet.has(getAttributaireKey(a)))
      : attributaires;

    const allowedLotIds = attributaires_ids.length > 0
      ? new Set(filteredAttributaires.map((a) => a.id_lot).filter(Boolean))
      : null;

    const tfSet = new Set(tf_values.map((tf) => normalizeTf(tf)).filter(Boolean));

    const filteredLots = allLots.filter((lot) => {
      if (allowedLotIds && !allowedLotIds.has(lot.id)) return false;
      if (tfSet.size > 0 && !tfSet.has(normalizeTf(lot.TF))) return false;
      return true;
    });

    const filteredIlotIds = new Set(filteredLots.map((lot) => lot.id_ilot).filter(Boolean));
    const ilotsForGuide = ilots.filter((ilot) => filteredIlotIds.has(ilot.id));

    // Indexation attributaires par lot pour éviter des .filter() en boucle
    const attributairesByLot = {};
    for (const a of (filteredAttributaires || [])) {
      if (!attributairesByLot[a.id_lot]) attributairesByLot[a.id_lot] = [];
      attributairesByLot[a.id_lot].push(a);
    }
    
    // Récupérer les attestations des lots du lotissement demandé uniquement :
    // lecture avec les droits de l'utilisateur (RLS), filtrée par lot, au lieu
    // d'une lecture globale de la table en service role.
    const attestationLotIds = lotsAll.map((l) => l.id).filter(Boolean);
    const attestations = [];
    for (let i = 0; i < attestationLotIds.length; i += 500) {
      const chunk = attestationLotIds.slice(i, i + 500);
      const chunkAttestations = await withRetry(() => base44.entities.Attestation.filter({ id_lot: { $in: chunk } }, "", 1000));
      if (Array.isArray(chunkAttestations)) attestations.push(...chunkAttestations);
    }
    const attestationsByLot = {};
    attestations.forEach(att => {
      if (!attestationsByLot[att.id_lot]) {
        attestationsByLot[att.id_lot] = [];
      }
      attestationsByLot[att.id_lot].push(att);
    });

    // PDF (génération uniquement si aucun guide pré-généré n'est fourni)
    if (!guidePdfB64) {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    /* ===== PAGE DE GARDE (désactivée) ===== */










    /* ===== PAGE RECAP ===== */
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(cleanText("Recapitulatif des ilots et des lots"), doc.internal.pageSize.width / 2, 20, { align: "center" });

    let startY = 35;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    const tableWidth = 115;
    const pageWidth = doc.internal.pageSize.width;
    const startX = (pageWidth - tableWidth) / 2;

    doc.rect(startX, startY, 25, 7);
    doc.text("ILOT", startX + 12.5, startY + 5, { align: "center" });
    doc.rect(startX + 25, startY, 50, 7);
    doc.text("LOTS", startX + 50, startY + 5, { align: "center" });
    doc.rect(startX + 75, startY, 40, 7);
    doc.text("NOMBRE DE LOTS", startX + 95, startY + 5, { align: "center" });

    startY += 7;
    doc.setFont("helvetica", "normal");

    const ilotsForSummary = ilotsForGuide;

    const ilotsSummary = ilotsForSummary.map((ilot) => {
      const lotsIlot = filteredLots.filter((l) => l.ilot.id === ilot.id);
      const lotNumbers = lotsIlot.map((l) => parseInt(l.numero_lot, 10) || 0).sort((a, b) => a - b);
      return {
        numero: ilot.numero_ilot,
        lotMin: lotNumbers[0] || 0,
        lotMax: lotNumbers[lotNumbers.length - 1] || 0,
        count: lotsIlot.length,
      };
    });

    for (const summary of ilotsSummary) {
      if (startY > 180) {
        doc.addPage();
        startY = 20;

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.rect(startX, startY, 25, 7);
        doc.text("ILOT", startX + 12.5, startY + 5, { align: "center" });
        doc.rect(startX + 25, startY, 50, 7);
        doc.text("LOTS", startX + 50, startY + 5, { align: "center" });
        doc.rect(startX + 75, startY, 40, 7);
        doc.text("NOMBRE DE LOTS", startX + 95, startY + 5, { align: "center" });

        startY += 7;
        doc.setFont("helvetica", "normal");
      }

      const interval = summary.lotMin === summary.lotMax ? String(summary.lotMin) : `${summary.lotMin} à ${summary.lotMax}`;

      doc.rect(startX, startY, 25, 7);
      doc.text(cleanText(summary.numero), startX + 12.5, startY + 5, { align: "center" });
      doc.rect(startX + 25, startY, 50, 7);
      doc.text(cleanText(interval), startX + 50, startY + 5, { align: "center" });
      doc.rect(startX + 75, startY, 40, 7);
      doc.text(cleanText(String(summary.count)), startX + 95, startY + 5, { align: "center" });

      startY += 7;
    }

    /* ===== PAGES LOTS (2 par page) ===== */
    doc.addPage();

    let lotsOnPage = 0;
    const lotsPerPage = 2;
    const blockHeight = 58;
    const gapY = 14;

    for (let idx = 0; idx < filteredLots.length; idx++) {
      const lotData = filteredLots[idx];

      if (lotsOnPage >= lotsPerPage) {
        doc.addPage();
        lotsOnPage = 0;
      }

      const lotAttributaires = attributairesByLot[lotData.id] || [];
      const attributairesActifs = lotAttributaires.filter((a) => a.actif);
      const attributairesInactifs = lotAttributaires.filter((a) => !a.actif);
      
      const lotAttestations = (attestationsByLot[lotData.id] || []).filter((attestation) => !isGuideExcludedAttestationRecord(attestation));

      const attribParPeriode = [];

      if (attributairesInactifs.length > 0) {
        const tousInactifs = [...attributairesInactifs].sort(
          (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime(),
        );

        const premiereDate = new Date(tousInactifs[0].created_date).getTime();
        const premiersInactifs = tousInactifs.filter(
          (a) => Math.abs(new Date(a.created_date).getTime() - premiereDate) < 3600000,
        );

        const nomsInactifs = premiersInactifs
          .map((attr) => getAttributaireDisplayName(attr))
          .filter(Boolean)
          .join(" & ");

        attribParPeriode[0] = { noms: nomsInactifs, attributaires: premiersInactifs };

        if (attributairesActifs.length > 0) {
          const nomsActifs = attributairesActifs
            .map((attr) => getAttributaireDisplayName(attr))
            .filter(Boolean)
            .join(" & ");

          attribParPeriode[1] = { noms: nomsActifs, attributaires: attributairesActifs };
        }
      } else if (attributairesActifs.length > 0) {
        const nomsActifs = attributairesActifs
          .map((attr) => getAttributaireDisplayName(attr))
          .filter(Boolean)
          .join(" & ");
        attribParPeriode[0] = { noms: nomsActifs, attributaires: attributairesActifs };
      }

      const yPos = 20 + (lotsOnPage * (blockHeight + gapY));
      const xOffset = 15;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        cleanText(
          `ILOT : ${lotData.ilot.numero_ilot}      LOT : ${lotData.numero_lot}      SURFACE (m2) : ${formatRoundedSurface(lotData.surface)}      AFFECTATION : ${lotData.affectation || "N/A"}      TF : ${normalizeTf(lotData.TF) || "N/A"}`, 
        ),
        xOffset,
        yPos,
      );

      let tableY = yPos + 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");

      const cols = [
        { x: xOffset, w: 10, text: "N" },
        { x: xOffset + 10, w: 70, text: "ATTRIBUTAIRES" },
        { x: xOffset + 80, w: 43, text: "ATTESTATION" },
        { x: xOffset + 123, w: 38, text: "CONTACTS" },
        { x: xOffset + 161, w: 106, text: "PIECE D'IDENTITE" },
      ];

      cols.forEach((col) => {
        doc.rect(col.x, tableY, col.w, 10);
        doc.text(cleanText(col.text), col.x + col.w / 2, tableY + 6, { align: "center" });
      });

      tableY += 10;

      doc.setFontSize(9);
      const cols2 = [
        { x: xOffset, w: 10, text: "" },
        { x: xOffset + 10, w: 70, text: "NOM ET PRENOMS" },
        { x: xOffset + 80, w: 13, text: "N" },
        { x: xOffset + 93, w: 30, text: "DATE" },
        { x: xOffset + 123, w: 38, text: "" },
        { x: xOffset + 161, w: 24, text: "NATURE" },
        { x: xOffset + 185, w: 56, text: "N" },
        { x: xOffset + 241, w: 26, text: "DATE" },
      ];

      cols2.forEach((col) => {
        doc.rect(col.x, tableY, col.w, 6);
        if (col.text) doc.text(cleanText(col.text), col.x + col.w / 2, tableY + 4, { align: "center" });
      });

      tableY += 6;

      const attributaireNom = attribParPeriode[0]?.noms || "";
      const contentString = [
        lotissement.nom,
        volume || "",
        lotData.ilot.numero_ilot,
        lotData.numero_lot,
        lotData.surface?.toString() || "",
        lotData.affectation || "",
        attributaireNom,
      ].join("|");

      const content_hash = await sha256Hex(contentString);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (let i = 1; i <= 3; i++) {
        const periodeData = attribParPeriode[i - 1];
        const attributairesPeriode = periodeData?.attributaires || [];

        const nomLines = getWrappedCellLines(doc, attributairesPeriode.map((a) => getAttributaireDisplayName(a)), 66);
        const telephoneLines = getWrappedCellLines(doc, attributairesPeriode.map((a) => getAttributaireField(a, "telephone")), 34);
        const natureLines = getWrappedCellLines(doc, attributairesPeriode.map((a) => getAttributaireField(a, "nature_piece_identite")), 20);
        const numeroPieceLines = getWrappedCellLines(doc, attributairesPeriode.map((a) => getAttributaireField(a, "numero_piece_identite")), 52);
        const datePieceLines = getWrappedCellLines(doc, attributairesPeriode.map((a) => formatDate(getAttributaireField(a, "date_expiration_piece"))), 22);

        let numeroAttestation = "";
        let dateAttestation = "";
        if (i === 1) {
          numeroAttestation = cleanText(String(lotData.numero_lot || ""));
          if (lotAttestations.length > 0) {
            const attestation = lotAttestations[0];
            if (attestation.date_attestation) {
              try {
                const date = new Date(attestation.date_attestation);
                dateAttestation = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
              } catch (e) {
                dateAttestation = "";
              }
            }
          }
        }

        const attestationNumberLines = numeroAttestation ? [numeroAttestation] : [];
        const attestationDateLines = dateAttestation ? [dateAttestation] : [];
        const maxLines = Math.max(
          1,
          nomLines.length,
          telephoneLines.length,
          natureLines.length,
          numeroPieceLines.length,
          datePieceLines.length,
          attestationNumberLines.length,
          attestationDateLines.length,
        );
        const rowHeight = Math.max(8, 4 + (maxLines * 4));

        doc.rect(xOffset, tableY, 10, rowHeight);
        doc.text(String(i), xOffset + 5, tableY + 5, { align: "center" });

        doc.rect(xOffset + 10, tableY, 70, rowHeight);
        drawCellLines(doc, nomLines, xOffset + 10, tableY);

        doc.rect(xOffset + 80, tableY, 13, rowHeight);
        drawCellLines(doc, attestationNumberLines, xOffset + 80, tableY, { align: "center", cellWidth: 13, paddingTop: 5 });
        
        doc.rect(xOffset + 93, tableY, 30, rowHeight);
        drawCellLines(doc, attestationDateLines, xOffset + 93, tableY, { align: "center", cellWidth: 30, paddingTop: 5 });

        doc.rect(xOffset + 123, tableY, 38, rowHeight);
        drawCellLines(doc, telephoneLines, xOffset + 123, tableY);

        doc.rect(xOffset + 161, tableY, 24, rowHeight);
        drawCellLines(doc, natureLines, xOffset + 161, tableY);

        doc.rect(xOffset + 185, tableY, 56, rowHeight);
        drawCellLines(doc, numeroPieceLines, xOffset + 185, tableY, { align: "center", cellWidth: 56 });

        doc.rect(xOffset + 241, tableY, 26, rowHeight);
        drawCellLines(doc, datePieceLines, xOffset + 241, tableY, { align: "center", cellWidth: 26 });

        tableY += rowHeight;
      }

      lotsOnPage++;
    }

    addGuidePageNumbers(doc);

      pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    }

    // If a pre-generated guide was passed, decode it here
    if (guidePdfB64 && !pdfBytes) {
      const bin = atob(guidePdfB64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      pdfBytes = arr;
    }

    if (body?.only_guide) {
      const safeNom = String(lotissement.nom || 'lotissement').replace(/[^a-zA-Z0-9]/g, "_");
      const safeVol = volume ? `_${String(volume).replace(/[^a-zA-Z0-9]/g, "_")}` : "";
      const filename = customFilename || `Guide_${safeNom}${safeVol}.pdf`;
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=${filename}`,
        },
      });
    }

    // Fusion via pdf-lib
    const merged = await PDFDocument.create();

    let mainAdded = false;

    if (body?.merge_with_cover_docs) {
      // 1) Page de garde en mode paysage (reprend l'aperçu UI)
      const cover = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWc = cover.internal.pageSize.width;
      const pageHc = cover.internal.pageSize.height;

      // Couleurs
      function hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
        if (!m) return { r: 249, g: 115, b: 22 }; // orange par défaut
        return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
      }
      // Charger toutes les configs en une seule requête puis indexer
      const allCfgs = await withRetry(() => base44.asServiceRole.entities.ConfigurationApp.filter({ cle: { $nin: ['_eguide_archive_prive', '_eguide_import_maps'] } }, '', 200));
      const cfgMap = {};
      (allCfgs || []).forEach((c) => { cfgMap[c.cle] = c.valeur; });

      const orangeRGB = { r: 245, g: 124, b: 0 }; // #F57C00
      const greenRGB = { r: 46, g: 125, b: 50 };   // #2E7D32
      const accentRGB = orangeRGB;

      // Config cover (depuis la map)
      const coverConf = cfgMap?.cover_page || {};

      // Logos (gauche/droite)
      const cgesnDefault = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696e905b63602ecb4e50760b/c5bb7384d_images.png';
      const mcluDefault = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696e905b63602ecb4e50760b/4b7a1c449_logo_MCLU.png';
      const leftLogoUrl = extractUrlFromConfigValue(coverConf.left_logo_url) || cgesnDefault;
      const rightLogoUrl = extractUrlFromConfigValue(coverConf.right_logo_url) || mcluDefault;

      // En-tête pays / région / commune
      const paysRaw = String(coverConf.pays || "CÔTE D'IVOIRE").toUpperCase();
      const paysCore = paysRaw.replace(/^(RÉPUBLIQUE|REPUBLIQUE)\s+DE\s+/, '').trim();
      const headerCountry = `RÉPUBLIQUE DE ${paysCore}`;

      // Contexte pour variables dynamiques
      const baseRegionCore = String(lotissement.region || '').toUpperCase().replace(/^(REGION|RÉGION)\s+/, '').trim();
      const baseCommuneCore = String(lotissement.commune || '').toUpperCase().replace(/^(COMMUNE\s+DE\s+|COMMUNE\s+)/, '').trim();
      const baseVillage = String((coverConf.localite_nom || lotissement.village || lotissement.nom || '')).toUpperCase().replace(/^(VILLAGE)(\s+DE\s+)?/, '').trim();
      const baseNomLot = String(coverConf.lotissement_nom || lotissement.nom || '').toUpperCase();
      const baseDecret = String((coverConf.arrete_approbation || lotissement.decret || '')).replace('N°16-008/MCU/DGUF/DU/SDAF','N°16-0080/MCU/DGUF/DU/SDAF');
      const ctx = {
        region: baseRegionCore,
        sous_prefecture: String(coverConf.sous_prefecture || lotissement.sous_prefecture || '').toUpperCase().trim(),
        commune: baseCommuneCore,
        village: baseVillage,
        nom_lotissement: baseNomLot,
        numero_approbation: baseDecret,
        background_image: ''
      };

      const regionTpl = String(coverConf.region || '').trim();
      const hasRegionTpl = /\{\{\s*\w+\s*\}\}/.test(regionTpl);
      const regionSrc = (hasRegionTpl ? replacePlaceholders(regionTpl, ctx) : String(lotissement.region || '')).toUpperCase();
      const regionDisp = regionSrc.replace(/^(REGION|RÉGION)\s+/, '').trim();
      const sousPrefectureTpl = String(coverConf.sous_prefecture || '').trim();
      const hasSousPrefectureTpl = /\{\{\s*\w+\s*\}\}/.test(sousPrefectureTpl);
      const sousPrefectureSrc = (hasSousPrefectureTpl ? replacePlaceholders(sousPrefectureTpl, ctx) : String(coverConf.sous_prefecture || lotissement.sous_prefecture || '')).toUpperCase();
      const sousPrefectureDisp = sousPrefectureSrc.replace(/^(SOUS[-\s]PR[ÉE]FECTURE\s+DE\s+|SOUS[-\s]PR[ÉE]FECTURE\s+)/, '').trim();
      const communeTpl = String(coverConf.commune || '').trim();
      const hasCommuneTpl = /\{\{\s*\w+\s*\}\}/.test(communeTpl);
      const hasCommuneValue = !!String(lotissement.commune || '').trim();
      const communeSrc = (hasCommuneTpl ? replacePlaceholders(communeTpl, ctx) : String(lotissement.commune || '')).toUpperCase();
      const communeDisp = hasCommuneValue ? communeSrc.replace(/^(COMMUNE\s+DE\s+|COMMUNE\s+)/, '').trim() : '';

      // Titre / opération / nom lotissement / volume / décret
      const documentTitle = String(coverConf.document_nom || 'GUIDE').toUpperCase();
      const lotissementTitle = String(coverConf.titre_lotissement || '').trim().toUpperCase();
      const coverDateText = (() => {
        const raw = String(coverConf.date_couverture || '').trim();
        if (!raw) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [year, month, day] = raw.split('-');
          return `${day}/${month}/${year}`;
        }
        return raw;
      })();
      const lotNomTpl = String(coverConf.lotissement_nom || '').trim();
      const hasLotTpl = /\{\{\s*\w+\s*\}\}/.test(lotNomTpl);
      const displayLotissementNom = String(hasLotTpl ? replacePlaceholders(lotNomTpl, ctx) : (lotissement.nom || 'LOTISSEMENT')).toUpperCase();
      const operationTextUpper = String(coverConf.type_operation || 'RÉGULARISATION DU PLAN DE LOTISSEMENT').toUpperCase();

      const decretTpl = String(coverConf.arrete_approbation || '').trim();
      const hasDecretTpl = /\{\{\s*\w+\s*\}\}/.test(decretTpl);
      const decretFront = (() => {
        const d = hasDecretTpl ? replacePlaceholders(decretTpl, ctx) : decretTpl;
        return d.replace('N°16-008/MCU/DGUF/DU/SDAF', 'N°16-0080/MCU/DGUF/DU/SDAF');
      })();

      // Fond
      cover.setFillColor(255, 255, 255);
      cover.rect(0, 0, pageWc, pageHc, 'F');

      // Coins décoratifs supprimés pour correspondre à l’aperçu

      // Arrière-plan (image légère) avec faible opacité
      try {
        const bgTpl = String(coverConf.background_image_url || '').trim();
        const hasBgTpl = /\{\{\s*\w+\s*\}\}/.test(bgTpl);
        const bgUrl = extractUrlFromConfigValue(hasBgTpl ? replacePlaceholders(bgTpl, ctx) : bgTpl);
        if (bgUrl) {
          const bgImg = await fetchImageAsDataUrl(bgUrl);
          try { const gs = new cover.GState({ opacity: 0.18 }); cover.setGState(gs); } catch (_) {}
          cover.addImage(bgImg.dataUrl, bgImg.fmt, 0, 0, pageWc, pageHc);
          try { const gs2 = new cover.GState({ opacity: 1 }); cover.setGState(gs2); } catch (_) {}
        }
      } catch (_) {}

      // Header gauche/droite
      const margin = 14;
      const rightW = 120;
      const rightX = pageWc - margin - rightW;

      // Pays (aligné à droite)
      cover.setTextColor(15, 23, 42);
      cover.setFont('helvetica', 'bold');
      cover.setFontSize(10);
      cover.setTextColor(245, 124, 0); // #F57C00
      cover.text(cleanText(headerCountry), rightX + rightW / 2, 16, { align: 'center' });

      // Logo officiel (centré dans le bloc de droite)
      try {
        const rImg = await fetchImageAsDataUrl(rightLogoUrl);
        const lw = 26, lh = 18;
        const lx = rightX + (rightW - lw) / 2;
        cover.addImage(rImg.dataUrl, rImg.fmt, lx, 19, lw, lh);
      } catch (_) {}

      // Ministère (sur une seule ligne)
      const ministere = cleanText(String(coverConf.ministere_nom || "MINISTERE DE LA CONSTRUCTION, DU LOGEMENT ET DE L'URBANISME.").toUpperCase());
      cover.setFont('helvetica', 'bold');
      cover.setTextColor(27, 94, 32); // #1B5E20
      cover.setFontSize(8);
      cover.text(ministere, rightX + rightW / 2, 41, { align: 'center' });

      // Bloc gauche (modèle centré): RÉGION DE..., COMMUNE DE..., ligne, VILLAGE DE...
      cover.setTextColor(15, 23, 42);
      let y = 16;
      const xL = margin;
      const blockW = 60; // largeur de bloc pour centrage
      const centerX = xL + blockW / 2;
      // RÉGION DE ... (gras, centré)
      if (regionDisp) {
        cover.setFont('helvetica', 'bold');
        cover.setFontSize(10);
        const needsDe = !/^(DE|DES|DU|D’|D')\s+/.test(regionDisp);
        const regionLabel = `RÉGION ${needsDe ? 'DE ' : ''}${regionDisp}`;
        cover.text(cleanText(regionLabel), centerX, y, { align: 'center' });
        y += 6;
      }
      // SOUS-PRÉFECTURE DE ... (centré)
      if (sousPrefectureDisp) {
        cover.setFont('helvetica', 'normal');
        cover.setFontSize(10);
        cover.text(cleanText(`SOUS-PRÉFECTURE DE ${sousPrefectureDisp}`), centerX, y, { align: 'center' });
        y += 5;
      }
      // COMMUNE DE ... (italique, centré)
      if (communeDisp) {
        cover.setFont('helvetica', 'italic');
        cover.setFontSize(10);
        cover.text(cleanText(`COMMUNE DE ${communeDisp}`), centerX, y, { align: 'center' });
        y += 3;
      }
      // Ligne centrée
      cover.setDrawColor(51, 65, 85); // slate-700
      cover.setLineWidth(0.5);
      cover.line(centerX - 10, y + 1, centerX + 10, y + 1);
      y += 4;
      // VILLAGE DE ... (accent bleu, centré)
      const localiteTpl = String(coverConf.localite_nom || '').trim();
      const hasLocaliteTpl = /\{\{\s*\w+\s*\}\}/.test(localiteTpl);
      const villageSource = hasLocaliteTpl ? replacePlaceholders(localiteTpl, ctx) : (localiteTpl || lotissement.village || lotissement.nom || '');
      const villageModel = cleanText(String((villageSource).toUpperCase().replace(/^(VILLAGE)(\s+DE\s+)?/, '').trim()));
      if (villageModel) {
        cover.setFont('helvetica', 'bold');
        cover.setTextColor(29, 78, 216); // blue-700
        cover.setFontSize(10.5);
        cover.text(cleanText(`VILLAGE DE ${villageModel}`), centerX, y + 4, { align: 'center' });
        cover.setTextColor(15, 23, 42); // reset
      }

      // Contenu centré: aligné à l’aperçu
      const contentCenterY = lotissementTitle ? pageHc / 2 + 12 : pageHc / 2 + 6;
      const contentCenterX = pageWc / 2 - 2;
      //const titleCenterX = contentCenterX - 14;
      const lotissementNameY = contentCenterY + 2;

if (lotissementTitle) {
  const titleText = lotissementTitle.trim();
  const maxTitleWidth = pageWc - 30;

  let titleFontSize = 15;
  const charSpace = 1.4;

  cover.setFont('helvetica', 'bold');
  cover.setTextColor(51, 65, 85);

  try {
    if (typeof cover.setCharSpace === 'function') {
      cover.setCharSpace(charSpace);
    }
  } catch (_) {}

  cover.setFontSize(titleFontSize);

  const getVisualWidth = () => {
    const normalWidth = cover.getTextWidth(titleText);
    const extraSpacing = Math.max(0, titleText.length - 1) * charSpace;

    return normalWidth + extraSpacing;
  };

  while (getVisualWidth() > maxTitleWidth && titleFontSize > 8) {
    titleFontSize -= 0.5;
    cover.setFontSize(titleFontSize);
  }

  const visualWidth = getVisualWidth();

  // Position de départ calculée pour centrer réellement le texte
  const titleX = (pageWc - visualWidth) / 2;

  cover.text(
    titleText,
    titleX,
    contentCenterY - 24,
    { align: 'left' }
  );

  try {
    if (typeof cover.setCharSpace === 'function') {
      cover.setCharSpace(0);
    }
  } catch (_) {}
}
      cover.setFont('helvetica', 'bold');
      cover.setTextColor(0, 106, 78);
      cover.setFontSize(46);
      try { if (typeof cover.setCharSpace === 'function') cover.setCharSpace(0.6); } catch (_) {}
      cover.text(displayLotissementNom, contentCenterX, lotissementNameY, { align: 'center' });
      try { if (typeof cover.setCharSpace === 'function') cover.setCharSpace(0); } catch (_) {}

      if (familyName) {
        cover.setFont('helvetica', 'bold');
        cover.setTextColor(30, 41, 59);
        cover.setFontSize(18);
        cover.text(familyName, contentCenterX, lotissementNameY + 16, { align: 'center' });
      }

      if (decretFront) {
        cover.setFont('helvetica', 'normal');
        cover.setTextColor(51, 65, 85);
        cover.setFontSize(11);
        cover.text(`ARRÊTÉ D’APPROBATION N° ${decretFront.toUpperCase()}` , contentCenterX, familyName ? lotissementNameY + 26 : lotissementNameY + 14, { align: 'center' });
      }

      if (coverDateText) {
        cover.setFont('helvetica', 'normal');
        cover.setTextColor(71, 85, 105);
        cover.setFontSize(12);
        cover.text(coverDateText, pageWc - 14, pageHc - 18, { align: 'right' });
      }

      // Bandeau bas bicolore
      const barH = 8;
      cover.setFillColor(orangeRGB.r, orangeRGB.g, orangeRGB.b); cover.rect(0, pageHc - barH, pageWc * 0.75, barH, 'F');
      cover.setFillColor(greenRGB.r, greenRGB.g, greenRGB.b); cover.rect(pageWc * 0.75, pageHc - barH, pageWc * 0.25, barH, 'F');

      // Export et insertion
      const coverBytes = cover.output('arraybuffer');
      const coverDoc = await safeLoadPdf(new Uint8Array(coverBytes));
      let coverPages = [];
      if (coverDoc) {
        coverPages = await merged.copyPages(coverDoc, coverDoc.getPageIndices());
        coverPages.forEach((p) => merged.addPage(p));
      }

      // 2) Ajouter les documents officiels (avec timeouts étendus)
      try {
        const docs = await withRetry(() => base44.entities.Document.filter({ id_lotissement }, '', 1000));
        const sortedDocs = [...docs].sort((a, b) => {
          const pa = a.type_document === 'decret' ? 1 : 0;
          const pb = b.type_document === 'decret' ? 1 : 0;
          if (pa !== pb) return pb - pa;
          const da = new Date(a.created_date || 0).getTime();
          const db = new Date(b.created_date || 0).getTime();
          return db - da;
        });

        let totalBytes = (coverBytes?.byteLength) || 0;
        let totalPages = coverPages.length;
        let addedDocs = 0;

        for (const d of sortedDocs) {
          if (addedDocs >= MERGE_LIMITS.MAX_DOCS) break;
          if (totalBytes >= MERGE_LIMITS.MAX_TOTAL_BYTES) break;
          if (totalPages >= MERGE_LIMITS.MAX_TOTAL_PAGES) break;

          const url = d.url_fichier;
          if (!isEligibleSelectedDocument(d, selectedDocumentIdsSet)) continue;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), MERGE_LIMITS.FETCH_TIMEOUT_MS);
          let res;
          try {
            validateFetchUrl(url);
            res = await safeFetch(url, { signal: controller.signal });
          } catch (_) {
            clearTimeout(timer);
            continue;
          }
          clearTimeout(timer);

          if (!res.ok) continue;
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (!ct.includes('pdf')) continue;

          const clHeader = res.headers.get('content-length');
          if (clHeader) {
            const cl = parseInt(clHeader, 10);
            if (isFinite(cl) && cl > 0 && (totalBytes + cl) > MERGE_LIMITS.MAX_TOTAL_BYTES) {
              break;
            }
          }

          let extBytes;
          try {
            extBytes = await res.arrayBuffer();
          } catch (_) {
            continue;
          }
          if ((totalBytes + extBytes.byteLength) > MERGE_LIMITS.MAX_TOTAL_BYTES) break;

          try {
            const extDoc = await safeLoadPdf(new Uint8Array(extBytes));
            if (!extDoc) { continue; }
            const extPages = await merged.copyPages(extDoc, extDoc.getPageIndices());
            if ((totalPages + extPages.length) > MERGE_LIMITS.MAX_TOTAL_PAGES) break;
            extPages.forEach((p) => merged.addPage(p));
            totalBytes += extBytes.byteLength;
            totalPages += extPages.length;
            addedDocs += 1;
          } catch (_) {
            // ignorer si illisible
          }
        }
      } catch (_) {
        // continuer sans docs
      }

      // 3) Ajouter les pages du guide
      const mainDoc = await safeLoadPdf(pdfBytes);
      if (mainDoc) {
        const mainPages = await merged.copyPages(mainDoc, mainDoc.getPageIndices());
        mainPages.forEach((p) => merged.addPage(p));
        mainAdded = true;
      }
    } else {
      // Ajouter le guide généré en premier
      const mainDoc = await safeLoadPdf(pdfBytes);
      if (mainDoc) {
        const mainPages = await merged.copyPages(mainDoc, mainDoc.getPageIndices());
        mainPages.forEach((p) => merged.addPage(p));
        mainAdded = true;
      }
    }

    // Récupérer et ajouter les documents PDF liés au lotissement, avec limites et timeout
    if (!body?.merge_with_cover_docs) {
    try {
      const docs = await withRetry(() => base44.entities.Document.filter({ id_lotissement }, "", 1000));
      const sortedDocs = [...docs].sort((a, b) => {
        const pa = a.type_document === "decret" ? 1 : 0;
        const pb = b.type_document === "decret" ? 1 : 0;
        if (pa !== pb) return pb - pa; // décret d'abord
        const da = new Date(a.created_date || 0).getTime();
        const db = new Date(b.created_date || 0).getTime();
        return db - da; // plus récents ensuite
      });

      let totalBytes = (pdfBytes?.byteLength) || 0;
      let totalPages = (typeof merged.getPageCount === 'function' ? merged.getPageCount() : merged.getPages().length);
      let addedDocs = 0;

      for (const d of sortedDocs) {
        if (addedDocs >= MERGE_LIMITS.MAX_DOCS) break;
        if (totalBytes >= MERGE_LIMITS.MAX_TOTAL_BYTES) break;
        if (totalPages >= MERGE_LIMITS.MAX_TOTAL_PAGES) break;

        const url = d.url_fichier;
        if (!isEligibleSelectedDocument(d, selectedDocumentIdsSet)) continue;

        // Contrôle anti-SSRF : l'URL provient d'une fiche Document, dont le champ
        // peut être renseigné par un utilisateur. Une URL interne est ignorée.
        try {
          validateFetchUrl(url);
        } catch (_) {
          continue;
        }

        // Timeout réseau
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), MERGE_LIMITS.FETCH_TIMEOUT_MS);
        let res;
        try {
          res = await safeFetch(url, { signal: controller.signal });
        } catch (_) {
          clearTimeout(timer);
          continue;
        }
        clearTimeout(timer);

        if (!res.ok) continue;
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!ct.includes("pdf")) continue;

        const clHeader = res.headers.get("content-length");
        if (clHeader) {
          const cl = parseInt(clHeader, 10);
          if (isFinite(cl) && cl > 0 && (totalBytes + cl) > MERGE_LIMITS.MAX_TOTAL_BYTES) {
            break; // dépassement anticipé
          }
        }

        let extBytes;
        try {
          extBytes = await res.arrayBuffer();
        } catch (_) {
          continue;
        }
        if ((totalBytes + extBytes.byteLength) > MERGE_LIMITS.MAX_TOTAL_BYTES) break;

        try {
          const extDoc = await safeLoadPdf(new Uint8Array(extBytes));
          if (!extDoc) { continue; }
          const extPagesCount = typeof extDoc.getPageCount === 'function' ? extDoc.getPageCount() : extDoc.getPages().length;
          if ((totalPages + extPagesCount) > MERGE_LIMITS.MAX_TOTAL_PAGES) break;

          const pages = await merged.copyPages(extDoc, extDoc.getPageIndices());
          pages.forEach((p) => merged.addPage(p));

          totalBytes += extBytes.byteLength;
          totalPages += pages.length;
          addedDocs += 1;
        } catch (_) {
          // ignorer les PDFs non lisibles
        }
      }
    } catch (_) {
      // si l'ajout des documents échoue, on renvoie quand même le guide
    }
    }

    // If nothing could be added due to corrupt PDFs, return a clear error
    if ((merged.getPageCount ? merged.getPageCount() : merged.getPages().length) === 0) {
      return Response.json({ error: 'Aucun PDF valide à fusionner (fichiers corrompus ou non PDF)' }, { status: 400 });
    }

    const finalBytes = await merged.save();

    if (body?.save_document) {
      // Enregistrer le guide remplace des Document en service role : réservé aux
      // administrateurs et au profil « administration » (gestionnaires E-GUIDE),
      // comme l'écriture des attributaires.
      const canSave = user.role === 'admin' || user.grade === 'administration' || user.data?.grade === 'administration';
      if (!canSave) {
        return Response.json({ saved: false, error: 'Accès refusé : enregistrement réservé aux gestionnaires E-GUIDE' }, { status: 403 });
      }
      try {
        const safeNom = String(lotissement.nom || 'lotissement').replace(/[^a-zA-Z0-9]/g, "_");
        const safeVol = volume ? `_${String(volume).replace(/[^a-zA-Z0-9]/g, "_")}` : "";
        const filename = customFilename || `Guide_${safeNom}${safeVol}.pdf`;
        const file = new File([finalBytes], filename, { type: "application/pdf" });
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        const file_url = uploadRes?.file_url || uploadRes?.url || uploadRes?.signed_url;

        const existingDocs = await withRetry(() => base44.entities.Document.filter({ id_lotissement }, "", 100));
        const guidesToDelete = existingDocs.filter((d) => d.description === "__GUIDE_GLOBAL__");
        for (const g of guidesToDelete) {
          try { await withRetry(() => base44.asServiceRole.entities.Document.delete(g.id)); } catch (_) {}
        }

        const saved = await withRetry(() => base44.asServiceRole.entities.Document.create({
          id_lotissement,
          type_document: "autre",
          nom_fichier: filename,
          url_fichier: file_url,
          taille: finalBytes.byteLength,
          type_mime: "application/pdf",
          description: "__GUIDE_GLOBAL__",
        }));

        return Response.json({ saved: true, document_id: saved.id, url: saved.url_fichier });
      } catch (e) {
        console.error('Enregistrement du guide:', e);
        return Response.json({ saved: false, error: 'Erreur serveur' }, { status: 500 });
      }
    }

    const safeNom = String(lotissement.nom || 'lotissement').replace(/[^a-zA-Z0-9]/g, "_");
    const safeVol = volume ? `_${String(volume).replace(/[^a-zA-Z0-9]/g, "_")}` : "";
    const filename = customFilename || `Guide_${safeNom}${safeVol}.pdf`;
    return new Response(finalBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error("Erreur génération guide:", error);
    console.error('genererGuide:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});