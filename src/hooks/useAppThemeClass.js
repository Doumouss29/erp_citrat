import { useEffect } from "react";

// Pose une classe de thème sur <html> tant que le composant est affiché (ex: "assistance-theme").
// Sur <html> plutôt que sur un conteneur : les menus déroulants et fenêtres modales sont rendus
// en dehors de l'appli et doivent quand même suivre ses couleurs.
export default function useAppThemeClass(className) {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add(className);
    return () => el.classList.remove(className);
  }, [className]);
}
