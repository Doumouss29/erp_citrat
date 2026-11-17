import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Logo d'une appli interne tel que défini dans l'administration du portail (PortalApp.icon).
// Retourne le logo personnalisé s'il existe, sinon le logo par défaut passé en paramètre.
// Le dernier logo connu est gardé en cache local pour éviter un clignotement au chargement.

const CACHE_PREFIX = "cgesn_app_icon_";
const memoryCache = {};
const pending = {};

function readCache(appId) {
  if (appId in memoryCache) return memoryCache[appId];
  try {
    const v = localStorage.getItem(CACHE_PREFIX + appId);
    return v === null ? undefined : v;
  } catch (e) {
    return undefined;
  }
}

function writeCache(appId, icon) {
  memoryCache[appId] = icon;
  try { localStorage.setItem(CACHE_PREFIX + appId, icon); } catch (e) {}
}

// Logo relu au plus toutes les 5 minutes (et non à chaque changement de page).
const ICON_TTL = 5 * 60 * 1000;
const fetchedAt = {};

function fetchIcon(appId) {
  if (!pending[appId] && appId in memoryCache && Date.now() - (fetchedAt[appId] || 0) < ICON_TTL) {
    return Promise.resolve(memoryCache[appId]);
  }
  if (!pending[appId]) {
    fetchedAt[appId] = Date.now();
    pending[appId] = base44.entities.PortalApp.filter({ app_id: appId })
      .then((list) => {
        const icon = (list && list[0] && list[0].icon) || "";
        writeCache(appId, icon);
        return icon;
      })
      .catch(() => readCache(appId) || "")
      .finally(() => { setTimeout(() => { delete pending[appId]; }, 0); });
  }
  return pending[appId];
}

export default function usePortalAppIcon(appId, defaultIcon) {
  const [icon, setIcon] = useState(() => readCache(appId) || "");

  useEffect(() => {
    let alive = true;
    fetchIcon(appId).then((v) => { if (alive) setIcon(v); });
    return () => { alive = false; };
  }, [appId]);

  return icon || defaultIcon;
}
