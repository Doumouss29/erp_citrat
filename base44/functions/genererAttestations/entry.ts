import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import { jsPDF } from "npm:jspdf@4.0.0";

async function ensureCalibriFont() {
  return;
}

function getNumericValue(str) {
  const match = String(str ?? "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function normalizeTf(value) {
  return String(value || "").replace(/^TF\s*/i, "").trim();
}

function buildNomComplet(attributaires) {
  return attributaires
    .map((attr) => attr.type_attributaire === "physique"
      ? `${attr.prenom || ""} ${attr.nom || ""}`.trim()
      : (attr.raison_sociale || attr.nom || "").trim())
    .filter(Boolean)
    .join(" & ");
}

function getPersonDisplayName(attr) {
  if (!attr) return "";
  return attr.type_attributaire === "physique"
    ? `${attr.prenom || ""} ${attr.nom || ""}`.trim()
    : (attr.raison_sociale || attr.nom || "").trim();
}

function getPersonProfession(attr) {
  return attr?.profession || "";
}

function getPersonDomicile(attr) {
  return attr?.domicile || attr?.adresse || "";
}
function getDefaultFields(variables) {
  if (Array.isArray(variables) && variables.length > 0) return variables;
  return [
{ variable: "numero_lot", x: 70, y: 65, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "numero_lot", x: 108, y: 65, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "numero_ilot", x: 150, y: 65, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "TF", x: 97, y: 69.8, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "nom_complet_attributaire", x: 73, y: 118.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "center" },

{ variable: "numero_piece_identite", x: 58, y: 138, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "date_piece_identite", x: 115, y: 137.8, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "etablie_a", x: 148, y: 138, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "profession", x: 37, y: 147.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "domicile", x: 95, y: 147.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "telephone", x: 144, y: 147.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "numero_lot", x: 59, y: 157.42, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "numero_ilot", x: 105, y: 157.42, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "TF", x: 55, y: 166.37, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
  ];
}
function getCessionFields() {
  return [
{ variable: "numero_lot", x: 66, y: 57.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "numero_lot", x: 108, y: 57.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "numero_ilot", x: 150, y: 57.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "TF", x: 90, y: 62.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "ancien_nom_complet_attributaire", x: 44, y: 110, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "ancien_profession", x: 36, y: 111, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "ancien_numero_piece_identite", x: 59, y: 125.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "ancien_date_piece_identite", x: 101, y: 125.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "ancien_domicile", x: 37, y: 128, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "ancien_telephone", x: 104, y: 128, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "numero_lot", x: 130, y: 144.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "numero_ilot", x: 180, y: 144.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "TF", x: 118, y:152, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },

{ variable: "nouveau_nom_complet_attributaire", x: 44, y: 178, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "nouveau_profession", x: 36, y: 173, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "nouveau_numero_piece_identite", x: 55, y: 194, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "nouveau_date_piece_identite", x: 102, y: 194, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "nouveau_domicile", x: 37, y: 202.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
{ variable: "nouveau_telephone", x: 104, y: 202.5, size: 12, fontFamily: "helvetica", fontStyle: "normal", align: "left" },
  ];
}

function mergeMissingAffectationFields(variables) {
  const fields = Array.isArray(variables) ? [...variables] : [];
  const existingVariables = new Set(fields.map((field) => field?.variable).filter(Boolean));
  const missingDefaults = getDefaultFields().filter((field) => (
    ["etablie_a", "profession", "domicile"].includes(field.variable) && !existingVariables.has(field.variable)
  ));
  return [...fields, ...missingDefaults];
}

function normalizeAttestationFields(fields) {
  return fields.map((field) => ({
    ...field,
    size: 12,
    fontFamily: "helvetica",
    fontStyle: "normal",
  }));
}

function drawFields(doc, fields, variables) {
  for (const field of fields) {
    const text = String(variables?.[field.variable] || "");
    doc.setFont(field.fontFamily || "helvetica", field.fontStyle || "normal");
    doc.setFontSize(Number(field.size) || 12);
    doc.text(text, Number(field.x) || 0, Number(field.y) || 0, field.align ? { align: field.align } : undefined);
  }
}

function buildAffectationVariables({ lot, ilot, lotissement, lotAttributaires }) {
  const nomCompletAttributaire = buildNomComplet(lotAttributaires);
  const principalAttributaire = lotAttributaires.find((a) => a.est_principal) || lotAttributaires[0] || {};

  return {
    numero_lot: lot.numero_lot || "",
    numero_ilot: ilot?.numero_ilot || "",
    nom_complet_attributaire: nomCompletAttributaire,
    numero_piece_identite: principalAttributaire.numero_piece_identite || "",
    date_piece_identite: formatDate(principalAttributaire.date_expiration_piece || principalAttributaire.date_piece_identite),
    etablie_a: principalAttributaire.etablie_a || "",
    profession: getPersonProfession(principalAttributaire),
    domicile: getPersonDomicile(principalAttributaire),
    telephone: principalAttributaire.telephone || "",
    TF: normalizeTf(lotissement.titre_foncier || lotissement.TF || lot.TF || ""),
  };
}

function buildCessionVariables({ lot, ilot, lotissement, ancienAttributaire, nouveauAttributaire }) {
  return {
    numero_lot: lot.numero_lot || "",
    numero_ilot: ilot?.numero_ilot || "",
    TF: normalizeTf(lotissement.TF || lotissement.titre_foncier || lot.TF || ""),
    ancien_nom_complet_attributaire: getPersonDisplayName(ancienAttributaire),
    ancien_profession: getPersonProfession(ancienAttributaire),
    ancien_numero_piece_identite: ancienAttributaire?.numero_piece_identite || "",
    ancien_date_piece_identite: formatDate(ancienAttributaire?.date_piece_identite || ancienAttributaire?.date_expiration_piece),
    ancien_domicile: getPersonDomicile(ancienAttributaire),
    ancien_telephone: ancienAttributaire?.telephone || "",
    nouveau_nom_complet_attributaire: getPersonDisplayName(nouveauAttributaire),
    nouveau_profession: getPersonProfession(nouveauAttributaire),
    nouveau_numero_piece_identite: nouveauAttributaire?.numero_piece_identite || "",
    nouveau_date_piece_identite: formatDate(nouveauAttributaire?.date_piece_identite || nouveauAttributaire?.date_expiration_piece),
    nouveau_domicile: getPersonDomicile(nouveauAttributaire),
    nouveau_telephone: nouveauAttributaire?.telephone || "",
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const id_lotissement = body?.id_lotissement;
    const ilots_ids = Array.isArray(body?.ilots_ids) ? body.ilots_ids : [];
    const attributaires_ids = Array.isArray(body?.attributaires_ids) ? body.attributaires_ids : [];
    const tf_values = Array.isArray(body?.tf_values) ? body.tf_values : [];
    const lot_ids = Array.isArray(body?.lot_ids) ? body.lot_ids : [];
    const save_document = !!body?.save_document;
    const attestationType = body?.attestation_type === "cession" ? "cession" : "affectation";

    if (!id_lotissement) {
      return Response.json({ error: "Lotissement manquant" }, { status: 400 });
    }

    const lotissement = await base44.asServiceRole.entities.LotissementEguide.get(id_lotissement);
    const allIlots = await base44.asServiceRole.entities.Ilot.filter({ id_lotissement }, "", 1000);
    const ilots = ilots_ids.length > 0 ? allIlots.filter((i) => ilots_ids.includes(i.id)) : allIlots;
    const ilotById = Object.fromEntries(ilots.map((i) => [i.id, i]));

    const lotsAll = await base44.asServiceRole.entities.Lot.filter({ id_lotissement }, "", 10000);
    const allLots = lotsAll
      .filter((lot) => ilotById[lot.id_ilot])
      .map((lot) => ({ ...lot, ilot: ilotById[lot.id_ilot] }))
      .sort((a, b) => {
        const ilotCompare = getNumericValue(a.ilot?.numero_ilot) - getNumericValue(b.ilot?.numero_ilot);
        if (ilotCompare !== 0) return ilotCompare;
        return getNumericValue(a.numero_lot) - getNumericValue(b.numero_lot);
      });

    const allAttributaires = await base44.asServiceRole.entities.Attributaire.filter({}, "", 5000);
    const allHistorique = await base44.asServiceRole.entities.HistoriqueAttribution.filter({}, "", 5000);
    const attributaireById = Object.fromEntries(allAttributaires.map((attr) => [attr.id, attr]));
    const selectedAttributairesSet = new Set(attributaires_ids);
    const getAttributaireKey = (a) => {
      const label = a.type_attributaire === "physique"
        ? `${a.prenom || ""} ${a.nom || ""}`.trim()
        : (a.raison_sociale || a.nom || "").trim();
      return `${a.type_attributaire || ""}::${label.toLowerCase()}`;
    };

    const filteredAttributaires = attributaires_ids.length > 0
      ? allAttributaires.filter((a) => selectedAttributairesSet.has(getAttributaireKey(a)))
      : allAttributaires;

    const allowedLotIds = attributaires_ids.length > 0
      ? new Set(filteredAttributaires.map((a) => a.id_lot).filter(Boolean))
      : null;

    const tfSet = new Set(tf_values.map((tf) => normalizeTf(tf)).filter(Boolean));
    const selectedLotIdsSet = new Set(lot_ids.filter(Boolean));

    const lots = allLots.filter((lot) => {
      if (allowedLotIds && !allowedLotIds.has(lot.id)) return false;
      if (tfSet.size > 0 && !tfSet.has(normalizeTf(lot.TF))) return false;
      if (selectedLotIdsSet.size > 0 && !selectedLotIdsSet.has(lot.id)) return false;
      return true;
    });

    const attributairesByLot = {};
    for (const attr of allAttributaires.filter((a) => a.actif !== false)) {
      if (!attributairesByLot[attr.id_lot]) attributairesByLot[attr.id_lot] = [];
      attributairesByLot[attr.id_lot].push(attr);
    }

    const historyByLot = {};
    for (const item of allHistorique) {
      if (!historyByLot[item.id_lot]) historyByLot[item.id_lot] = [];
      historyByLot[item.id_lot].push(item);
    }

    const affectationFields = normalizeAttestationFields(mergeMissingAffectationFields(getDefaultFields(lotissement.attestation_variables)));
    const cessionFields = normalizeAttestationFields(getCessionFields());
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await ensureCalibriFont(doc);
    let hasPages = false;
    const generatedItems = [];
    const skippedCessionLots = [];

    for (let index = 0; index < lots.length; index++) {
      const lot = lots[index];
      const ilot = lot.ilot;
      const lotAttributaires = attributairesByLot[lot.id] || [];

      if (attestationType === "cession") {
        const lotHistory = (historyByLot[lot.id] || [])
          .filter((item) => item.action === "transfert" || item.action === "suppression" || item.action === "modification" || item.action === "creation")
          .sort((a, b) => new Date(b.date_action || b.created_date || 0).getTime() - new Date(a.date_action || a.created_date || 0).getTime());

        const nouveauAttributaire = lotAttributaires.find((a) => a.est_principal) || lotAttributaires[0] || null;
        const nouveauNomNormalise = getPersonDisplayName(nouveauAttributaire).trim().toLowerCase();

        const historiqueSource = lotHistory.find((item) => {
          const action = String(item.action || "").toLowerCase();
          const nomHistorique = `${item.prenom_attributaire || ""} ${item.nom_attributaire || ""}`.trim().toLowerCase();
          if (!nomHistorique) return false;
          if (action !== "suppression" && action !== "transfert") return false;
          return nomHistorique !== nouveauNomNormalise;
        }) || lotHistory.find((item) => {
          const action = String(item.action || "").toLowerCase();
          return action === "suppression" || action === "transfert";
        });

        const ancienAttributaireSource = historiqueSource?.id_attributaire ? attributaireById[historiqueSource.id_attributaire] : null;
        const ancienTypeAttributaire = historiqueSource?.type_attributaire || ancienAttributaireSource?.type_attributaire || "physique";
        const ancienAttributaire = historiqueSource ? {
          type_attributaire: ancienTypeAttributaire,
          nom: historiqueSource.nom_attributaire || ancienAttributaireSource?.nom || "",
          prenom: historiqueSource.prenom_attributaire || ancienAttributaireSource?.prenom || "",
          raison_sociale: ancienTypeAttributaire === "morale"
            ? (historiqueSource.nom_attributaire || ancienAttributaireSource?.raison_sociale || ancienAttributaireSource?.nom || "")
            : "",
          numero_piece_identite: historiqueSource.numero_piece_identite || ancienAttributaireSource?.numero_piece_identite || "",
          date_piece_identite: historiqueSource.date_piece_identite || ancienAttributaireSource?.date_piece_identite || "",
          date_expiration_piece: historiqueSource.date_expiration_piece || ancienAttributaireSource?.date_expiration_piece || "",
          domicile: historiqueSource.domicile || historiqueSource.adresse || ancienAttributaireSource?.domicile || ancienAttributaireSource?.adresse || "",
          adresse: historiqueSource.adresse || historiqueSource.domicile || ancienAttributaireSource?.adresse || ancienAttributaireSource?.domicile || "",
          telephone: historiqueSource.telephone || ancienAttributaireSource?.telephone || "",
          profession: historiqueSource.profession || ancienAttributaireSource?.profession || "",
        } : null;

        const hasAncien = !!ancienAttributaire && !!getPersonDisplayName(ancienAttributaire);
        const hasNouveau = !!nouveauAttributaire && !!getPersonDisplayName(nouveauAttributaire);

        if (!hasAncien || !hasNouveau) {
          skippedCessionLots.push(`lot ${lot.numero_lot || lot.id}`);
          continue;
        }

        const variables = buildCessionVariables({
          lot,
          ilot,
          lotissement,
          ancienAttributaire,
          nouveauAttributaire,
        });

        if (hasPages) doc.addPage();
        hasPages = true;
        doc.setTextColor(255, 0, 0);
        drawFields(doc, cessionFields, variables);

        generatedItems.push({
          lot,
          variables,
          principalAttributaire: nouveauAttributaire,
          type: "cession",
        });

        continue;
      }

      const variables = buildAffectationVariables({ lot, ilot, lotissement, lotAttributaires });
      const principalAttributaire = lotAttributaires.find((a) => a.est_principal) || lotAttributaires[0] || {};

      if (hasPages) doc.addPage();
      hasPages = true;
      doc.setTextColor(255, 0, 0);
      drawFields(doc, affectationFields, variables);

      generatedItems.push({
        lot,
        variables,
        principalAttributaire,
        type: "affectation",
      });
    }

    if (!hasPages) {
      if (attestationType === "cession") {
        const lotsLabel = skippedCessionLots.length > 0
          ? ` : ${skippedCessionLots.join(", ")}`
          : "";
        return Response.json({ error: `Impossible de générer une attestation de cession : aucun ancien attributaire n'a été trouvé pour le(s) lot(s) sélectionné(s)${lotsLabel}.` }, { status: 400 });
      }
      return Response.json({ error: "Aucun lot sélectionné" }, { status: 400 });
    }

    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));

    if (save_document) {
      const savedDocs = [];
      for (const item of generatedItems) {
        const singleDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        await ensureCalibriFont(singleDoc);
        singleDoc.setTextColor(0, 0, 0);
        drawFields(singleDoc, item.type === "cession" ? cessionFields : affectationFields, item.variables);
        const singleBytes = new Uint8Array(singleDoc.output("arraybuffer"));
        const filename = `${item.type === "cession" ? "Attestation_cession" : "Attestation_lot"}_${String(item.lot.numero_lot || item.lot.id).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
        const file = new File([singleBytes], filename, { type: "application/pdf" });
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        const file_url = uploadRes?.file_url || uploadRes?.url || uploadRes?.signed_url;

        const existingDocs = await base44.asServiceRole.entities.Document.filter({ id_lot: item.lot.id, type_document: "attestation" }, "", 100);
        for (const existing of existingDocs) {
          await base44.asServiceRole.entities.Document.delete(existing.id);
        }

        const saved = await base44.asServiceRole.entities.Document.create({
          id_lot: item.lot.id,
          id_lotissement,
          id_attributaire: item.principalAttributaire?.id || undefined,
          type_document: "attestation",
          nom_fichier: filename,
          url_fichier: file_url,
          taille: singleBytes.byteLength,
          type_mime: "application/pdf",
          description: item.type === "cession" ? "__ATTESTATION_CESSION__" : "__ATTESTATION_LOT__",
        });
        savedDocs.push(saved);
      }

      return Response.json({ saved: true, count: savedDocs.length, documents: savedDocs });
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${attestationType === "cession" ? "attestations_cession" : "attestations"}_${String(lotissement.nom || "lotissement").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      },
    });
  } catch (error) {
    console.error('genererAttestations:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});