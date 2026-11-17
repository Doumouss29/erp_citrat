import { base44 } from "@/api/base44Client";

// Cache partagé RH-CGESN : l'utilisateur connecté et l'annuaire des employés étaient
// rechargés par le menu puis par chaque page. Ils sont maintenant chargés une fois,
// partagés entre les pages, et rafraîchis après un court délai.
//
// Le cache est lié au jeton de session : après une déconnexion ou un changement de compte,
// il repart de zéro.

const ME_TTL = 5 * 60 * 1000;      // 5 min
const EMPLOYEES_TTL = 60 * 1000;   // 1 min
const EMPLOYEES_LIMIT = 1000;      // le SDK plafonne à 50 par défaut

const sessionKey = () => {
  try {
    return localStorage.getItem("base44_access_token") || "";
  } catch {
    return "";
  }
};

const makeCache = (ttl, loader) => {
  let entry = null; // { key, at, promise }
  const get = ({ fresh = false } = {}) => {
    const key = sessionKey();
    if (!fresh && entry && entry.key === key && Date.now() - entry.at < ttl) return entry.promise;
    const promise = loader().catch((error) => {
      if (entry && entry.promise === promise) entry = null; // ne pas garder un échec
      throw error;
    });
    entry = { key, at: Date.now(), promise };
    return promise;
  };
  const invalidate = () => { entry = null; };
  return { get, invalidate };
};

const meCache = makeCache(ME_TTL, () => base44.auth.me());
const employeesCache = makeCache(EMPLOYEES_TTL, () =>
  base44.entities.Employee.list("-created_date", EMPLOYEES_LIMIT)
);

/** Utilisateur connecté (équivalent de base44.auth.me(), partagé entre les pages). */
export const getMe = (options) => meCache.get(options);
export const invalidateMe = () => meCache.invalidate();

/** Tous les employés (jusqu'à 1000), partagés entre les pages. Ne pas modifier le tableau renvoyé. */
export const getEmployees = (options) => employeesCache.get(options).then((list) => list || []);
/** À appeler après toute création / modification / suppression d'employé. */
export const invalidateEmployees = () => employeesCache.invalidate();

/** Fiche employé de l'utilisateur (par e-mail, sinon par matricule). */
export const findEmployeeFor = (user, employees) => {
  if (!user || !employees) return null;
  const email = user.email?.toLowerCase();
  return (
    employees.find(
      (emp) =>
        (email && emp.email?.toLowerCase() === email) ||
        (!!user.employee_code && emp.employee_code === user.employee_code)
    ) || null
  );
};

/** Utilisateur + sa fiche employé, en parallèle. */
export async function getMyEmployee(options) {
  const [user, employees] = await Promise.all([getMe(options), getEmployees(options)]);
  return { user, employees, employee: findEmployeeFor(user, employees) };
}
