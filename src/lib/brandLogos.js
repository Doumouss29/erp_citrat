// Logos du portail modifiables depuis la page Administration.
// Stockés dans l'entité ConfigurationApp (cle = "logos_portail", valeur = { header, login }).
// Une valeur vide = logo par défaut ci-dessous.
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export const BRAND_LOGOS_KEY = "logos_portail";
const CACHE_KEY = "citrat_logos_portail_v1";
const UPDATE_EVENT = "citrat-logos-updated";

export const DEFAULT_BRAND_LOGOS = {
  header: "/logo-citrat.svg",
  login: "/logo-citrat.svg"
};

export const BRAND_LOGO_SLOTS = [
  { key: "header", label: "Logo de l'en-tête", hint: "Affiché sur fond bleu (portail, administration, pages légales)." },
  { key: "login", label: "Logo de connexion", hint: "Affiché sur fond blanc (connexion, mot de passe oublié)." }
];

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (e) {
    return {};
  }
}

function writeCache(value) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(value || {})); } catch (e) {}
}

let inflight = null;

// Charge la configuration brute (avec l'id de l'entité) depuis la base.
export async function fetchBrandLogosConfig() {
  const list = await base44.entities.ConfigurationApp.filter({ cle: BRAND_LOGOS_KEY });
  const record = (list && list[0]) || null;
  const value = (record && record.valeur) || {};
  writeCache(value);
  return { id: record ? record.id : null, value };
}

// Enregistre les logos (réservé aux administrateurs via la RLS de ConfigurationApp).
export async function saveBrandLogos(value) {
  const clean = {};
  BRAND_LOGO_SLOTS.forEach(({ key }) => { clean[key] = (value[key] || "").trim(); });
  const { id } = await fetchBrandLogosConfig();
  if (id) {
    await base44.entities.ConfigurationApp.update(id, { valeur: clean });
  } else {
    await base44.entities.ConfigurationApp.create({
      cle: BRAND_LOGOS_KEY,
      valeur: clean,
      description: "Logos du portail CITRAT (en-tête et page de connexion)"
    });
  }
  writeCache(clean);
  try { window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: clean })); } catch (e) {}
  return clean;
}

function resolve(value) {
  return {
    header: (value && value.header) || DEFAULT_BRAND_LOGOS.header,
    login: (value && value.login) || DEFAULT_BRAND_LOGOS.login
  };
}

// Hook : renvoie { header, login } avec repli sur les logos par défaut.
export function useBrandLogos() {
  const [logos, setLogos] = useState(() => resolve(readCache()));

  useEffect(() => {
    let active = true;
    if (!inflight) {
      inflight = fetchBrandLogosConfig()
        .then((r) => r.value)
        .catch(() => readCache())
        .finally(() => { setTimeout(() => { inflight = null; }, 0); });
    }
    inflight.then((value) => { if (active) setLogos(resolve(value)); });
    const onUpdate = (e) => setLogos(resolve(e.detail));
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => {
      active = false;
      window.removeEventListener(UPDATE_EVENT, onUpdate);
    };
  }, []);

  return logos;
}
