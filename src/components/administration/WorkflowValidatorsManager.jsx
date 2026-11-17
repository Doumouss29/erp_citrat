import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect } from "react";
import { fetchWorkflowValidatorsConfig, saveWorkflowValidators } from "@/lib/workflowValidators";
import { base44 } from "@/api/base44Client";
import { BUREAUX, DEPARTEMENTS } from "@/lib/rhReferentiels";
import { OrgTiles, OrgTile } from "@/components/administration/OrgTiles";

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
  width: "100%"
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

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "oklch(0.4 0.1 165)",
  marginBottom: 6
};

const hintStyle = { fontSize: 12, color: "oklch(0.5 0.005 90)", marginBottom: 12, lineHeight: 1.5 };

const saveBtnStyle = {
  height: 40,
  padding: "0 18px",
  border: "none",
  borderRadius: 10,
  background: "#0f5c52",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Poppins',sans-serif"
};

const ghostBtnStyle = {
  height: 40,
  padding: "0 16px",
  border: "1px solid oklch(0.88 0.005 90)",
  borderRadius: 10,
  background: "#fff",
  color: "oklch(0.4 0.005 90)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Poppins',sans-serif"
};

const EMPTY_ROW = { localite: "", departement: "", nom: "", email: "" };

// Tuiles : Administration (services centraux, repli, niveaux 2 et 3) puis un bureau par tuile
const ADMIN = "__admin__";
const OTHER = "__other__";
const ADMIN_DEPTS = ["direction_generale", "administratif_financier"];
const properName = (s) => String(s || "").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// Bureaux et départements : référentiels déjà définis dans le code (fiche employé)
const LOCALITE_OPTIONS = [
  ...BUREAUX.map((b) => ({ value: b, label: b })),
  { value: "__default__", label: "__default__ (repli)" }
];
const DEPARTEMENT_OPTIONS = DEPARTEMENTS;

// Comparaison insensible à la casse et aux accents (ex. « bouaflé » = « BOUAFLE »)
function sameKey(a, b) {
  const clean = (v) =>
    String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return clean(a) === clean(b);
}

function Field({ label, value, onChange, placeholder, flex }) {
  return (
    <div style={{ flex: flex || "1 1 140px", minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// Champ « liste déroulante » : une valeur déjà enregistrée qui ne figure pas dans le
// référentiel est conservée comme option, pour ne rien perdre à l'enregistrement.
function SelectField({ label, value, onChange, options, placeholder, flex, upper }) {
  const known = options.find((o) => sameKey(o.value, value));
  const list = value && !known ? [{ value, label: value }, ...options] : options;
  return (
    <div style={{ flex: flex || "1 1 140px", minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      <FormSelect
        style={{ ...inputStyle, cursor: "pointer", appearance: "auto", textTransform: upper ? "uppercase" : "none" }}
        value={known ? known.value : (value || "")}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {list.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </FormSelect>
    </div>
  );
}

const cardStyle = { border: "1px solid oklch(0.91 0.005 90)", borderRadius: 12, padding: 12 };

const iconBtnStyle = {
  width: 38,
  height: 38,
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid oklch(0.88 0.005 90)",
  borderRadius: 10,
  background: "#fff",
  color: "#0f5c52",
  cursor: "pointer"
};

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Valeur en lecture seule (même gabarit que les champs, sans bordure de saisie)
function ReadField({ label, value, flex, upper, muted }) {
  return (
    <div style={{ flex: flex || "1 1 140px", minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      <div
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          background: "oklch(0.985 0.002 90)",
          borderColor: "transparent",
          textTransform: upper ? "uppercase" : "none",
          color: muted ? "oklch(0.6 0.005 90)" : inputStyle.color,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
        title={value || ""}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export default function WorkflowValidatorsManager() {
  const [level1, setLevel1] = useState([]);
  const [level2, setLevel2] = useState({ nom: "", email: "" });
  const [level3, setLevel3] = useState({ nom: "", email: "" });
  const [directL2, setDirectL2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [readOnly, setReadOnly] = useState([]);
  // Lignes ouvertes en modification (clés : "l1-<index>", "l2", "l3")
  const [editing, setEditing] = useState({});
  const isEditing = (key) => !!editing[key];
  // Tuile ouverte : "" = aucune (tuiles seules), ADMIN, ou un bureau
  const [tile, setTile] = useState("");
  const toggleEdit = (key) => setEditing((p) => ({ ...p, [key]: !p[key] }));

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const { value } = await fetchWorkflowValidatorsConfig();
      setLevel1(value.level1 || []);
      setLevel2(value.level2 || { nom: "", email: "" });
      setLevel3(value.level3 || { nom: "", email: "" });
      setDirectL2(value.direct_level2 || []);
      setReadOnly(value.read_only || []);
      setEditing({});
    } catch (e) {
      setError("Impossible de charger la configuration des validateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (index, key, val) =>
    setLevel1((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: val } : row)));
  const addRow = (preset = {}) => {
    setEditing((p) => ({ ...p, [`l1-${level1.length}`]: true }));
    setLevel1((prev) => [...prev, { ...EMPTY_ROW, ...preset }]);
  };

  // Rangement d'une ligne de niveau 1 : services centraux et repli → Administration ; sinon son bureau
  const groupOf = (row) => {
    if (ADMIN_DEPTS.includes(row.departement) || row.localite === "__default__") return ADMIN;
    const b = BUREAUX.find((x) => sameKey(x, row.localite));
    return b || (row.localite ? OTHER : "");
  };
  const removeRow = (index) => {
    setLevel1((prev) => prev.filter((_, i) => i !== index));
    // Les clés d'édition suivent l'index : on referme tout après une suppression
    setEditing((p) => ({ l2: p.l2, l3: p.l3 }));
  };

  const updateDirect = (index, key, val) =>
    setDirectL2((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: val } : row)));
  const addDirect = () => {
    setEditing((p) => ({ ...p, [`d-${directL2.length}`]: true }));
    setDirectL2((prev) => [...prev, { nom: "", email: "", employee_code: "" }]);
  };
  const removeDirect = (index) => {
    setDirectL2((prev) => prev.filter((_, i) => i !== index));
    setEditing((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith("d-"))));
  };

  const localiteLabel = (v) => (LOCALITE_OPTIONS.find((o) => sameKey(o.value, v)) || {}).label || v;
  const departementLabel = (v) => (DEPARTEMENT_OPTIONS.find((o) => sameKey(o.value, v)) || {}).label || v;

  const editButton = (key) => (
    <button
      type="button"
      onClick={() => toggleEdit(key)}
      style={{ ...iconBtnStyle, ...(isEditing(key) ? { background: "#0f5c52", color: "#fff", borderColor: "#0f5c52" } : {}) }}
      title={isEditing(key) ? "Terminer la modification" : "Modifier"}
      aria-label={isEditing(key) ? "Terminer la modification" : "Modifier"}
    >
      {isEditing(key) ? <CheckIcon /> : <PencilIcon />}
    </button>
  );

  // Niveaux 2 et 3 : une personne (nom + e-mail), même présentation que les lignes du niveau 1
  const renderSingle = (key, value, setValue, namePlaceholder) => (
    <div style={cardStyle}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        {isEditing(key) ? (
          <>
            <Field label="Nom" value={value.nom} onChange={(v) => setValue((p) => ({ ...p, nom: v }))} placeholder={namePlaceholder} />
            <Field label="E-mail" value={value.email} onChange={(v) => setValue((p) => ({ ...p, email: v }))} placeholder="adresse@exemple.com" />
          </>
        ) : (
          <>
            <ReadField label="Nom" value={value.nom} />
            <ReadField label="E-mail" value={value.email} />
          </>
        )}
        {editButton(key)}
      </div>
    </div>
  );

  const onSubmit = async () => {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      // Adresses modifiées (même bureau/département, ou niveaux 2 et 3) : les demandes en attente suivront.
      const before = (await fetchWorkflowValidatorsConfig().catch(() => null))?.value;
      const n = (v) => String(v || "").trim().toLowerCase();
      const changes = [];
      if (before) {
        for (const row of level1) {
          const old = (before.level1 || []).find((o) => n(o.localite) === n(row.localite) && n(o.departement) === n(row.departement));
          if (old && n(old.email) && n(row.email) && n(old.email) !== n(row.email)) changes.push({ level: 1, from: old.email, to: row.email, nom: row.nom });
        }
        if (n(before.level2?.email) && n(level2.email) && n(before.level2.email) !== n(level2.email)) changes.push({ level: 2, from: before.level2.email, to: level2.email, nom: level2.nom });
        if (n(before.level3?.email) && n(level3.email) && n(before.level3.email) !== n(level3.email)) changes.push({ level: 3, from: before.level3.email, to: level3.email, nom: level3.nom });
      }
      await saveWorkflowValidators({ level1, level2, level3, direct_level2: directL2, read_only: readOnly, level1_by_employee: [] });
      let moved = 0;
      if (changes.length) {
        try {
          const res = await base44.functions.invoke("reassignApprovers", { changes });
          moved = res?.data?.reassigned || 0;
        } catch (e) {
          setError("Validateurs enregistrés, mais les demandes en attente n'ont pas pu suivre la nouvelle adresse. Signalez-le à la DSI.");
        }
      }
      setMsg(moved ? `Validateurs enregistrés. ${moved} demande(s) en attente réattribuée(s) à la nouvelle adresse.` : "Validateurs enregistrés.");
      await load();
    } catch (e) {
      setError("Enregistrement impossible. Vérifiez que vous êtes administrateur.");
    } finally {
      setSaving(false);
    }
  };

  const rowsOf = (key) => level1.map((row, index) => ({ row, index })).filter(({ row }) => groupOf(row) === key || (key === OTHER && groupOf(row) === ""));
  const tiles = [
    {
      key: ADMIN,
      label: "Administration",
      admin: true,
      count: rowsOf(ADMIN).length + directL2.length + (level2.email ? 1 : 0) + (level3.email ? 1 : 0) + readOnly.length,
      rh: properName(level2.nom) || level2.email || "",
      dg: properName(level3.nom) || level3.email || ""
    },
    ...BUREAUX.map((b) => {
      const rows = rowsOf(b);
      const names = rows.map(({ row }) => properName(row.nom) || row.email).filter(Boolean);
      return { key: b, label: b, count: rows.length, names, email: (rows[0] && rows[0].row.email) || "" };
    }),
    ...(rowsOf(OTHER).length ? [{ key: OTHER, label: "Autres localités", count: rowsOf(OTHER).length, names: rowsOf(OTHER).map(({ row }) => properName(row.nom) || row.email), email: "" }] : [])
  ];
  const tileLabel = (k) => (tiles.find((t) => t.key === k) || {}).label || k;

  // Ligne de validateur de niveau 1 (lecture ou modification)
  const renderL1 = ({ row, index }) => {
    const key = `l1-${index}`;
    const open = isEditing(key);
    return (
      <div key={index} style={{ ...cardStyle, ...(open ? { borderColor: "oklch(0.75 0.06 165)" } : {}) }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          {open ? (
            <>
              <SelectField label="Localité" value={row.localite} onChange={(v) => updateRow(index, "localite", v)} options={LOCALITE_OPTIONS} placeholder="— Choisir un bureau —" upper />
              <SelectField label="Département" value={row.departement} onChange={(v) => updateRow(index, "departement", v)} options={DEPARTEMENT_OPTIONS} placeholder="Tous les services (optionnel)" />
              <Field label="Nom" value={row.nom} onChange={(v) => updateRow(index, "nom", v)} placeholder="Nom du validateur" />
              <Field label="E-mail" value={row.email} onChange={(v) => updateRow(index, "email", v)} placeholder="adresse@exemple.com" />
            </>
          ) : (
            <>
              <ReadField label="Localité" value={localiteLabel(row.localite)} upper />
              <ReadField label="Département" value={row.departement ? departementLabel(row.departement) : "Tous les services"} muted={!row.departement} />
              <ReadField label="Nom" value={row.nom} />
              <ReadField label="E-mail" value={row.email} />
            </>
          )}
          {editButton(key)}
        </div>
        {open && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              type="button"
              onClick={() => removeRow(index)}
              style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 600, color: "oklch(0.5 0.18 25)", cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}
            >
              Supprimer ce validateur
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)", display: "flex", justifyContent: "center" }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)" }}>
      <div style={sectionTitleStyle}>VALIDATEURS DU WORKFLOW RH</div>
      <div style={{ fontSize: 12.5, color: "oklch(0.5 0.005 90)", marginBottom: 18, lineHeight: 1.5 }}>
        Ces e-mails déterminent qui peut valider les congés, absences et activités. Saisissez ici les adresses professionnelles de chaque validateur.
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", border: "1px solid oklch(0.85 0.1 25)", fontSize: "12.5px", fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>
          {error}
        </div>
      )}
      {msg && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "oklch(0.95 0.06 145)", border: "1px solid oklch(0.8 0.12 145)", fontSize: "12.5px", fontWeight: 600, color: "oklch(0.35 0.1 145)" }}>
          {msg}
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <OrgTiles label="Bureaux">
          {tiles.map((t) => {
            const on = tile === t.key;
            return t.admin ? (
              <OrgTile
                key={t.key}
                label={t.label}
                sub="Services centraux, repli, niveaux 2 et 3"
                icon="shield"
                variant="admin"
                value={t.count}
                unit={`rôle${t.count > 1 ? "s" : ""} configuré${t.count > 1 ? "s" : ""}`}
                stats={[
                  { label: "Gestionnaire RH", value: t.rh || "À définir", tone: t.rh ? "small" : "warn" },
                  { label: "Direction générale", value: t.dg || "À définir", tone: t.dg ? "small" : "warn" }
                ]}
                active={on}
                onClick={() => setTile(on ? "" : t.key)}
              />
            ) : (
              <OrgTile
                key={t.key}
                label={t.label}
                sub="Validation de niveau 1"
                icon="key"
                value={t.count}
                unit={`validateur${t.count > 1 ? "s" : ""}`}
                note={t.names.length ? <b>{t.names.join(", ")}</b> : "Aucun validateur : repli utilisé"}
                noteWarn={!t.names.length}
                stats={[{ label: "E-mail", value: t.email || "—", tone: "small" }]}
                active={on}
                muted={!t.count}
                onClick={() => setTile(on ? "" : t.key)}
              />
            );
          })}
        </OrgTiles>
      </div>

      {tile && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>{tileLabel(tile)}</span>
          <button type="button" onClick={() => setTile("")} style={{ ...ghostBtnStyle, height: 30, fontSize: 12, padding: "0 12px" }}>Fermer</button>
        </div>
      )}

      {tile && tile !== ADMIN && (
        <div style={{ marginBottom: 26 }}>
          <div style={sectionTitleStyle}>NIVEAU 1 — VALIDATEUR DU BUREAU</div>
          <div style={hintStyle}>Valide en premier les congés, absences et activités des agents de ce bureau.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rowsOf(tile).map(renderL1)}
            {rowsOf(tile).length === 0 && <div style={{ ...hintStyle, marginBottom: 0 }}>Aucun validateur pour ce bureau : les demandes passent par le validateur de repli.</div>}
          </div>
          <button onClick={() => addRow(tile === OTHER ? {} : { localite: tile })} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Ajouter un validateur</button>
        </div>
      )}

      {tile === ADMIN && (<>
      <div style={{ marginBottom: 26 }}>
        <div style={sectionTitleStyle}>NIVEAU 1 — SERVICES CENTRAUX ET REPLI</div>
        <div style={hintStyle}>
          Validateurs de la Direction et du service Administratif &amp; Financier, et validateur de repli (« __default__ ») utilisé lorsqu'aucun bureau ne correspond.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rowsOf(ADMIN).map(renderL1)}
        </div>
        <button onClick={() => addRow({ localite: "ABIDJAN", departement: "administratif_financier" })} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Ajouter un validateur</button>
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={sectionTitleStyle}>SANS VALIDATEUR DE BUREAU — CIRCUIT RH PUIS DG</div>
        <div style={hintStyle}>
          Personnes dont les demandes ne passent pas par un validateur de bureau (ex. coordinateur) : elles vont directement au Niveau 2 (RH) puis au Niveau 3 (DG). Les validateurs de bureau envoient leurs propres demandes directement à la DG ; le gestionnaire RH passe directement au DG ; la Direction Générale ne dépose pas de demande.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {directL2.map((row, index) => {
            const key = `d-${index}`;
            const open = isEditing(key);
            return (
              <div key={key} style={{ ...cardStyle, ...(open ? { borderColor: "oklch(0.75 0.06 165)" } : {}) }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                  {open ? (
                    <>
                      <Field label="Nom" value={row.nom} onChange={(v) => updateDirect(index, "nom", v)} placeholder="Nom de la personne" />
                      <Field label="E-mail" value={row.email} onChange={(v) => updateDirect(index, "email", v)} placeholder="adresse@gmail.com" />
                    </>
                  ) : (
                    <>
                      <ReadField label="Nom" value={row.nom} />
                      <ReadField label="E-mail" value={row.email} />
                    </>
                  )}
                  {editButton(key)}
                </div>
                {open && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => removeDirect(index)}
                      style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 600, color: "oklch(0.5 0.18 25)", cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}
                    >
                      Retirer de ce circuit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={addDirect} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Ajouter une personne</button>
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={sectionTitleStyle}>NIVEAU 2 — GESTIONNAIRE RH</div>
        <div style={hintStyle}>Valide les demandes après le Niveau 1.</div>
        {renderSingle("l2", level2, setLevel2, "Nom du gestionnaire RH")}
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={sectionTitleStyle}>NIVEAU 3 — DIRECTION GÉNÉRALE</div>
        <div style={hintStyle}>Validation finale des congés et absences.</div>
        {renderSingle("l3", level3, setLevel3, "Nom du responsable")}
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={sectionTitleStyle}>LECTURE SEULE — ASSISTANTE RH</div>
        <div style={hintStyle}>Ces comptes consultent les validations mais ne peuvent ni approuver ni refuser, même s'ils sont administrateurs.</div>
        <div style={{ display: "grid", gap: 10 }}>
          {readOnly.map((row, index) => (
            <div key={index} style={cardStyle}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                <Field label="Nom" value={row.nom} onChange={(v) => setReadOnly((prev) => prev.map((r, i) => (i === index ? { ...r, nom: v } : r)))} placeholder="Nom de la personne" />
                <Field label="E-mail" value={row.email} onChange={(v) => setReadOnly((prev) => prev.map((r, i) => (i === index ? { ...r, email: v } : r)))} placeholder="adresse@exemple.com" />
                <button type="button" onClick={() => setReadOnly((prev) => prev.filter((_, i) => i !== index))} style={ghostBtnStyle}>Retirer</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setReadOnly((prev) => [...prev, { nom: "", email: "" }])} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Ajouter une personne</button>
      </div>
      </>)}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={load} disabled={saving} style={ghostBtnStyle}>Annuler</button>
        <button onClick={onSubmit} disabled={saving} style={{ ...saveBtnStyle, cursor: saving ? "wait" : "pointer" }}>
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}