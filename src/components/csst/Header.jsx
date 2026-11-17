import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const MENSUEL_YEAR = "2026";

function tabBtnStyle(active) {
  return {
    padding: "14px 2px",
    borderRadius: 0,
    fontWeight: 600,
    fontSize: "12.5px",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    background: "transparent",
    borderBottom: active ? "3px solid var(--color-accent)" : "3px solid transparent",
    color: active ? "var(--color-text)" : "var(--color-neutral-700)",
  };
}

export default function Header({ tabs, activeTab, onTabChange, isMobile }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleTabClick = (key) => {
    onTabChange(key);
    setMenuOpen(false);
  };

  return (
    <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* En-tête principal */}
      <div style={{ background: "#1c2b3d", padding: isMobile ? "18px clamp(12px,4vw,48px)" : "26px clamp(16px,4vw,48px)", display: "grid", gridTemplateColumns: "1fr", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "4px solid var(--color-accent)" }}>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: isMobile ? "clamp(16px,4.2vw,21px)" : "clamp(22px,2.6vw,30px)", color: "#fff", lineHeight: isMobile ? 1.1 : 1.15, letterSpacing: isMobile ? "0.005em" : "0.01em" }}>
            Sensibilisation aux <span style={{ color: "#f6a06b", whiteSpace: "nowrap" }}>risques professionnels</span>
          </div>
          {!isMobile && (
            <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9fb0c4" }}>Outil de prévention et de Sécurité</div>
          )}
        </div>

      </div>

    </div>
  );
}