import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { MenuButton, MenuDrawer, MenuItem, MenuSection } from "@/components/cgesn/PortalMenu";

const DEFAULT_ITEMS = [{ label: "Retour au portail", to: "/portail" }];

function Switch({ on }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex h-6 w-11 flex-none rounded-full transition-colors ${on ? "bg-[#0f5c52]" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </span>
  );
}

/**
 * Menu de l'en-tête vert du portail (mobile) : bouton officiel + menu latéral officiel.
 * items : [{ label, to?, onSelect?, icon?, toggle?: boolean (interrupteur), danger?: true (placé en pied, en rouge) }]
 * user  : { name, email } — carte d'identité en tête du menu
 */
export default function BrandMobileMenu({ items = DEFAULT_ITEMS, user }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = () => setOpen(false);
  const main = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);
  const initials = user?.initials || (user?.name || user?.email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="cgesn-brand-mobile-actions">
      <MenuButton onDark open={open} onClick={() => setOpen((o) => !o)} />
      <MenuDrawer open={open} onClose={close}>
        {user && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <span className="w-11 h-11 rounded-full bg-[oklch(0.82_0.15_80)] text-[#0d3b3f] flex items-center justify-center text-sm font-bold flex-none">{initials}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900 truncate">{user.name || "Utilisateur"}</span>
              {user.email && <span className="block text-xs text-slate-500 truncate">{user.email}</span>}
            </span>
          </div>
        )}
        {user && <MenuSection>Réglages</MenuSection>}
        {main.map((item) =>
          item.to ? (
            <MenuItem key={item.label} to={item.to} icon={item.icon} active={location.pathname === item.to} onClick={close}>
              {item.label}
            </MenuItem>
          ) : (
            <MenuItem
              key={item.label}
              icon={item.icon}
              end={typeof item.toggle === "boolean" ? <Switch on={item.toggle} /> : undefined}
              onClick={() => {
                if (typeof item.toggle !== "boolean") close();
                item.onSelect?.();
              }}
            >
              {item.label}
            </MenuItem>
          )
        )}
        {/* Déconnexion juste sous les réglages (et non collée en bas du panneau) */}
        {danger.length > 0 && (
          <div className="mx-4 mt-2 pt-3 border-t border-slate-100">
            {danger.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { close(); item.onSelect?.(); }}
                className="w-full h-11 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100"
              >
                {item.icon ? <item.icon className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </MenuDrawer>
    </div>
  );
}
