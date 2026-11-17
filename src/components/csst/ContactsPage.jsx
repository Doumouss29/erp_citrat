import React from "react";
import { Ambulance, Flame, Phone, Shield, ShieldCheck, Headset, UserRound, MapPin, TriangleAlert, Users, MessageCircle, TrafficCone, HardHat, Trees, Building2, Siren } from "lucide-react";
import { CIVIL_PROTECTION_CONTACTS, EMERGENCY_CONTACTS } from "@/components/csst/data";

const URGENCES = [
  { label: "SAMU", number: "185", icon: Ambulance, color: "#c0392b" },
  { label: "Sapeurs-pompiers", number: "180", icon: Flame, color: "#d35400" },
  { label: "Police secours", number: "170", more: "ou 110 / 111", icon: Shield, color: "#2c5f82" },
];
// Message d'alerte en 4 bulles de dialogue : ce qu'il faut dire + un exemple de phrase
const MESSAGE = [
  { k: "Qui", v: "Votre nom et votre fonction", ex: "Je suis Koffi, chef d'équipe topo.", icon: UserRound, color: "#2c5f82", bg: "#eaf2fa" },
  { k: "Où", v: "Lieu précis et repères pour vous trouver", ex: "Cocody, carrefour de la pharmacie, chantier B.", icon: MapPin, color: "#1e8449", bg: "#eaf7ee" },
  { k: "Quoi", v: "Ce qui s'est passé et le danger qui persiste", ex: "Un collègue est tombé dans une fouille.", icon: TriangleAlert, color: "#d35400", bg: "#fff1e3" },
  { k: "Combien", v: "Nombre de victimes et leur état", ex: "Une victime, consciente, blessée à la jambe.", icon: Users, color: "#c0392b", bg: "#fbebeb" },
];
const ZONE_COLORS = ["#E67E22", "#D4A017", "#27AE60", "#3498DB"];
const ZONE_ICONS = [TrafficCone, HardHat, Trees, Building2];

// Pictogramme et couleur du service d'après son nom
function serviceStyle(label) {
  const l = label.toLowerCase();
  if (l.includes("samu")) return { icon: Ambulance, color: "#c0392b", bg: "#fbebeb" };
  if (l.includes("pompier")) return { icon: Flame, color: "#d35400", bg: "#fff1e3" };
  if (l.includes("gendarm")) return { icon: ShieldCheck, color: "#1e8449", bg: "#eaf7ee" };
  if (l.includes("police")) return { icon: Shield, color: "#2c5f82", bg: "#eaf2fa" };
  return { icon: Siren, color: "#6c3483", bg: "#f3ecf8" };
}

// Numéros en boutons « pastille » faciles à toucher
function PhoneNumbers({ value, color = "#1c2b3d", bg = "#f1f4f8" }) {
  const numbers = value.split("/").map((n) => n.trim());
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "flex-end" }}>
      {numbers.map((n) => (
        <a
          key={n}
          href={`tel:${n.replace(/\s/g, "")}`}
          aria-label={`Appeler le ${n}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: 36, padding: "6px 12px", borderRadius: "999px", background: bg, color, fontWeight: 700, fontSize: "14.5px", textDecoration: "none", whiteSpace: "nowrap", border: `1px solid ${color}26` }}
        >
          <Phone size={13} aria-hidden="true" />{n}
        </a>
      ))}
    </span>
  );
}

const sectionTitle = { margin: "0 0 12px", color: "#1c2b3d", fontSize: "17px" };

export default function ContactsPage({ isMobile }) {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px,3vw,34px)", margin: "4px 0 6px", color: "#1c2b3d" }}>Contacts d'urgence</h1>
      <p style={{ color: "var(--color-neutral-700)", maxWidth: "640px", margin: "0 0 20px" }}>Sur téléphone, touchez un numéro pour appeler directement.</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: "12px", marginBottom: "16px" }}>
        {URGENCES.map((u) => {
          const Icon = u.icon;
          return (
            <a key={u.label} href={`tel:${u.number}`} aria-label={`Appeler ${u.label} au ${u.number}`} style={{ background: u.color, color: "#fff", borderRadius: "10px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
              <Icon size={32} aria-hidden="true" style={{ flex: "none" }} />
              <span>
                <span style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>{u.label}</span>
                <span style={{ display: "block", fontSize: "30px", fontWeight: 800, lineHeight: 1.1 }}>{u.number}</span>
                {u.more && <span style={{ display: "block", fontSize: "12px" }}>{u.more}</span>}
              </span>
            </a>
          );
        })}
      </div>

      <div style={{ background: "#fff4dc", border: "1.5px solid #e6b655", borderRadius: "12px", padding: isMobile ? "16px" : "18px 20px", marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", background: "#8a5a00", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Headset size={20} />
          </span>
          <div>
            <div style={{ fontWeight: 700, color: "#8a5a00", fontSize: "16px" }}>Que dire quand vous appelez ?</div>
            <div style={{ fontSize: "12.5px", color: "#8a5a00", opacity: 0.85 }}>Restez calme, parlez dans cet ordre et ne raccrochez pas le premier.</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(200px,1fr))", gap: "14px" }}>
          {MESSAGE.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={m.k} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Bulle de dialogue */}
                <div style={{ position: "relative", background: "#fff", border: `1.5px solid ${m.color}40`, borderRadius: "14px", padding: "12px 14px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", background: m.bg, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <Icon size={16} strokeWidth={2.3} />
                    </span>
                    <strong style={{ color: m.color, fontSize: "15px" }}>{i + 1}. {m.k} ?</strong>
                  </div>
                  <div style={{ fontSize: "13.5px", color: "var(--color-neutral-800)", lineHeight: 1.4 }}>{m.v}</div>
                  {/* Queue de la bulle */}
                  <span aria-hidden="true" style={{ position: "absolute", left: 22, bottom: -8, width: 14, height: 14, background: "#fff", borderRight: `1.5px solid ${m.color}40`, borderBottom: `1.5px solid ${m.color}40`, transform: "rotate(45deg)" }} />
                </div>
                {/* Exemple de phrase */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", paddingLeft: "6px", marginTop: "4px" }}>
                  <MessageCircle size={14} color={m.color} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
                  <span style={{ fontSize: "12.5px", fontStyle: "italic", color: "#6b5a33", lineHeight: 1.35 }}>« {m.ex} »</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-title" style={sectionTitle}>Numéros par zone d'intervention</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "14px", marginBottom: "30px" }}>
        {EMERGENCY_CONTACTS.map((ec, i) => {
          const zc = ZONE_COLORS[i % ZONE_COLORS.length];
          const ZoneIcon = ZONE_ICONS[i % ZONE_ICONS.length];
          return (
            <div key={ec.zone} style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: `${zc}14`, borderBottom: `2px solid ${zc}` }}>
                <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "10px", background: zc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <ZoneIcon size={18} strokeWidth={2.2} />
                </span>
                <span style={{ fontWeight: 700, color: "#1c2b3d", fontSize: "15px" }}>{ec.zone}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {ec.entries.map((en, j) => {
                  const s = serviceStyle(en.label);
                  const SIcon = s.icon;
                  return (
                    <div key={en.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 16px", borderTop: j > 0 ? "1px solid var(--color-neutral-100, #eef1f5)" : "none" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 600, color: "var(--color-neutral-800)", minWidth: 0 }}>
                        <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                          <SIcon size={15} strokeWidth={2.3} />
                        </span>
                        {en.label}
                      </span>
                      <PhoneNumbers value={en.number} color={s.color} bg={s.bg} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-title" style={sectionTitle}>Centres de protection civile (CPC)</div>
      {/* Annuaire sobre : ville à gauche, numéro + bouton d'appel à droite */}
      <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "12px", overflow: "hidden", marginBottom: "30px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)" }}>
        {CIVIL_PROTECTION_CONTACTS.map((cp, i) => {
          const isGspm = /^gspm\s*/i.test(cp.zone);
          const city = cp.zone.replace(/^gspm\s*/i, "").toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
          const tel = cp.number.split("/")[0].trim();
          const cols = isMobile ? 1 : 2;
          return (
            <div
              key={cp.zone}
              style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
                borderTop: i >= cols ? "1px solid #eef1f5" : "none",
                borderLeft: !isMobile && i % 2 === 1 ? "1px solid #eef1f5" : "none",
              }}
            >
              <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: "10px", background: isGspm ? "#fff1e3" : "#f1f4f8", color: isGspm ? "#d35400" : "#2c5f82", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                {isGspm ? <Flame size={17} /> : <MapPin size={17} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, color: "#1c2b3d", fontSize: "14.5px" }}>{city}</span>
                <span style={{ display: "block", fontSize: "12px", color: "var(--color-neutral-600, #6b7280)" }}>{isGspm ? "Sapeurs-pompiers (GSPM)" : "Protection civile"}</span>
              </span>
              <span style={{ fontWeight: 600, color: "#1c2b3d", fontSize: "14.5px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flex: "none" }}>{cp.number}</span>
              <a
                href={`tel:${tel.replace(/\s/g, "")}`}
                aria-label={`Appeler ${cp.zone} au ${tel}`}
                style={{ width: 34, height: 34, marginLeft: "4px", borderRadius: "50%", background: "#eaf7ee", border: "1px solid #cfe9d8", color: "#2e8b57", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", textDecoration: "none" }}
              >
                <Phone size={15} aria-hidden="true" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
