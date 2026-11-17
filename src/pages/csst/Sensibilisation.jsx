import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCsstProgress } from "@/hooks/useCsstProgress";
import {
  QUIZ_DEFS,
  MONTHS,
  QUIZ_ORDER,
  MODULE_STYLE,
  PASS_THRESHOLD,
} from "@/components/csst/data";
import CertificatPage from "@/components/csst/CertificatPage";
import ComitePage from "@/components/csst/ComitePage";
import PreventionPage from "@/components/csst/PreventionPage";
import ConsignesPage from "@/components/csst/ConsignesPage";
import ContactsPage from "@/components/csst/ContactsPage";
import { Car, HardHat, Monitor, Trees } from "lucide-react";
import Header from "@/components/csst/Header";
import { useViewport } from "@/hooks/useViewport";
import {
  downloadCertificateAsPdf,
  downloadAllCertificatesAsPdf,
} from "@/utils/csst/certificatePdf";

const QUIZ_ICONS = { terrain: HardHat, route: Car, ergonomie: Monitor, isole: Trees };
const CABINET_NAME = "Cabinet de Géomètre-Expert Soro Nanga";

// Ordre aléatoire des réponses : la bonne réponse n'occupe plus presque toujours la position B.
function shuffledIndexes(count) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
const buildOptionOrders = (id) => QUIZ_DEFS[id].questions.map((q) => shuffledIndexes(q.opts.length));

function tabBtnStyle(active) {
  return {
    padding: "14px 4px",
    borderRadius: 0,
    fontFamily: "var(--font-body)",
    fontWeight: active ? 600 : 500,
    fontSize: "13px",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    background: "transparent",
    borderBottom: active ? "2.5px solid var(--color-accent-700)" : "2.5px solid transparent",
    color: active ? "var(--color-text)" : "var(--color-neutral-700)",
    transition: "color .15s ease, border-color .15s ease",
  };
}

const checkSvg = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: "3px" }}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

// Fiches de risques — 6 cartes horizontales (risques / mesures).
const FICHES = [
  {
    title: "Relevés topographiques sur voie publique",
    level: "Risque élevé",
    elevated: true,
    icon: '<path d="M12 3l9 16H3z"></path><path d="M12 10v4"></path><circle cx="12" cy="17" r="0.4"></circle>',
    risques: ["Collision avec les véhicules en circulation", "Visibilité réduite (météo, luminosité)", "Chutes de plain-pied", "Exposition aux intempéries"],
    mesures: ["Vêtement haute visibilité classe 3", "Signalisation temporaire (cônes, panneaux)", "Balisage du périmètre de travail", "Second agent en soutien si possible"],
  },
  {
    title: "Intervention sur chantier BTP",
    level: "Risque élevé",
    elevated: true,
    icon: '<path d="M4 14a8 8 0 0116 0"></path><path d="M3 14h18"></path><path d="M12 6v3"></path>',
    risques: ["Circulation d'engins de chantier", "Chute dans une tranchée ou fouille", "Coactivité avec d'autres corps de métier", "Chute d'objets, ensevelissement"],
    mesures: ["EPI complets (casque, chaussures, gilet)", "Respect du plan de circulation du chantier", "Coordination avec le responsable sécurité du chantier", "Jamais dans une fouille non sécurisée"],
  },
  {
    title: "Déplacements en véhicule de service",
    level: "Risque modéré",
    elevated: false,
    icon: '<rect x="3" y="9" width="18" height="6" rx="2"></rect><circle cx="7.5" cy="17" r="1.6"></circle><circle cx="16.5" cy="17" r="1.6"></circle><path d="M6 9l2-4h8l2 4"></path>',
    risques: ["Accident de la route", "Fatigue au volant", "Chargement / déchargement du matériel", "Conditions météo dégradées"],
    mesures: ["Respect du code de la route et des pauses", "Arrimage systématique du matériel", "Entretien régulier du véhicule", "Planification des tournées"],
  },
  {
    title: "Bureau d'études / poste CAO-DAO",
    level: "Risque modéré",
    elevated: false,
    icon: '<rect x="3" y="4" width="18" height="12" rx="1.5"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path>',
    risques: ["Troubles musculo-squelettiques (TMS)", "Fatigue visuelle", "Sédentarité prolongée", "Stress lié aux délais"],
    mesures: ["Réglage ergonomique du poste", "Pauses régulières (règle 20-20-20)", "Alternance des tâches", "Éclairage adapté"],
  },
  {
    title: "Travail isolé en milieu naturel / forestier",
    level: "Risque élevé",
    elevated: true,
    icon: '<path d="M12 3l4 6h-3l4 6h-3l3 5H7l3-5H7l4-6H8z"></path><path d="M12 20v2"></path>',
    risques: ["Isolement en cas d'accident", "Terrain difficile (dénivelés, cours d'eau)", "Absence de réseau téléphonique", "Faune (serpents, insectes, autres animaux)"],
    mesures: ["Dispositif d'alarme travailleur isolé (DATI)", "Déclaration d'itinéraire avant départ", "Équipement adapté et trousse de secours", "Point de contact horaire fixé"],
  },
  {
    title: "Appareils topographiques et drone",
    level: "Risque modéré",
    elevated: false,
    icon: '<rect x="9.5" y="9.5" width="5" height="5" rx="1"></rect><circle cx="4.5" cy="4.5" r="2.2"></circle><circle cx="19.5" cy="4.5" r="2.2"></circle><circle cx="4.5" cy="19.5" r="2.2"></circle><circle cx="19.5" cy="19.5" r="2.2"></circle><path d="M9.7 9.7L6.2 6.2M14.3 9.7l3.5-3.5M9.7 14.3l-3.5 3.5M14.3 14.3l3.5 3.5"></path>',
    risques: ["Proximité de lignes électriques (perches, drones)", "TMS liés au port du matériel", "Non-respect de la réglementation aérienne", "Collision drone / tiers"],
    mesures: ["Vérification des distances aux lignes HT", "Formation télépilote et déclaration des vols", "Respect des zones interdites de vol", "Manutention avec aides adaptées"],
  },
];

// Consignes par zone — 4 cartes.
const CONSIGNES = [
  {
    title: "Voie publique et abords de chantier",
    bg: "var(--color-accent-100)",
    iconBg: "var(--color-accent-100)",
    iconColor: "var(--color-accent-700)",
    icon: '<path d="M4 14a8 8 0 0116 0"></path><path d="M3 14h18"></path><path d="M12 6v3"></path>',
    items: ["Porter un vêtement haute visibilité", "Installer la signalisation avant les relevés", "Se positionner face à la circulation", "Choisir un emplacement dégagé", "Rester attentif au bruit, sans écouteurs", "Replier le matériel en fin d'intervention"],
  },
  {
    title: "Chantier BTP en activité",
    bg: "var(--color-accent-2-100)",
    iconBg: "var(--color-accent-2-100)",
    iconColor: "var(--color-accent-2-700)",
    icon: '<rect x="3" y="9" width="18" height="6" rx="2"></rect><circle cx="7.5" cy="17" r="1.6"></circle><circle cx="16.5" cy="17" r="1.6"></circle><path d="M6 9l2-4h8l2 4"></path>',
    items: ["Se signaler à l'accueil chantier", "Porter les EPI obligatoires du site", "Suivre le plan de circulation des engins", "Attendre le signal avant de croiser un engin", "Ne jamais approcher une fouille non sécurisée", "Signaler toute anomalie au responsable"],
  },
  {
    title: "Terrain naturel / forestier isolé",
    bg: "var(--color-accent-200)",
    iconBg: "var(--color-accent-300)",
    iconColor: "var(--color-accent-900)",
    icon: '<path d="M12 3l4 6h-3l4 6h-3l3 5H7l3-5H7l4-6H8z"></path><path d="M12 20v2"></path>',
    items: ["Déclarer son itinéraire avant le départ", "Vérifier téléphone et dispositif DATI", "Emporter trousse de secours et eau", "Adapter tenue et équipement au terrain", "Prévenir le référent en cas d'imprévu", "Ne jamais s'engager sur zone instable"],
  },
  {
    title: "Bureau d'études",
    bg: "#eaf1f7",
    iconBg: "#dce8f2",
    iconColor: "#2c5f82",
    icon: '<rect x="3" y="4" width="18" height="12" rx="1.5"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path>',
    items: ["Régler son poste (écran, siège)", "Faire une pause de 5 min par heure", "Positionner l'écran perpendiculaire aux fenêtres", "Signaler tout inconfort persistant", "Garder l'espace de circulation dégagé"],
  },
];

function IconSvg({ paths, size = 26, stroke = "var(--color-accent-700)", width = 2.75 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
  );
}

function FicheCard({ fiche, isMobile, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const visible = !isMobile || open;
  const iconBg = fiche.elevated ? "var(--color-accent-100)" : "var(--color-accent-2-100)";
  const iconColor = fiche.elevated ? "var(--color-accent-700)" : "var(--color-accent-2-700)";
  const badgeBg = fiche.elevated ? "var(--color-accent-100)" : "var(--color-accent-2-100)";
  const badgeColor = fiche.elevated ? "var(--color-accent-800)" : "var(--color-accent-2-800)";
  return (
    <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px", overflow: "hidden" }}>
      <div role={isMobile ? "button" : undefined} tabIndex={isMobile ? 0 : undefined} aria-expanded={isMobile ? visible : undefined} onClick={() => isMobile && setOpen(!open)} onKeyDown={(e) => { if (isMobile && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(!open); } }} style={{ display: "flex", alignItems: "center", gap: "14px", padding: isMobile ? "14px" : "20px 20px 16px", borderBottom: visible ? "1px solid var(--color-neutral-200)" : "none", cursor: isMobile ? "pointer" : "default" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <IconSvg paths={fiche.icon} stroke={iconColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="card-title" style={{ margin: "0 0 6px", color: "#1c2b3d" }}>{fiche.title}</div>
          <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: badgeBg, color: badgeColor }}>{fiche.level}</span>
        </div>
      </div>
      {visible && <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1px", background: "var(--color-neutral-200)" }}>
        <div style={{ background: "#fdf2ee", padding: "16px 18px" }}>
          <div style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-accent-800)", borderBottom: "1px solid rgba(198,113,57,0.25)", paddingBottom: "6px" }}>Risques principaux</div>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--color-neutral-800)", lineHeight: 1.6 }}>
            {fiche.risques.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
        <div style={{ background: "#eef4e9", padding: "16px 18px" }}>
          <div style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-accent-2-800)", borderBottom: "1px solid rgba(122,138,94,0.3)", paddingBottom: "6px" }}>Mesures de prévention</div>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--color-neutral-800)", lineHeight: 1.6 }}>
            {fiche.mesures.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      </div>}
    </div>
  );
}

function ConsigneCard({ c }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--color-neutral-200)", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <IconSvg paths={c.icon} size={22} stroke={c.iconColor} />
        </div>
        <div className="card-title" style={{ margin: 0, color: "#1c2b3d" }}>{c.title}</div>
      </div>
      <div style={{ margin: 0, padding: "18px 20px", background: c.bg, display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {c.items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", color: c.iconColor }}>
            {checkSvg}
            <span style={{ color: "var(--color-neutral-800)" }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CsstSensibilisation() {
  const viewport = useViewport();
  const isMobile = viewport === "mobile";
  const isTablet = viewport === "tablet";
  const isMobileOrTablet = isMobile || isTablet;
  // Onglet piloté par l'adresse (/csst?onglet=quiz) : le menu officiel du portail y mène directement
  const [searchParams, setSearchParams] = useSearchParams();
  const CSST_TABS = ["fiches", "comite", "prevention", "consignes", "mensuel", "quiz", "contacts"];
  const activeTab = CSST_TABS.includes(searchParams.get("onglet")) ? searchParams.get("onglet") : "comite";
  // Premier menu (Le comité CSST) = page d'accueil de l'application
  const setActiveTab = (t) => setSearchParams(t === "comite" ? {} : { onglet: t });
  const [mensuelIndex, setMensuelIndex] = useState(new Date().getMonth());
  const [quizPhase, setQuizPhase] = useState("select");
  const [quizId, setQuizId] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [optionOrders, setOptionOrders] = useState([]);
  // Scores, certificats et nom enregistrés sur le compte de l'utilisateur (survivent aux actualisations)
  const { scores, setScores, certificates, setCertificates, participantName, setParticipantName } = useCsstProgress();
  const [nameInputValue, setNameInputValue] = useState("");
  const [nameDialogFor, setNameDialogFor] = useState(null);
  const [viewMode, setViewMode] = useState("app");
  const [viewingCertId, setViewingCertId] = useState(null);
  const [lastResultPct, setLastResultPct] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const DOWNLOAD_ERROR = "Le certificat n'a pas pu être téléchargé. Réessayez ; si le problème persiste, contactez l'assistance.";
  const monthStripRef = useRef(null);
  useEffect(() => {
    const strip = monthStripRef.current;
    const btn = strip && strip.querySelector(`[data-mois="${mensuelIndex}"]`);
    if (strip && btn && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = btn.offsetLeft - strip.offsetLeft - (strip.clientWidth - btn.offsetWidth) / 2;
  }, [mensuelIndex, activeTab]);
  const singleCertRef = useRef(null);
  const allCertsRefs = useRef([]);
  const certRefsById = useRef({});

  const threshold = PASS_THRESHOLD;

  const setTab = (tab) => setActiveTab(tab);
  // Changement d'onglet (bouton ou menu du portail) : retour à la vue normale
  useEffect(() => {
    setViewMode("app");
    if (activeTab !== "quiz") setQuizPhase("select");
    if (isMobileOrTablet) window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);


  const startQuiz = (id) => {
    setQuizId(id);
    setOptionOrders(buildOptionOrders(id));
    setQuizPhase("running");
    setQIndex(0);
    setSelected(null);
    setSubmitted(false);
    setAnswers([]);
  };
  const retryCurrentQuiz = () => {
    setOptionOrders(buildOptionOrders(quizId));
    setQuizPhase("running");
    setQIndex(0);
    setSelected(null);
    setSubmitted(false);
    setAnswers([]);
  };
  const backToSelection = () => setQuizPhase("select");

  const selectOption = (idx) => {
    if (submitted) return;
    const next = answers.slice();
    next[qIndex] = idx;
    setSelected(idx);
    setSubmitted(true);
    setAnswers(next);
  };

  const nextQuestion = () => {
    const def = QUIZ_DEFS[quizId];
    if (qIndex + 1 < def.questions.length) {
      setQIndex(qIndex + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      const total = def.questions.length;
      let correctCount = 0;
      answers.forEach((a, i) => { if (a === def.questions[i].correct) correctCount++; });
      const pct = Math.round((correctCount / total) * 100);
      setScores((s) => ({ ...s, [quizId]: Math.max(s[quizId] || 0, pct) }));
      setLastResultPct(pct);
      setQuizPhase("result");
    }
  };

  const confirmName = () => {
    const name = (nameInputValue || "").trim();
    if (!name) return;
    const pending = nameDialogFor;
    setParticipantName(name);
    setNameDialogFor(null);
    if (pending) setTimeout(() => generateCertificate(pending), 0);
  };
  const cancelNameDialog = () => setNameDialogFor(null);

  const requestCertificate = (id) => {
    if (!participantName) { setNameDialogFor(id); setNameInputValue(""); return; }
    generateCertificate(id);
  };

  const generateCertificate = (id) => {
    if (certificates[id]) { viewCertificate(id); return; }
    const def = QUIZ_DEFS[id];
    const num = `CSST-${def.code}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    setCertificates((c) => ({ ...c, [id]: { number: num, date } }));
  };

  const viewCertificate = (id) => { setViewMode("certificate"); setViewingCertId(id); };
  const backFromCertView = () => setViewMode("app");
  const viewAllCertificates = () => setViewMode("all-certs");
  const backFromAllCerts = () => setViewMode("app");

  const downloadSingleCert = async () => {
    if (!singleCertRef.current || downloading) return;
    setDownloading(true);
    try {
      const cert = buildCertData(viewingCertId);
      await downloadCertificateAsPdf(singleCertRef.current, `certificat-${viewingCertId}.pdf`);
    } catch (e) {
      setDownloadError(DOWNLOAD_ERROR);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllCerts = async () => {
    const refs = allCertsRefs.current.filter(Boolean);
    if (!refs.length || downloading) return;
    setDownloading(true);
    try {
      await downloadAllCertificatesAsPdf(refs, "certificats-csst.pdf");
    } catch (e) {
      setDownloadError(DOWNLOAD_ERROR);
    } finally {
      setDownloading(false);
    }
  };

  const downloadCertById = async (id) => {
    const el = certRefsById.current[id];
    if (!el || downloadingId) return;
    setDownloadingId(id);
    setDownloadError("");
    try {
      await downloadCertificateAsPdf(el, `certificat-${id}.pdf`);
    } catch (e) {
      setDownloadError(DOWNLOAD_ERROR);
    } finally {
      setDownloadingId(null);
    }
  };

  const buildCertData = (id) => {
    const def = QUIZ_DEFS[id];
    const cert = certificates[id];
    if (!cert) return null;
    return {
      name: participantName,
      moduleTitle: def.title,
      score: (scores[id] || 0) + "%",
      date: cert.date,
      number: cert.number,
    };
  };

  const tabs = [
    { key: "fiches", label: "Risque Metiers", style: tabBtnStyle(activeTab === "fiches") },
    { key: "comite", label: "Le comité CSST", style: tabBtnStyle(activeTab === "comite") },
    { key: "prevention", label: "Démarche de prévention", style: tabBtnStyle(activeTab === "prevention") },
    { key: "consignes", label: "Consignes de Sécurité", style: tabBtnStyle(activeTab === "consignes") },
    { key: "mensuel", label: "Préventions Mensuels", style: tabBtnStyle(activeTab === "mensuel") },
    { key: "quiz", label: "Quiz & Certificats", style: tabBtnStyle(activeTab === "quiz") },
    { key: "contacts", label: "Contacts d'urgence", style: tabBtnStyle(activeTab === "contacts") },
  ];

  const currentMonth = MONTHS[mensuelIndex];
  const thisMonthIndex = new Date().getMonth();
  const monthColor = currentMonth.color;
  const monthDark = assombrir(monthColor);
  const allCertsIssued = QUIZ_ORDER.every((id) => !!certificates[id]);
  const validatedCount = QUIZ_ORDER.filter((id) => (scores[id] ?? -1) >= threshold).length;
  const issuedCount = QUIZ_ORDER.filter((id) => !!certificates[id]).length;

  // Quiz cards
  const quizCards = QUIZ_ORDER.map((id) => {
    const def = QUIZ_DEFS[id];
    const best = scores[id];
    const passed = best !== null && best !== undefined && best >= threshold;
    const hasBest = best !== null && best !== undefined;
    return {
      ...MODULE_STYLE[id],
      title: def.title,
      description: def.description,
      questionsLabel: `${def.questions.length} questions`,
      hasBest,
      bestLabel: hasBest ? best + "%" : "",
      bestTagStyle: { alignSelf: "flex-start", display: "inline-block", padding: "5px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: passed ? "var(--color-accent-2-100)" : "var(--color-neutral-200)", color: passed ? "var(--color-accent-2-800)" : "var(--color-neutral-700)" },
      buttonLabel: hasBest ? "Repasser le quiz" : "Commencer",
      start: () => startQuiz(id),
    };
  });

  // Cert cards
  const certCards = QUIZ_ORDER.map((id) => {
    const def = QUIZ_DEFS[id];
    const best = scores[id];
    const passed = best !== null && best !== undefined && best >= threshold;
    const cert = certificates[id];
    const badgeBase = { alignSelf: "flex-start", display: "inline-block", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" };
    let statusLabel, statusTagStyle, isLocked = false, isReady = false, isIssued = false, action = null;
    if (cert) { statusLabel = "Certificat obtenu"; statusTagStyle = { ...badgeBase, background: "var(--color-accent-2-100)", color: "var(--color-accent-2-800)" }; isIssued = true; action = () => downloadCertById(id); }
    else if (passed) { statusLabel = "Validé"; statusTagStyle = { ...badgeBase, background: "var(--color-accent-100)", color: "var(--color-accent-800)" }; isReady = true; action = () => requestCertificate(id); }
    else { statusLabel = "Non validé"; statusTagStyle = { ...badgeBase, background: "var(--color-neutral-200)", color: "var(--color-neutral-700)" }; isLocked = true; }
    return {
      ...MODULE_STYLE[id],
      id,
      title: def.title, statusLabel, statusTagStyle, isLocked, isReady, isIssued,
      number: cert ? cert.number : "", date: cert ? cert.date : "",
      threshold: threshold + "%", action,
    };
  });

  // Running quiz
  let running = {};
  if (quizPhase === "running" && quizId) {
    const def = QUIZ_DEFS[quizId];
    const q = def.questions[qIndex];
    const letters = ["A", "B", "C", "D"];
    running = {
      runningQuizTitle: def.title,
      runningQNumber: qIndex + 1,
      runningQTotal: def.questions.length,
      runningProgressPct: Math.round((qIndex / def.questions.length) * 100) + "%",
      runningQuestionText: q.q,
      runningOptions: (optionOrders[qIndex] || q.opts.map((_, i) => i)).map((idx, position) => {
        const text = q.opts[idx];
        let bg = "var(--color-neutral-100)", border = "var(--color-neutral-200)", color = "var(--color-neutral-800)";
        if (submitted) {
          if (idx === q.correct) { bg = "var(--color-accent-2-100)"; border = "var(--color-accent-2-500)"; color = "var(--color-accent-2-800)"; }
          else if (idx === selected) { bg = "var(--color-accent-100)"; border = "var(--color-accent-500)"; color = "var(--color-accent-800)"; }
        }
        return {
          text, letter: letters[position],
          style: { display: "flex", alignItems: "center", gap: "12px", textAlign: "left", padding: isMobile ? "12px 12px" : "14px 16px", borderRadius: "var(--radius-lg)", border: `1.5px solid ${border}`, background: bg, color, fontSize: isMobile ? "14px" : "15px" },
          badgeStyle: { width: "26px", height: "26px", borderRadius: "999px", background: "rgba(0,0,0,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flex: "none" },
          onClick: () => selectOption(idx),
        };
      }),
      runningShowFeedback: submitted,
      runningFeedbackTitle: selected === q.correct ? "Bonne réponse" : "Réponse incorrecte",
      runningFeedbackBg: selected === q.correct ? "var(--color-accent-2-100)" : "var(--color-accent-100)",
      runningFeedbackColor: selected === q.correct ? "var(--color-accent-2-800)" : "var(--color-accent-800)",
      runningExplanation: q.exp,
      nextButtonLabel: qIndex + 1 < def.questions.length ? "Question suivante" : "Voir le résultat",
    };
  }

  // Result
  let result = {};
  if (quizPhase === "result" && quizId) {
    const pct = lastResultPct ?? 0;
    const passed = pct >= threshold;
    result = {
      resultPercentLabel: pct + "%",
      resultCircleBg: passed ? "var(--color-accent-2-100)" : "var(--color-accent-100)",
      resultCircleColor: passed ? "var(--color-accent-2-700)" : "var(--color-accent-700)",
      resultTitle: passed ? "Module validé" : "Module non validé",
      resultSubtitle: passed ? `Score de ${pct}%, au moins égal au seuil de ${threshold}%.` : `Score de ${pct}%, en dessous du seuil de ${threshold}%. Vous pouvez repasser le quiz.`,
      resultPassed: passed,
    };
  }


  // ===== RENDER =====
  if (viewMode === "certificate") {
    return (
      <div>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", padding: isMobile ? "14px 16px" : "18px clamp(16px,4vw,48px)", maxWidth: "1080px", margin: "0 auto" }}>
          <button className="btn btn-ghost csst-btn" onClick={backFromCertView}>← Retour</button>
          <button className="btn btn-primary csst-btn" disabled={downloading} onClick={downloadSingleCert}>{downloading ? "Génération…" : "Télécharger PDF"}</button>
        </div>
        <div style={{ maxWidth: "900px", margin: "0 auto 60px", display: "block", padding: isMobile ? "0 8px" : 0, overflowX: "auto" }}>
          <div ref={singleCertRef} style={isMobileOrTablet ? { width: "297mm" } : undefined}>
            <CertificatPage cert={buildCertData(viewingCertId)} />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "all-certs") {
    const allCertsData = QUIZ_ORDER.map((id) => buildCertData(id)).filter(Boolean);
    return (
      <div>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", padding: isMobile ? "14px 16px" : "18px clamp(16px,4vw,48px)", maxWidth: "1080px", margin: "0 auto" }}>
          <button className="btn btn-ghost csst-btn" onClick={backFromAllCerts}>← Retour</button>
          <button className="btn btn-primary csst-btn" disabled={downloading} onClick={downloadAllCerts}>{downloading ? "Génération…" : "Télécharger les 4 certificats (PDF)"}</button>
        </div>
        {allCertsData.map((cert, i) => (
          <div key={i} style={{ maxWidth: "900px", margin: "0 auto 40px", display: "block", padding: isMobile ? "0 8px" : 0, overflowX: "auto" }}>
            <div ref={(el) => (allCertsRefs.current[i] = el)} style={isMobileOrTablet ? { width: "297mm" } : undefined}>
              <CertificatPage cert={cert} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="csst-scope" style={{ minHeight: "100vh", background: "var(--color-neutral-100)", color: "var(--color-text)", fontFamily: "var(--font-body)" }}>
      {/* Header institutionnel */}
      <Header tabs={tabs} activeTab={activeTab} onTabChange={setTab} isMobile={isMobileOrTablet} />

      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: isMobile ? "20px 14px 60px" : "28px clamp(16px,4vw,48px) 80px" }}>
        {/* TAB 1: FICHES */}
        {activeTab === "fiches" && (
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px,3vw,34px)", margin: "4px 0 6px", color: "#1c2b3d" }}>Fiches de risques par activité</h1>
            <p style={{ color: "var(--color-neutral-700)", maxWidth: "640px", margin: "0 0 28px" }}>Les principaux risques identifiés pour chaque activité et les mesures de prévention associées.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "18px" }}>
              {FICHES.map((f, i) => <FicheCard key={i} fiche={f} isMobile={isMobile} defaultOpen={i === 0} />)}
            </div>
          </div>
        )}

        {/* TAB COMITÉ */}
        {activeTab === "comite" && <ComitePage isMobile={isMobile} isTablet={isTablet} />}

        {/* TAB DÉMARCHE DE PRÉVENTION */}
        {activeTab === "prevention" && <PreventionPage isMobile={isMobile} isTablet={isTablet} />}

        {/* TAB 2: CONSIGNES */}
        {activeTab === "consignes" && <ConsignesPage isMobile={isMobile} />}

        {/* TAB MENSUEL */}
        {activeTab === "mensuel" && (
          <div>
          <div ref={monthStripRef} role="group" aria-label="Choisir le mois" style={{ maxWidth: "760px", margin: "0 auto 16px", display: "grid", gridTemplateColumns: isMobile ? "none" : "repeat(6,1fr)", gridAutoFlow: isMobile ? "column" : "row", gridAutoColumns: isMobile ? "84px" : undefined, overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? "6px" : 0, gap: "8px" }}>
            {MONTHS.map((m, i) => {
              const on = i === mensuelIndex;
              return (
                <button key={m.id} data-mois={i} type="button" aria-pressed={on} title={m.theme} onClick={() => setMensuelIndex(i)} style={{ padding: "8px 4px", borderRadius: "8px", cursor: "pointer", border: `1.5px solid ${on ? m.color : "var(--color-neutral-200)"}`, background: on ? assombrir(m.color) : "#fff", color: on ? "#fff" : "#1c2b3d", fontSize: "12.5px", fontWeight: on ? 700 : 500, lineHeight: 1.25 }}>
                  <span aria-hidden="true" style={{ display: "block", fontSize: "18px" }}>{m.icon}</span>
                  {m.name}
                  {i === thisMonthIndex && <span style={{ display: "block", fontSize: "12px", fontWeight: 700 }}>ce mois-ci</span>}
                </button>
              );
            })}
          </div>
          <div style={{ maxWidth: "760px", margin: "0 auto", background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-md)", borderTop: `6px solid ${monthColor}` }}>
            <div style={{ padding: isMobile ? "18px 16px 20px" : "24px 28px 24px" }}>
              <div style={{ background: monthDark, borderRadius: "10px", padding: "14px 20px", textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.85)", marginBottom: "4px" }}>★ THÈME DU MOIS ★</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: isMobile ? "17px" : "20px", color: "#fff" }}>{currentMonth.theme}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div style={{ border: "1.5px solid #5b9bd5", background: "#eaf2fa", borderRadius: "8px", padding: "16px 18px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#2c5f82", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Présentation</div>
                  <div style={{ fontSize: "13.5px", color: "var(--color-neutral-800)", lineHeight: 1.6 }}>{currentMonth.presentation}</div>
                </div>
                <div style={{ border: "1.5px solid #6fbf87", background: "#eaf7ee", borderRadius: "8px", padding: "16px 18px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: monthDark, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Pourquoi c'est important ?</div>
                  <div style={{ fontSize: "13.5px", color: "var(--color-neutral-800)", lineHeight: 1.6 }}>{currentMonth.importance}</div>
                </div>
              </div>

              <div style={{ border: "1.5px solid #e08585", background: "#fbebeb", borderRadius: "8px", padding: "16px 18px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px" }}>Principaux risques</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {currentMonth.risques.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "999px", background: "#c0392b", color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: "1px" }}>{i + 1}</span>
                      <span style={{ fontSize: "13.5px", color: "var(--color-neutral-800)", lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: monthDark, borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                <div style={{ background: "#1c2b3d", color: "#fff", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", borderRadius: "8px", padding: "8px 10px", textAlign: "center", flex: "none", lineHeight: 1.3 }}>Règle<br />d'or</div>
                <div style={{ color: "#fff", fontSize: "13.5px", fontStyle: "italic", lineHeight: 1.5 }}>{currentMonth.goldenRule}</div>
              </div>

              <div style={{ border: "1px solid var(--color-neutral-200)", background: "var(--color-neutral-100)", borderRadius: "8px", padding: "16px 18px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: monthDark, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px" }}>Conseils pratiques</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {currentMonth.instructions.map((ins, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "999px", background: monthDark, color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: "1px" }}>{i + 1}</span>
                      <span style={{ fontSize: "13.5px", color: "var(--color-neutral-800)", lineHeight: 1.5 }}><strong>{ins.title}</strong> : {ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* TAB QUIZ & CERTIFICATS */}
        {activeTab === "quiz" && (
          <div>
            {quizPhase === "select" && (
              <div>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px,3vw,34px)", margin: "4px 0 6px", color: "#1c2b3d" }}>Quiz & certificats</h1>
                <p style={{ color: "var(--color-neutral-700)", maxWidth: "680px", margin: "0 0 24px" }}>4 modules de 20 questions. Seuil de réussite : {threshold}%. Le certificat d'un module se débloque dès qu'il est validé.</p>

                <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px", padding: "16px 18px", marginBottom: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", fontWeight: 700, color: "#1c2b3d", marginBottom: "8px" }}>
                    <span>Votre progression : {validatedCount} / {QUIZ_ORDER.length} modules validés</span>
                    <span style={{ fontWeight: 500, color: "var(--color-neutral-700)" }}>{issuedCount} certificat{issuedCount > 1 ? "s" : ""} obtenu{issuedCount > 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ height: "10px", borderRadius: "999px", background: "var(--color-neutral-200)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round((validatedCount / QUIZ_ORDER.length) * 100)}%`, background: "#27AE60", transition: "width .3s ease" }} />
                  </div>
                </div>

                {allCertsIssued && (
                  <div style={{ border: "1px solid var(--color-accent-2-500)", borderLeft: "4px solid var(--color-accent-2-600)", borderRadius: "6px", background: "var(--color-accent-2-100)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
                    <div style={{ fontWeight: 600, color: "var(--color-accent-2-800)" }}>Les 4 modules sont validés — tous vos certificats sont disponibles.</div>
                    <button className="btn btn-primary csst-btn" onClick={viewAllCertificates}>Télécharger les 4 certificats</button>
                  </div>
                )}

                {downloadError && (
                  <div role="alert" style={{ background: "#fbebeb", border: "1.5px solid #e08585", borderRadius: "8px", padding: "12px 16px", color: "#c0392b", fontWeight: 600, fontSize: "14px", marginBottom: "22px" }}>{downloadError}</div>
                )}

                {nameDialogFor !== null && (
                  <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px", padding: "22px", marginBottom: "22px", maxWidth: "420px", boxShadow: "var(--shadow-md)" }}>
                    <div className="card-title" style={{ margin: "0 0 4px" }}>Votre nom</div>
                    <div className="card-body" style={{ margin: "0 0 14px", color: "var(--color-neutral-700)" }}>Saisissez votre nom : il sera réutilisé pour tous vos certificats.</div>
                    <div className="field">
                      <input className="input" type="text" value={nameInputValue} onChange={(e) => setNameInputValue(e.target.value)} placeholder="Prénom Nom" />
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                      <button className="btn btn-primary csst-btn" onClick={confirmName}>Valider</button>
                      <button className="btn btn-ghost csst-btn" onClick={cancelNameDialog}>Annuler</button>
                    </div>
                  </div>
                )}

                <div id="csst-certificats" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: "20px", scrollMarginTop: "20px" }}>
                  {quizCards.map((q, i) => {
                    const c = certCards[i];
                    const certBtnBase = { width: "100%", padding: "10px 12px", borderRadius: "999px", fontWeight: 600, fontSize: "14px", lineHeight: 1.2, border: "1.5px solid var(--color-accent)", background: "#fff", color: "var(--color-accent-700)", cursor: "pointer" };
                    return (
                      <div key={i} style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderTop: `3px solid ${q.color}`, borderRadius: "8px", padding: "22px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: q.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                            {React.createElement(QUIZ_ICONS[c.id], { size: 21, color: q.iconColor, "aria-hidden": true })}
                          </div>
                          <div className="card-kicker" style={{ margin: 0 }}>{q.questionsLabel}</div>
                          <span style={{ ...c.statusTagStyle, marginLeft: "auto", alignSelf: "center", padding: "4px 10px", fontSize: "12px" }}>{c.statusLabel}</span>
                        </div>
                        <div className="card-title" style={{ margin: 0, color: "#1c2b3d" }}>{q.title}</div>
                        <div className="card-body" style={{ margin: 0, color: "var(--color-neutral-700)" }}>{q.description}</div>
                        {(q.hasBest || c.isIssued) && (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            {q.hasBest && <span style={q.bestTagStyle}>Meilleur score : {q.bestLabel}</span>}
                            {c.isIssued && <span style={{ color: "var(--color-neutral-700)", fontSize: "12px", background: "var(--color-neutral-100)", borderRadius: "6px", padding: "5px 10px" }}>Certificat N° {c.number} · {c.date}</span>}
                          </div>
                        )}
                        <div style={{ marginTop: "auto", paddingTop: "6px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
                          <button className="btn btn-primary csst-btn" style={{ width: "100%" }} onClick={q.start}>{q.buttonLabel}</button>
                          {c.isLocked && (
                            <button className="csst-btn" disabled title={`Réussissez le quiz à ${c.threshold} pour débloquer le certificat`} style={{ ...certBtnBase, borderColor: "var(--color-neutral-300)", color: "var(--color-neutral-500)", background: "var(--color-neutral-100)", cursor: "not-allowed" }}>
                              🔒 Certificat
                            </button>
                          )}
                          {c.isReady && (
                            <button className="csst-btn" style={certBtnBase} onClick={c.action}>Générer le certificat</button>
                          )}
                          {c.isIssued && (
                            <button className="csst-btn" style={certBtnBase} disabled={downloadingId === c.id} onClick={c.action}>{downloadingId === c.id ? "Génération…" : "Télécharger le certificat"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {quizPhase === "running" && running.runningQuizTitle && (
              <div style={{ maxWidth: "640px", margin: "0 auto", padding: isMobile ? "0 4px" : 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "19px" }}>{running.runningQuizTitle}</div>
                  <div style={{ color: "var(--color-neutral-700)", fontSize: "14px" }}>Question {running.runningQNumber} / {running.runningQTotal}</div>
                </div>
                <div style={{ height: "8px", borderRadius: "999px", background: "var(--color-neutral-200)", overflow: "hidden", marginBottom: "28px" }}>
                  <div style={{ height: "100%", borderRadius: "999px", background: "var(--color-accent)", width: running.runningProgressPct, transition: "width .3s ease" }} />
                </div>

                <div style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderRadius: "8px", padding: isMobile ? "18px" : "26px", boxShadow: "var(--shadow-md)" }}>
                  <div style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: 600, marginBottom: "18px", lineHeight: 1.4 }}>{running.runningQuestionText}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {running.runningOptions.map((opt, idx) => (
                      <button key={idx} className="csst-btn csst-opt" style={opt.style} onClick={opt.onClick}>
                        <span style={opt.badgeStyle}>{opt.letter}</span>
                        <span style={{ flex: 1 }}>{opt.text}</span>
                      </button>
                    ))}
                  </div>

                  {running.runningShowFeedback && (
                    <div>
                      <div style={{ marginTop: "20px", padding: "16px 18px", borderRadius: "var(--radius-lg)", background: running.runningFeedbackBg }}>
                        <div style={{ fontWeight: 700, marginBottom: "4px", color: running.runningFeedbackColor }}>{running.runningFeedbackTitle}</div>
                        <div style={{ color: "var(--color-neutral-800)", lineHeight: 1.5 }}>{running.runningExplanation}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
                        <button className="btn btn-primary csst-btn" onClick={nextQuestion}>{running.nextButtonLabel}</button>
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn btn-ghost csst-btn" style={{ marginTop: "16px" }} onClick={backToSelection}>← Retour aux quiz</button>
              </div>
            )}

            {quizPhase === "result" && (
              <div style={{ maxWidth: "640px", margin: "32px auto 0", textAlign: "center" }}>
                <div style={{ width: "88px", height: "88px", borderRadius: "999px", background: result.resultCircleBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "26px", color: result.resultCircleColor }}>{result.resultPercentLabel}</span>
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", marginBottom: "8px" }}>{result.resultTitle}</div>
                <div style={{ color: "var(--color-neutral-700)", marginBottom: "22px" }}>{result.resultSubtitle}</div>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-secondary csst-btn" onClick={retryCurrentQuiz}>Repasser le quiz</button>
                  {result.resultPassed && (
                    <button className="btn btn-primary csst-btn" onClick={() => { setQuizPhase("select"); setTimeout(() => document.getElementById("csst-certificats")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Voir mes certificats</button>
                  )}
                  <button className="btn btn-ghost csst-btn" onClick={backToSelection}>Retour aux quiz</button>
                </div>
                {quizId && (() => {
                  const wrong = QUIZ_DEFS[quizId].questions.filter((q, i) => answers[i] !== q.correct);
                  return (
                    <div style={{ marginTop: "30px", textAlign: "left" }}>
                      <div className="card-title" style={{ margin: "0 0 12px", color: "#1c2b3d" }}>
                        {wrong.length ? `À revoir : ${wrong.length} question${wrong.length > 1 ? "s" : ""}` : "Aucune erreur, bravo !"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {wrong.map((q) => (
                          <div key={q.q} style={{ background: "#fff", border: "1px solid var(--color-neutral-200)", borderLeft: "4px solid #c0392b", borderRadius: "8px", padding: "14px 16px", fontSize: "14px", lineHeight: 1.5 }}>
                            <div style={{ fontWeight: 600, color: "#1c2b3d", marginBottom: "5px" }}>{q.q}</div>
                            <div style={{ color: "#1e8449", fontWeight: 600, marginBottom: "4px" }}>Bonne réponse : {q.opts[q.correct]}</div>
                            <div style={{ color: "var(--color-neutral-700)" }}>{q.exp}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTACTS & EPI */}
        {activeTab === "contacts" && <ContactsPage isMobile={isMobile} />}
      </div>

      {/* Conteneur hors-écran pour la capture PDF directe des certificats émis */}
      <div aria-hidden style={{ position: "fixed", left: "-99999px", top: 0, width: "297mm", pointerEvents: "none" }}>
        {QUIZ_ORDER.map((id) => certificates[id] ? (
          <div key={id} ref={(el) => { certRefsById.current[id] = el; }}>
            <CertificatPage cert={buildCertData(id)} />
          </div>
        ) : null)}
      </div>
    </div>
  );
}
// Teinte à 75 % vers le noir, calculée ici pour ne pas dépendre de color-mix (navigateurs anciens).
function assombrir(color) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color || "");
  if (!hex) return `color-mix(in srgb, ${color} 75%, black)`;
  const n = parseInt(hex[1], 16);
  const canal = (decalage) => Math.round(((n >> decalage) & 255) * 0.75);
  return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
}
