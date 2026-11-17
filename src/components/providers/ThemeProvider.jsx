import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { KEYS } from "@/lib/cgesnData";

/**
 * Thème global du portail.
 * - Sans choix enregistré, le thème suit le réglage clair / sombre de l'appareil, y compris s'il change.
 * - Le bouton « Mode sombre » enregistre un choix explicite, qui prime ensuite sur l'appareil.
 * - Les pages à l'identité visuelle fixe (accueil, connexion, documents imprimables, etc.)
 *   n'ont pas de variante sombre : elles restent toujours en clair.
 * - L'impression et les PDF navigateur se font toujours en clair.
 */
const QUERY = "(prefers-color-scheme: dark)";

const LIGHT_ONLY_PATHS = [
  "/bienvenue", "/connexion", "/inscription", "/forgot-password", "/reset-password",
  "/administration", "/politique", "/conditions", "/consentement", "/mes-donnees",
  "/coprociv", "/csst", "/assistance/suivi",
  "/board/activitespdf", "/board/rapportpdf",
  "/ecadastre/rapportcollecte",
];

export const isLightOnlyPath = (pathname) => {
  const path = String(pathname || "/").toLowerCase();
  return path === "/" || LIGHT_ONLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`) || (p.includes("rapportcollecte") && path.startsWith(p)));
};

const readStored = () => {
  try {
    const value = localStorage.getItem(KEYS.darkMode);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch (e) { /* stockage indisponible : on suit l'appareil */ }
  return null;
};

const systemPrefersDark = () => {
  try { return window.matchMedia(QUERY).matches; } catch (e) { return false; }
};

const ThemeContext = createContext({ isDark: false, toggleDarkMode: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const { pathname } = useLocation();
  const [stored, setStored] = useState(readStored);
  const [system, setSystem] = useState(systemPrefersDark);

  useEffect(() => {
    let media;
    try { media = window.matchMedia(QUERY); } catch (e) { return undefined; }
    const onChange = (e) => setSystem(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isDark = stored ?? system;
  const applied = isDark && !isLightOnlyPath(pathname);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", applied);
    const onBeforePrint = () => root.classList.remove("dark");
    const onAfterPrint = () => root.classList.toggle("dark", applied);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [applied]);

  const toggleDarkMode = useCallback(() => {
    const next = !isDark;
    setStored(next);
    try { localStorage.setItem(KEYS.darkMode, next ? "1" : "0"); } catch (e) { /* choix valable pour la session */ }
  }, [isDark]);

  const value = useMemo(() => ({ isDark, toggleDarkMode }), [isDark, toggleDarkMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
