import React from "react";

/**
 * En-tête commun des pages de l'espace RH (charte RH-CGESN : vert pétrole + doré).
 *
 * <RhPageHeader icon={Clock} title="Rapports de Pointage" mobileTitle="Pointages"
 *   subtitle="…" actions={<Button …/>}>
 *   {contenu optionnel sous le titre, ex. onglets}
 * </RhPageHeader>
 */
export const RH_GOLD = "#d4af6a";
export const RH_TEAL = "#0d5c66";
export const RH_GRADIENT = "linear-gradient(135deg,#0e4b53 0%,#0d5c66 45%,#006d79 100%)";

// Classes d'un onglet (TabsTrigger) posé dans le bandeau : verre, actif en doré
export const RH_TAB_CLASS =
  "rounded-xl px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all " +
  "bg-white/[0.07] ring-1 ring-white/10 text-white/80 hover:bg-white/15 hover:text-white " +
  "data-[state=active]:bg-[#d4af6a] data-[state=active]:text-[#0e4b53] data-[state=active]:ring-0 data-[state=active]:shadow-lg";

// Classes du conteneur d'onglets (TabsList) posé dans le bandeau
export const RH_TABLIST_CLASS = "bg-transparent p-0 h-auto w-full flex flex-wrap gap-2";

// Bouton d'action principal sur le bandeau
export const RH_ACTION_CLASS =
  "bg-[#0d5c66] hover:bg-[#0e4b53] text-white font-semibold rounded-xl shadow-sm ring-1 ring-[#d4af6a]/50 border-0";

export default function RhPageHeader({ icon: Icon, avatar, title, mobileTitle, actions, children, className = "" }) {
  // En-tête léger : uniquement l'icône et le titre (sur-titre et sous-titre retirés à la demande)
  return (
    <header className={`mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {avatar}
          {!avatar && Icon && (
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-none shadow-sm" style={{ background: RH_TEAL }}>
              <Icon className="w-5 h-5" style={{ color: RH_GOLD }} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: RH_TEAL }}>
              {mobileTitle ? (
                <>
                  <span className="sm:hidden">{mobileTitle}</span>
                  <span className="hidden sm:inline">{title}</span>
                </>
              ) : title}
            </h1>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
