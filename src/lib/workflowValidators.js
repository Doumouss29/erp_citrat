// Configuration des validateurs du workflow RH (congés / absences / activités).
// Stockée dans l'entité ConfigurationApp (cle = "workflow_validators") et modifiable
// depuis la page Administration. Aucun e-mail de validateur n'est codé en dur.
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { isRhAssistant } from "@/lib/rhAccess";

export const WORKFLOW_VALIDATORS_KEY = "workflow_validators";
const CACHE_KEY = "cgesn_workflow_validators";
const UPDATE_EVENT = "cgesn-workflow-validators-updated";

export const EMPTY_WORKFLOW_VALIDATORS = { level1: [], level2: null, level3: null, direct_level2: [], read_only: [], level1_by_employee: [] };

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) || null : null;
  } catch (e) {
    return null;
  }
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value || EMPTY_WORKFLOW_VALIDATORS));
  } catch (e) {
    // ignore
  }
}

function coerce(value) {
  const v = value || {};
  const rows = Array.isArray(v.level1) ? v.level1 : [];
  const person = (p) =>
    p && String(p.email || "").trim()
      ? { nom: String(p.nom || "").trim(), email: String(p.email || "").trim() }
      : null;
  return {
    level1: rows
      .filter((e) => e && String(e.email || "").trim())
      .map((e) => ({
        localite: String(e.localite || "").trim(),
        departement: String(e.departement || "").trim(),
        nom: String(e.nom || "").trim(),
        email: String(e.email || "").trim(),
        actif: e.actif !== false
      })),
    level2: person(v.level2),
    level3: person(v.level3),
    // Personnes sans validateur de bureau (ex. coordinateur) : circuit RH puis DG.
    // Les validateurs de bureau suivent déjà ce circuit pour leurs propres demandes.
    direct_level2: (Array.isArray(v.direct_level2) ? v.direct_level2 : [])
      .filter((e) => e && String(e.email || "").trim())
      .map((e) => ({
        nom: String(e.nom || "").trim(),
        email: String(e.email || "").trim(),
        // Code salarié : la personne reste reconnue même si son adresse change
        employee_code: String(e.employee_code || "").trim().toUpperCase(),
        actif: e.actif !== false
      })),
    // Comptes en lecture seule (ex. assistante RH) : consultent les validations,
    // mais ne peuvent ni approuver ni refuser, même avec le rôle administrateur.
    read_only: (Array.isArray(v.read_only) ? v.read_only : [])
      .filter((e) => e && String(e.email || "").trim())
      .map((e) => ({ nom: String(e.nom || "").trim(), email: String(e.email || "").trim() })),
    // Agents dont le validateur Niveau 1 ne découle pas de leur bureau ni de leur département.
    level1_by_employee: (Array.isArray(v.level1_by_employee) ? v.level1_by_employee : [])
      .filter((e) => e && String(e.employee_code || "").trim() && String(e.email || "").trim())
      .map((e) => ({
        employee_code: String(e.employee_code || "").trim().toUpperCase(),
        nom: String(e.nom || "").trim(),
        email: String(e.email || "").trim()
      }))
  };
}

// Configuration brute (avec l'id du record) telle qu'enregistrée.
export async function fetchWorkflowValidatorsConfig() {
  const list = await base44.entities.ConfigurationApp.filter({ cle: WORKFLOW_VALIDATORS_KEY });
  const record = (list && list[0]) || null;
  return { id: record ? record.id : null, value: coerce(record ? record.valeur : null) };
}

// Enregistre les validateurs (réservé aux administrateurs via la RLS de ConfigurationApp).
export async function saveWorkflowValidators(value) {
  const clean = coerce(value);
  const { id } = await fetchWorkflowValidatorsConfig();
  if (id) {
    await base44.entities.ConfigurationApp.update(id, { valeur: clean });
  } else {
    await base44.entities.ConfigurationApp.create({
      cle: WORKFLOW_VALIDATORS_KEY,
      valeur: clean,
      description: "Validateurs du workflow RH (Niveau 1 par bureau, RH Niveau 2, DG Niveau 3)"
    });
  }
  writeCache(clean);
  try {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: clean }));
  } catch (e) {
    // ignore
  }
  return clean;
}

// Validateur Niveau 1 selon le bureau (et le département pour Abidjan).
// La localité "__default__" sert de repli quand aucun bureau ne correspond.
export function resolveLevel1Approver(validators, location, department, employeeCode) {
  const code = normalize(employeeCode);
  const personal = code ? ((validators && validators.level1_by_employee) || []).find((e) => normalize(e.employee_code) === code) : null;
  if (personal) return { name: personal.nom, email: personal.email };
  const list = (validators && validators.level1) || [];
  const loc = normalize(location);
  const dept = normalize(department);
  const active = list.filter((e) => e && e.actif !== false);
  let match = dept
    ? active.find((e) => normalize(e.localite) === loc && normalize(e.departement) === dept)
    : null;
  if (!match) match = active.find((e) => normalize(e.localite) === loc && !normalize(e.departement));
  // Département seul (ex. bureau « CAG SECRETARIAT » → validateur du secrétariat)
  if (!match && dept) match = active.find((e) => normalize(e.departement) === dept);
  if (!match) match = active.find((e) => normalize(e.localite) === "__default__");
  // Repli de l'ancienne application : validateur général d'Abidjan
  if (!match) match = active.find((e) => normalize(e.localite) === "abidjan" && !normalize(e.departement));
  return { name: match?.nom || "", email: match?.email || "" };
}

export function isLevel1Validator(validators, user) {
  const email = normalize(user?.email);
  if (!email) return false;
  const list = (validators && validators.level1) || [];
  return list.some((e) => e && e.actif !== false && normalize(e.email) === email);
}

export function isReadOnlyValidator(validators, user) {
  if (isRhAssistant(user)) return true;
  const email = normalize(user?.email);
  if (!email) return false;
  return ((validators && validators.read_only) || []).some((e) => e && normalize(e.email) === email);
}

export function getLevel2Validator(validators) {
  const v = validators && validators.level2;
  return v && v.email ? v : null;
}

export function getLevel3Validator(validators) {
  const v = validators && validators.level3;
  return v && v.email ? v : null;
}

// Niveau de validation de l'utilisateur courant ("admin", "level1", "level2", "level3" ou null).
export function resolveUserWorkflowLevel(validators, user) {
  if (!user) return null;
  if (user.role === "admin") return "admin";
  // Assistante RH : voit toutes les demandes, sans aucun droit de décision.
  if (isRhAssistant(user)) return "read_only";
  const email = normalize(user.email);
  if (!email) return null;
  const l2 = getLevel2Validator(validators);
  if (l2 && normalize(l2.email) === email) return "level2";
  const l3 = getLevel3Validator(validators);
  if (l3 && normalize(l3.email) === email) return "level3";
  if (isLevel1Validator(validators, user)) return "level1";
  return null;
}

let inflight = null;

// Chargement partagé (dédupliqué) ; repli sur le cache local en cas d'erreur.
export async function loadWorkflowValidators() {
  if (!inflight) {
    inflight = fetchWorkflowValidatorsConfig()
      .then((r) => {
        writeCache(r.value);
        return r.value;
      })
      .catch(() => readCache() || EMPTY_WORKFLOW_VALIDATORS)
      .finally(() => {
        setTimeout(() => {
          inflight = null;
        }, 0);
      });
  }
  return inflight;
}

// Hook : valeur mise en cache immédiatement, puis rafraîchie depuis la base.
export function useWorkflowValidators() {
  const [validators, setValidators] = useState(() => readCache() || EMPTY_WORKFLOW_VALIDATORS);

  useEffect(() => {
    let active = true;
    loadWorkflowValidators().then((value) => {
      if (active) setValidators(value);
    });
    const onUpdate = (e) => setValidators(coerce(e.detail));
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => {
      active = false;
      window.removeEventListener(UPDATE_EVENT, onUpdate);
    };
  }, []);

  return validators;
}