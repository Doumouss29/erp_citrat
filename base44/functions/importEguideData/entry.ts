import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  parseCSV,
  csvToObjects,
  parseJSON,
  toBool,
  toNum,
  enumVal,
} from "../../shared/csvParser.ts";

import { gunzipSync } from "node:zlib";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

const ARCHIVE_KEY = "_eguide_archive_prive";

const LOT_AFFECTATIONS = ["Habitat", "Commerce", "Équipement", "Espace vert", "Voirie", "Autre"];
const LOT_STATUTS = ["Lot en vente", "Lot vendu", "Lot réservé", "Lot non à vendre"];
const LOT_STATUT_MAP: Record<string, string> = { "Lot non cessible": "Lot non à vendre" };
const NATURE_PIECE = ["CNI", "Passeport", "Carte de séjour", "Registre de commerce", "Autre"];
const TYPE_DOC = ["piece_identite", "decret", "plan", "attestation", "contrat", "autre"];
const TYPE_ATTR = ["physique", "morale"];
const TYPE_ATTEST = ["Attribution", "Propriété", "Occupation", "Autre"];
const ACTIONS = ["creation", "modification", "suppression", "transfert"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAndParse(base44: any, key: string): Promise<Record<string, string>[]> {
  const rowsForFile = await base44.asServiceRole.entities.ConfigurationApp.filter({ cle: ARCHIVE_KEY, "valeur.name": key }, "", 100);
  const parts = rowsForFile.map((row: any) => row.valeur).sort((a: any, b: any) => a.index - b.index);
  if (!parts.length || parts.length !== parts[0].total || parts.some((p: any, i: number) => p.index !== i)) {
    throw new Error("Archive incomplète");
  }
  const bytes = gunzipSync(Buffer.from(parts.map((p: any) => p.chunk).join(""), "base64"));
  if (createHash("sha256").update(bytes).digest("hex") !== parts[0].digest) throw new Error("Archive invalide");
  const text = bytes.toString("utf8");
  const rows = parseCSV(text);
  let objs = csvToObjects(rows);
  return objs.filter((r) => r.is_sample !== "true");
}

async function bulkCreateRetry(
  base44: any,
  entityName: string,
  batch: any[]
): Promise<any[]> {
  let attempt = 0;
  while (attempt < 5) {
    try {
      return await base44.asServiceRole.entities[entityName].bulkCreate(batch);
    } catch (e: any) {
      attempt++;
      if (attempt >= 5) throw e;
      await sleep(3000 * attempt);
    }
  }
  return [];
}

async function bulkCreateBatched(
  base44: any,
  entityName: string,
  payloads: any[],
  batchSize = 500
): Promise<any[]> {
  const all: any[] = [];
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const created = await bulkCreateRetry(base44, entityName, batch);
    all.push(...created);
    if (i + batchSize < payloads.length) await sleep(1500);
  }
  return all;
}

// Store maps in a ConfigurationApp record for cross-phase persistence
async function storeMaps(base44: any, maps: Record<string, any>): Promise<void> {
  await base44.asServiceRole.entities.ConfigurationApp.create({
    cle: "_eguide_import_maps",
    valeur: maps,
    description: "Maps d'IDs pour l'import E-GUIDE multi-phases",
  });
}

async function loadMaps(base44: any): Promise<Record<string, any> | null> {
  const page = await base44.asServiceRole.entities.ConfigurationApp.filter(
    { cle: "_eguide_import_maps" },
    { limit: 1 }
  );
  const items = (page as any).items || page;
  return items.length > 0 ? items[0].valeur : null;
}

async function deleteMaps(base44: any): Promise<void> {
  try {
    await base44.asServiceRole.entities.ConfigurationApp.deleteMany({
      cle: "_eguide_import_maps",
    });
  } catch {}
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return Response.json({ error: "Forbidden - admin requis" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const phase: string = body.phase || "all";
    if (body.clearExisting === true) return Response.json({ error: "Suppression globale désactivée" }, { status: 400 });

    const results: Record<string, any> = {};
    const errors: string[] = [];

    // ===== Phase 1: Lotissement + ConfigurationApp + Ilot =====
    if (phase === "all" || phase === "1") {
      const lotissementMap: Record<string, string> = {};

      // Import Lotissement
      {
        const records = await fetchAndParse(base44, "lotissement");
        const payloads = records.map((r) => ({
          nom: r.nom || "Sans nom",
          localite: r.commune || "",
          commune: r.commune || "",
          region: r.region || "",
          village: r.village || "",
          decret: (r.decret || "").trim(),
          zoom_defaut: toNum(r.zoom_defaut),
          coordonnees_centre: parseJSON(r.coordonnees_centre),
          nombre_lots: toNum(r.nombre_lots),
          nombre_ilots: toNum(r.nombre_ilots),
          superficie_totale: toNum(r.superficie_totale),
          statut: "En cours",
        }));
        const created = await bulkCreateBatched(base44, "LotissementEguide", payloads);
        created.forEach((rec: any, idx: number) => {
          if (records[idx]?.id) lotissementMap[records[idx].id] = rec.id;
        });
        results.lotissement = { imported: created.length, mapSize: Object.keys(lotissementMap).length };
      }

      // Import ConfigurationApp
      {
        const records = await fetchAndParse(base44, "config");
        const payloads = records.filter((r) => r.cle !== ARCHIVE_KEY).map((r) => ({
          cle: r.cle || "",
          valeur: parseJSON(r.valeur) || {},
          description: r.description || "",
        }));
        const created = await bulkCreateBatched(base44, "ConfigurationApp", payloads);
        results.configurationApp = created.length;
      }

      // Import Ilot
      {
        const records = await fetchAndParse(base44, "ilot");
        const payloads = records.map((r) => ({
          id_lotissement: lotissementMap[r.id_lotissement] || r.id_lotissement,
          numero_ilot: r.numero_ilot || "",
          nombre_lots: toNum(r.nombre_lots),
          numero_lot_debut: r.numero_lot_debut || "",
          numero_lot_fin: r.numero_lot_fin || "",
          geometrie: parseJSON(r.geometrie),
          couleur: r.couleur || "",
        }));
        const created = await bulkCreateBatched(base44, "Ilot", payloads);
        const ilotMap: Record<string, string> = {};
        created.forEach((rec: any, idx: number) => {
          if (records[idx]?.id) ilotMap[records[idx].id] = rec.id;
        });
        results.ilot = { imported: created.length, mapSize: Object.keys(ilotMap).length };

        // Store maps for subsequent phases
        await storeMaps(base44, { lotissementMap, ilotMap });
        results.mapsStored = true;
      }
    }

    // ===== Phase 2: Lot (needs lotissementMap + ilotMap) =====
    if (phase === "all" || phase === "2") {
      let lotissementMap: Record<string, string> = {};
      let ilotMap: Record<string, string> = {};

      const stored = await loadMaps(base44);
      if (stored) {
        lotissementMap = stored.lotissementMap || {};
        ilotMap = stored.ilotMap || {};
      }

      const records = await fetchAndParse(base44, "lot");
      const payloads = records.map((r) => {
        let statut = r.statut || "Lot en vente";
        if (LOT_STATUT_MAP[statut]) statut = LOT_STATUT_MAP[statut];
        if (!LOT_STATUTS.includes(statut)) statut = "Lot en vente";
        return {
          id_lotissement: lotissementMap[r.id_lotissement] || r.id_lotissement,
          id_ilot: ilotMap[r.id_ilot] || r.id_ilot,
          numero_lot: r.numero_lot || "",
          parcelle: r.parcelle || "",
          TF: r.TF || "",
          surface: toNum(r.surface),
          affectation: enumVal(r.affectation, LOT_AFFECTATIONS, "Autre") || "Autre",
          statut,
          geometrie: parseJSON(r.geometrie),
          prix: toNum(r.prix),
          notes: r.notes || "",
        };
      });
      const created = await bulkCreateBatched(base44, "Lot", payloads);
      const lotMap: Record<string, string> = {};
      created.forEach((rec: any, idx: number) => {
        if (records[idx]?.id) lotMap[records[idx].id] = rec.id;
      });
      results.lot = { imported: created.length, mapSize: Object.keys(lotMap).length };

      // Update stored maps with lotMap
      const stored2 = await loadMaps(base44);
      if (stored2) {
        await storeMaps(base44, { ...stored2, lotMap });
      }
    }

    // ===== Phase 3: Attributaire (needs lotMap) =====
    if (phase === "all" || phase === "3") {
      let lotMap: Record<string, string> = {};

      const stored3 = await loadMaps(base44);
      if (stored3) {
        lotMap = stored3.lotMap || {};
      }

      const records = await fetchAndParse(base44, "attributaire");
      const payloads = records.map((r) => {
        const payload: any = {
          id_lot: lotMap[r.id_lot] || r.id_lot,
          type_attributaire: enumVal(r.type_attributaire, TYPE_ATTR, "physique") || "physique",
          est_principal: toBool(r.est_principal),
          nom: r.nom || "",
          prenom: r.prenom || "",
          raison_sociale: r.raison_sociale || "",
          representant_nom: r.representant_nom || "",
          representant_prenom: r.representant_prenom || "",
          telephone: r.telephone || "",
          email: r.email || "",
          adresse: r.adresse || "",
          domicile: r.domicile || "",
          profession: r.profession || "",
          numero_piece_identite: r.numero_piece_identite || "",
          etablie_a: r.etablie_a || "",
          piece_identite_url: r.piece_identite_url || "",
          actif: toBool(r.actif),
        };
        const nature = enumVal(r.nature_piece_identite, NATURE_PIECE);
        if (nature) payload.nature_piece_identite = nature;
        if (r.date_expiration_piece) payload.date_expiration_piece = r.date_expiration_piece;
        if (r.date_attribution) payload.date_attribution = r.date_attribution;
        return payload;
      });
      const created = await bulkCreateBatched(base44, "Attributaire", payloads);
      const attributaireMap: Record<string, string> = {};
      created.forEach((rec: any, idx: number) => {
        if (records[idx]?.id) attributaireMap[records[idx].id] = rec.id;
      });
      results.attributaire = { imported: created.length, mapSize: Object.keys(attributaireMap).length };

      // Update stored maps with attributaireMap
      const stored4 = await loadMaps(base44);
      if (stored4) {
        await storeMaps(base44, { ...stored4, attributaireMap });
      }
    }

    // ===== Phase 4: Document + Attestation + HistoriqueAttribution =====
    if (phase === "all" || phase === "4") {
      let lotissementMap: Record<string, string> = {};
      let lotMap: Record<string, string> = {};
      let attributaireMap: Record<string, string> = {};

      const stored5 = await loadMaps(base44);
      if (stored5) {
        lotissementMap = stored5.lotissementMap || {};
        lotMap = stored5.lotMap || {};
        attributaireMap = stored5.attributaireMap || {};
      }

      // Document
      {
        const records = await fetchAndParse(base44, "document");
        const payloads = records
          .map((r) => {
            const payload: any = {
              type_document: enumVal(r.type_document, TYPE_DOC, "autre") || "autre",
              nom_fichier: r.nom_fichier || "",
              url_fichier: r.url_fichier || "",
              taille: toNum(r.taille),
              type_mime: r.type_mime || "",
              description: r.description || "",
            };
            if (r.id_lot && lotMap[r.id_lot]) payload.id_lot = lotMap[r.id_lot];
            if (r.id_attributaire && attributaireMap[r.id_attributaire])
              payload.id_attributaire = attributaireMap[r.id_attributaire];
            if (r.id_lotissement && lotissementMap[r.id_lotissement])
              payload.id_lotissement = lotissementMap[r.id_lotissement];
            return payload;
          })
          .filter((p) => p.url_fichier);
        const created = await bulkCreateBatched(base44, "Document", payloads);
        results.document = created.length;
      }

      // Attestation
      {
        const records = await fetchAndParse(base44, "attestation");
        const payloads = records.map((r) => {
          const payload: any = {
            id_lot: lotMap[r.id_lot] || r.id_lot,
            numero_attestation: r.numero_attestation || "",
            type_attestation:
              enumVal(r.type_attestation, TYPE_ATTEST, "Attribution") || "Attribution",
            document_url: r.document_url || "",
            qr_code: r.qr_code || "",
            observations: r.observations || "",
          };
          if (r.date_attestation) payload.date_attestation = r.date_attestation;
          if (r.id_attributaire && attributaireMap[r.id_attributaire])
            payload.id_attributaire = attributaireMap[r.id_attributaire];
          return payload;
        });
        const created = await bulkCreateBatched(base44, "Attestation", payloads);
        results.attestation = created.length;
      }

      // HistoriqueAttribution
      {
        const records = await fetchAndParse(base44, "historique");
        const payloads = records.map((r) => {
          const payload: any = {
            id_lot: lotMap[r.id_lot] || r.id_lot,
            action: enumVal(r.action, ACTIONS, "creation") || "creation",
            nom_attributaire: r.nom_attributaire || "",
            prenom_attributaire: r.prenom_attributaire || "",
            type_attributaire: r.type_attributaire || "",
            details_modification: r.details_modification || "",
            ancien_statut: r.ancien_statut || "",
            nouveau_statut: r.nouveau_statut || "",
            utilisateur_action: r.utilisateur_action || "",
          };
          if (r.date_action) payload.date_action = r.date_action;
          if (r.id_attributaire && attributaireMap[r.id_attributaire])
            payload.id_attributaire = attributaireMap[r.id_attributaire];
          return payload;
        });
        const created = await bulkCreateBatched(base44, "HistoriqueAttribution", payloads);
        results.historique = created.length;
      }

      // Clean up stored maps
      await deleteMaps(base44);
    }

    return Response.json({
      success: true,
      phase,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return Response.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}