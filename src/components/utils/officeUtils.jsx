import { base44 } from "@/api/base44Client";

// Comptes bureaux (terminaux de pointage partagés).
// Pour le moment, les bureaux se connectent avec leurs adresses Gmail (pas d'adresse pro @cgesn.com).
// Source : l'entité OfficeTerminal, gérée depuis Administration → Bureaux ; la liste ci-dessous
// sert de filet de sécurité tant que l'annuaire n'est pas chargé.
// Un compte bureau, actif ou non, ne voit jamais que la page de pointage.
export const OFFICE_ACCOUNTS = {};

// Normalise un e-mail : minuscules, sans espaces ni accents
export const normalizeEmail = (email) =>
  String(email || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const LEGACY = Object.fromEntries(Object.entries(OFFICE_ACCOUNTS).map(([k, v]) => [normalizeEmail(k), v]));

// Annuaire chargé depuis la base (email normalisé → fiche bureau, actifs ET inactifs)
let directory = new Map();
let loadingPromise = null;

export function loadOfficeDirectory(force = false) {
  if (loadingPromise && !force) return loadingPromise;
  loadingPromise = base44.entities.OfficeTerminal.list("office_name", 200)
    .then((rows) => {
      const map = new Map();
      (rows || []).forEach((t) => {
        if (t?.email) map.set(normalizeEmail(t.email), t);
      });
      directory = map;
      return map;
    })
    .catch((e) => {
      console.error("Chargement des bureaux impossible :", e);
      loadingPromise = null;
      return directory;
    });
  return loadingPromise;
}

// Vérifie (sans attendre) si un email correspond à un compte bureau
export const isOfficeAccount = (email) => {
  const e = normalizeEmail(email);
  if (!e) return false;
  return directory.has(e);
};

// Version fiable : attend l'annuaire avant de répondre
export async function isOfficeAccountAsync(email) {
  await loadOfficeDirectory();
  return isOfficeAccount(email);
}

// Nom du bureau à partir de l'email
export const getOfficeName = (email) => {
  const e = normalizeEmail(email);
  if (!e) return null;
  if (directory.has(e)) return directory.get(e).office_name;
  return null;
};

// Fiche complète du bureau connecté (nom, localisation, statut actif…)
export async function resolveOffice(email) {
  await loadOfficeDirectory();
  const e = normalizeEmail(email);
  if (directory.has(e)) return directory.get(e);
  const name = getOfficeName(email);
  return name ? { office_name: name } : null;
}
