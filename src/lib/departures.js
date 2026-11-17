// Gestion des fins de contrat et des départs (Gestion du personnel › Départs).
//
// Principe : chaque fin de contrat se termine par une DÉCISION tracée, jamais par une désactivation silencieuse.
//   - « À venir »   : contrat à durée limitée (CDD, CDDTI, prestation, stage) qui se termine dans 30 jours ou moins ;
//   - « À statuer » : date de fin passée sans décision, ou fiche inactive sans motif de départ ;
//   - « Partis »    : départ enregistré (date + motif), consultable et réversible (réintégration).
// Les décisions (renouvellement, départ, réintégration) sont ajoutées à contract_history.
import { base44 } from "@/api/base44Client";
import { invalidateEmployees } from "@/lib/rhSession";

export const DEPARTURE_REASONS = [
  { value: "fin_contrat", label: "Fin de contrat", hint: "CDD, CDDTI ou prestation arrivé à échéance" },
  { value: "fin_stage", label: "Fin de stage", hint: "Stage arrivé à échéance, non renouvelé" },
  { value: "licenciement", label: "Licenciement" },
  { value: "rupture_conventionnelle", label: "Rupture conventionnelle" },
  { value: "demission", label: "Démission" },
  { value: "deces", label: "Décès" },
  { value: "autre", label: "Autre" }
];
export const reasonLabel = (v) => (DEPARTURE_REASONS.find((r) => r.value === v) || {}).label || "Motif non renseigné";

export const HISTORY_LABELS = {
  embauche: "Embauche",
  renouvellement: "Renouvellement",
  changement_contrat: "Changement de contrat",
  depart: "Départ",
  reintegration: "Réintégration"
};

export const SOON_DAYS = 30;
/** Périmètre commun dashboard / Départs : CDD, CDDTI et stages actifs à J+30. */
export function upcomingEndCounts(employees = []) {
  const cdd = [], interns = [];
  for (const emp of employees) {
    if (!emp?.is_active || isOfficeAccount(emp)) continue;
    const days = daysUntil(endDateOf(emp));
    if (days === null || days < 0 || days > SOON_DAYS) continue;
    if (isIntern(emp)) interns.push(emp);
    else if (["CDD", "CDDTI"].includes(emp.contract_type)) cdd.push(emp);
  }
  return { cdd, interns, total: cdd.length + interns.length };
}


// Comptes de bureau (terminaux) : jamais concernés par les départs
const OFFICE_EMAILS = ["abidjan.cgesn@gmail.com", "moussneko@gmail.com", "yakro.cgesn@gmail.com", "bouafle.cgesn@gmail.com", "sinfra.cgesn@gmail.com", "daloa.cgesn@gmail.com", "issia.cgesn@gmail.com"];
export const isOfficeAccount = (emp) => OFFICE_EMAILS.includes(String(emp?.email || "").toLowerCase());

export const isIntern = (emp) => !!(emp && emp.internship_type);
const LIMITED = ["CDD", "CDDTI", "Prestation"];

/** Date de fin du contrat en cours (null pour un CDI ou une date inconnue). */
export function endDateOf(emp) {
  if (!emp) return null;
  if (isIntern(emp)) return emp.internship_end_date || null;
  if (LIMITED.includes(emp.contract_type)) return emp.contract_end_date || null;
  return null;
}

export function contractLabel(emp) {
  if (isIntern(emp)) return `Stage · ${emp.internship_type}`;
  return emp?.contract_type || "CDI";
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const t = startOfDay(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - startOfDay(today).getTime()) / 86400000);
}

/** Étape du cycle de vie : "parti" | "a_statuer" | "a_venir" | "actif" */
export function lifecycleOf(emp, today = new Date()) {
  if (!emp || isOfficeAccount(emp)) return "actif";
  if (emp.is_active === false) return emp.departure_reason ? "parti" : "a_statuer";
  const days = daysUntil(endDateOf(emp), today);
  if (days === null) return "actif";
  if (days < 0) return "a_statuer";
  if (days <= SOON_DAYS) return "a_venir";
  return "actif";
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const pushHistory = (emp, entry) => [...(Array.isArray(emp.contract_history) ? emp.contract_history : []), { date: todayIso(), ...entry }];

// Comptes du portail reliés à la fiche (e-mail de connexion, personnel ou professionnel)
async function linkedAccounts(emp) {
  const emails = [emp.email, emp.personal_email, emp.email_pro].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return [];
  try {
    const users = await base44.entities.User.list("-created_date", 1000);
    return (users || []).filter((u) => emails.includes(String(u.email || "").toLowerCase()));
  } catch {
    return [];
  }
}

/** Suspend (ou réactive) les comptes portail de la fiche. Les administrateurs ne sont jamais suspendus. */
async function setAccountsStatus(emp, statut) {
  const accounts = await linkedAccounts(emp);
  const done = [];
  const skipped = [];
  for (const u of accounts) {
    if (statut === "suspendu" && (u.role === "admin" || u.super_admin)) { skipped.push(u.email); continue; }
    if ((u.statut || "actif") === statut) continue;
    try {
      await base44.functions.invoke("updateUserAccess", { user_id: u.id, statut });
      done.push(u.email);
    } catch {
      skipped.push(u.email);
    }
  }
  return { done, skipped };
}

/** Enregistre un départ : fiche inactive, motif, date, historique, compte portail suspendu. */
export async function recordDeparture(emp, { date, reason, notes }, by) {
  const patch = {
    is_active: false,
    is_favorite: false,
    departure_date: date,
    departure_reason: reason,
    departure_notes: notes || "",
    departure_recorded_by: by || "",
    departure_recorded_at: new Date().toISOString(),
    contract_history: pushHistory(emp, {
      action: "depart",
      contract_type: emp.contract_type || "",
      internship_type: emp.internship_type || "",
      end_date: date,
      reason,
      notes: notes || "",
      by: by || ""
    })
  };
  await base44.entities.Employee.update(emp.id, patch); invalidateEmployees();
  const accounts = await setAccountsStatus(emp, "suspendu");
  return { patch, accounts };
}

/**
 * Renouvelle ou fait évoluer le contrat : nouvelle date de fin, éventuellement nouveau type
 * (ex. stage → CDD, CDD → CDI). La fiche redevient active et le compte portail est réactivé.
 */
export async function renewContract(emp, { kind, internshipType, startDate, endDate, notes }, by) {
  const wasIntern = isIntern(emp);
  const toIntern = kind === "Stage";
  const changed = toIntern ? !wasIntern || internshipType !== emp.internship_type : wasIntern || kind !== emp.contract_type;
  const patch = {
    is_active: true,
    is_favorite: false,
    departure_date: null,
    departure_reason: null,
    departure_notes: null,
    departure_recorded_by: null,
    departure_recorded_at: null
  };
  if (toIntern) {
    Object.assign(patch, {
      contract_type: "Stage",
      internship_type: internshipType || emp.internship_type || "PERFECTIONNEMENT",
      internship_start_date: startDate || emp.internship_start_date || null,
      internship_end_date: endDate,
      socio_professional_category: "Stagiaire"
    });
  } else {
    Object.assign(patch, {
      contract_type: kind,
      contract_end_date: kind === "CDI" ? null : endDate,
      internship_type: null,
      internship_start_date: null,
      internship_end_date: null,
      internship_office: null
    });
    if (wasIntern) {
      // Passage de stagiaire à salarié : nouvelle date d'embauche, catégorie à préciser sur la fiche
      patch.hire_date = startDate || todayIso();
      if (emp.socio_professional_category === "Stagiaire") patch.socio_professional_category = "Non renseigné";
    }
  }
  patch.contract_history = pushHistory(emp, {
    action: changed ? "changement_contrat" : "renouvellement",
    contract_type: patch.contract_type,
    internship_type: patch.internship_type || "",
    start_date: startDate || "",
    end_date: kind === "CDI" ? "" : endDate,
    notes: notes || "",
    by: by || ""
  });
  await base44.entities.Employee.update(emp.id, patch); invalidateEmployees();
  const accounts = await setAccountsStatus(emp, "actif");
  return { patch, accounts };
}

/** Annule un départ enregistré par erreur. */
export async function reinstate(emp, notes, by) {
  const patch = {
    is_active: true,
    departure_date: null,
    departure_reason: null,
    departure_notes: null,
    departure_recorded_by: null,
    departure_recorded_at: null,
    contract_history: pushHistory(emp, { action: "reintegration", reason: emp.departure_reason || "", notes: notes || "", by: by || "" })
  };
  await base44.entities.Employee.update(emp.id, patch); invalidateEmployees();
  const accounts = await setAccountsStatus(emp, "actif");
  return { patch, accounts };
}
