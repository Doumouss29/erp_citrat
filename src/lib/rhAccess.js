// Accès à l'espace RH du portail.
// Le grade « assistante_rh » ouvre les pages RH sans le rôle administrateur : il ne donne
// aucun droit sur le reste du portail et aucun droit de décision sur les demandes.
// Le grade n'est modifiable que par un administrateur (règles de l'entité User).
export const RH_ASSISTANT_GRADE = "assistante_rh";

export const isRhAssistant = (user) => user?.grade === RH_ASSISTANT_GRADE;

export const canAccessRh = (user) => user?.role === "admin" || isRhAssistant(user);

// Champs réservés aux administrateurs : soldes (décomptés par le circuit de validation),
// accès au portail et liens de synchronisation. Retirés des enregistrements de l'assistante.
const ADMIN_ONLY_EMPLOYEE_FIELDS = [
  "absence_days_used", "carried_forward_days", "december_on_call_days",
  "remaining_december_days", "remaining_year_days",
  "portal_access", "portal_grade", "rh_id", "rh_synced_at",
];

export function employeeDataFor(user, data) {
  if (user?.role === "admin") return data;
  const clean = { ...data };
  ADMIN_ONLY_EMPLOYEE_FIELDS.forEach((field) => delete clean[field]);
  return clean;
}
