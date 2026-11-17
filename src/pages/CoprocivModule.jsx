import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Coprociv from '@/pages/Coprociv';
import '@/styles/coprociv.css';

// COPROCIV dans le portail CGESN : réservé aux comptes connectés ayant l'accès « COPROCIV »
// (contrôlé en amont par RequireAppAccess). Le module garde sa propre mise en page et ses thèmes.
const FONTS_ID = 'coprociv-fonts';
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap';

export default function CoprocivModule() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  // Icône d'onglet et titre du portail, relevés avant que le module n'applique les siens
  // (les effets des composants enfants s'exécutent avant ceux du parent).
  const prev = useRef(null);
  if (prev.current === null && typeof document !== 'undefined') {
    const ic = document.querySelector('link[rel="icon"]');
    prev.current = { icon: ic ? ic.getAttribute('href') : null, title: document.title };
  }

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) navigate('/connexion', { replace: true });
  }, [isLoadingAuth, isAuthenticated, navigate]);

  // Polices du module (chargées une seule fois) ; icône d'onglet et titre rétablis en quittant le module.
  useEffect(() => {
    if (!document.getElementById(FONTS_ID)) {
      const l = document.createElement('link');
      l.id = FONTS_ID; l.rel = 'stylesheet'; l.href = FONTS_URL;
      document.head.appendChild(l);
    }
    const { icon: prevIcon, title: prevTitle } = prev.current || {};
    document.title = 'COPROCIV — Portail Digital CGESN';
    return () => {
      const icon = document.querySelector('link[rel="icon"]');
      if (icon && prevIcon) icon.setAttribute('href', prevIcon);
      if (prevTitle) document.title = prevTitle;
    };
  }, []);

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="cp-root">
      <Coprociv />
    </div>
  );
}
