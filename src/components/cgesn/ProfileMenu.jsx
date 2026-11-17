import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Moon, Sun, LogOut } from "lucide-react";

// Initiales prénom + nom ; repli sur le nom complet, puis sur l'e-mail.
export function getUserInitials(user) {
  if (!user) return "?";
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  const words = (user.full_name || "").trim().split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (user.email || "?").split("@")[0].slice(0, 2).toUpperCase();
}

function displayName(user) {
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  return (first || last) ? `${first} ${last}`.trim() : (user.full_name || user.email || "Utilisateur");
}

const GOLD = "oklch(0.82 0.15 80)";
const INK = "#0d3b3f";

function Avatar({ initials, size, ring }) {
  return (
    <span style={{ position: "relative", width: size, height: size, borderRadius: "50%", background: GOLD, color: INK, fontSize: Math.round(size * 0.38), fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", letterSpacing: "0.02em" }}>
      {initials}
      {ring && <span style={{ position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: "50%", background: "oklch(0.78 0.16 145)", border: `2px solid ${ring}` }} />}
    </span>
  );
}

/**
 * Avatar à initiales + menu déroulant (nom, e-mail, mode sombre, déconnexion).
 * Props : user, darkMode (bool), onToggleDarkMode, onLogout
 */
export default function ProfileMenu({ user, darkMode, onToggleDarkMode, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!user) return null;
  const initials = getUserInitials(user);
  const name = displayName(user);

  const panelBg = darkMode ? "oklch(0.22 0.01 250)" : "#fff";
  const panelBorder = darkMode ? "oklch(0.32 0.01 250)" : "oklch(0.92 0.005 90)";
  const text = darkMode ? "oklch(0.95 0.005 90)" : "oklch(0.22 0.01 90)";
  const muted = darkMode ? "oklch(0.72 0.005 90)" : "oklch(0.5 0.005 90)";
  const hover = darkMode ? "oklch(0.27 0.01 250)" : "oklch(0.97 0.003 90)";
  const itemStyle = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", borderRadius: 8, background: "none", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 500, textAlign: "left" };

  return (
    <div ref={rootRef} style={{ position: "relative", flex: "none" }}>
      <style>{`
        .cgesn-profile-trigger{transition:background .15s}
        .cgesn-profile-trigger:hover{background:rgba(255,255,255,0.2) !important}
        .cgesn-profile-trigger:focus-visible,.cgesn-profile-item:focus-visible{outline:2px solid ${GOLD};outline-offset:2px}
        .cgesn-profile-item:hover{background:var(--cgesn-profile-hover) !important}
        @keyframes cgesnProfileIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <button
        type="button"
        className="cgesn-profile-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Profil de ${name}`}
        title={name}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: 100, border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", cursor: "pointer" }}
      >
        <Avatar initials={initials} size={36} ring="#0f5c52" />
        <ChevronDown style={{ width: 16, height: 16, color: "#fff", transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div role="menu" style={{ "--cgesn-profile-hover": hover, position: "absolute", top: "calc(100% + 10px)", right: 0, width: 268, background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.18)", overflow: "hidden", zIndex: 50, animation: "cgesnProfileIn .14s ease-out", fontFamily: "'Poppins',sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
            <Avatar initials={initials} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              {user.email && <div style={{ fontSize: 12, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${panelBorder}`, padding: 6 }}>
            <button type="button" role="menuitemcheckbox" aria-checked={darkMode} className="cgesn-profile-item" onClick={onToggleDarkMode} style={{ ...itemStyle, color: text }}>
              {darkMode ? <Sun style={{ width: 17, height: 17 }} /> : <Moon style={{ width: 17, height: 17 }} />}
              Mode sombre
              <span aria-hidden="true" style={{ marginLeft: "auto", position: "relative", width: 34, height: 19, borderRadius: 100, background: darkMode ? "#0f5c52" : "oklch(0.85 0.005 90)", transition: "background .15s", flex: "none" }}>
                <span style={{ position: "absolute", top: 2, left: darkMode ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left .15s" }} />
              </span>
            </button>
          </div>
          <div style={{ borderTop: `1px solid ${panelBorder}`, padding: 6 }}>
            <button type="button" role="menuitem" className="cgesn-profile-item" onClick={() => { setOpen(false); onLogout(); }} style={{ ...itemStyle, color: "oklch(0.55 0.18 25)" }}>
              <LogOut style={{ width: 17, height: 17 }} />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
