import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import usePortalAppIcon from '@/hooks/usePortalAppIcon';
import PortalReturnButton from '@/components/cgesn/PortalReturnButton';

const DEFAULT_LOGO = "https://base44.app/api/apps/6aa96886350e13fe6882c8af/files/mp/public/6aa96886350e13fe6882c8af/2e88b302a_HSEPRESFOR.webp";

// Couleurs de marque HSE-PRESFOR (issues du logo)
export const HSE_TEAL = '#0b5f5a';
export const HSE_ORANGE = '#c2580c';

// Styles de boutons partagés par toutes les pages du registre
export const hseBtnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#c2580c] hover:bg-[#9a4200] text-white text-sm font-semibold px-4 py-2 shadow-sm transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2580c]";
export const hseBtnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed";
export const hseIcon = "w-4 h-4 text-[#0b5f5a]";

/**
 * En-tête commun des pages du registre HSE-PRESFOR.
 * - backTo : affiche un lien « Retour au registre » au-dessus du titre (pages secondaires)
 * - showPortal : affiche le bouton « Retour au portail » (page principale uniquement)
 * - actions : boutons alignés à droite du titre
 * - children : menu centré sous le titre
 */
export default function HSEPageHeader({ title, subtitle, backTo, showPortal = false, actions, children }) {
  const appLogo = usePortalAppIcon('hse', DEFAULT_LOGO);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
      <header className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${HSE_TEAL} 0%,${HSE_TEAL} 55%,${HSE_ORANGE} 100%)` }} />
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
          {backTo && (
            <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0b5f5a] mb-3 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au registre
            </Link>
          )}
          {/* Page principale : barre d'outils — titre à gauche, actions regroupées à droite
              (action principale en dernier sur grand écran, en premier et pleine largeur sur mobile). */}
          {showPortal && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-slate-500 leading-snug mt-0.5">{subtitle}</p>}
              </div>
              {children && (
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:justify-end md:flex-shrink-0 [&>*]:w-full md:[&>*]:w-auto">
                  {children}
                </div>
              )}
            </div>
          )}

          {!showPortal && (
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 leading-snug truncate">{subtitle}</p>
              )}
            </div>
            {actions && <div className="hidden sm:flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
          )}

          {/* Mobile : actions de la page en pleine largeur sous le titre */}
          {actions && (
            <div className="sm:hidden mt-3 grid grid-cols-2 gap-2 [&>*]:w-full [&>*:only-child]:col-span-2">
              {actions}
            </div>
          )}

          {/* Menu : grille 2 colonnes sur mobile (action principale en pleine largeur), centré sur grand écran */}
          {children && !showPortal && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center [&>*]:w-full sm:[&>*]:w-auto [&>*:first-child]:col-span-2 [&>*:last-child:nth-child(even)]:col-span-2 max-sm:[&>*]:whitespace-normal max-sm:[&>*]:text-center max-sm:[&>*]:leading-tight max-sm:[&>*]:px-3 max-sm:[&>*]:py-2.5 max-sm:[&>*]:text-[13px]">
                {children}
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
