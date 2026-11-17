import PageSuspense from "@/components/PageSuspense";
/**
 * COQUILLE COMMUNE des applications internes du Portail Digital CITRAT.
 * Chaque application garde SON logo et SA couleur (définis dans l'administration du portail) ;
 * le vert reste réservé à l'accueil du portail.
 *
 * Trois formats (seuils uniques du portail) :
 *   - Mobile     < 768 px      : barre du haut + onglets en bas (3 + « Plus » qui ouvre le menu complet)
 *   - Tablette   768–1 279 px  : barre du haut + hamburger ouvrant un menu latéral
 *   - Ordinateur ≥ 1 280 px    : barre du haut (fil d'Ariane) + barre latérale « MENU » de 264 px
 * Le hamburger est réservé aux tablettes (et aux mobiles sans onglets inférieurs).
 *
 * Props :
 *   appId     identifiant de l'application dans le portail (rhcgesn, cgesnboard, ecadastre, lotissement,
 *             assistancenum, csst, hse) → logo, nom et couleur officiels
 *   app       { code, name?, color? }  repli / surcharge (code = pastille si aucun logo)
 *   items     [{ title, short?, url, icon, badge?, section?, match?, exact? }]
 *             section = intertitre, match = préfixes d'URL des sous-pages, exact = comparer les ?paramètres
 *   tabs      [url, …]  3 entrées max pour les onglets mobiles
 *   actions   nœud React à droite de la barre (ex. cloche de notifications)
 *   children  contenu de la page
 */
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, LayoutGrid } from "lucide-react";
import { MenuButton, MenuDrawer, MenuHeader, MenuItem, MenuSection, MenuPortalLink } from "@/components/cgesn/PortalMenu";
import { APP_DEFS } from "@/lib/cgesnData";
import usePortalAppIcon from "@/hooks/usePortalAppIcon";
import useAppTheme from "@/hooks/useAppTheme";

export const PORTAL_GREEN = "#0C3D85";

const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
// Page active : URL exacte, ou l'un des préfixes de `match` (sous-pages d'une entrée)
const isOn = (item, path, full) =>
  (item.exact ? same(item.url, full) : same(item.url, path)) ||
  (item.match || []).some((p) => String(path || "").toLowerCase().startsWith(String(p).toLowerCase()));

// Fil d'Ariane : noms d'applications en casse harmonisée (sigles en capitales, le reste en minuscules)
const CRUMB_NAMES = {
  rhcgesn: "RH-CITRAT",
  cgesnboard: "CITRAT-Board",
  ecadastre: "e-Cadastre",
  lotissement: "e-Guide",
  assistancenum: "Assistance",
  csst: "CSST",
  hse: "HSE-Presfor",
  coprociv: "Coprociv",
  messagerie: "Messagerie",
};
const CRUMB_LINK = "text-white/90 hover:text-white underline-offset-4 hover:underline no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-sm";

const NO_RESP = ':not([class*=":text-"])'; // laisse intactes les tailles déjà adaptées par écran (sm:/md:/lg:)
const SHELL_CSS = `
  /* Jamais de défilement horizontal de la page : un contenu trop large est rogné, pas décalé */
  [data-shell-main] { overflow-x: clip; min-width: 0; }

[data-shell-main] .sticky.top-0{top:calc(56px + env(safe-area-inset-top))}
@media (min-width:768px){[data-shell-main] .sticky.top-0{top:64px}}
[data-shell-main] .min-h-screen{min-height:calc(100vh - 56px - env(safe-area-inset-top));min-height:calc(100dvh - 56px - env(safe-area-inset-top))}
/* Mobile avec onglets du bas : la page tient dans l'espace visible (pas de défilement inutile) */
@media (max-width:767px){[data-shell-main][data-shell-tabs] .min-h-screen{min-height:calc(100vh - 56px - 68px - env(safe-area-inset-top) - env(safe-area-inset-bottom));min-height:calc(100dvh - 56px - 68px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}}
@media (min-width:768px){[data-shell-main] .min-h-screen{min-height:calc(100vh - 64px);min-height:calc(100dvh - 64px)}}
/* Échelle de titres fluide : même hiérarchie, taille adaptée à la largeur d'écran */
[data-shell-main] .text-4xl${NO_RESP}{font-size:clamp(1.5rem,1.05rem + 1.6vw,2.25rem);line-height:1.2}
[data-shell-main] .text-3xl${NO_RESP}{font-size:clamp(1.375rem,1.05rem + 1.1vw,1.875rem);line-height:1.25}
[data-shell-main] .text-2xl${NO_RESP}{font-size:clamp(1.1875rem,1.05rem + .6vw,1.5rem);line-height:1.3}
[data-shell-main] .text-xl${NO_RESP}{font-size:clamp(1.0625rem,1rem + .35vw,1.25rem);line-height:1.35}
/* Plus aucun texte sous 12 px */
[data-shell-main] .text-\\[10px\\],[data-shell-main] .text-\\[11px\\]{font-size:12px}
@media print{[data-shell-chrome]{display:none !important}[data-shell-main]{padding:0 !important}[data-shell-main] .min-h-screen{min-height:auto}}
`;

export function AppLogo({ src, code, color, bg, fit }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <span className="flex-none h-9 w-9 rounded-lg overflow-hidden border border-white/35 flex items-center justify-center" style={{ background: bg || "#ffffff" }}>
        <img src={src} alt="" className="h-full w-full" style={{ objectFit: fit || "cover" }} onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span
      className="flex-none inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/35 text-white font-bold"
      style={{ background: color, fontSize: String(code || "").length > 2 ? 10 : 12 }}
      aria-hidden="true"
    >
      {code}
    </span>
  );
}

function groupBySection(items) {
  const groups = [];
  for (const item of items) {
    const key = item.section || "";
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(item);
  }
  return groups;
}

/** Identité d'une application (logo, couleur, nom) — pour les pages plein écran hors coquille. */
export function useAppBrand(appId) {
  useAppTheme(appId);
  const def = APP_DEFS.find((a) => a.id === appId) || {};
  const logo = usePortalAppIcon(appId || "none", def.icon);
  return { def, logo, color: def.color || PORTAL_GREEN, name: def.name || "" };
}

export const appBarStyle = (color) => ({
  backgroundColor: color,
  backgroundImage: "linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.12))",
});

export default function AppShell({ appId, app = {}, items = [], tabs = [], actions, children, navigationSwitch, homeUrl }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const def = APP_DEFS.find((a) => a.id === appId) || {};
  const logo = usePortalAppIcon(appId || "none", def.icon);
  const color = app.color || def.color || PORTAL_GREEN;
  const name = app.name || def.name || "";
  // Thème de l'application (couleur principale des pages, boutons, onglets actifs)
  useAppTheme(appId);

  const path = location.pathname;
  const full = location.pathname + location.search;
  const active = items.find((i) => isOn(i, path, full));
  const groups = groupBySection(items);
  // Même pied de page pour toutes les applications : 3 onglets + « Plus ».
  // « Plus » ouvre le menu complet, qui contient aussi le retour au portail.
  const tabItems = tabs.map((u) => items.find((i) => i.url === u)).filter(Boolean).slice(0, 3);
  const showMore = tabItems.length > 0;
  const close = () => setMenuOpen(false);
  // Page enfant : toute page de l'application qui n'est pas elle-même une entrée du menu.
  const isChildPage = items.length > 0 && !items.some((i) => same(String(i.url).split("?")[0], path));
  const goBack = () => {
    // Lien ouvert directement (aucun historique dans l'application) : retour à la page principale.
    if (location.key === "default") navigate(items[0].url, { replace: true });
    else navigate(-1);
  };

  const spaceSwitch = navigationSwitch && (
    <div className="grid grid-cols-2 gap-1 p-1.5 m-2 rounded-xl bg-[#EDF3F4] border border-[#DFE8EA]" role="group" aria-label="Choisir un espace">
      {[["personal", "Mon profil"], ["admin", "Administration"]].map(([value, label]) => (
        <button key={value} type="button" onClick={() => { navigationSwitch.onChange(value); close(); }}
          aria-pressed={navigationSwitch.value === value}
          className={`min-w-0 rounded-lg px-1.5 py-2 text-xs font-semibold whitespace-normal leading-tight transition-colors ${navigationSwitch.value === value ? "bg-[#0D5C66] text-white shadow-sm" : "text-[#0D5C66] hover:bg-white"}`}>
          {label}
        </button>
      ))}
    </div>
  );
  const menuEntries = (onNavigate) =>
    groups.map((g) => (
      <React.Fragment key={g.key || "main"}>
        {g.key && <MenuSection>{g.key}</MenuSection>}
        {g.items.map((item) => (
          <MenuItem key={item.url} to={item.url} icon={item.icon} badge={item.badge} active={isOn(item, path, full)} onClick={onNavigate}>
            {item.title}
          </MenuItem>
        ))}
      </React.Fragment>
    ));

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f5f7]">
      <style>{SHELL_CSS}</style>

      {/* ── Barre du haut : logo et couleur de l'application ── */}
      <header
        data-shell-chrome
        className="sticky top-0 z-30 flex-none text-white"
        style={{
          backgroundColor: color,
          // léger assombrissement : texte blanc lisible sur toutes les couleurs d'application
          backgroundImage: "linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.12))",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="h-14 md:h-16 flex items-center gap-3 px-4 md:px-5">
          {isChildPage && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Retour"
              title="Retour"
              className="flex-none -ml-2 h-11 w-11 inline-flex items-center justify-center rounded-full text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Link to={items[0]?.url || "/portail"} className="flex items-center gap-2.5 min-w-0 xl:w-[240px] no-underline text-white">
            <AppLogo src={logo} code={app.code} color={color} bg={def.iconBg} fit={def.iconFit} />
            <span className="font-semibold text-[15px] md:text-[17px] truncate" style={{ fontFamily: "'Poppins', sans-serif" }}>{name}</span>
          </Link>

          {/* Fil d'Ariane (ordinateur) */}
          <nav aria-label="Fil d'Ariane" className="hidden xl:flex items-center gap-2 text-sm text-white/90 min-w-0">
            <Link to="/portail" className={`flex-none ${CRUMB_LINK}`}>Portail</Link>
            <span aria-hidden="true" className="text-white/60">›</span>
            <Link to={homeUrl || items[0]?.url || "/portail"} className={`flex-none ${CRUMB_LINK}`}>
              {app.crumb || CRUMB_NAMES[appId] || name}
            </Link>
            {active && (
              <>
                <span aria-hidden="true" className="text-white/60">›</span>
                <Link
                  to={active.url}
                  aria-current={same(String(active.url).split("?")[0], path) ? "page" : undefined}
                  className={`truncate font-semibold ${CRUMB_LINK} !text-white`}
                >
                  {active.title}
                </Link>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            {actions}
            {/* Tablette : hamburger ; mobile : menu si pas de navigation inférieure. */}
            <MenuButton onDark className={tabItems.length === 0 ? "xl:hidden" : "hidden md:inline-flex xl:hidden"} open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sur tablette, le menu s'ouvre depuis le hamburger dans la barre supérieure. */}
        {/* ── Barre latérale « MENU » (ordinateur) ── */}
        <aside data-shell-chrome className="hidden xl:flex flex-col w-[264px] flex-none bg-white border-r border-slate-200 sticky top-16 h-[calc(100dvh-4rem)]">
          <MenuHeader />
          {spaceSwitch}
          <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto py-1">{menuEntries()}</nav>
          <MenuPortalLink />
        </aside>

        {/* ── Contenu ── */}
        <main data-shell-main data-shell-tabs={tabItems.length ? "" : undefined} className={`flex-1 min-w-0 ${tabItems.length ? "pb-[calc(68px+env(safe-area-inset-bottom))]" : ""} md:pb-0`}><PageSuspense>{children}</PageSuspense></main>
      </div>

      {/* ── Onglets du bas (mobile) ── */}
      {tabItems.length > 0 && (
        <nav
          data-shell-chrome
          aria-label="Navigation rapide"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid"
          style={{ gridTemplateColumns: `repeat(${tabItems.length + (showMore ? 1 : 0)}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {tabItems.map((item) => {
            const on = isOn(item, path, full);
            const Icon = item.icon;
            return (
              <Link
                key={item.url}
                to={item.url}
                aria-current={on ? "page" : undefined}
                className={`h-[68px] flex flex-col items-center justify-center gap-1 text-xs no-underline ${on ? "text-app font-bold" : "text-slate-500 font-semibold"}`}
              >
                <span className={`flex items-center justify-center h-7 w-[52px] rounded-full ${on ? "bg-app/10" : ""}`}>
                  {Icon && <Icon className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                </span>
                <span className="truncate max-w-full px-1">{item.short || item.title}</span>
              </Link>
            );
          })}
          {showMore && <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Plus de pages"
            className="h-[68px] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-slate-500"
          >
            <span className="flex items-center justify-center h-7 w-[52px]">
              <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={1.8} />
            </span>
            Plus
          </button>}
        </nav>
      )}

      {/* ── Menu complet (mobile, ouvert par « Plus ») ── */}
      <MenuDrawer open={menuOpen} onClose={close} className="xl:hidden" footer={<MenuPortalLink onClick={close} />}>
        {spaceSwitch}
        {menuEntries(close)}
      </MenuDrawer>
    </div>
  );
}
