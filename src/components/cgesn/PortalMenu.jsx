/**
 * MENU OFFICIEL du Portail Digital CGESN — à utiliser dans TOUS les modules
 * (RH, Board, CSST, Assistance, e-Guide, e-Cadastre, HSE…). Ne pas recréer de menu à la main.
 *
 *  - MenuButton  : bouton hamburger officiel (carré arrondi vert marque, bordure claire, 3 traits).
 *                  onDark = posé sur un bandeau vert (fond translucide).
 *  - MenuDrawer  : panneau latéral droit (mobile) avec voile, en-tête « MENU » + croix.
 *  - MenuItem    : lien du menu ; actif = fond teint + barre à gauche dans la couleur de l'application ouverte.
 *  - MenuBadge   : pastille (ex. « RH »).
 *  - MenuSection : intertitre discret dans le menu.
 *  - MenuPortalLink : lien « Retour au portail » en pied de menu.
 */
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, X } from "lucide-react";

/* ---------- Bouton hamburger ---------- */

function Lines() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export const MenuButton = React.forwardRef(function MenuButton(
  { onDark = false, open = false, color, className = "", style, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      aria-expanded={open}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/25 text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        onDark ? "bg-white/10 hover:bg-white/20" : `${color ? "" : "bg-brand"} hover:brightness-110 shadow-sm`
      } ${className}`}
      style={!onDark && color ? { backgroundColor: color, ...style } : style}
      {...props}
    >
      {open ? <X size={20} strokeWidth={2} /> : <Lines />}
    </button>
  );
});

/* ---------- Éléments du menu ---------- */

export function MenuHeader({ onClose, label = "Menu" }) {
  return (
    <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 flex-shrink-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="inline-flex h-10 w-10 -mr-2 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export function MenuBadge({ children = "RH" }) {
  return (
    <span className="inline-flex items-center rounded-md bg-app/10 px-2.5 py-0.5 text-xs font-semibold text-app">
      {children}
    </span>
  );
}

export function MenuSection({ children }) {
  return (
    <div className="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</div>
  );
}

const itemClass = (active) =>
  `flex items-center gap-3 w-full text-left text-sm font-semibold transition-colors ${
    active ? "bg-app-soft text-slate-900" : "text-slate-600 hover:bg-slate-50"
  }`;
const itemStyle = (active) => ({
  padding: "14px 20px",
  borderLeft: `3px solid ${active ? "rgb(var(--app))" : "transparent"}`,
  textDecoration: "none",
});

/** Lien (to) ou action (onClick sans to). */
export function MenuItem({ to, icon: Icon, children, active = false, badge, onClick, end }) {
  const content = (
    <>
      {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-app" : "text-slate-500"}`} />}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {badge && <MenuBadge>{badge}</MenuBadge>}
      {end}
    </>
  );
  if (!to) {
    return (
      <button type="button" onClick={onClick} className={itemClass(active)} style={itemStyle(active)}>
        {content}
      </button>
    );
  }
  return (
    <Link to={to} onClick={onClick} aria-current={active ? "page" : undefined} className={itemClass(active)} style={itemStyle(active)}>
      {content}
    </Link>
  );
}

export function MenuPortalLink({ onClick, to = "/portail" }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-semibold border-t border-slate-200 flex-shrink-0 hover:bg-slate-50"
      style={{ padding: "14px 20px", color: "#0f5c52", textDecoration: "none" }}
    >
      <Home className="w-4 h-4" />
      Retour au portail
    </Link>
  );
}

/* ---------- Panneau mobile ---------- */

export function MenuDrawer({ open, onClose, children, footer, label = "Menu", topOffset = 0, className = "" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    // La page derrière le menu ne défile plus (pas de barre de défilement à côté du panneau)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-[1200]" onClick={onClose} aria-hidden="true" />}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`fixed right-0 bottom-0 w-72 max-w-[85vw] bg-white border-l border-slate-200 shadow-2xl z-[1201] flex flex-col transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        } ${className}`}
        style={{ top: topOffset, paddingTop: topOffset ? 0 : "env(safe-area-inset-top)" }}
      >
        <MenuHeader onClose={onClose} label={label} />
        <nav className="flex-1 overflow-y-auto">{children}</nav>
        {footer}
      </aside>
    </>
  );
}
