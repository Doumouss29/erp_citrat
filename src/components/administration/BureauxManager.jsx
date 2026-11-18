import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { loadOfficeDirectory, normalizeEmail } from "@/components/utils/officeUtils";

// Configuration des bureaux CITRAT (entité OfficeTerminal) :
// identité, compte du terminal de pointage, coordonnées et gestionnaires.
// L'e-mail du compte bureau est celui qui ouvre le terminal de pointage RH-CITRAT.

const inputStyle = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid oklch(0.88 0.005 90)",
  background: "#fff",
  color: "oklch(0.25 0.01 90)",
  fontSize: 13,
  fontFamily: "'Poppins',sans-serif",
  boxSizing: "border-box",
  width: "100%",
  outline: "none"
};
const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "oklch(0.55 0.005 90)",
  marginBottom: 4
};
const sectionTitleStyle = { fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "oklch(0.4 0.1 165)" };
const hintStyle = { fontSize: 12, color: "oklch(0.5 0.005 90)", lineHeight: 1.5 };
const primaryBtn = {
  height: 40, padding: "0 18px", border: "none", borderRadius: 10, background: "#0C3D85", color: "#fff",
  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", whiteSpace: "nowrap"
};
const ghostBtn = {
  height: 40, padding: "0 16px", border: "1px solid oklch(0.88 0.005 90)", borderRadius: 10, background: "#fff",
  color: "oklch(0.4 0.005 90)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", whiteSpace: "nowrap"
};
const smallBtn = { ...ghostBtn, height: 32, padding: "0 12px", fontSize: 12 };
const dangerBtn = { ...smallBtn, color: "oklch(0.5 0.18 25)", borderColor: "oklch(0.88 0.06 25)" };
const panelStyle = { background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)" };

const EMPTY_MANAGER = { nom: "", fonction: "", email: "", telephone: "", principal: false };
const EMPTY_FORM = {
  office_name: "", code: "", email: "", location: "", ville: "", adresse: "",
  telephone: "", email_contact: "", notes: "", is_active: true, gestionnaires: []
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, value, onChange, placeholder, type = "text", flex, required }) {
  return (
    <div style={{ flex: flex || "1 1 200px", minWidth: 0 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: "oklch(0.55 0.18 25)" }}> *</span>}</label>
      <input type={type} style={inputStyle} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto" }}>
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
const ICONS = {
  mail: ["M4 4h16v16H4z", "M22 6l-10 7L2 6"],
  phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"],
  pin: ["M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z", "M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  clock: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 6v6l4 2"],
};

function InfoLine({ icon, children, mono }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "oklch(0.42 0.005 90)", minWidth: 0 }}>
      <span style={{ color: "oklch(0.6 0.005 90)", display: "inline-flex" }}><Icon d={ICONS[icon]} /></span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: mono ? "ui-monospace,Menlo,monospace" : "inherit" }}>{children}</span>
    </div>
  );
}

export default function BureauxManager() {
  const [bureaux, setBureaux] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, emps, users] = await Promise.all([
        base44.entities.OfficeTerminal.list("office_name", 200),
        base44.entities.Employee.list(null, 500).catch(() => []),
        base44.entities.User.list().catch(() => [])
      ]);
      setBureaux(rows || []);
      setEmployees(emps || []);
      setAccounts(users || []);
    } catch (e) {
      setError("Impossible de charger les bureaux.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  // L'effectif correspond aux comptes actifs rattachés au bureau ; les fiches RH
  // supplémentaires sont prises en compte sans compter deux fois le même e-mail.
  // Un utilisateur sans fiche employé reste bien un agent du bureau.
  const staffCount = (b) => {
    const norm = (v) => String(v || "").trim().toUpperCase();
    const matches = (u) => (u.role !== "admin") &&
      (norm(u.office) === norm(b.office_name) ||
       (b.id && (u.bureau_id === b.id || (u.bureau_ids || []).includes(b.id))) ||
       (b.code && norm(u.bureau_code) === norm(b.code)));
    const emails = new Set();
    let count = 0;
    for (const u of accounts) {
      if (u.account_status === "suspended" || !matches(u)) continue;
      const email = normalizeEmail(u.email);
      if (email && emails.has(email)) continue;
      if (email) emails.add(email);
      count++;
    }
    for (const e of employees) {
      if (e.is_active === false || norm(e.office) !== norm(b.office_name)) continue;
      const email = normalizeEmail(e.email || e.email_pro || e.email_professionnel);
      if (email && emails.has(email)) continue;
      if (email) emails.add(email);
      count++;
    }
    return count;
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM, gestionnaires: [{ ...EMPTY_MANAGER, principal: true }] });
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (b) => {
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, b[k] ?? EMPTY_FORM[k]])),
      gestionnaires: Array.isArray(b.gestionnaires) ? b.gestionnaires.map((g) => ({ ...EMPTY_MANAGER, ...g })) : []
    });
    setFormError(null);
    setEditing(b.id);
  };

  const closeForm = () => {
    setEditing(null);
    setFormError(null);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setManager = (i, k, v) =>
    setForm((f) => ({
      ...f,
      gestionnaires: f.gestionnaires.map((g, j) => {
        if (k === "principal") return { ...g, principal: j === i ? v : (v ? false : g.principal) };
        return j === i ? { ...g, [k]: v } : g;
      })
    }));
  const addManager = () => setForm((f) => ({ ...f, gestionnaires: [...f.gestionnaires, { ...EMPTY_MANAGER, principal: f.gestionnaires.length === 0 }] }));
  const removeManager = (i) => setForm((f) => ({ ...f, gestionnaires: f.gestionnaires.filter((_, j) => j !== i) }));

  const save = async () => {
    const name = form.office_name.trim().toUpperCase();
    const email = form.email.trim().toLowerCase();
    if (!name) return setFormError("Le nom du bureau est obligatoire.");
    if (!EMAIL_RE.test(email)) return setFormError("L'e-mail du compte bureau (terminal) n'est pas valide.");
    if (form.email_contact && !EMAIL_RE.test(form.email_contact.trim())) return setFormError("L'e-mail de contact n'est pas valide.");
    const dup = bureaux.find((b) => b.id !== editing && normalizeEmail(b.email) === normalizeEmail(email));
    if (dup) return setFormError(`Cet e-mail est déjà utilisé par le bureau ${dup.office_name}.`);
    const managers = form.gestionnaires
      .map((g) => ({ ...g, nom: g.nom.trim(), fonction: g.fonction.trim(), email: g.email.trim().toLowerCase(), telephone: g.telephone.trim() }))
      .filter((g) => g.nom || g.email || g.telephone);
    const badManager = managers.find((g) => g.email && !EMAIL_RE.test(g.email));
    if (badManager) return setFormError(`E-mail invalide pour le gestionnaire ${badManager.nom || badManager.email}.`);

    const payload = {
      office_name: name,
      code: form.code.trim().toUpperCase(),
      email,
      location: form.location.trim(),
      ville: form.ville.trim(),
      adresse: form.adresse.trim(),
      telephone: form.telephone.trim(),
      email_contact: form.email_contact.trim().toLowerCase(),
      notes: form.notes.trim(),
      is_active: !!form.is_active,
      gestionnaires: managers
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") await base44.entities.OfficeTerminal.create(payload);
      else await base44.entities.OfficeTerminal.update(editing, payload);
      await loadOfficeDirectory(true);
      await load();
      closeForm();
      flash(editing === "new" ? "Bureau ajouté." : "Bureau mis à jour.");
    } catch (e) {
      setFormError("Enregistrement impossible : " + (e?.message || "erreur inconnue"));
    }
    setSaving(false);
  };

  const toggleActive = async (b) => {
    try {
      await base44.entities.OfficeTerminal.update(b.id, { is_active: !(b.is_active !== false) });
      await loadOfficeDirectory(true);
      await load();
    } catch (e) {
      setError("Mise à jour impossible.");
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Supprimer le bureau ${b.office_name} ? Son compte (${b.email}) n'ouvrira plus le terminal de pointage.`)) return;
    try {
      await base44.entities.OfficeTerminal.delete(b.id);
      await loadOfficeDirectory(true);
      await load();
      flash("Bureau supprimé.");
    } catch (e) {
      setError("Suppression impossible.");
    }
  };

  const q = normalizeEmail(search);
  const filtered = bureaux.filter((b) => {
    if (!q) return true;
    const hay = [b.office_name, b.code, b.email, b.location, b.ville, ...(b.gestionnaires || []).map((g) => g.nom)].map(normalizeEmail).join(" ");
    return hay.includes(q);
  });
  const activeCount = bureaux.filter((b) => b.is_active !== false).length;

  // ---------- Formulaire ----------
  if (editing) {
    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={sectionTitleStyle}>{editing === "new" ? "NOUVEAU BUREAU" : `MODIFIER — BUREAU ${form.office_name || ""}`}</div>
            <div style={hintStyle}>Les champs marqués * sont obligatoires.</div>
          </div>
          <button style={ghostBtn} onClick={closeForm}>Annuler</button>
        </div>

        <div style={{ display: "grid", gap: 22 }}>
          <section>
            <div style={{ ...labelStyle, fontSize: 12, color: "oklch(0.4 0.1 165)", marginBottom: 10 }}>Identité</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Field label="Nom du bureau" required value={form.office_name} onChange={(v) => set("office_name", v)} placeholder="NOM DU BUREAU" flex="2 1 220px" />
              <Field label="Code" value={form.code} onChange={(v) => set("code", v)} placeholder="ABJ" flex="1 1 100px" />
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <label style={labelStyle}>Statut</label>
                <label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
                  {form.is_active ? "Actif" : "Inactif"}
                </label>
              </div>
            </div>
          </section>

          <section style={{ background: "oklch(0.97 0.02 190)", border: "1px solid oklch(0.88 0.05 190)", borderRadius: 12, padding: 14 }}>
            <div style={{ ...labelStyle, fontSize: 12, color: "oklch(0.4 0.1 190)", marginBottom: 4 }}>Terminal de pointage</div>
            <div style={{ ...hintStyle, marginBottom: 10 }}>
              Le compte connecté avec cet e-mail (Gmail du bureau) ne voit que le terminal de pointage, avec le nom du bureau. Si le bureau est inactif, le terminal s'affiche mais le pointage est bloqué.
            </div>
            <Field label="E-mail du compte bureau" required type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="bureau@citrat.ci" />
          </section>

          <section>
            <div style={{ ...labelStyle, fontSize: 12, color: "oklch(0.4 0.1 165)", marginBottom: 10 }}>Coordonnées</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Field label="Localisation (quartier)" value={form.location} onChange={(v) => set("location", v)} placeholder="Commerce" />
              <Field label="Ville" value={form.ville} onChange={(v) => set("ville", v)} placeholder="Ville du bureau" />
              <Field label="Adresse / repère" value={form.adresse} onChange={(v) => set("adresse", v)} placeholder="Face à la mairie" flex="2 1 280px" />
              <Field label="Téléphone du bureau" value={form.telephone} onChange={(v) => set("telephone", v)} placeholder="+225 07 00 00 00 00" />
              <Field label="E-mail de contact" type="email" value={form.email_contact} onChange={(v) => set("email_contact", v)} placeholder="contact@exemple.ci" />
            </div>
          </section>

          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ ...labelStyle, fontSize: 12, color: "oklch(0.4 0.1 165)", margin: 0 }}>Gestionnaires</div>
              <button style={smallBtn} onClick={addManager}>+ Ajouter un gestionnaire</button>
            </div>
            {form.gestionnaires.length === 0 && (
              <div style={{ ...hintStyle, padding: "14px", border: "1px dashed oklch(0.86 0.005 90)", borderRadius: 10, textAlign: "center" }}>
                Aucun gestionnaire. Ajoutez le responsable du bureau et ses adjoints.
              </div>
            )}
            <div style={{ display: "grid", gap: 10 }}>
              {form.gestionnaires.map((g, i) => (
                <div key={i} style={{ border: "1px solid oklch(0.91 0.005 90)", borderRadius: 12, padding: 12, background: g.principal ? "oklch(0.98 0.015 165)" : "#fff" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Field label="Nom complet" value={g.nom} onChange={(v) => setManager(i, "nom", v)} placeholder="KONE TORNON" flex="2 1 200px" />
                    <Field label="Fonction" value={g.fonction} onChange={(v) => setManager(i, "fonction", v)} placeholder="Chef de bureau" flex="1 1 150px" />
                    <Field label="E-mail" type="email" value={g.email} onChange={(v) => setManager(i, "email", v)} placeholder="prenom.nom@gmail.com" flex="2 1 200px" />
                    <Field label="Téléphone" value={g.telephone} onChange={(v) => setManager(i, "telephone", v)} placeholder="+225 …" flex="1 1 150px" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "oklch(0.4 0.005 90)", cursor: "pointer" }}>
                      <input type="radio" name="principal" checked={!!g.principal} onChange={() => setManager(i, "principal", true)} />
                      Responsable principal
                    </label>
                    <button style={dangerBtn} onClick={() => removeManager(i)}>Retirer</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, height: 80, padding: "10px 12px", resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Horaires d'ouverture, informations utiles…"
            />
          </section>

          {formError && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", border: "1px solid oklch(0.85 0.1 25)", fontSize: 12.5, fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>
              {formError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button style={ghostBtn} onClick={closeForm} disabled={saving}>Annuler</button>
            <button style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer le bureau"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Liste ----------
  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <div style={sectionTitleStyle}>BUREAUX CITRAT</div>
          <div style={{ ...hintStyle, marginTop: 4, maxWidth: 620 }}>
            Bureaux, gestionnaires et contacts. L'e-mail du compte bureau ouvre le terminal de pointage RH-CITRAT.
          </div>
        </div>
        <button style={primaryBtn} onClick={openNew}>+ Nouveau bureau</button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "16px 0" }}>
        <input
          style={{ ...inputStyle, flex: "1 1 240px", width: "auto" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un bureau, une ville, un gestionnaire…"
        />
        <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.55 0.005 90)" }}>
          {activeCount} actif{activeCount > 1 ? "s" : ""} sur {bureaux.length}
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.04 165)", border: "1px solid oklch(0.85 0.08 165)", fontSize: 12.5, fontWeight: 600, color: "oklch(0.38 0.1 165)" }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", border: "1px solid oklch(0.85 0.1 25)", fontSize: 12.5, fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...hintStyle, textAlign: "center", padding: "40px 0" }}>
          {bureaux.length === 0 ? "Aucun bureau configuré." : "Aucun bureau ne correspond à la recherche."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))" }}>
          {filtered.map((b) => {
            const active = b.is_active !== false;
            const managers = Array.isArray(b.gestionnaires) ? b.gestionnaires : [];
            const lead = managers.find((g) => g.principal) || managers[0];
            const others = managers.filter((g) => g !== lead);
            const staff = staffCount(b);
            return (
              <div key={b.id} style={{ border: "1px solid oklch(0.91 0.005 90)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", opacity: active ? 1 : 0.65 }}>
                <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", gap: 10, background: "oklch(0.985 0.008 190)", borderBottom: "1px solid oklch(0.93 0.005 90)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "oklch(0.25 0.02 190)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {b.office_name}
                      {b.code && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "oklch(0.93 0.02 190)", color: "oklch(0.4 0.06 190)" }}>{b.code}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "oklch(0.55 0.005 90)", marginTop: 2 }}>
                      {[b.location, b.ville].filter(Boolean).join(", ") || "Localisation non renseignée"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(b)}
                    title={active ? "Désactiver" : "Activer"}
                    style={{ alignSelf: "flex-start", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: active ? "oklch(0.72 0.15 160)" : "oklch(0.9 0.005 90)", color: active ? "#fff" : "oklch(0.45 0.005 90)", fontFamily: "'Poppins',sans-serif" }}
                  >
                    {active ? "Actif" : "Inactif"}
                  </button>
                </div>

                <div style={{ padding: "12px 16px", display: "grid", gap: 7, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, background: "oklch(0.96 0.03 190)", border: "1px solid oklch(0.88 0.05 190)", minWidth: 0 }}>
                    <span style={{ color: "oklch(0.45 0.1 190)", display: "inline-flex" }}><Icon d={ICONS.clock} /></span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", color: "oklch(0.4 0.08 190)", whiteSpace: "nowrap" }}>TERMINAL</span>
                    <span style={{ fontSize: 12, color: "oklch(0.35 0.03 190)", fontFamily: "ui-monospace,Menlo,monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.email}</span>
                  </div>
                  <InfoLine icon="phone">{b.telephone}</InfoLine>
                  <InfoLine icon="mail">{b.email_contact}</InfoLine>
                  <InfoLine icon="pin">{b.adresse}</InfoLine>

                  <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px dashed oklch(0.91 0.005 90)" }}>
                    <div style={{ ...labelStyle, fontSize: 10.5, marginBottom: 6 }}>Gestionnaires</div>
                    {lead ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        {[lead, ...others].map((g, i) => (
                          <div key={i} style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.3 0.01 90)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {g.nom || "—"}
                              {g.principal && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "oklch(0.94 0.04 165)", color: "oklch(0.4 0.1 165)" }}>Responsable</span>}
                              {g.fonction && <span style={{ fontSize: 11.5, fontWeight: 500, color: "oklch(0.55 0.005 90)" }}>· {g.fonction}</span>}
                            </div>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                              <InfoLine icon="mail">{g.email}</InfoLine>
                              <InfoLine icon="phone">{g.telephone}</InfoLine>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "oklch(0.6 0.005 90)", fontStyle: "italic" }}>Aucun gestionnaire renseigné</div>
                    )}
                  </div>
                </div>

                <div style={{ padding: "10px 16px", borderTop: "1px solid oklch(0.93 0.005 90)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "oklch(0.55 0.005 90)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon d={ICONS.user} size={13} /> {staff} agent{staff > 1 ? "s" : ""}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={smallBtn} onClick={() => openEdit(b)}>Modifier</button>
                    <button style={dangerBtn} onClick={() => remove(b)}>Supprimer</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
