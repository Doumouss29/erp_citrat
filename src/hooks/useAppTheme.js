import { useLayoutEffect } from "react";

// Pose data-app="<appId>" sur <html> tant que l'application est affichée.
// Les palettes de src/styles/app-themes.css s'appliquent alors à toute la page,
// y compris aux menus déroulants et fenêtres rendus hors de l'application.
// Plusieurs composants peuvent demander la même application (layout + coquille) : compteur.
const counts = {};

function apply() {
  const ids = Object.keys(counts).filter((k) => counts[k] > 0);
  const el = document.documentElement;
  if (ids.length) el.setAttribute("data-app", ids[ids.length - 1]);
  else el.removeAttribute("data-app");
}

export default function useAppTheme(appId) {
  useLayoutEffect(() => {
    if (!appId) return undefined;
    counts[appId] = (counts[appId] || 0) + 1;
    // l'application la plus récemment ouverte passe en dernier
    const n = counts[appId];
    delete counts[appId];
    counts[appId] = n;
    apply();
    return () => {
      counts[appId] = (counts[appId] || 1) - 1;
      if (counts[appId] <= 0) delete counts[appId];
      apply();
    };
  }, [appId]);
}
