import { FormSelect } from "@/components/ui/form-select";
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { effectiveAccess } from "@/lib/accessProfiles";

import { HSE_PROFILS as PROFILS } from "@/lib/hseProfils";
const norm = (value) => String(value || "").trim().toLowerCase();

const field = { height: 38, padding: "0 10px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", background: "#fff", fontSize: 13, fontFamily: "'Poppins',sans-serif", minWidth: 0 };
const button = { height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", background: "#fff", color: "oklch(0.4 0.005 90)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" };

// Lecture d'un export CSV : valeurs éventuellement entre guillemets, séparées par une virgule ou un point-virgule.
function parseCsv(text) {
  const rows = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (rows.length < 2) return [];
  const split = (line) => {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && quoted && line[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if ((c === "," || c === ";") && !quoted) { cells.push(cell); cell = ""; }
      else cell += c;
    }
    cells.push(cell);
    return cells.map((v) => v.trim());
  };
  const headers = split(rows[0]).map(norm);
  return rows.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

// Liste des personnes alertées lors d'un évènement HSE-PRESFOR (administration du portail).
export default function HseAlertRecipientsManager({ users = [], profiles = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [profil, setProfil] = useState(PROFILS[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.ResponsableHSE.list("nom", 500);
      setRows(list || []);
    } catch (err) {
      setError("La liste n'a pas pu être chargée.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const accounts = useMemo(() => new Map(users.map((u) => [norm(u.email), u])), [users]);
  const listed = useMemo(() => new Set(rows.map((r) => norm(r.email))), [rows]);
  const available = useMemo(
    () => users.filter((u) => u.email && !listed.has(norm(u.email)) && u.statut !== "suspendu")
      .sort((a, b) => String(a.full_name || a.email).localeCompare(String(b.full_name || b.email), "fr")),
    [users, listed]
  );

  const statusOf = (row) => {
    const account = accounts.get(norm(row.email));
    if (!account) return { label: "Pas de compte : ne reçoit rien", color: "oklch(0.45 0.16 25)", bg: "oklch(0.96 0.03 25)" };
    if (account.statut === "suspendu") return { label: "Compte suspendu : ne reçoit rien", color: "oklch(0.45 0.16 25)", bg: "oklch(0.96 0.03 25)" };
    if (!effectiveAccess(account, profiles).includes("hse")) return { label: "Sans accès à HSE-PRESFOR", color: "oklch(0.45 0.12 70)", bg: "oklch(0.96 0.05 85)" };
    return { label: "Compte actif", color: "#0f5c52", bg: "oklch(0.95 0.04 165)" };
  };

  const run = async (action, doneMessage) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (doneMessage) setMessage(doneMessage);
      await load();
    } catch (err) {
      setError("L'enregistrement a échoué. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const addSelected = () => {
    const account = accounts.get(norm(selectedEmail));
    if (!account) return;
    run(async () => {
      await base44.entities.ResponsableHSE.create({ nom: account.full_name || account.email, email: account.email, profil, actif: true });
      setSelectedEmail("");
    });
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const seen = new Set(listed);
    const fresh = [];
    for (const row of parseCsv(text)) {
      const email = norm(row.email);
      if (!email || !row.nom || seen.has(email)) continue;
      seen.add(email);
      fresh.push({
        nom: row.nom,
        email,
        profil: PROFILS.includes(row.profil) ? row.profil : PROFILS[0],
        actif: norm(row.actif) !== "false",
      });
    }
    if (!fresh.length) {
      setError(null);
      setMessage("Aucune nouvelle personne à importer.");
      return;
    }
    const withoutAccount = fresh.filter((r) => !accounts.has(r.email)).length;
    await run(
      () => Promise.all(fresh.map((row) => base44.entities.ResponsableHSE.create(row))),
      `${fresh.length} personne(s) importée(s)${withoutAccount ? `, dont ${withoutAccount} sans compte` : ""}.`
    );
  };

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid oklch(0.92 0.005 90)", padding: "clamp(16px,3vw,24px)", marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "oklch(0.4 0.1 165)", marginBottom: 6 }}>ALERTES HSE-PRESFOR</div>
      <div style={{ fontSize: 12.5, color: "oklch(0.5 0.005 90)", lineHeight: 1.5, marginBottom: 16 }}>
        Ces personnes sont prévenues à chaque nouvelle fiche HSE. Il leur faut un compte actif : le détail de l'alerte se consulte uniquement une fois connecté au portail. Rapports trimestriels : le Référent HSE les prépare, le Coordinateur HSE ou le Chef de projet HSE les valide.
      </div>

      {error && <div role="alert" style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", color: "oklch(0.42 0.16 25)", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
      {message && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "oklch(0.95 0.04 165)", color: "#0f5c52", fontSize: 12.5, fontWeight: 600 }}>{message}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <FormSelect aria-label="Compte à ajouter" style={{ ...field, flex: "2 1 220px" }} value={selectedEmail} onChange={(e) => setSelectedEmail(e.target.value)}>
          <option value="">Choisir un compte du portail</option>
          {available.map((u) => <option key={u.id} value={u.email}>{u.full_name ? `${u.full_name} (${u.email})` : u.email}</option>)}
        </FormSelect>
        <FormSelect aria-label="Profil" style={{ ...field, flex: "1 1 170px" }} value={profil} onChange={(e) => setProfil(e.target.value)}>
          {PROFILS.map((p) => <option key={p} value={p}>{p}</option>)}
        </FormSelect>
        <button type="button" style={{ ...button, background: "#0f5c52", color: "#fff", border: "none" }} disabled={!selectedEmail || saving} onClick={addSelected}>Ajouter</button>
        <label style={{ ...button, display: "inline-flex", alignItems: "center" }}>
          Importer un CSV
          <input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={saving} style={{ display: "none" }} />
        </label>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "oklch(0.5 0.005 90)" }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "oklch(0.5 0.005 90)", padding: "20px 0" }}>Aucun destinataire. Sans liste, les alertes automatiques vont aux administrateurs.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const status = statusOf(row);
            return (
              <div key={row.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, border: "1px solid oklch(0.92 0.005 90)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "oklch(0.25 0.01 90)" }}>{row.nom}</div>
                  <div style={{ fontSize: 12, color: "oklch(0.5 0.005 90)", overflowWrap: "anywhere" }}>{row.email}</div>
                </div>
                <FormSelect aria-label={`Profil de ${row.nom}`} style={{ ...field, flex: "1 1 170px" }} value={row.profil} disabled={saving} onChange={(e) => run(() => base44.entities.ResponsableHSE.update(row.id, { profil: e.target.value }))}>
                  {!PROFILS.includes(row.profil) && <option value={row.profil}>{row.profil} (ancien profil à remplacer)</option>}
                  {PROFILS.map((p) => <option key={p} value={p}>{p}</option>)}
                </FormSelect>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 100, color: status.color, background: status.bg }}>{status.label}</span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                  <input type="checkbox" checked={row.actif !== false} disabled={saving} onChange={(e) => run(() => base44.entities.ResponsableHSE.update(row.id, { actif: e.target.checked }))} style={{ accentColor: "#0f5c52", width: 15, height: 15 }} />
                  Reçoit les alertes
                </label>
                {confirmDeleteId === row.id ? (
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button type="button" style={button} onClick={() => setConfirmDeleteId(null)}>Annuler</button>
                    <button type="button" style={{ ...button, color: "oklch(0.45 0.16 25)" }} disabled={saving} onClick={() => { setConfirmDeleteId(null); run(() => base44.entities.ResponsableHSE.delete(row.id)); }}>Confirmer</button>
                  </span>
                ) : (
                  <button type="button" style={button} onClick={() => setConfirmDeleteId(row.id)}>Retirer</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
