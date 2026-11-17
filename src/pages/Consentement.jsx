import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LogOut, Home } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useBrandLogos } from "@/lib/brandLogos";
import BrandHeader from "@/components/cgesn/BrandHeader";
import ColorBar from "@/components/cgesn/ColorBar";
import SiteFooter from "@/components/cgesn/SiteFooter";
import {
  CONSENT_VERSION, CONSENT_UPDATED, NOTICE, LEGAL_FRAMEWORK, ageFromDate, findEmployeeFor,
  hasValidConsent, isConsentExempt, logConsentDecision,
} from "@/lib/consentement";

// Écran de consentement obligatoire (mode "accord") et page « Mes données personnelles » (mode "gestion").
const C = {
  green: "#0C3D85", greenDark: "#0a4038", greenSoft: "#e3efec", greenTint: "#eef6f4",
  ink: "#16201d", text: "#343d3a", muted: "#4b5552", soft: "#5d6763",
  line: "#dfe5e3", field: "#c9d2cf", page: "#f2f4f3", tile: "#f6f8f7",
};
const card = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: "clamp(20px,3vw,28px)", display: "flex", flexDirection: "column" };
const h2 = { margin: 0, fontSize: 17, fontWeight: 700, color: C.ink };
const label = { fontSize: 13, fontWeight: 600, color: C.text };
const input = { height: 46, boxSizing: "border-box", border: `1px solid ${C.field}`, borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: 15, color: C.ink, background: "#fff", width: "100%" };
const star = <span style={{ color: "#b42318" }} aria-hidden="true">*</span>;

// Nom et prénom saisis à l'inscription (copie locale, au cas où leur enregistrement sur le compte aurait échoué)
function signupName(email) {
  try {
    const s = JSON.parse(localStorage.getItem("cgesn_signup_name") || "null");
    return s && String(s.email || "") === String(email || "").trim().toLowerCase() ? s : null;
  } catch (e) {
    return null;
  }
}

export default function Consentement({ mode = "accord" }) {
  const { user, isAuthenticated, isLoadingAuth, refreshUser } = useAuth();
  const logos = useBrandLogos();
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const navigate = useNavigate();
  const manage = mode === "gestion";

  const [form, setForm] = useState({ nom: "", prenom: "", date_naissance: "", telephone: "" });
  const [loaded, setLoaded] = useState(false);
  const [c1, setC1] = useState(manage);
  const [c2, setC2] = useState(manage);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [namesLocked, setNamesLocked] = useState(false); // nom et prénom officiels issus de l'inscription
  const [refuseAsk, setRefuseAsk] = useState(false);
  const [refused, setRefused] = useState(false);
  const [lastRefusal, setLastRefusal] = useState(null);

  // Pré-remplissage : nom et prénom saisis à l'inscription, puis fiche employé
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [emp, history] = await Promise.all([
        findEmployeeFor(user),
        base44.entities.ConsentementDonnees.filter({ user_email: user.email }, "-created_date", 1).catch(() => []),
      ]);
      if (!alive) return;
      const signup = signupName(user.email);
      const nom = user.last_name || signup?.last_name || emp?.last_name || "";
      const prenom = user.first_name || signup?.first_name || emp?.first_name || "";
      // Identité officielle déjà connue (inscription) : non modifiable à l'étape d'accord.
      setNamesLocked(!manage && !!(nom && prenom && ((user.last_name && user.first_name) || signup)));
      if (history?.[0]?.decision === "refuse") setLastRefusal(history[0].created_date);
      setForm({
        nom,
        prenom,
        date_naissance: (user.date_naissance || emp?.birth_date || "").slice(0, 10),
        telephone: user.telephone || emp?.phone || "",
      });
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const age = ageFromDate(form.date_naissance);
  const infosOk = !!(form.nom.trim() && form.prenom.trim() && age !== null && age >= 16 && age < 100 && form.telephone.replace(/\D/g, "").length >= 8);
  const ready = infosOk && c1 && c2;
  const returnTo = useMemo(() => { const r = safeReturnTo(); return r === "/" ? "/portail" : r; }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const logout = () => base44.auth.logout("/connexion");

  if (isLoadingAuth) return <Spinner />;
  if (!isAuthenticated || !user) return <Navigate to="/connexion" replace />;
  if (isConsentExempt(user)) return <Navigate to="/portail" replace />;
  if (!manage && hasValidConsent(user) && !done) return <Navigate to={returnTo} replace />;

  const data = () => ({
    nom: form.nom.trim(), prenom: form.prenom.trim(),
    date_naissance: form.date_naissance, telephone: form.telephone.trim(),
  });

  const accept = async () => {
    setTried(true);
    setError("");
    if (!ready || saving) return;
    setSaving(true);
    try {
      const d = data();
      await base44.auth.updateMe({
        last_name: d.nom, first_name: d.prenom, date_naissance: d.date_naissance, telephone: d.telephone,
        consentement_version: CONSENT_VERSION,
        ...(manage ? {} : { consentement_date: new Date().toISOString() }),
      });
      await logConsentDecision(user, manage ? "mise_a_jour" : "accepte", d);
      try { localStorage.removeItem("cgesn_signup_name"); } catch (e) { /* ignore */ }
      await refreshUser();
      setDone(true);
      if (!manage) setTimeout(() => navigate(returnTo, { replace: true }), 1200);
    } catch (e) {
      setError("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
    }
    setSaving(false);
  };

  // Rapport de consentement personnel, généré à la demande pour la personne connectée.
  const downloadReport = async () => {
    setReportBusy(true);
    setReportError("");
    try {
      const [lastDecision] = await base44.entities.ConsentementDonnees.filter({ user_email: user.email }, "-created_date", 1);
      const status = hasValidConsent(user) ? "ok"
        : user.consentement_version ? "outdated"
        : lastDecision?.decision === "retire" ? "withdrawn"
        : lastDecision?.decision === "refuse" ? "refused" : "pending";
      const { buildConsentReport } = await import("@/lib/consentReport");
      await buildConsentReport({
        row: { u: user, status, lastDecision },
        statusLabels: { ok: "Accord donné", pending: "En attente", refused: "Refusé", withdrawn: "Retiré", outdated: "Ancienne version", exempt: "Compte bureau (exempté)" },
        decisionLabels: { accepte: "Accord", refuse: "Refus", retire: "Retrait", mise_a_jour: "Mise à jour" },
        logoUrl: logos?.header,
      });
    } catch (e) {
      console.error(e);
      setReportError("Le rapport n'a pas pu être généré. Réessayez.");
    }
    setReportBusy(false);
  };

  const withdraw = async () => {
    if (!window.confirm("Retirer votre accord ? Vous serez déconnecté et ne pourrez plus utiliser le portail tant que vous n'aurez pas donné à nouveau votre accord.")) return;
    setSaving(true);
    try {
      await logConsentDecision(user, "retire", data());
      await base44.auth.updateMe({ consentement_version: "" });
      logout();
    } catch (e) {
      setError("Le retrait n'a pas pu être enregistré. Réessayez ou contactez la DSI.");
      setSaving(false);
    }
  };

  // Refus : enregistré dans le journal ; sans accord, aucune application du portail n'est accessible.
  const refuse = async () => {
    setSaving(true);
    setError("");
    try {
      const ok = await logConsentDecision(user, "refuse", data());
      if (!ok) throw new Error("journal");
      if (user.consentement_version) await base44.auth.updateMe({ consentement_version: "" });
      setRefuseAsk(false);
      setRefused(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError("Votre refus n'a pas pu être enregistré. Réessayez.");
    }
    setSaving(false);
  };

  const today = new Date().toLocaleDateString("fr-FR");

  if (refused) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.page, fontFamily: "'Poppins',Helvetica,Arial,sans-serif" }}>
        <BrandHeader subtitle="DAGNOKO HAMED" nowrap maxWidth={880} menuUser={{ name: user.full_name, email: user.email }}
          mobileMenuItems={[{ label: "Se déconnecter", icon: LogOut, danger: true, onSelect: logout }]} />
        <ColorBar />
        <main style={{ flex: 1, width: "100%", maxWidth: 640, margin: "0 auto", boxSizing: "border-box", padding: "clamp(32px,6vw,64px) 20px" }}>
          <section role="status" style={{ ...card, gap: 14 }}>
            <span style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b42318", background: "#fdecea", borderRadius: 999, padding: "5px 12px" }}>Refus enregistré</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.ink }}>Vous avez refusé l'utilisation de vos données</h1>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: C.muted }}>
              Votre décision du {today} est enregistrée dans le journal des consentements. Sans votre accord, vous ne pouvez accéder à aucune application du Portail Digital CITRAT.
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.soft }}>
              Vous pouvez changer d'avis à tout moment : reconnectez-vous et donnez votre accord pour retrouver l'accès.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
              <button type="button" onClick={() => setRefused(false)} style={{ minHeight: 48, border: `1px solid ${C.green}`, background: "#fff", color: C.green, borderRadius: 12, padding: "0 22px", font: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Revoir ma décision</button>
              <button type="button" onClick={logout} style={{ minHeight: 48, border: "none", background: C.green, color: "#fff", borderRadius: 12, padding: "0 22px", font: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Se déconnecter</button>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.page, fontFamily: "'Poppins',Helvetica,Arial,sans-serif", color: "#1f2523", overflowX: "hidden" }}>
      <style>{`.cgesn-consent input:focus-visible,.cgesn-consent button:focus-visible,.cgesn-consent a:focus-visible{outline:3px solid rgba(15,92,82,0.35);outline-offset:2px}`}</style>
      <BrandHeader
        subtitle="DAGNOKO HAMED"
        nowrap
        maxWidth={880}
        menuUser={{ name: user.full_name, email: user.email }}
        mobileMenuItems={[
          ...(manage ? [{ label: "Retour au portail", to: "/portail", icon: Home }] : []),
          { label: "Se déconnecter", icon: LogOut, danger: true, onSelect: logout },
        ]}
      >
        {manage && (
          <Link to="/portail" style={{ marginLeft: "auto", textDecoration: "none", height: 40, padding: "0 18px", borderRadius: 100, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            Retour au portail
          </Link>
        )}
      </BrandHeader>
      <ColorBar />

      <main className="cgesn-consent" style={{ flex: 1, width: "100%", maxWidth: 880, margin: "0 auto", boxSizing: "border-box", padding: "clamp(24px,4vw,44px) clamp(16px,3vw,24px) 56px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.green, background: C.greenSoft, borderRadius: 999, padding: "5px 12px" }}>
            {manage ? "Mes données personnelles" : "Étape obligatoire avant l'accès"}
          </span>
          <h1 style={{ margin: 0, fontSize: "clamp(24px,3vw,32px)", fontWeight: 800, lineHeight: 1.2, color: C.ink }}>Protection de vos données personnelles</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: C.muted, maxWidth: 680 }}>
            {manage
              ? `Vous avez donné votre accord${user.consentement_date ? ` le ${new Date(user.consentement_date).toLocaleDateString("fr-FR")}` : ""}. Vous pouvez corriger vos informations ou retirer votre accord.`
              : "Avant d'utiliser le portail et ses applications, prenez connaissance de l'usage qui est fait de vos données, confirmez vos informations et donnez ou refusez votre accord."}
          </p>
          {!manage && lastRefusal && (
            <p style={{ margin: 0, fontSize: 13, color: "#7a1f16", background: "#fdecea", borderRadius: 10, padding: "10px 14px" }}>
              Vous avez refusé le {new Date(lastRefusal).toLocaleDateString("fr-FR")} : l'accès aux applications reste bloqué tant que vous n'avez pas donné votre accord.
            </p>
          )}
        </div>

        <section aria-labelledby="notice-title" style={{ ...card, gap: 16 }}>
          <h2 id="notice-title" style={h2}>1. Notice d'information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
            {NOTICE.map((n) => (
              <div key={n.titre} style={{ background: C.tile, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.green, marginBottom: 4 }}>{n.titre}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: C.text }}>{n.texte}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
            Traitement réalisé conformément à la {LEGAL_FRAMEWORK.charAt(0).toLowerCase() + LEGAL_FRAMEWORK.slice(1)}{" "}
            <Link to="/politique" style={{ color: C.green, fontWeight: 600 }}>Lire la politique de confidentialité complète</Link>
          </p>
        </section>

        <section aria-labelledby="form-title" style={{ ...card, gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 id="form-title" style={h2}>2. Vos informations</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.soft }}>
              {namesLocked
                ? "Nom et prénom officiels repris de votre inscription. Les autres informations sont préremplies depuis votre fiche employé quand elle existe."
                : "Pré-remplies depuis votre inscription et votre fiche employé quand elle existe. Corrigez-les si besoin."}
            </p>
          </div>
          {!loaded ? <Spinner inline /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="nom" style={label}>Nom {star}</label>
                <input id="nom" type="text" value={form.nom} onChange={set("nom")} required autoComplete="family-name" readOnly={namesLocked}
                  style={namesLocked ? { ...input, border: `1px solid ${C.line}`, color: C.text, background: C.page } : input} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="prenom" style={label}>Prénom {star}</label>
                <input id="prenom" type="text" value={form.prenom} onChange={set("prenom")} required autoComplete="given-name" readOnly={namesLocked}
                  style={namesLocked ? { ...input, border: `1px solid ${C.line}`, color: C.text, background: C.page } : input} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="naissance" style={label}>Date de naissance {star}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input id="naissance" type="date" value={form.date_naissance} onChange={set("date_naissance")} required autoComplete="bday" max={new Date().toISOString().slice(0, 10)} style={{ ...input, flex: 1, minWidth: 0 }} />
                  <span aria-live="polite" style={{ flex: "none", fontSize: 14, fontWeight: 700, color: C.green, background: C.greenSoft, borderRadius: 999, padding: "8px 14px" }}>
                    {age === null ? "— ans" : `${age} ans`}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="tel" style={label}>Téléphone {star}</label>
                <input id="tel" type="tel" value={form.telephone} onChange={set("telephone")} required placeholder="+225 07 00 00 00 00" autoComplete="tel" style={input} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <label htmlFor="mail" style={label}>Adresse e-mail</label>
                <input id="mail" type="email" value={user.email || ""} readOnly aria-describedby="mail-hint" style={{ ...input, border: `1px solid ${C.line}`, color: C.soft, background: C.page }} />
                <span id="mail-hint" style={{ fontSize: 12, color: C.soft }}>Adresse de votre compte de connexion, non modifiable ici.</span>
              </div>
            </div>
          )}
        </section>

        {!manage && (
          <section aria-labelledby="accord-title" style={{ ...card, gap: 14 }}>
            <h2 id="accord-title" style={h2}>3. Votre accord</h2>
            <Check id="c1" checked={c1} onChange={() => setC1((v) => !v)}>
              J'ai lu et compris la notice d'information sur l'utilisation de mes données personnelles.
            </Check>
            <Check id="c2" checked={c2} onChange={() => setC2((v) => !v)}>
              J'accepte que le CITRAT utilise mes nom, prénom, âge, téléphone et e-mail pour les finalités décrites ci-dessus, dans le cadre de l'utilisation du portail.
            </Check>
            {tried && !ready && !done && (
              <p role="status" style={{ margin: 0, fontSize: 13, color: "#8a4b08", background: "#fdf3e2", borderRadius: 10, padding: "10px 14px" }}>
                Complétez les champs obligatoires et cochez les deux cases pour continuer.
              </p>
            )}
          </section>
        )}
        {manage && tried && !infosOk && (
          <p role="status" style={{ margin: 0, fontSize: 13, color: "#8a4b08", background: "#fdf3e2", borderRadius: 10, padding: "10px 14px" }}>
            Complétez les champs obligatoires pour enregistrer.
          </p>
        )}

        {error && (
          <div role="alert" style={{ background: "#fdecea", border: "1px solid #f3c2bc", borderRadius: 14, padding: "14px 18px", fontSize: 14, color: "#7a1f16" }}>{error}</div>
        )}

        {done && (
          <div role="status" style={{ background: C.greenSoft, border: "1px solid #b7d6ce", borderRadius: 14, padding: "16px 18px", fontSize: 14, lineHeight: 1.6, color: C.greenDark }}>
            {manage
              ? <><strong>Vos informations sont enregistrées</strong> ({today}).</>
              : <><strong>Merci, votre accord est enregistré</strong> (notice v{CONSENT_VERSION}, {today}). Redirection vers le portail…</>}
          </div>
        )}

        {/* Refus possible : il est enregistré, mais sans accord aucune application n'est accessible */}
        {!manage && refuseAsk && (
          <div role="alertdialog" aria-labelledby="refus-title" style={{ background: "#fff", border: "1px solid #f3c2bc", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <strong id="refus-title" style={{ fontSize: 15, color: "#7a1f16" }}>Confirmer votre refus ?</strong>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.text }}>
              Si vous refusez, <strong>vous ne pourrez accéder à aucune application du portail</strong> (RH, HSE, e-Cadastre, Assistance…). Votre refus sera enregistré dans le journal des consentements. Vous pourrez donner votre accord plus tard en vous reconnectant.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setRefuseAsk(false)} disabled={saving} style={{ minHeight: 44, border: `1px solid ${C.field}`, background: "#fff", color: C.text, borderRadius: 12, padding: "0 18px", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
              <button type="button" onClick={refuse} disabled={saving} style={{ minHeight: 44, border: "none", background: "#b42318", color: "#fff", borderRadius: 12, padding: "0 18px", font: "inherit", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>{saving ? "Enregistrement…" : "Confirmer mon refus"}</button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap-reverse", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
          {!manage && (
            <button type="button" onClick={() => setRefuseAsk(true)} disabled={saving || done} style={{ minHeight: 48, border: "1px solid #f3c2bc", background: "#fff", color: "#b42318", borderRadius: 12, padding: "0 22px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Je refuse
            </button>
          )}
          {manage && (
<div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={downloadReport} disabled={reportBusy} style={{ minHeight: 48, border: `1px solid ${C.green}`, background: "#fff", color: C.green, borderRadius: 12, padding: "0 22px", font: "inherit", fontSize: 15, fontWeight: 700, cursor: reportBusy ? "wait" : "pointer" }}>
              {reportBusy ? "Préparation…" : "Télécharger mon rapport (PDF)"}
            </button>
            {reportError && <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#7a1f16" }}>{reportError}</p>}
            <button type="button" onClick={withdraw} disabled={saving} style={{ minHeight: 48, border: "1px solid #f3c2bc", background: "#fff", color: "#b42318", borderRadius: 12, padding: "0 22px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Retirer mon accord</button>
            </div>
          )}
          <button
            type="button"
            onClick={accept}
            aria-disabled={!(manage ? infosOk : ready) || saving}
            style={{ minHeight: 48, border: "none", background: (manage ? infosOk : ready) && !saving ? C.green : "#8fa9a3", color: "#fff", borderRadius: 12, padding: "0 26px", font: "inherit", fontSize: 15, fontWeight: 700, letterSpacing: "0.01em", cursor: saving ? "wait" : "pointer" }}
          >
            {saving ? "Enregistrement…" : manage ? "Enregistrer les modifications" : "J'accepte et j'accède au portail"}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: C.soft, textAlign: "center" }}>
          Notice v{CONSENT_VERSION} · mise à jour le {CONSENT_UPDATED}
          {!manage && " · Vous pourrez consulter, modifier ou retirer votre accord depuis « Mes données personnelles »."}
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function Check({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: checked ? C.greenTint : "#fff" }}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} style={{ width: 22, height: 22, margin: "1px 0 0", accentColor: C.green, flex: "none" }} />
      <span style={{ fontSize: 14, lineHeight: 1.55, color: C.text }}>{children}</span>
    </label>
  );
}

function Spinner({ inline = false }) {
  return (
    <div style={inline ? { display: "flex", justifyContent: "center", padding: "24px 0" } : { position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0C3D85] rounded-full animate-spin" />
    </div>
  );
}
