import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CONSENT_VERSION, isConsentExempt } from "@/lib/consentement";
import { useBrandLogos } from "@/lib/brandLogos";
import { buildEmailHtml, sendMail } from "@/components/utils/emailTemplate";
import { BUREAUX } from "@/lib/rhReferentiels";
import { OrgTiles, OrgTile } from "@/components/administration/OrgTiles";

// Suivi des consentements (onglet de l'Administration du portail) :
// statut de chaque compte, journal des décisions, export CSV.
const STATUS = {
  ok: { label: "Accord donné", bg: "#e3efec", color: "#0a4038" },
  pending: { label: "En attente", bg: "#fdf3e2", color: "#8a4b08" },
  refused: { label: "Refusé", bg: "#fdecea", color: "#7a1f16" },
  withdrawn: { label: "Retiré", bg: "#fdecea", color: "#7a1f16" },
  outdated: { label: "Ancienne version", bg: "#fdf3e2", color: "#8a4b08" },
  exempt: { label: "Compte bureau (exempté)", bg: "#eef0f2", color: "#4b5552" },
};
// Heure d'Abidjan (GMT). Les dates Base44 sans fuseau (ex. created_date) sont en UTC : on ajoute "Z".
const toDate = (d) => new Date(typeof d === "string" && /T\d{2}:\d{2}/.test(d) && !/(Z|[+-]\d{2}:?\d{2})$/.test(d) ? d + "Z" : d);
const fmt = (d) => (d ? toDate(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Abidjan" }) : "—");
const DECISION_LABEL = { accepte: "Accord", refuse: "Refus", retire: "Retrait", mise_a_jour: "Mise à jour" };
const LINK_DAYS = 7; // durée de validité du lien de téléchargement envoyé par e-mail
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const personName = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || u.email;

// Tuiles : Administration (comptes administrateurs) puis un bureau par tuile
const ADMIN = "__admin__";
const NONE = "__none__";
const TODO = ["pending", "refused", "withdrawn", "outdated"];
// Bureau du compte, ou à défaut celui de sa fiche employé RH (même logique que l'onglet Utilisateurs)
const tileOf = (u, empByEmail = {}) => {
  if (u.super_admin || u.role === "admin") return ADMIN;
  const emp = empByEmail[String(u.email || "").trim().toLowerCase()];
  const o = String(u.office || (emp && emp.office) || "").trim().toUpperCase();
  return BUREAUX.includes(o) ? o : o || NONE;
};
export default function ConsentementsManager() {
  const [configuredOffices, setConfiguredOffices] = useState([]);
  useEffect(() => {
    let active = true;
    base44.entities.OfficeTerminal.list("office_name", 200)
      .then(rows => { if (active) setConfiguredOffices((rows || []).map(x => String(x.office_name || "").trim().toUpperCase()).filter(Boolean)); })
      .catch(() => { if (active) setConfiguredOffices([]); });
    return () => { active = false; };
  }, []);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  // Journal des décisions : global (tous les bureaux), dans sa propre section repliable
  const [showJournal, setShowJournal] = useState(false);
  const view = "users";
  const [pdfBusy, setPdfBusy] = useState(null);
  const [mailRowId, setMailRowId] = useState(null);
  const [mailTo, setMailTo] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // Tuile ouverte : "" = aucune (tuiles seules), ADMIN, un bureau ou NONE
  const [tile, setTile] = useState("");
  const logos = useBrandLogos();

  useEffect(() => {
    (async () => {
      try {
        const [u, j] = await Promise.all([
          base44.entities.User.list("-created_date", 1000),
          base44.entities.ConsentementDonnees.list("-created_date", 2000),
        ]);
        setUsers(u || []);
        setJournal(j || []);
        const emps = await base44.entities.Employee.filter({ is_active: true }, "last_name", 1000).catch(() => []);
        setEmployees(Array.isArray(emps) ? emps : []);
      } catch (e) {
        setError("Impossible de charger les consentements.");
      }
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    const last = {};
    journal.forEach((e) => { const k = (e.user_email || "").toLowerCase(); if (!last[k]) last[k] = e; });
    return users.map((u) => {
      const k = (u.email || "").toLowerCase();
      const lastDecision = last[k];
      let status = "pending";
      if (isConsentExempt(u)) status = "exempt";
      else if (String(u.consentement_version || "") === CONSENT_VERSION) status = "ok";
      else if (u.consentement_version) status = "outdated";
      else if (lastDecision?.decision === "retire") status = "withdrawn";
      else if (lastDecision?.decision === "refuse") status = "refused";
      return { u, status, lastDecision };
    });
  }, [users, journal]);

  const empByEmail = useMemo(() => {
    const m = {};
    employees.forEach((e) => {
      [e.email, e.personal_email, e.email_pro].forEach((v) => {
        const k = String(v || "").trim().toLowerCase();
        if (k && !m[k]) m[k] = e;
      });
    });
    return m;
  }, [employees]);
  const tileOfU = (u) => tileOf(u, empByEmail);

  const counts = useMemo(() => rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {}), [rows]);
  const q = ""; // recherche retirée de l'onglet
  // Bureau affiché : la tuile choisie ; une recherche sans tuile porte sur tous les comptes
  const effTile = tile || (q ? "all" : "");
  const tiles = useMemo(() => {
    const keys = [ADMIN, ...configuredOffices];
    rows.forEach(({ u }) => { const k = tileOfU(u); if (!keys.includes(k)) keys.push(k); });
    return keys.map((k) => {
      const list = rows.filter((r) => tileOfU(r.u) === k);
      const ok = list.filter((r) => r.status === "ok").length;
      const todo = list.filter((r) => TODO.includes(r.status)).length;
      const exempt = list.filter((r) => r.status === "exempt").length;
      return { key: k, label: k === ADMIN ? "Administration" : k === NONE ? "Sans bureau" : k, total: list.length, ok, todo, exempt, admin: k === ADMIN, none: k === NONE };
    });
  }, [rows, empByEmail, configuredOffices]);
  const shown = rows.filter((r) =>
    !!effTile && (effTile === "all" || tileOfU(r.u) === effTile) &&
    (filter === "all" || r.status === filter || (filter === "todo" && TODO.includes(r.status))) &&
    (!q || `${r.u.full_name || ""} ${r.u.first_name || ""} ${r.u.last_name || ""} ${r.u.email || ""}`.toLowerCase().includes(q))
  );
  const shownJournal = journal.filter((e) => !q || `${e.user_name || ""} ${e.user_email || ""}`.toLowerCase().includes(q));

  // Rapport PDF individuel d'un collaborateur (fichier nommé à son nom).
  const exportPdf = async (row) => {
    setPdfBusy(row.u.id);
    setError("");
    try {
      const { buildConsentReport } = await import("@/lib/consentReport");
      await buildConsentReport({
        row,
        statusLabels: Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label])),
        decisionLabels: DECISION_LABEL,
        logoUrl: logos?.header, // logo prévu pour fond vert (identique à l'en-tête du portail)
      });
    } catch (e) {
      console.error(e);
      setError("Le rapport PDF n'a pas pu être généré. Réessayez.");
    }
    setPdfBusy(null);
  };

  // Envoi du rapport par e-mail : le PDF est déposé en fichier privé et l'e-mail contient
  // un lien de téléchargement sécurisé, valable LINK_DAYS jours.
  const openMail = (row) => {
    setError("");
    setNotice("");
    setMailRowId(row.u.id);
    setMailTo(row.u.email || "");
  };
  const sendReport = async (row) => {
    const to = mailTo.trim().toLowerCase();
    if (!isEmail(to)) { setError("Adresse e-mail invalide."); return; }
    setMailBusy(true);
    setError("");
    setNotice("");
    try {
      const statusLabels = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label]));
      const { buildConsentReport } = await import("@/lib/consentReport");
      const { blob, fileName } = await buildConsentReport({ row, statusLabels, decisionLabels: DECISION_LABEL, logoUrl: logos?.header, output: "blob" });
      const file = new File([blob], fileName, { type: "application/pdf" });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: LINK_DAYS * 86400 });
      const name = personName(row.u);
      const self = to === String(row.u.email || "").toLowerCase();
      const subject = self ? "Votre rapport de consentement — données personnelles" : `Rapport de consentement — ${name}`;
      const content = [
        self
          ? "Vous trouverez ci-dessous le lien vers votre rapport de consentement au traitement de vos données personnelles."
          : `Vous trouverez ci-dessous le lien vers le rapport de consentement de ${name}.`,
        "",
        `Collaborateur : ${name}`,
        `Statut : ${statusLabels[row.status]}`,
        `Version de la notice : v${CONSENT_VERSION}`,
        "",
        `Le lien de téléchargement reste valable ${LINK_DAYS} jours. Ce document est confidentiel.`,
      ].join("\n");
      await sendMail({
        to,
        subject,
        html: buildEmailHtml({
          preheader: subject,
          title: subject,
          greeting: self ? `Bonjour ${name},` : "Bonjour,",
          content,
          cta: { label: "Télécharger le rapport (PDF)", url: signed_url },
        }),
      });
      setNotice(`Rapport de ${name} envoyé à ${to}.`);
      setMailRowId(null);
    } catch (e) {
      console.error(e);
      setError("L'envoi du rapport par e-mail a échoué. Réessayez.");
    }
    setMailBusy(false);
  };

  const pill = (active) => ({ border: `1px solid ${active ? "#0C3D85" : "oklch(0.9 0.005 90)"}`, background: active ? "#0C3D85" : "#fff", color: active ? "#fff" : "oklch(0.35 0.01 90)", borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" });
  const th = { textAlign: "left", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "oklch(0.5 0.005 90)", padding: "10px 12px", borderBottom: "1px solid oklch(0.92 0.005 90)", whiteSpace: "nowrap" };
  const td = { fontSize: 13, color: "oklch(0.3 0.01 90)", padding: "10px 12px", borderBottom: "1px solid oklch(0.95 0.003 90)", verticalAlign: "top" };

  return (
    <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "oklch(0.4 0.1 165)" }}>CONSENTEMENTS — DONNÉES PERSONNELLES</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.55 0.005 90)" }}>Notice en vigueur : v{CONSENT_VERSION}</div>
      </div>

      {error && <div role="alert" style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", fontSize: 13, fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>{error}</div>}
      {notice && <div role="status" style={{ padding: "10px 14px", borderRadius: 10, background: "#e3efec", fontSize: 13, fontWeight: 600, color: "#0a4038" }}>{notice}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {(() => {
            const todo = TODO.reduce((n, k) => n + (counts[k] || 0), 0);
            const exempt = counts.exempt || 0;
            const ok = counts.ok || 0;
            const base = rows.length - exempt;
            const pct = base ? Math.round((ok / base) * 100) : 0;
            const card = { background: "oklch(0.975 0.003 90)", border: "1px solid oklch(0.93 0.004 90)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 };
            const lbl = { fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "oklch(0.5 0.005 90)" };
            const big = { fontSize: 28, fontWeight: 800, lineHeight: 1, color: "oklch(0.25 0.01 90)", display: "flex", alignItems: "baseline", gap: 6 };
            const small = { fontSize: 12.5, fontWeight: 500, color: "oklch(0.52 0.005 90)" };
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <div style={{ ...card, background: "#0C3D85", borderColor: "#0C3D85" }}>
                  <div style={{ ...lbl, color: "#cfe6e1" }}>Taux d'accord</div>
                  <div style={{ ...big, color: "#fff" }}>{pct}<span style={{ fontSize: 16, fontWeight: 700 }}>%</span></div>
                  <div style={{ height: 5, borderRadius: 5, background: "rgba(255,255,255,.2)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 5 }} /></div>
                </div>
                <div style={card}>
                  <div style={lbl}>Accords donnés</div>
                  <div style={big}>{ok}<span style={small}>sur {base} compte{base > 1 ? "s" : ""}</span></div>
                </div>
                <div style={{ ...card, ...(todo ? { background: "oklch(0.97 0.035 85)", borderColor: "oklch(0.9 0.07 80)" } : {}) }}>
                  <div style={{ ...lbl, ...(todo ? { color: "oklch(0.55 0.13 65)" } : {}) }}>À relancer</div>
                  <div style={{ ...big, ...(todo ? { color: "oklch(0.5 0.13 60)" } : {}) }}>{todo}<span style={small}>{todo ? "en attente d'accord" : "tout est à jour"}</span></div>
                </div>
                <div style={card}>
                  <div style={lbl}>Comptes bureaux</div>
                  <div style={big}>{exempt}<span style={small}>exempté{exempt > 1 ? "s" : ""}</span></div>
                </div>
              </div>
            );
          })()}

          {view === "users" && (
            <>
              <OrgTiles label="Bureaux">
                {tiles.map((t) => {
                  const on = tile === t.key;
                  const base = t.total - t.exempt;
                  const pct = base ? (t.ok / base) * 100 : 0;
                  return (
                    <OrgTile
                      key={t.key}
                      label={t.label}
                      sub={t.admin ? "Comptes administrateurs" : t.none ? "Comptes sans bureau" : `${t.total} compte${t.total > 1 ? "s" : ""}`}
                      icon={t.admin ? "shield" : t.none ? "alert" : "pin"}
                      variant={t.admin ? "admin" : t.none ? "warn" : undefined}
                      value={t.ok}
                      unit={`accord${t.ok > 1 ? "s" : ""}`}
                      progress={pct}
                      progressLabel="Taux d'accord"
                      stats={[
                        { label: "À relancer", value: t.todo, tone: t.todo ? "warn" : "ok" },
                        { label: "Exemptés", value: t.exempt }
                      ]}
                      badge={t.todo}
                      badgeTitle="Comptes à relancer"
                      active={on}
                      muted={!t.total}
                      onClick={() => setTile(on ? "" : t.key)}
                    />
                  );
                })}
              </OrgTiles>
            </>
          )}

          {view === "users" && effTile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>
                {tile ? (tiles.find((t) => t.key === tile) || {}).label : "Résultats de recherche · tous les comptes"}
              </span>
              {tile && <button type="button" onClick={() => setTile("")} style={{ ...pill(false), padding: "5px 12px" }}>Fermer</button>}
            </div>
          )}

          {view === "users" && effTile && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["ok", "Accord donné"], ["exempt", "Exemptés"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(filter === k ? "all" : k)} aria-pressed={filter === k} title={filter === k ? "Afficher tous les comptes" : `Afficher seulement : ${l}`} style={pill(filter === k)}>{l}</button>
              ))}
            </div>
          )}

          {(view !== "users" || effTile) && (
          <div style={{ overflowX: "auto", border: "1px solid oklch(0.93 0.004 90)", borderRadius: 12 }}>
            {view === "users" ? (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, tableLayout: "fixed" }}>
                <colgroup><col style={{ width: "34%" }} /><col style={{ width: "22%" }} /><col style={{ width: "20%" }} /><col style={{ width: "24%" }} /></colgroup>
                <thead><tr><th style={th}>Utilisateur</th><th style={th}>Statut</th><th style={th}>Dernière décision</th><th style={{ ...th, textAlign: "right" }}>Rapport</th></tr></thead>
                <tbody>
                  {shown.length === 0 && <tr><td style={{ ...td, textAlign: "center", padding: 24 }} colSpan={4}>Aucun compte.</td></tr>}
                  {shown.map((r) => { const { u, status, lastDecision } = r; const mailOpen = mailRowId === u.id; return (
                    <React.Fragment key={u.id}>
                    <tr style={mailOpen ? { background: "oklch(0.985 0.004 165)" } : undefined}>
                      <td style={{ ...td, verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || "—"}</div>
                        <div style={{ fontSize: 12, color: "oklch(0.55 0.005 90)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      </td>
                      <td style={{ ...td, verticalAlign: "middle" }}>
                        <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, borderRadius: 100, padding: "3px 10px", background: STATUS[status].bg, color: STATUS[status].color, whiteSpace: "nowrap" }}>{STATUS[status].label}</span>
                        {status === "ok" && <div style={{ fontSize: 11.5, color: "oklch(0.55 0.005 90)", marginTop: 4 }}>le {fmt(u.consentement_date)}</div>}
                      </td>
                      <td style={{ ...td, verticalAlign: "middle" }}>
                        {lastDecision ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{DECISION_LABEL[lastDecision.decision] || lastDecision.decision}</div>
                            <div style={{ fontSize: 11.5, color: "oklch(0.55 0.005 90)" }}>{fmt(lastDecision.created_date)}</div>
                          </>
                        ) : "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button type="button" onClick={() => exportPdf(r)} disabled={!!pdfBusy || mailBusy} title={`Télécharger le rapport de consentement de ${personName(u)}`} style={{ ...pill(false), borderColor: "#0C3D85", color: "#0C3D85", padding: "5px 12px", cursor: pdfBusy ? "wait" : "pointer" }}>
                            {pdfBusy === u.id ? "Génération…" : "PDF"}
                          </button>
                          <button type="button" onClick={() => (mailOpen ? setMailRowId(null) : openMail(r))} disabled={mailBusy} title={`Envoyer le rapport de ${personName(u)} par e-mail`} style={{ ...pill(mailOpen), padding: "5px 12px", borderColor: "#0C3D85", color: mailOpen ? "#fff" : "#0C3D85" }}>
                            Envoyer par e-mail
                          </button>
                        </div>
                      </td>
                    </tr>
                    {mailOpen && (
                      <tr style={{ background: "oklch(0.985 0.004 165)" }}>
                        <td colSpan={4} style={{ ...td, paddingTop: 0 }}>
                          <form onSubmit={(e) => { e.preventDefault(); sendReport(r); }} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: "oklch(0.4 0.01 90)" }} htmlFor={`mail-${u.id}`}>Destinataire</label>
                            <input
                              id={`mail-${u.id}`} type="email" value={mailTo} onChange={(e) => setMailTo(e.target.value)} autoFocus
                              style={{ height: 34, flex: "0 1 300px", minWidth: 200, border: "1px solid oklch(0.88 0.005 90)", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13 }}
                            />
                            <button type="submit" disabled={mailBusy} style={{ ...pill(true), padding: "7px 14px", cursor: mailBusy ? "wait" : "pointer" }}>{mailBusy ? "Envoi…" : "Envoyer"}</button>
                            <button type="button" onClick={() => setMailRowId(null)} disabled={mailBusy} style={{ ...pill(false), padding: "7px 14px" }}>Annuler</button>
                            <span style={{ flexBasis: "100%", textAlign: "right", fontSize: 11.5, color: "oklch(0.55 0.005 90)" }}>L'e-mail contient un lien sécurisé vers le PDF, valable {LINK_DAYS} jours.</span>
                          </form>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ); })}
                </tbody>
              </table>
            ) : null}
          </div>
          )}
          <section style={{ marginTop: 8, border: "1px solid oklch(0.92 0.005 90)", borderRadius: 14, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setShowJournal((v) => !v)}
              aria-expanded={showJournal}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", border: "none", background: "oklch(0.975 0.003 90)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "oklch(0.5 0.005 90)", transform: showJournal ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="M9 18l6-6-6-6" /></svg>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "oklch(0.3 0.01 90)" }}>Journal des décisions</span>
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 100, padding: "2px 8px", background: "#e3efec", color: "#0a4038" }}>{journal.length}</span>
              <span style={{ fontSize: 12, color: "oklch(0.55 0.005 90)", marginLeft: "auto" }}>Tous bureaux confondus · du plus récent au plus ancien</span>
            </button>
            {showJournal && (
              <div style={{ overflowX: "auto", borderTop: "1px solid oklch(0.92 0.005 90)", maxHeight: 420, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                <thead><tr><th style={th}>Date</th><th style={th}>Utilisateur</th><th style={th}>Décision</th><th style={th}>Version</th></tr></thead>
                <tbody>
                  {shownJournal.length === 0 && <tr><td style={{ ...td, textAlign: "center", padding: 24 }} colSpan={4}>Aucune décision enregistrée.</td></tr>}
                  {shownJournal.map((e) => (
                    <tr key={e.id}>
                      <td style={td}>{fmt(e.created_date)}</td>
                      <td style={td}><div style={{ fontWeight: 600 }}>{e.user_name || "—"}</div><div style={{ fontSize: 12, color: "oklch(0.55 0.005 90)" }}>{e.user_email}</div></td>
                      <td style={td}>{DECISION_LABEL[e.decision] || e.decision}</td>
                      <td style={td}>v{e.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>
          <p style={{ margin: 0, fontSize: 12, color: "oklch(0.55 0.005 90)" }}>
            Le journal est une preuve : il n'est pas modifiable par les utilisateurs. Pour imposer une nouvelle validation à tous, incrémenter la version de la notice (src/lib/consentement.js).
          </p>
        </>
      )}
    </div>
  );
}
