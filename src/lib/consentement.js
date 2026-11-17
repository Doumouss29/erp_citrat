// Consentement à l'utilisation des données personnelles (nom, prénom, âge, téléphone, e-mail).
// Tant que l'utilisateur n'a pas accepté la version en vigueur de la notice, l'accès au portail
// et à toutes les applications est bloqué (voir ConsentGate dans App.jsx).
// Changer CONSENT_VERSION (et la date) quand la notice change : tout le monde devra re-valider.
import { base44 } from "@/api/base44Client";
import { isOfficeAccount } from "@/components/utils/officeUtils";

export const CONSENT_VERSION = "1";
export const CONSENT_UPDATED = "25/10/2026";

// Cadre légal (repris dans l'écran de consentement, la politique de confidentialité et le rapport PDF)
export const LEGAL_LAW = "Loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel";
export const LEGAL_FRAMEWORK = `${LEGAL_LAW} en Côte d'Ivoire, qui encadre le traitement des données personnelles par les organismes publics et privés.`;

// Textes de la notice (modifiables ici ; incrémenter CONSENT_VERSION après une modification de fond)
export const NOTICE = [
  { titre: "Responsable", texte: "Cabinet de Géomètre Expert Soro Nanga (CGESN)" },
  { titre: "Données concernées", texte: "Nom, prénom, date de naissance (âge), téléphone, adresse e-mail" },
  { titre: "Finalités", texte: "Vous identifier, vous contacter dans le cadre professionnel, gestion administrative et RH interne" },
  { titre: "Qui y a accès", texte: "Service RH, direction et administrateurs du portail. Aucune cession à des tiers." },
  { titre: "Durée de conservation", texte: "Pendant toute la durée de votre collaboration avec le CGESN, puis pendant la durée d'archivage prévue par la loi" },
  { titre: "Vos droits", texte: "Accès, rectification, suppression, retrait du consentement" },
];

// Pages accessibles sans consentement (connexion, pages légales, suivi public de ticket…)
const FREE_PATHS = [
  "/", "/bienvenue", "/connexion", "/inscription", "/login", "/register",
  "/forgot-password", "/reset-password", "/politique", "/conditions", "/consentement",
];
const FREE_PREFIXES = ["/assistance/suivi/"];

export function isConsentFreePath(pathname) {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  return FREE_PATHS.includes(p.toLowerCase()) || FREE_PREFIXES.some((x) => p.toLowerCase().startsWith(x));
}

// Comptes bureaux (terminaux de pointage partagés) : ce ne sont pas des personnes, pas de consentement.
export function isConsentExempt(user) {
  return !!user && isOfficeAccount(user.email);
}

export function hasValidConsent(user) {
  return !!user && String(user.consentement_version || "") === CONSENT_VERSION;
}

export function needsConsent(user) {
  return !!user && !isConsentExempt(user) && !hasValidConsent(user);
}

export function ageFromDate(d) {
  if (!d) return null;
  const b = new Date(d);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

// Fiche employé de l'utilisateur (pré-remplissage) — null si aucune
export async function findEmployeeFor(user) {
  if (!user?.email) return null;
  try {
    const list = await base44.entities.Employee.filter({ email: user.email });
    if (list && list[0]) return list[0];
    const lower = user.email.toLowerCase();
    if (lower !== user.email) {
      const l2 = await base44.entities.Employee.filter({ email: lower });
      if (l2 && l2[0]) return l2[0];
    }
  } catch (e) {
    // pas d'accès ou pas de fiche : on laisse l'utilisateur saisir
  }
  return null;
}

// Trace une décision dans le journal (preuve). Ne bloque jamais l'utilisateur en cas d'échec.
export async function logConsentDecision(user, decision, data = {}) {
  try {
    await base44.entities.ConsentementDonnees.create({
      user_email: user.email,
      user_name: [data.prenom, data.nom].filter(Boolean).join(" ") || user.full_name || "",
      decision,
      version: CONSENT_VERSION,
      nom: data.nom || "",
      prenom: data.prenom || "",
      date_naissance: data.date_naissance || undefined,
      telephone: data.telephone || "",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
    });
    return true;
  } catch (e) {
    console.error("Journal de consentement :", e);
    return false;
  }
}
