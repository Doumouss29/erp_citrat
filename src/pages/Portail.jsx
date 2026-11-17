import NotificationBell from "@/components/notifications/NotificationBell";
import { Settings, Moon, LogOut } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import BrandHeader from "@/components/cgesn/BrandHeader";
import ProfileMenu, { getUserInitials } from "@/components/cgesn/ProfileMenu";
import ColorBar from "@/components/cgesn/ColorBar";
import { useTheme } from "@/components/providers/ThemeProvider";
import SiteFooter from "@/components/cgesn/SiteFooter";
import PortalAccessRequest from "@/components/cgesn/PortalAccessRequest";
import { APP_DEFS, INTERNAL_APP_IDS, isRemovedApp } from "@/lib/cgesnData";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveAccess } from "@/lib/accessProfiles";
import { safeUrl } from "@/lib/safeUrl";
import { isOfficeAccountAsync } from "@/components/utils/officeUtils";

// Initiales pour l'icône de repli des applications ajoutées depuis l'administration
// (elles n'ont pas d'image dédiée dans cgesnData.js)
function getAppInitials(name) {
  const parts = (name || "?").trim().split(/[\s-]+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[1][0]] : [(name || "?")[0]];
  return letters.join("").toUpperCase();
}

// Couleurs de badge des applis ajoutées depuis l'administration, assorties à leur logo
// (clé = nom de l'appli en majuscules). Sans entrée ici, le badge reste vert par défaut.
const CUSTOM_APP_COLORS = {
  COFFRIA: { color: "#1c2a4a", badgeBg: "#e2e6ef", hoverBorder: "#1c2a4a", shadow: "0 4px 10px rgba(28,42,74,0.25)" },
};

export default function Portail() {
  const { user, isAuthenticated, isLoadingAuth, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { access: userAccess, loading: accessLoading } = useEffectiveAccess(user);

  const { isDark: darkMode, toggleDarkMode } = useTheme();
  const [adminApps, setAdminApps] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const loadPortalApps = async () => {
      try {
        const list = await base44.entities.PortalApp.list();
        setAdminApps(list || []);
      } catch (e) {
        setAdminApps([]);
      }
    };
    // Relit aussi le profil : les accès modifiés dans l'administration s'appliquent sans recharger la page
    const refreshAll = () => { loadPortalApps(); if (refreshUser) refreshUser(); };
    refreshAll();
    window.addEventListener("focus", refreshAll);
    return () => window.removeEventListener("focus", refreshAll);
  }, []);

  // Message affiché quand on est renvoyé ici faute d'accès à une appli (voir RequireAppAccess)
  useEffect(() => {
    const msg = location.state && location.state.accessDenied;
    if (!msg) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigate("/connexion", { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated]);

  // Comptes bureaux : pas de portail, directement le terminal de pointage
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    isOfficeAccountAsync(user.email).then((office) => {
      if (office && !cancelled) navigate("/rh/Pointage", { replace: true });
    });
    return () => { cancelled = true; };
  }, [user?.email]);

  const appStatus = (app) => {
    const entry = adminApps.find((a) => a.app_id === app.id);
    if (entry) return { isOff: entry.status !== "ok", href: entry.href };
    // Les modules embarqués n'ont pas besoin d'URL externe.
    // Seul l'administrateur local peut les tester sans configuration PortalApp.
    if (user?.super_admin === true && user?.role === "admin" && INTERNAL_APP_IDS.includes(app.id)) {
      return { isOff: false, href: null };
    }
    return { isOff: !app.href, href: app.href };
  };

  // Applications intégrées en interne dans le portail (clé = app_id, valeur = route interne)
  // Ajouter ici chaque nouvelle appli intégrée pour qu'elle navigue en interne au lieu d'ouvrir un lien externe.
  const INTERNAL_ROUTES = {
    rhcgesn: "/rh",
    cgesnboard: "/board",
    ecadastre: "/ecadastre",
    assistancenum: "/assistance",
    lotissement: "/eguide/Dashboard",
    csst: "/csst",
    hse: "/hse",
    coprociv: "/coprociv",
  };

  const openApp = (app) => {
    const internalRoute = INTERNAL_ROUTES[app.id];
    if (internalRoute) {
      const { isOff } = appStatus(app);
      if (isOff) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastMsg(`${app.name} — indisponible (maintenance)`);
        toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
        return;
      }
      navigate(internalRoute);
      return;
    }
    const { isOff, href } = appStatus(app);
    // N'ouvre que des liens http(s) : un href javascript:/data: enregistré est ignoré.
    const target = safeUrl(href);
    if (!isOff && target) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(`${app.name} — indisponible`);
    toastTimer.current = setTimeout(() => setToastMsg(null), 1800);
  };

  if (isLoadingAuth || !isAuthenticated || accessLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(125deg,#061A58 0%,#0C3D85 60%,#087DA4 100%)", fontFamily: "'Poppins',Helvetica,Arial,sans-serif" }}>
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const dm = darkMode;
  const pageBg = dm ? "oklch(0.16 0.01 250)" : "oklch(0.965 0.004 90)";
  const cardBg = dm ? "oklch(0.2 0.01 250)" : "#fff";
  const cardBorder = dm ? "oklch(0.3 0.01 250)" : "oklch(0.92 0.005 90)";
  const appCardBg = dm ? "oklch(0.24 0.01 250)" : "oklch(0.98 0.003 90)";
  const appCardBorder = dm ? "oklch(0.32 0.01 250)" : "oklch(0.91 0.005 90)";

  // Applications créées depuis l'administration mais absentes de APP_DEFS (cgesnData.js) :
  // sans elles, une appli ajoutée dans le gestionnaire n'apparaissait jamais ici.
  const customApps = adminApps
    .filter((a) => a.app_id && !isRemovedApp(a.app_id) && !APP_DEFS.some((def) => def.id === a.app_id))
    .map((a) => ({
      id: a.app_id,
      name: a.name,
      href: a.href,
      icon: a.icon || undefined,
      isCustom: true,
      ...(CUSTOM_APP_COLORS[(a.name || "").trim().toUpperCase()] || {})
    }));
  // Logo personnalisé depuis l'administration (PortalApp.icon) prioritaire sur le logo par défaut
  const builtInApps = APP_DEFS.map((def) => {
    const entry = adminApps.find((a) => a.app_id === def.id);
    return entry && entry.icon ? { ...def, icon: entry.icon, iconBg: null, iconFit: "contain" } : def;
  });
  const allApps = [...builtInApps, ...customApps];
  // Les accès cochés dans l'administration s'appliquent à tous les comptes, administrateurs compris
  const visibleApps = allApps.filter((app) => userAccess.includes(app.id));
  const appGroups = [
    { key: "internes", title: "Applications internes", apps: visibleApps.filter((a) => INTERNAL_APP_IDS.includes(a.id)).sort((a, b) => INTERNAL_APP_IDS.indexOf(a.id) - INTERNAL_APP_IDS.indexOf(b.id)) },
    { key: "externes", title: "Applications externes", apps: visibleApps.filter((a) => !INTERNAL_APP_IDS.includes(a.id)) }
  ].filter((g) => g.apps.length > 0);

  return (
    <>
      <style>{`
        .cgesn-apps-grid{grid-template-columns:repeat(4,1fr);max-width:660px;margin:0 auto}
        @media (max-width:1023px){.cgesn-apps-grid{grid-template-columns:repeat(3,1fr);max-width:500px}
          .cgesn-app-card{height:124px !important;padding:12px 8px !important}
          .cgesn-app-icon{width:46px !important;height:46px !important}
          .cgesn-app-badge{font-size:9.5px !important;padding:3px 9px !important}
        }
        @media (max-width:767px){.cgesn-apps-grid{grid-template-columns:repeat(2,1fr);gap:10px !important;max-width:400px}
          .cgesn-app-card{height:104px !important;padding:12px 8px !important;gap:8px !important}
          .cgesn-app-icon{width:42px !important;height:42px !important;border-radius:11px !important}
          .cgesn-app-badge{font-size:9.5px !important;padding:3px 10px !important}
        }
        .cgesn-header-btn:hover{background:rgba(255,255,255,0.16) !important}
        .cgesn-auth-pill:hover{background:rgba(255,255,255,0.16) !important}
        .cgesn-app-card{transition:box-shadow .18s,transform .18s,border-color .18s;height:140px}
        .cgesn-app-card:hover{box-shadow:0 12px 26px rgba(0,0,0,0.12);transform:translateY(-3px);border-color:var(--hover-border) !important}
        @keyframes cgesnToastIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
        .cgesn-toast{animation:cgesnToastIn .18s ease-out}
        .cgesn-admin-link{transition:background .15s,color .15s}
        .cgesn-admin-link:hover{background:rgba(255,255,255,0.12);color:#fff !important}
        .cgesn-admin-link:focus-visible{outline:2px solid oklch(0.82 0.15 80);outline-offset:2px}

      `}</style>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: pageBg, fontFamily: "'Poppins',Helvetica,Arial,sans-serif", overflowX: "hidden" }}>
        <BrandHeader className="cgesn-portal-header" subtitle="DAGNOKO HAMED" nowrap
          menuUser={user ? { name: user.full_name, email: user.email, initials: getUserInitials(user) } : undefined}
          mobileMenuItems={[
          ...(user && user.super_admin === true ? [{ label: "Administration", to: "/administration", icon: Settings }] : []),
          { label: "Mode sombre", icon: Moon, toggle: !!dm, onSelect: toggleDarkMode },
          { label: "Se déconnecter", icon: LogOut, danger: true, onSelect: () => base44.auth.logout("/connexion") }
        ]}>
          <div className="cgesn-header-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", justifyContent: "flex-end", marginLeft: "auto" }}>
            {user && user.super_admin === true && (
              <>
                <Link to="/administration" className="cgesn-admin-link" style={{ textDecoration: "none", height: 40, padding: "0 14px", borderRadius: 100, color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                  <Settings style={{ width: 17, height: 17 }} />
                  Administration
                </Link>
                <span aria-hidden="true" style={{ width: 1, height: 26, background: "rgba(255,255,255,0.25)", margin: "0 8px" }} />
              </>
            )}
            {user?.email && <NotificationBell userEmail={user.email} buttonClassName="text-white" />}
            <ProfileMenu user={user} darkMode={!!dm} onToggleDarkMode={toggleDarkMode} onLogout={() => base44.auth.logout("/connexion")} />
          </div>
        </BrandHeader>
        <ColorBar />

        <div style={{ flex: 1, maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "clamp(24px,4vw,44px) clamp(20px,4vw,32px) 60px" }}>
          <div style={{ background: cardBg, borderRadius: 20, boxShadow: "0 4px 22px rgba(13,59,63,0.08)", border: `1px solid ${cardBorder}`, padding: "clamp(24px,3vw,36px)" }}>
            {appGroups.map((grp, gi) => (
            <section key={grp.key} style={{ marginTop: gi === 0 ? 0 : 30 }}>
            <div className="cgesn-apps-grid" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: dm ? "oklch(0.78 0.06 165)" : "#0C3D85", whiteSpace: "nowrap" }}>{grp.title}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: dm ? "oklch(0.8 0.005 90)" : "oklch(0.5 0.005 90)", background: dm ? "oklch(0.28 0.01 250)" : "oklch(0.95 0.003 90)", padding: "1px 8px", borderRadius: 100 }}>{grp.apps.length}</span>
              <span style={{ flex: 1, height: 1, background: dm ? "oklch(0.3 0.01 250)" : "oklch(0.92 0.005 90)" }} />
            </div>
            <div className="cgesn-apps-grid" style={{ display: "grid", gap: 14, alignItems: "start", justifyItems: "stretch" }}>
              {grp.apps.map((app) => {
                const { isOff } = appStatus(app);
                const dotColor = isOff ? "oklch(0.75 0.15 75)" : "oklch(0.7 0.16 145)";
                const statusLabel = isOff ? "Indisponible" : "Disponible";
                return (
                  <div
                    key={app.id}
                    className="cgesn-app-card"
                    style={{
                      position: "relative",
                      background: appCardBg,
                      border: `1px solid ${appCardBorder}`,
                      borderRadius: 14,
                      padding: "14px 10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      cursor: "pointer",
                      "--hover-border": app.hoverBorder || "#0C3D85"
                    }}
                    onClick={() => openApp(app)}
                  >
                    <div title={statusLabel} style={{ position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
                    <div
                      className="cgesn-app-icon"
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 13,
                        overflow: "hidden",
                        flex: "none",
                        boxShadow: app.shadow,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: app.iconBg || (app.icon ? undefined : "linear-gradient(135deg,#0C3D85,#0A95C7)"),
                        color: "#fff",
                        fontSize: 17,
                        fontWeight: 700
                      }}
                    >
                      {app.icon ? (
                        <img src={app.icon} alt={app.name} style={{ width: "100%", height: "100%", objectFit: app.iconFit || "contain", display: "block" }} />
                      ) : (
                        getAppInitials(app.name)
                      )}
                    </div>
                    <span className="cgesn-app-badge" style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.03em", whiteSpace: "nowrap", color: app.color || "#0C3D85", background: app.badgeBg || "oklch(0.94 0.06 165)", padding: "4px 12px", borderRadius: 100 }}>
                      {app.name}
                    </span>
                  </div>
                );
              })}
            </div>
            </section>
            ))}
            {visibleApps.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", fontSize: "13.5px", color: dm ? "oklch(0.7 0.005 90)" : "oklch(0.5 0.005 90)" }}>
                Aucune application n'est attribuée à votre compte.
                <PortalAccessRequest userId={user?.id} darkMode={dm} refreshUser={refreshUser} />
              </div>
            )}
          </div>
        </div>

        <SiteFooter />
      </div>

      {toastMsg && (
        <div className="cgesn-toast" style={{ position: "fixed", left: "50%", bottom: 32, transform: "translateX(-50%)", background: "oklch(0.22 0.01 90)", color: "#fff", padding: "12px 22px", borderRadius: 100, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toastMsg}
        </div>
      )}
    </>
  );
}