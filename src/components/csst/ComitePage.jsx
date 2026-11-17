import React, { useState } from "react";
import { Link } from "react-router-dom";
import Repliable from "@/components/csst/Repliable";
import { ClipboardCheck, ExternalLink, FileSearch, Lightbulb, Megaphone, Search, CalendarDays, ChevronDown, FileText, LifeBuoy, Users, ClipboardList, GraduationCap, HeartHandshake, PenLine, ShieldCheck, Stethoscope, User, UserCog, Vote, CircleHelp } from "lucide-react";

// Contenu vérifié le 2 novembre 2026 sur le texte des décrets n° 2020-955 et n° 2020-956
// (Journal officiel n° 14 du 18 février 2021) et sur les documents de la CNPS.

const CHIFFRES = [
  { value: "+ de 50", label: "salariés : comité obligatoire", ref: "Art. 2" },
  { value: "2 à 9", label: "représentants élus du personnel", ref: "Art. 6 et 7" },
  { value: "1 réunion", label: "du comité par trimestre, au minimum", ref: "Art. 9" },
  { value: "2 ans", label: "de mandat, renouvelable", ref: "Art. 8" },
];

const MISSIONS = [
  { title: "Sensibilisation des employés", text: "Veiller à l'information des nouveaux embauchés et des travailleurs changeant de poste, et à la formation de tous aux risques et aux moyens de s'en protéger.", ref: "Art. 3", icon: Megaphone, bg: "#fff7c2", color: "#7a6200" },
  { title: "Conformité aux règles", text: "Inspecter l'entreprise pour vérifier l'application des règles et consignes d'hygiène et de sécurité, notamment pour les machines, installations et équipements de protection.", ref: "Art. 3", icon: ClipboardCheck, bg: "#c9fbe5", color: "#116149" },
  { title: "Analyse des risques", text: "Analyser les risques professionnels auxquels les travailleurs peuvent être exposés, ainsi que les conditions de travail.", ref: "Art. 3", icon: Search, bg: "#ffe3cd", color: "#8a4a17" },
  { title: "Suivi des accidents", text: "Se réunir à la suite de tout accident grave, ou qui aurait pu l'être, pour en examiner les circonstances et les mesures à prendre.", ref: "Art. 3 et 9", icon: FileSearch, bg: "#ffd9d9", color: "#962f2f" },
  { title: "Améliorations de la sécurité", text: "Proposer des méthodes de travail plus sûres, participer au choix des équipements de protection et donner son avis sur le programme annuel de prévention.", ref: "Art. 3 et 4", icon: Lightbulb, bg: "#e5fbb8", color: "#476b0d" },
];

const EFFECTIFS = [
  ["51 à 100 travailleurs", "2"],
  ["101 à 300 travailleurs", "3"],
  ["301 à 750 travailleurs", "5"],
  ["751 à 1 000 travailleurs", "7"],
  ["1 001 travailleurs et plus", "9"],
];

const PRESIDENT = { title: "Le président", text: "Le chef d'entreprise ou son représentant", icon: UserCog };
const MEMBRES = [
  { title: "Chargé de sécurité", text: "Chef du service sécurité ou agent spécialiste", icon: ShieldCheck, soft: "#fff1e3", dark: "#a84f0c" },
  { title: "Médecin du travail", text: "Le ou les médecins de l'entreprise", icon: Stethoscope, soft: "#fbebeb", dark: "#c0392b" },
  { title: "Assistant social", text: "L'assistant social de l'entreprise", icon: HeartHandshake, soft: "#f3ecf8", dark: "#6c3483" },
  { title: "Responsable de la formation", text: "Pour les besoins de formation du personnel", icon: GraduationCap, soft: "#eaf2fa", dark: "#2c5f82" },
  { title: "Représentants du personnel", text: "Élus par les travailleurs (art. 6)", icon: Vote, soft: "#eaf7ee", dark: "#1e8449" },
  { title: "Secrétaire", text: "Désigné par le chef d'entreprise parmi les représentants", icon: PenLine, soft: "#fff4dc", dark: "#8a5a00" },
];

const THEMES = [
  { title: "Les réunions", icon: CalendarDays, soft: "#eaf2fa", line: "#5b9bd5", dark: "#2c5f82", items: [
    ["Au moins une réunion par trimestre, à l'initiative du président", "Art. 9"],
    ["Ordre du jour communiqué par le secrétaire au moins 15 jours avant", "Art. 9"],
    ["Réunion supplémentaire après un accident grave ou qui aurait pu l'être, ou à la demande motivée de deux représentants", "Art. 9"],
    ["Dans l'établissement, dans un local approprié et pendant les heures de travail", "Art. 9"],
  ] },
  { title: "Les documents", icon: FileText, soft: "#eaf7ee", line: "#6fbf87", dark: "#1e8449", items: [
    ["Procès-verbaux et rapports transmis à l'inspection de la santé et sécurité au travail, à l'inspection du travail et à la CNPS", "Art. 9"],
    ["Bilan de l'année écoulée et programme annuel de prévention présentés avant la fin du premier trimestre", "Art. 15"],
    ["Bilan et programme transmis aux mêmes organismes, avec l'avis du comité", "Art. 16"],
  ] },
  { title: "Les membres", icon: Users, soft: "#fff4dc", line: "#e6b655", dark: "#8a5a00", items: [
    ["Membre sortant remplacé dans un délai d'un mois, pour la durée restante du mandat", "Art. 8"],
    ["Temps de réunion et de mission rémunéré comme temps de travail", "Art. 11"],
    ["Pour les représentants du personnel : 15 heures par mois au plus, sauf circonstances exceptionnelles ou convention contraire", "Art. 18"],
  ] },
  { title: "Les moyens et l'appui", icon: LifeBuoy, soft: "#fbebeb", line: "#e08585", dark: "#c0392b", items: [
    ["Moyens de fonctionnement fournis par l'employeur", "Art. 12"],
    ["Recours possible à un expert en cas de risque grave ou de projet modifiant fortement les conditions de travail, aux frais de l'employeur", "Art. 13"],
  ] },
];

const PROGRAMME = ["Cadre légal", "Évaluation des risques", "Analyse d'un accident", "Inspection des lieux de travail", "Conduite des réunions"];

const FAQ = [
  { q: "Notre entreprise compte 50 salariés ou moins : que faire ?", a: "Le comité n'est pas à créer : la délégation du personnel en joue le rôle (décret 2020-955, art. 2)." },
  { q: "La formation des membres est-elle obligatoire ?", a: "Oui. Les membres doivent bénéficier de la formation nécessaire à leurs missions, financée par l'employeur dans le cadre de la formation professionnelle continue (art. 20). Le décret n'en fixe ni la durée ni le programme." },
  { q: "Les représentants du personnel sont-ils protégés ?", a: "Oui, ils bénéficient des mêmes protections que les délégués du personnel et les délégués syndicaux (art. 18)." },
  { q: "Les membres sont-ils tenus au secret ?", a: "Oui, à une obligation de discrétion pour les informations confidentielles et au secret professionnel pour les procédés de fabrication (art. 19)." },
  { q: "Que faire en cas de désaccord entre l'employeur et le comité sur les mesures à prendre ?", a: "Le président saisit l'inspecteur du travail et des lois sociales et le médecin inspecteur du travail (art. 17)." },
  { q: "Un retrait face à un danger peut-il être sanctionné ?", a: "Non : aucune sanction ni retenue de salaire si le travailleur avait un motif raisonnable de penser que la situation présentait un danger grave et imminent (décret 2020-956, art. 7)." },
  { q: "Quel est le délai pour déclarer un accident du travail ?", a: "L'employeur dispose de 48 heures pour déclarer l'accident à la CNPS. S'il ne le fait pas, la victime ou ses ayants droit peuvent effectuer la déclaration dans un délai de 2 ans." },
];

const SOURCES = [
  { label: "Décret n° 2020-955 relatif au comité de santé et sécurité au travail (texte reproduit par Loi d'ici)", href: "https://loidici.biz/2021/04/18/le-comite-de-sante-et-securite-au-travail-csst/lois-article-par-article/codes/le-code-du-travail/comite-de-travail/20891/naty/" },
  { label: "Décret n° 2020-956 relatif au devoir d'alerte et au droit de retrait (texte reproduit par Loi d'ici)", href: "https://loidici.biz/2021/04/15/le-decret-n-2020-956-du-9-decembre-2020-relatif-au-devoir-dalerte-et-au-droit-de-retrait-en-cas-de-danger-grave-et-imminent/lois-article-par-article/plus-de-textes-de-lois/20821/naty/" },
  { label: "Gouvernement de Côte d'Ivoire : communiqué du Conseil des ministres du 9 décembre 2020", href: "https://www.gouv.ci/uploads/publications/1607545013COMMUNIQUE-DU-CONSEIL-DES-MINISTRES-DU-MERCREDI-09-DECEMBRE-2020.pdf" },
  { label: "CNPS : parcours de la victime d'un accident du travail", href: "https://www.cnps.ci/wp-content/uploads/2025/09/Parcours-simplifies-AT-VICTIME.pdf" },
  { label: "CNPS : accidents du travail et maladies professionnelles", href: "https://www.cnps.ci/wp-content/uploads/2021/04/ACCIDENTS-DU-TRAVAIL-ET-MALADIES-ATMP.pdf" },
  { label: "SécuriCours : guide du CSST en Côte d'Ivoire", href: "https://securicours.com/guides/csst-cote-divoire/" },
];

const cardStyle = { background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px" };
const refStyle = { fontSize: "12px", fontWeight: 700, color: "var(--color-neutral-700)", whiteSpace: "nowrap" };
const CHIFFRE_COLORS = [["#eaf2fa", "#5b9bd5", "#2c5f82"], ["#eaf7ee", "#6fbf87", "#1e8449"], ["#fff4dc", "#e6b655", "#8a5a00"], ["#fbebeb", "#e08585", "#c0392b"]];

function BlocVertical({ title, icon: Icon, soft, line, dark, isMobile, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderLeft: `5px solid ${line}`, borderRadius: "8px", overflow: "hidden", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "210px 1fr" }}>
      <div style={{ background: soft, color: dark, padding: "16px 18px", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-start", gap: "10px", fontWeight: 700, fontSize: "15px", lineHeight: 1.3 }}>
        <Icon size={isMobile ? 20 : 26} aria-hidden="true" style={{ flex: "none" }} />
        {title}
      </div>
      <div style={{ padding: "6px 18px", minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function ComitePage({ isMobile, isTablet }) {
  const [openFaq, setOpenFaq] = useState(0);
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px,3vw,34px)", margin: "4px 0 6px", color: "#1c2b3d" }}>Le comité de santé et sécurité au travail</h1>
      <p style={{ color: "var(--color-neutral-700)", maxWidth: "700px", margin: "0 0 22px" }}>
        Instance de dialogue entre l'employeur et les travailleurs, le CSST agit pour la santé, la sécurité et les conditions de travail. Ses règles sont fixées par le décret n° 2020-955 du 9 décembre 2020, pris en application des articles 42.1 à 42.3 du Code du travail.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "12px" }}>
        {CHIFFRES.map((c, i) => (
          <div key={c.label} style={{ background: CHIFFRE_COLORS[i][0], border: `1.5px solid ${CHIFFRE_COLORS[i][1]}`, borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 700, color: CHIFFRE_COLORS[i][2], lineHeight: 1.1 }}>{c.value}</div>
            <div style={{ fontSize: "13px", color: "var(--color-neutral-800)", margin: "6px 0", lineHeight: 1.35 }}>{c.label}</div>
            <div style={refStyle}>{c.ref}</div>
          </div>
        ))}
      </div>

      <Repliable title="Les missions du comité" sub="Cinq domaines d'action pour renforcer la santé et la sécurité au travail." isMobile={isMobile} defaultOpen>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "14px" }}>
        {MISSIONS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title} style={{ ...cardStyle, padding: "18px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "999px", background: m.bg, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <div className="card-title" style={{ margin: "0 0 4px", color: "#1c2b3d" }}>{m.title}</div>
                <div style={{ fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.5 }}>{m.text}</div>
                <div style={{ ...refStyle, marginTop: "6px" }}>{m.ref}</div>
              </div>
            </div>
          );
        })}
      </div>
      </Repliable>

      <Repliable title="Composition" sub="Qui siège au comité et combien de représentants élire selon l'effectif." isMobile={isMobile}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "3fr 2fr", gap: "14px" }}>
        <div style={{ ...cardStyle, padding: "18px" }}>
          <div className="card-title" style={{ margin: "0 0 12px", color: "#1c2b3d" }}>Membres du comité <span style={refStyle}>Art. 5</span></div>
          <div style={{ background: "#1c2b3d", color: "#fff", borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            {React.createElement(PRESIDENT.icon, { size: 24, "aria-hidden": true, style: { flex: "none" } })}
            <div>
              <div style={{ fontWeight: 700 }}>{PRESIDENT.title}</div>
              <div style={{ fontSize: "13.5px" }}>{PRESIDENT.text}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "10px" }}>
            {MEMBRES.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.title} style={{ background: m.soft, borderRadius: "8px", padding: "12px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Icon size={20} color={m.dark} aria-hidden="true" style={{ flex: "none", marginTop: "1px" }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: m.dark, lineHeight: 1.25, marginBottom: "2px" }}>{m.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--color-neutral-800)", lineHeight: 1.35 }}>{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: "18px" }}>
          <div className="card-title" style={{ margin: "0 0 4px", color: "#1c2b3d" }}>Représentants du personnel <span style={refStyle}>Art. 7</span></div>
          <div style={{ fontSize: "13px", color: "var(--color-neutral-700)", marginBottom: "10px" }}>Nombre minimum selon l'effectif</div>
          {EFFECTIFS.map(([e, n]) => (
            <div key={e} style={{ padding: "9px 0", borderTop: "1px solid var(--color-neutral-200)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14px", color: "var(--color-neutral-800)", marginBottom: "4px" }}>
                <span>{e}</span><strong style={{ color: "#1c2b3d" }}>{n}</strong>
              </div>
              <div aria-hidden="true" style={{ display: "flex", gap: "1px", color: "#27AE60" }}>
                {Array.from({ length: Number(n) }).map((_, i) => <User key={i} size={16} fill="currentColor" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: "14px", background: "#fff4dc", border: "1.5px solid #e6b655", borderRadius: "8px", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.45 }}>
        <ClipboardList size={20} color="#8a5a00" aria-hidden="true" style={{ flex: "none", marginTop: "1px" }} />
        <span><strong>À faire :</strong> afficher la liste nominative des membres sur les lieux de travail et la communiquer à l'inspecteur du travail, à la direction de la Santé et sécurité au travail et à la CNPS (art. 7).</span>
      </div>
      </Repliable>

      <Repliable title="Le comité au quotidien" sub="Les règles, la formation et les réponses aux questions courantes, au même endroit." isMobile={isMobile}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {THEMES.map((t) => (
          <BlocVertical key={t.title} title={t.title} icon={t.icon} soft={t.soft} line={t.line} dark={t.dark} isMobile={isMobile}>
            {t.items.map(([regle, art], i) => (
              <div key={regle} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", padding: "10px 0", borderTop: i ? "1px solid var(--color-neutral-200)" : "none" }}>
                <span style={{ fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.45 }}>{regle}</span>
                <span style={{ ...refStyle, flex: "none", background: "var(--color-neutral-100)", borderRadius: "999px", padding: "3px 9px" }}>{art}</span>
              </div>
            ))}
          </BlocVertical>
        ))}

        <BlocVertical title="La formation des membres" icon={GraduationCap} soft="#f3ecf8" line="#a569bd" dark="#6c3483" isMobile={isMobile}>
          <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px" }}>
            <span style={{ fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.45 }}>Les membres doivent recevoir la formation nécessaire à leurs missions, financée par l'employeur. La direction de la Santé et sécurité au travail, l'inspection du travail, la CNPS ou tout organisme qualifié peuvent y contribuer.</span>
            <span style={{ ...refStyle, flex: "none", background: "var(--color-neutral-100)", borderRadius: "999px", padding: "3px 9px" }}>Art. 20</span>
          </div>
          <div style={{ padding: "10px 0", borderTop: "1px solid var(--color-neutral-200)" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1c2b3d", marginBottom: "8px" }}>Programme conseillé <span style={{ fontWeight: 400, color: "var(--color-neutral-700)" }}>(le décret n'impose ni durée ni programme)</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PROGRAMME.map((item) => (
                <span key={item} style={{ background: "#f3ecf8", color: "#6c3483", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 600 }}>{item}</span>
              ))}
            </div>
          </div>
        </BlocVertical>

        <BlocVertical title="Les questions fréquentes" icon={CircleHelp} soft="var(--color-neutral-200)" line="#1c2b3d" dark="#1c2b3d" isMobile={isMobile}>
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} style={{ borderTop: i ? "1px solid var(--color-neutral-200)" : "none" }}>
                <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "11px 0", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontWeight: 600, fontSize: "14px", color: "#1c2b3d" }}>
                  {f.q}
                  <ChevronDown size={18} aria-hidden="true" style={{ flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
                </button>
                {open && <p style={{ margin: 0, padding: "0 0 12px", fontSize: "14px", color: "var(--color-neutral-800)", lineHeight: 1.55 }}>{f.a}</p>}
              </div>
            );
          })}
        </BlocVertical>
      </div>

      <p style={{ margin: "18px 0 0", fontSize: "14px", color: "var(--color-neutral-800)" }}>
        Danger grave et imminent : la marche à suivre est dans <Link to="/csst?onglet=consignes" style={{ color: "#2c5f82", fontWeight: 600, textDecoration: "underline", display: "inline-block", padding: "12px 2px" }}>Consignes de sécurité</Link>.
      </p>
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
        Décrets publiés au Journal officiel n° 14 du 18 février 2021. Contenu vérifié le 2 novembre 2026. Cette page résume les textes et ne remplace pas un conseil juridique. Le décret n° 2020-955 ne prévoit pas de sanction propre.
      </p>
      </Repliable>
    </div>
  );
}
