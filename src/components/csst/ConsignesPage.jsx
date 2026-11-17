import React, { useState } from "react";
import { EPI_LIST } from "@/components/csst/data";
import { Check, ChevronDown, HardHat, Monitor, OctagonAlert, TrafficCone, Trees } from "lucide-react";

const ALERTE = [
  { title: "Se retirer et alerter", text: "Tout travailleur peut se retirer d'une situation présentant un danger grave et imminent pour sa vie ou sa santé, ou celle d'autrui.", ref: "Décret 2020-956, art. 2" },
  { title: "Consigner l'alerte", text: "Le représentant au comité alerte aussitôt l'employeur et note dans le registre spécial, daté et signé, les postes concernés, la nature du danger et les personnes exposées.", ref: "Art. 5 et 9" },
  { title: "Enquêter et remédier", text: "L'employeur enquête immédiatement avec ce représentant et prend les dispositions nécessaires.", ref: "Art. 11" },
  { title: "Réunir le comité en cas de divergence", text: "Le comité se réunit d'urgence, sous 24 heures au plus. Sans accord, l'inspecteur du travail est saisi et convoque une réunion extraordinaire dans les 24 heures.", ref: "Art. 12 et 13" },
];

const EPI_COLORS = [
  ["#ffe6cf", "#c2570c"], ["#fff0b3", "#a16207"], ["#f1e4d8", "#7c5a3c"], ["#dcefff", "#2c5f82"],
  ["#fbdcdc", "#c0392b"], ["#e9def5", "#6c3483"], ["#d8f0f5", "#0e7490"], ["#ffdcc2", "#b9450f"],
];
const sectionTitle = { margin: "0 0 12px", color: "#1c2b3d", fontSize: "17px" };

const ZONES = [
  {
    title: "Voie publique et abords de chantier", icon: TrafficCone, color: "#E67E22", dark: "#a84f0c", soft: "#fff1e3",
    phases: [
      { label: "Avant", items: ["Porter un vêtement haute visibilité", "Choisir un emplacement dégagé", "Installer la signalisation avant les relevés"] },
      { label: "Pendant", items: ["Se positionner face à la circulation", "Rester attentif au bruit, sans écouteurs"] },
      { label: "Après", items: ["Replier le matériel et la signalisation en fin d'intervention"] },
    ],
  },
  {
    title: "Chantier BTP en activité", icon: HardHat, color: "#F39C12", dark: "#8a5a00", soft: "#fff4dc",
    phases: [
      { label: "Avant", items: ["Se signaler à l'accueil chantier", "Porter les EPI obligatoires du site"] },
      { label: "Pendant", items: ["Suivre le plan de circulation des engins", "Attendre le signal avant de croiser un engin", "Ne jamais approcher une fouille non sécurisée"] },
      { label: "Après", items: ["Signaler toute anomalie au responsable"] },
    ],
  },
  {
    title: "Terrain naturel / forestier isolé", icon: Trees, color: "#27AE60", dark: "#1e8449", soft: "#eaf7ee",
    phases: [
      { label: "Avant", items: ["Déclarer son itinéraire avant le départ", "Vérifier téléphone et dispositif DATI", "Emporter trousse de secours et eau", "Adapter tenue et équipement au terrain"] },
      { label: "Pendant", items: ["Prévenir le référent en cas d'imprévu", "Ne jamais s'engager sur une zone instable"] },
      { label: "Après", items: ["Confirmer son retour au référent"] },
    ],
  },
  {
    title: "Bureau d'études", icon: Monitor, color: "#3498DB", dark: "#2c5f82", soft: "#eaf2fa",
    phases: [
      { label: "Avant", items: ["Régler son poste (écran, siège)", "Positionner l'écran perpendiculaire aux fenêtres"] },
      { label: "Pendant", items: ["Faire une pause de 5 min par heure", "Garder l'espace de circulation dégagé"] },
      { label: "Après", items: ["Signaler tout inconfort persistant"] },
    ],
  },
];

export default function ConsignesPage({ isMobile }) {
  const [openZone, setOpenZone] = useState(0);
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px,3vw,34px)", margin: "4px 0 6px", color: "#1c2b3d" }}>Consignes de sécurité</h1>
      <p style={{ color: "var(--color-neutral-700)", maxWidth: "640px", margin: "0 0 20px" }}>Que faire face à un danger, quoi vérifier avant de partir et les bons gestes selon le lieu de travail.</p>

      <div style={{ background: "#fbebeb", border: "1.5px solid #e08585", borderRadius: "8px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "14px" }}>
        <OctagonAlert size={28} color="#c0392b" aria-hidden="true" style={{ flex: "none" }} />
        <div>
          <div style={{ fontWeight: 700, color: "#c0392b", marginBottom: "3px" }}>Danger grave et imminent : arrêtez-vous</div>
          <div style={{ fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.5 }}>
            Mettez-vous en sécurité et signalez immédiatement la situation à l'employeur ou à son représentant et au CSST (Code du travail, art. 41.4). Aucune sanction ni retenue de salaire si vous aviez un motif raisonnable de vous retirer (décret n° 2020-956, art. 7).
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "14px", marginBottom: "30px" }}>
        {ALERTE.map((a, i) => (
          <div key={a.title} style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px", padding: "16px 18px", display: "flex", gap: "12px" }}>
            <span style={{ width: "26px", height: "26px", borderRadius: "999px", background: "#c0392b", color: "#fff", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#1c2b3d", marginBottom: "3px" }}>{a.title}</div>
              <div style={{ fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.5 }}>{a.text}</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-neutral-700)", marginTop: "6px" }}>{a.ref}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderRadius: "10px", overflow: "hidden", border: "1.5px solid #e6b655", marginBottom: "30px" }}>
        <div style={{ background: "#1c2b3d", color: "#fff", padding: "13px 18px" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px" }}>EPI et matériel à prévoir avant le départ</div>
        </div>
        <div style={{ background: "#fff4dc", padding: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "10px" }}>
          {EPI_LIST.map((it, idx) => {
            const [soft, dark] = EPI_COLORS[idx % EPI_COLORS.length];
            return (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", border: `1.5px solid ${dark}`, background: soft }}>
                <span style={{ width: "40px", height: "40px", borderRadius: "8px", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: dark }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: it.icon }} />
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#1c2b3d" }}>{it.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-title" style={sectionTitle}>Consignes par zone</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "18px" }}>
        {ZONES.map((z, zi) => {
          const Icon = z.icon;
          const visible = !isMobile || openZone === zi;
          return (
            <div key={z.title} style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderTop: `4px solid ${z.color}`, borderRadius: "8px", overflow: "hidden" }}>
              <button type="button" disabled={!isMobile} aria-expanded={isMobile ? visible : undefined} onClick={() => setOpenZone(visible ? -1 : zi)} style={{ width: "100%", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", background: z.soft, border: "none", textAlign: "left", cursor: isMobile ? "pointer" : "default", color: "inherit", opacity: 1 }}>
                <span style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#fff", color: z.dark, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="card-title" style={{ margin: 0, color: "#1c2b3d", flex: 1 }}>{z.title}</span>
                {isMobile && <ChevronDown size={20} color={z.dark} aria-hidden="true" style={{ flex: "none", transform: visible ? "rotate(180deg)" : "none" }} />}
              </button>
              {visible && <div style={{ padding: "14px 18px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {z.phases.map((p) => (
                  <div key={p.label}>
                    <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: z.dark, marginBottom: "6px" }}>{p.label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {p.items.map((it) => (
                        <div key={it} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.45 }}>
                          <Check size={16} color={z.dark} strokeWidth={3} aria-hidden="true" style={{ flex: "none", marginTop: "2px" }} />
                          <span>{it}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
