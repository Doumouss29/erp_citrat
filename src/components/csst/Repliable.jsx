import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// Section de page : titre normal sur tablette et ordinateur, repliable sur téléphone
// pour éviter les pages trop longues à faire défiler.
export default function Repliable({ title, sub, isMobile, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!isMobile) {
    return (
      <section>
        <div style={{ margin: "36px 0 14px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", margin: 0, color: "#1c2b3d" }}>{title}</h2>
          {sub && <p style={{ color: "var(--color-neutral-700)", margin: "6px 0 0", maxWidth: "700px" }}>{sub}</p>}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section style={{ marginTop: "12px" }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: "100%", minHeight: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 14px", background: "#1c2b3d", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "16px" }}>
        {title}
        <ChevronDown size={20} aria-hidden="true" style={{ flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {open && (
        <div style={{ paddingTop: "12px" }}>
          {sub && <p style={{ color: "var(--color-neutral-700)", margin: "0 0 12px", fontSize: "14px" }}>{sub}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
