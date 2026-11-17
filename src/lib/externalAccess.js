// Comptes externes (prestataires, consultants) : ils sont reconnus à leur grade, jamais au seul
// type de contrat, afin qu'une fiche « Prestation » existante ne change pas de statut sans décision.
export const EXTERNAL_GRADES = ["prestataire", "consultant"];
export const EXTERNAL_CONTRACT = "Prestation";

export const isExternalUser = (user) => EXTERNAL_GRADES.includes(user?.grade);
export const isExternalEmployee = (employee) => employee?.contract_type === EXTERNAL_CONTRACT;

// Pages personnelles de l'espace RH réservées aux salariés et stagiaires.
export const RH_PAGES_HIDDEN_FOR_EXTERNALS = [
  "AbsencesConges", "Absences", "Conges", "Calendrier", "DeclarationActivite", "MissionsHistory",
];

// Jours restants avant la fin de mission (null si aucune date).
export function missionDaysLeft(endDate, today = new Date()) {
  if (!endDate) return null;
  const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end - start) / 86400000);
}

// Un administrateur n'est jamais bloqué : il doit pouvoir réactiver les comptes.
export const isAccountBlocked = (user) =>
  !!user && user.statut === "suspendu" && user.role !== "admin" && !user.super_admin;
