/**
 * Indicateurs du Portail Digital CGESN.
 *
 * StatGrid — grille qui choisit SEULE son nombre de colonnes selon la place disponible :
 *   autant de colonnes que possible, chacune d'au moins `min` px (1, 2, 3… colonnes).
 *   <StatGrid min={140}> … </StatGrid>
 *
 * StatCard — carte d'indicateur compacte, identique dans toutes les applications :
 *   icône + libellé (2 lignes max), valeur, légende ou lien d'action.
 *   <StatCard icon={Clock} label="Pointages" value={12} caption="Aujourd'hui" tone="blue" />
 *   onClick + action="Voir l'historique" → toute la carte devient un bouton.
 */
import React from "react";
import { ChevronRight } from "lucide-react";

const TONES = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   num: "text-blue-900" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", num: "text-orange-900" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  num: "text-green-900" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", num: "text-purple-900" },
  cyan:   { bg: "bg-cyan-50",   icon: "text-cyan-700",   num: "text-cyan-900" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  num: "text-amber-900" },
  red:    { bg: "bg-red-50",    icon: "text-red-600",    num: "text-red-900" },
  slate:  { bg: "bg-white",     icon: "text-slate-600",  num: "text-slate-900" },
};

export function autoGridStyle(min = 140) {
  return { gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` };
}

export function StatGrid({ min = 140, className = "", children }) {
  return (
    <div className={`grid gap-2 sm:gap-4 lg:gap-5 ${className}`} style={autoGridStyle(min)}>
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, caption, tone = "slate", onClick, action, className = "" }) {
  const t = TONES[tone] || TONES.slate;
  const body = (
    <>
      <div className="flex items-start gap-2 min-w-0">
        {Icon && <Icon className={`w-5 h-5 sm:w-6 sm:h-6 flex-none ${t.icon}`} strokeWidth={1.9} />}
        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug line-clamp-2">{label}</p>
      </div>
      <p className={`mt-2 text-2xl sm:text-3xl font-bold leading-none tabular-nums ${t.num}`}>{value}</p>
      {action ? (
        <p className={`mt-auto pt-2 text-xs font-semibold inline-flex items-center gap-0.5 ${t.icon}`}>
          {action}
          <ChevronRight className="w-3.5 h-3.5" />
        </p>
      ) : caption ? (
        <p className="mt-auto pt-2 text-xs text-slate-600 line-clamp-2">{caption}</p>
      ) : null}
    </>
  );
  const cls = `h-full min-w-0 flex flex-col text-left rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5 ${t.bg} ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default StatCard;
