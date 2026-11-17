import { useState, useEffect, useCallback } from "react";

/**
 * Détecte si l'app PWA est installable et fournit une fonction d'installation.
 * - Android/Chrome : l'événement `beforeinstallprompt` permet d'afficher une fenêtre native.
 * - iOS/Safari : pas d'événement ; on détecte l'appareil pour afficher des instructions manuelles.
 * - Desktop/autres : instructions génériques (ajouter à l'écran d'accueil / raccourci).
 * - Si l'app est déjà installée (mode standalone), aucune invite n'est proposée.
 * Le bouton s'affiche systématiquement tant que l'app n'est pas installée,
 * indépendamment du déclenchement de `beforeinstallprompt`.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Détection du mode standalone (app déjà installée)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // Détection iOS (Safari iPhone/iPad — pas de beforeinstallprompt)
    const ua = window.navigator.userAgent || "";
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Détection desktop (pas mobile)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsDesktop(!isMobile);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  // Le bouton s'affiche systématiquement tant que l'app n'est pas installée,
  // quelle que soit la plateforme. Le clic adapte le comportement :
  // prompt natif (Android/Chrome), instructions iOS, ou instructions desktop.
  const canInstall = !isInstalled;

  return { canInstall, isInstalled, isIOS, isDesktop, hasPrompt: !!deferredPrompt, install };
}