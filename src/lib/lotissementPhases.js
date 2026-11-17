// Définition des 7 phases et 42 pièces du dossier de lotissement.
// Source : maquette "Lotissements" (Dossier_lotissement_CI_pieces_separees).

export const LOTISSEMENT_PHASES = [
  "Données d'entrée",
  "Autorisation de lotir",
  "Demande d'approbation",
  "Processus d'approbation",
  "Travaux",
  "Gestion domaniale",
  "Fin de lotissement",
];

// [phaseIndex, intitulé, conditionnel?]
const RAW_ELEMENTS = [
  [0, "PV de réunion de sollicitation de lotissement"],
  [0, "Libation / Dotation"],
  [0, "Délimitation de la parcelle"],
  [0, "Délimitation des parcellaires"],
  [0, "Documents de propriété (Attestation de propriété coutumière / TF)"],
  [0, "PV de famille"],
  [0, "Avis de servitude"],
  [0, "Convention de lotissement"],
  [0, "Courrier de demande d'avis favorable du chef de village au Sous-Préfet/Maire"],
  [1, "Demande de lotissement signé par le lotisseur à l'intention du Ministre / Préfet"],
  [1, "Avis favorable du Sous-Préfet/Maire"],
  [1, "Plan de situation"],
  [1, "Extrait topographique"],
  [1, "Lettre d'intention de financement d'une banque (Garantie bancaire)"],
  [1, "Contrat avec un urbaniste Agréé"],
  [1, "Contrat avec un Bureau d'Etudes Technique"],
  [1, "Contrat avec entreprise de travaux VRD"],
  [1, "Courrier de l'autorisation de lotir signé par le Préfet / Ministre"],
  [2, "Croquis de levé"],
  [2, "Plan d'Etat des Lieux EDL"],
  [2, "Listing des points de détail"],
  [2, "Rapport du Géomètre"],
  [2, "Plan d'aménagement (Urbaniste)"],
  [2, "Rapport d'urbanisme"],
  [2, "Ordre de recette droits domaniaux"],
  [3, "Contrôle DTC"],
  [3, "Contrôle de l'assainissement"],
  [3, "Mise en enquête publique", true],
  [3, "Courrier de convocation de la commission mixte"],
  [3, "PV d'avis favorable de la commission mixte"],
  [3, "Numérotation du plan par la DTC"],
  [3, "Arrêté d'approbation"],
  [3, "Publication de l'arrêté d'approbation"],
  [4, "Application du lotissement"],
  [4, "Ouverture des voies"],
  [4, "Travaux VRD"],
  [5, "PV de partage"],
  [5, "Guide de lotissement"],
  [5, "Établissement des attestations"],
  [6, "Certificat de conformité"],
  [6, "Rapport de clôture"],
  [6, "Attestation de bonne exécution (ABE)"],
];

export const LOTISSEMENT_ELEMENTS = RAW_ELEMENTS.map((row, i) => ({
  id: "e" + (i + 1),
  phase: row[0],
  intitule: row[1],
  conditionnel: !!row[2],
}));

export const LOTISSEMENT_TOTAL = LOTISSEMENT_ELEMENTS.length;

export function getPhaseElements(phaseIndex) {
  return LOTISSEMENT_ELEMENTS.filter((e) => e.phase === phaseIndex);
}

// suiviByElement : { [elementId]: { disponibilite, document, observations, ... } }
export function computeProgress(suiviByElement) {
  let done = 0;
  LOTISSEMENT_ELEMENTS.forEach((el) => {
    const rec = suiviByElement[el.id];
    if (rec && (rec.disponibilite === "Disponible" || rec.disponibilite === "Non applicable")) done++;
  });
  const pct = LOTISSEMENT_TOTAL ? Math.round((done / LOTISSEMENT_TOTAL) * 100) : 0;
  return { done, pct };
}

export function computePhaseProgress(phaseIndex, suiviByElement) {
  const els = getPhaseElements(phaseIndex);
  let done = 0;
  els.forEach((el) => {
    const rec = suiviByElement[el.id];
    if (rec && (rec.disponibilite === "Disponible" || rec.disponibilite === "Non applicable")) done++;
  });
  const pct = els.length ? Math.round((done / els.length) * 100) : 0;
  return { done, total: els.length, pct, cloturee: els.length > 0 && done === els.length };
}

export function formatDateFR(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

export function isLate(lot) {
  const today = new Date().toISOString().slice(0, 10);
  return lot.statut !== "Terminé" && !!lot.date_fin_prevue && lot.date_fin_prevue < today;
}

export function displayStatut(lot) {
  return isLate(lot) ? "En retard" : lot.statut;
}

// Classes Tailwind pour le badge de statut
export function statutBadgeClass(lot) {
  if (isLate(lot)) return "bg-red-100 text-red-700 border-red-300";
  switch (lot.statut) {
    case "Terminé":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "Suspendu":
      return "bg-slate-200 text-slate-600 border-slate-300";
    default:
      return "bg-amber-100 text-amber-700 border-amber-300";
  }
}

// Couleur de la barre de progression (hex) — utilisée pour la bordure haute des cartes
export function statusColor(lot) {
  if (isLate(lot)) return "#dc2626";
  switch (lot.statut) {
    case "Terminé":
      return "#10b981";
    case "Suspendu":
      return "#94a3b8";
    default:
      return "#4A6CF7";
  }
}