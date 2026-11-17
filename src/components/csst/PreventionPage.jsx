import React from "react";
import Repliable from "@/components/csst/Repliable";
import { ExternalLink } from "lucide-react";

// Méthode inspirée de la page Unep et de l'INRS (droit français), rattachée au droit ivoirien :
// Code du travail, art. 41.2 à 41.7 ; décret n° 2020-955 ; CNPS. Vérifié le 2 novembre 2026.

const NIVEAUX = [
  { title: "Prévention primaire", text: "Supprimer ou réduire le risque avant qu'il ne cause un dommage.", example: "Baliser une zone de relevé avant de commencer." },
  { title: "Prévention secondaire", text: "Repérer tôt les difficultés et aider les personnes à y faire face.", example: "Signaler les premières douleurs liées au port du matériel." },
  { title: "Prévention tertiaire", text: "Limiter les conséquences d'un dommage et accompagner le retour au travail.", example: "Adapter le poste après un accident." },
];

const PRINCIPES = [
  { title: "Éviter les risques", example: "Réaliser un relevé à distance quand c'est possible, plutôt que d'intervenir sur la chaussée." },
  { title: "Évaluer les risques", example: "Avant une mission, repérer la circulation, le terrain, le réseau et les lignes électriques." },
  { title: "Combattre le risque à la source", example: "Réparer un câble abîmé plutôt que d'afficher une consigne de prudence." },
  { title: "Adapter le travail à l'homme", example: "Régler le poste CAO et répartir le port du matériel sur le terrain." },
  { title: "Considérer l'évolution de la technique", example: "Étudier du matériel plus léger ou l'usage du drone sur les zones difficiles d'accès." },
  { title: "Remplacer le dangereux par ce qui l'est moins", example: "Préférer un véhicule à une moto pour un long trajet sur piste, quand c'est possible." },
  { title: "Planifier la prévention", example: "Inscrire les actions, les responsables et les délais dans le programme annuel de prévention." },
  { title: "Donner la priorité aux protections collectives", example: "Mettre en place le balisage ou le garde-corps avant de compter sur les seuls EPI." },
  { title: "Donner les instructions appropriées aux salariés", example: "Faire un point sécurité avant le départ et former les nouveaux arrivants." },
];

const ETAPES = [
  { title: "Identifier et évaluer les risques", text: "Passer en revue chaque activité (bureau, terrain, chantier, déplacements) et classer les risques par priorité. Consigner le résultat dans un document daté, tenu à jour et partagé avec le CSST.", ref: "Code du travail, art. 41.2 ; décret 2020-955, art. 3" },
  { title: "Mettre en œuvre les actions", text: "Agir auprès des salariés (suivi médical, formation), dans l'entreprise (signalisation, consignes, EPI, conformité du matériel) et sur les chantiers (coactivité, réseaux, niveaux d'expérience différents).", ref: "Code du travail, art. 41.2, 41.3 et 41.7" },
  { title: "Suivre et améliorer", text: "Contrôler l'application des mesures, analyser les résultats et ajuster les actions. Le bilan et le programme annuel sont présentés au comité avant la fin du premier trimestre.", ref: "Code du travail, art. 41.7 ; décret 2020-955, art. 15" },
];

const OBLIGATIONS = [
  { who: "L'employeur", items: [
    { text: "Prend les mesures utiles pour protéger la vie et la santé des salariés", ref: "Art. 41.2" },
    { text: "Forme à l'hygiène et à la sécurité les nouveaux embauchés et ceux qui changent de poste ou de technique", ref: "Art. 41.3" },
    { text: "Assure l'eau potable sur les lieux et pendant les heures de travail", ref: "Art. 41.6" },
    { text: "Organise le contrôle permanent du respect des règles d'hygiène et de sécurité", ref: "Art. 41.7" },
  ] },
  { who: "Le salarié", items: [
    { text: "Signale immédiatement tout danger grave et imminent et toute défectuosité des systèmes de protection", ref: "Art. 41.4" },
    { text: "Respecte les consignes et utilise correctement les dispositifs de sécurité, sans les enlever ni les modifier sans autorisation", ref: "Art. 41.7" },
  ] },
];

const ACCIDENT = [
  { title: "Organiser les secours", text: "Sécuriser la zone, alerter les secours et donner les premiers soins dans la limite de ses compétences. Les numéros utiles sont dans l'onglet Contacts d'urgence." },
  { title: "Déclarer l'accident", text: "L'employeur dispose de 48 heures pour déclarer l'accident du travail ou de trajet à la CNPS." },
  { title: "Analyser les causes", text: "Analyser les accidents, les presque-accidents et les incidents. Le CSST se réunit après tout accident grave ou qui aurait pu l'être (décret 2020-955, art. 9)." },
  { title: "Se faire accompagner", text: "S'appuyer sur le CSST, le médecin du travail, l'inspecteur du travail et le technicien en prévention de la CNPS (décret 2020-955, art. 14)." },
];

const SOURCES = [
  { label: "Unep : mettre en œuvre une démarche de prévention (méthode, droit français)", href: "https://www.lesentreprisesdupaysage.fr/base-documentaire/mettre-en-oeuvre-une-demarche-de-prevention-et-de-sante-et-securite-au-travail/" },
  { label: "INRS : les principes généraux de prévention (référence française)", href: "https://www.inrs.fr/demarche/principes-generaux/Principes-generaux-prevention.html" },
  { label: "Code du travail ivoirien, art. 41.1 à 41.8 (texte reproduit par Loi d'ici)", href: "https://loidici.biz/2018/08/26/titre-iv-sante-et-securite-et-organismes-de-sante-au-travail-chapitre-premier-sante-et-securite-au-travail-2015/" },
  { label: "Décret n° 2020-955 relatif au CSST (texte reproduit par Loi d'ici)", href: "https://loidici.biz/2021/04/18/le-comite-de-sante-et-securite-au-travail-csst/lois-article-par-article/codes/le-code-du-travail/comite-de-travail/20891/naty/" },
  { label: "Portail de l'Administration ivoirienne : accident du travail ou de trajet", href: "https://servicepublic.gouv.ci/accueil/detaildemarcheparticulier/1/443/100" },
];

const PRINCIPE_COLORS = [["#0b7fc1", "#fff"], ["#b9cf94", "#1c2b3d"], ["#0f8a6a", "#fff"], ["#a6dbe6", "#1c2b3d"], ["#ee7b2b", "#1c2b3d"], ["#f6d94a", "#1c2b3d"], ["#c9b8ac", "#1c2b3d"], ["#d81e6b", "#fff"], ["#cfdc3b", "#1c2b3d"]];
const NIVEAU_COLORS = [["#eaf7ee", "#6fbf87", "#1e8449"], ["#fff4dc", "#e6b655", "#8a5a00"], ["#fbebeb", "#e08585", "#c0392b"]];
const OBLIGATION_COLORS = [["#eaf2fa", "#5b9bd5", "#2c5f82"], ["#eaf7ee", "#6fbf87", "#1e8449"]];
const cardStyle = { background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px" };
const refStyle = { fontSize: "12px", fontWeight: 700, color: "var(--color-neutral-700)" };
const numberStyle = { width: "30px", height: "30px", borderRadius: "999px", background: "#27AE60", color: "#fff", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" };
const titleStyle = { fontWeight: 700, color: "#1c2b3d", lineHeight: 1.3 };
const textStyle = { fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.5 };

export default function PreventionPage({ isMobile, isTablet }) {
  const principeColumns = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(3,1fr)";
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px,3vw,34px)", margin: "4px 0 6px", color: "#1c2b3d" }}>La démarche de prévention</h1>
      <p style={{ color: "var(--color-neutral-700)", maxWidth: "700px", margin: 0 }}>
        Prévenir, c'est préserver la sécurité et la santé physique et mentale des travailleurs, en agissant avant l'accident. Cette démarche concerne tout le monde : direction, CSST, encadrement et salariés.
      </p>

      <Repliable title="Trois niveaux de prévention" isMobile={isMobile} defaultOpen>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: "14px" }}>
        {NIVEAUX.map((n, i) => (
          <div key={n.title} style={{ background: NIVEAU_COLORS[i][0], border: `1.5px solid ${NIVEAU_COLORS[i][1]}`, borderRadius: "8px", padding: "16px 18px" }}>
            <div style={{ ...titleStyle, color: NIVEAU_COLORS[i][2], marginBottom: "5px" }}>{n.title}</div>
            <div style={textStyle}>{n.text}</div>
            <div style={{ ...textStyle, marginTop: "8px", color: "var(--color-neutral-700)" }}><strong>Exemple :</strong> {n.example}</div>
          </div>
        ))}
      </div>
      </Repliable>

      <Repliable title="Les 9 principes de prévention" sub="Une méthode de référence à suivre dans cet ordre : on cherche d'abord à supprimer le risque, avant de s'en protéger." isMobile={isMobile}>
      <div style={{ display: "grid", gridTemplateColumns: principeColumns, gap: "12px" }}>
        {PRINCIPES.map((p, i) => (
          <div key={p.title} style={{ ...cardStyle, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ background: PRINCIPE_COLORS[i][0], color: PRINCIPE_COLORS[i][1], padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", minHeight: "86px" }}>
              <span style={{ fontSize: "38px", fontWeight: 800, lineHeight: 1, flex: "none" }}>{i + 1}</span>
              <span style={{ fontWeight: 800, fontSize: "14px", lineHeight: 1.25, textTransform: "uppercase" }}>{p.title}</span>
            </div>
            <div style={{ ...textStyle, padding: "12px 16px" }}>{p.example}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--color-neutral-700)", margin: "10px 0 0", lineHeight: 1.45, maxWidth: "720px" }}>
        Cette liste vient du Code du travail français (art. L.4121-2). Le Code du travail ivoirien ne l'énumère pas sous cette forme : elle est présentée ici comme une bonne pratique. Les exemples sont propres à nos activités.
      </p>
      </Repliable>

      <Repliable title="Les obligations en Côte d'Ivoire" isMobile={isMobile}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "14px" }}>
        {OBLIGATIONS.map((o, i) => (
          <div key={o.who} style={{ background: OBLIGATION_COLORS[i][0], border: `1.5px solid ${OBLIGATION_COLORS[i][1]}`, borderRadius: "8px", padding: "18px 20px" }}>
            <div className="card-title" style={{ margin: "0 0 10px", color: OBLIGATION_COLORS[i][2] }}>{o.who}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {o.items.map((it) => (
                <div key={it.text} style={{ display: "flex", justifyContent: "space-between", gap: "14px" }}>
                  <span style={textStyle}>{it.text}</span>
                  <span style={{ ...refStyle, whiteSpace: "nowrap", paddingTop: "2px" }}>{it.ref}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </Repliable>

      <Repliable title="Mettre en œuvre la démarche" isMobile={isMobile}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {ETAPES.map((e, i) => (
          <div key={e.title} style={{ ...cardStyle, padding: "16px 18px", display: "flex", gap: "12px" }}>
            <span style={numberStyle}>{i + 1}</span>
            <div>
              <div style={{ ...titleStyle, marginBottom: "4px" }}>{e.title}</div>
              <div style={textStyle}>{e.text}</div>
              <div style={{ ...refStyle, marginTop: "6px" }}>{e.ref}</div>
            </div>
          </div>
        ))}
      </div>
      </Repliable>

      <Repliable title="Réagir face à un accident" isMobile={isMobile}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "14px" }}>
        {ACCIDENT.map((a, i) => (
          <div key={a.title} style={{ background: "#fbebeb", border: "1.5px solid #e08585", borderRadius: "8px", padding: "16px 18px", display: "flex", gap: "12px" }}>
            <span style={{ ...numberStyle, background: "#c0392b" }}>{i + 1}</span>
            <div>
              <div style={{ ...titleStyle, marginBottom: "4px" }}>{a.title}</div>
              <div style={textStyle}>{a.text}</div>
            </div>
          </div>
        ))}
      </div>
      </Repliable>

      <Repliable title="Sources" isMobile={isMobile}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {SOURCES.map((s) => (
          <li key={s.href}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: "#2c5f82", fontSize: "14px", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "40px" }}>
              {s.label} <ExternalLink size={13} aria-hidden="true" style={{ flex: "none" }} />
            </a>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: "12.5px", color: "var(--color-neutral-700)", margin: "16px 0 0", lineHeight: 1.5, maxWidth: "720px" }}>
        Contenu vérifié le 2 novembre 2026. Cette page résume les textes et ne remplace pas un conseil juridique.
      </p>
      </Repliable>
    </div>
  );
}
