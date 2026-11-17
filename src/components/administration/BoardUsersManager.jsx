import { FormSelect } from "@/components/ui/form-select";
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FONCTIONS } from "@/lib/userFonctions";
import { effectiveAccess, fetchProfiles, profileApps } from "@/lib/accessProfiles";
import { OrgTiles, OrgTile } from "@/components/administration/OrgTiles";

// Onglet « CITRAT-Board » de l'administration du portail : uniquement les personnes qui ont accès au Board
// (ou y sont inscrites), leur fonction et leurs bureaux, et l'ajout de nouvelles personnes.
const NONE = "__none__";
const ADMIN = "__admin__";
const norm = (v) => String(v || "").trim().toLowerCase();
const accountName = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || u.email;
const pendingName = (a) => [a.prenom, a.nom].filter(Boolean).join(" ") || a.email;
// Le rôle d'administration est défini par l'API SQLite, distinct de la fonction Board.
const isPortalAdmin = (u) => u?.role === "admin" && u?.super_admin === true;

const inputStyle = { height: 36, padding: "0 10px", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 10, background: "#fff", fontSize: 13, maxWidth: "100%" };

const emptyForm = { user_id: "", fonction: "secretaire", bureau_ids: [] };

const shortName = (s) => String(s || "").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

function BureauChips({ bureaux, bureauIds, disabled, locked, onToggle }) {
  return (
    <div style={{ flex: "2 1 300px", display: "flex", flexWrap: "wrap", gap: 6 }}>
      {bureaux.map((b) => {
        const on = locked || bureauIds.includes(b.id);
        return (
          <button
            key={b.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(b.id)}
            disabled={disabled || locked}
            title={locked ? "La Direction est rattachée à tous les bureaux" : b.nom}
            style={{ padding: "5px 10px", borderRadius: 100, fontSize: 12, cursor: disabled || locked ? "default" : "pointer", border: `1px solid ${on ? "#0C3D85" : "oklch(0.92 0.005 90)"}`, background: on ? "#0C3D85" : "#fff", color: on ? "#fff" : "oklch(0.4 0.005 90)" }}
          >
            {b.code}
          </button>
        );
      })}
    </div>
  );
}

function Row({ name, email, fonction, bureauIds, bureaux, disabled, onFonction, onToggleBureau, tag, onRemove, removeDisabled }) {
  const isDirection = fonction === "admin";
  const [confirm, setConfirm] = useState(false);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid oklch(0.95 0.003 90)" }}>
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, overflowWrap: "anywhere" }}>
          {name}
          {tag && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 600, color: "oklch(0.55 0.13 65)" }}>{tag}</span>}
        </div>
        <div style={{ fontSize: 12, color: "oklch(0.52 0.005 90)", overflowWrap: "anywhere" }}>{email}</div>
      </div>
      <FormSelect style={{ ...inputStyle, flex: "0 1 200px" }} value={fonction || ""} onChange={(e) => onFonction(e.target.value)} disabled={disabled} aria-label={`Fonction de ${name}`}>
        <option value="">Fonction à définir</option>
        {FONCTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </FormSelect>
      <BureauChips bureaux={bureaux} bureauIds={bureauIds} disabled={disabled} locked={isDirection} onToggle={onToggleBureau} />
      {onRemove && (confirm ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#c53637" }}>Retirer du Board ?</span>
          <button type="button" onClick={() => { setConfirm(false); onRemove(); }} disabled={disabled} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: "#c53637", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Oui</button>
          <button type="button" onClick={() => setConfirm(false)} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid oklch(0.92 0.005 90)", background: "#fff", color: "oklch(0.52 0.005 90)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Non</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          disabled={disabled || removeDisabled}
          title={removeDisabled ? "Vous ne pouvez pas vous retirer vous-même" : `Retirer ${name} du CITRAT-Board`}
          aria-label={`Retirer ${name} du CITRAT-Board`}
          style={{ marginLeft: "auto", height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid #fdc9c4", background: "#fff", color: "#b32228", fontSize: 12, fontWeight: 600, cursor: disabled || removeDisabled ? "default" : "pointer", opacity: removeDisabled ? 0.5 : 1 }}
        >
          Retirer
        </button>
      ))}
    </div>
  );
}

export default function BoardUsersManager({ users, setUsers, currentUser, refreshUser }) {
  const [bureaux, setBureaux] = useState([]);
  const [annuaire, setAnnuaire] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [terminalEmails, setTerminalEmails] = useState([]);
  const [search, setSearch] = useState("");
  // "" = aucun bureau choisi : seules les tuiles s'affichent
  const [bureauFilter, setBureauFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.OfficeTerminal.list("office_name", 200),
      base44.entities.AnnuaireAttente.list(null, 500),
      base44.entities.OfficeTerminal.list(null, 200),
      fetchProfiles({ force: true }),
    ])
      .then(([b, a, t, p]) => {
        if (!alive) return;
        setBureaux((b || []).map(x => ({ ...x, nom: x.office_name, code: x.code || x.office_name })));
        setAnnuaire(a || []);
        setProfiles(p || []);
        setTerminalEmails((t || []).map((x) => norm(x.email)));
      })
      .catch((e) => { if (alive) setError(e?.message || "Chargement impossible."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const saveUser = async (userId, patch) => {
    setSaving(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("updateUserAccess", { user_id: userId, ...patch });
      const access = (res?.data || res)?.access;
      setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, ...patch, ...(access ? { access } : {}) } : x)));
      if (currentUser?.id === userId && refreshUser) refreshUser();
      return true;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Échec de l'enregistrement.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const savePending = async (entry, patch) => {
    const data = { ...patch };
    if (data.bureau_ids) data.bureau_codes = data.bureau_ids.map((id) => bureaux.find((b) => b.id === id)?.code).filter(Boolean);
    setSaving(true);
    setError(null);
    try {
      await base44.entities.AnnuaireAttente.update(entry.id, data);
      setAnnuaire((prev) => prev.map((x) => (x.id === entry.id ? { ...x, ...data } : x)));
    } catch (e) {
      setError(e?.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const isDirection = form.fonction === "admin";
    const account = users.find((u) => u.id === form.user_id);
    if (!account) return setError("Choisissez un utilisateur dans la liste.");
    if (!isDirection && form.bureau_ids.length === 0) return setError("Sélectionnez au moins un bureau.");
    const bureau_ids = isDirection ? allIds : form.bureau_ids;
    // L'ajout vaut attribution explicite de l'application, y compris pour un externe.
    const access = Array.from(new Set([...(account.access || []), "cgesnboard"]));
    const done = await saveUser(account.id, { fonction: form.fonction, bureau_ids, access });
    if (done) {
      setForm(emptyForm);
      setAdding(false);
    }
  };

  // Retire une personne du Board : fonction et bureaux vidés, accès individuel CITRAT-Board supprimé,
  // et affectation préparée éventuelle supprimée (sinon la personne resterait listée).
  const removeMember = async (u) => {
    const access = (u.access || []).filter((a) => a !== "cgesnboard");
    const done = await saveUser(u.id, { fonction: "", bureau_ids: [], access });
    if (!done) return;
    const entries = annuaire.filter((a) => norm(a.email) === norm(u.email));
    for (const entry of entries) {
      try {
        await base44.entities.AnnuaireAttente.delete(entry.id);
        setAnnuaire((prev) => prev.filter((x) => x.id !== entry.id));
      } catch (e) {
        setError(e?.message || "Impossible de supprimer l'affectation préparée.");
      }
    }
    if (profileApps(profiles, u.grade).includes("cgesnboard")) {
      setError(`${accountName(u)} garde l'accès au Board via son grade. Retirez CITRAT-Board du grade dans l'onglet Profils, ou changez son grade dans Utilisateurs.`);
    }
  };

  const removePending = async (entry) => {
    setSaving(true);
    setError(null);
    try {
      await base44.entities.AnnuaireAttente.delete(entry.id);
      setAnnuaire((prev) => prev.filter((x) => x.id !== entry.id));
    } catch (e) {
      setError(e?.message || "Échec de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  const allIds = bureaux.map((b) => b.id);
  const toggled = (cur, id) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const term = norm(search);
  // Bureau affiché : la tuile choisie ; une recherche sans tuile porte sur tous les bureaux
  const effFilter = bureauFilter || (term ? "all" : "");
  // Administration : la Direction et toute personne rattachée à tous les bureaux
  const isAll = (ids, fonction, account) => isPortalAdmin(account) || fonction === "admin" || (allIds.length > 0 && allIds.every((id) => ids.includes(id)));
  const matches = (name, email, ids, fonction, account) => {
    if (!effFilter) return false;
    const all = isAll(ids, fonction, account);
    if (effFilter === ADMIN && !all) return false;
    if (effFilter === NONE && (ids.length || all)) return false;
    if (effFilter !== "all" && effFilter !== NONE && effFilter !== ADMIN && (all || !ids.includes(effFilter))) return false;
    return !term || norm(`${name} ${email}`).includes(term);
  };

  const annuaireEmails = useMemo(() => new Set(annuaire.map((a) => norm(a.email))), [annuaire]);
  // Seules les personnes concernées par le Board sont listées, pas tous les comptes du portail.
  const accounts = useMemo(
    () => users
      .filter((u) => !terminalEmails.includes(norm(u.email)))
      .filter((u) => isPortalAdmin(u) || u.fonction || annuaireEmails.has(norm(u.email)) || effectiveAccess(u, profiles).includes("cgesnboard"))
      .sort((a, b) => accountName(a).localeCompare(accountName(b))),
    [users, terminalEmails, annuaireEmails, profiles]
  );
  const accountEmails = useMemo(() => new Set(users.map((u) => norm(u.email))), [users]);
  // Utilisateurs du portail qui ne sont pas encore dans la liste du Board.
  const candidates = useMemo(() => {
    const memberIds = new Set(accounts.map((u) => u.id));
    return users
      .filter((u) => !memberIds.has(u.id) && !terminalEmails.includes(norm(u.email)))
      .sort((a, b) => accountName(a).localeCompare(accountName(b)));
  }, [users, accounts, terminalEmails]);
  const pending = annuaire.filter((a) => !accountEmails.has(norm(a.email)));

  const shownAccounts = accounts.filter((u) => matches(accountName(u), u.email, u.bureau_ids || [], u.fonction, u));
  const shownPending = pending.filter((a) => matches(pendingName(a), a.email, a.bureau_ids || [], a.fonction));

  const titleStyle = { fontSize: 14, fontWeight: 700, margin: "20px 0 4px" };

  // Chiffres de chaque tuile : comptes, affectations en attente, responsable du bureau
  const tiles = useMemo(() => {
    const allOf = (x) => isAll(x.bureau_ids || [], x.fonction, x);
    const admins = accounts.filter(allOf);
    const list = [{
      key: ADMIN,
      label: "Administration",
      title: "Administration · accès à tous les bureaux",
      count: admins.length,
      waiting: pending.filter(allOf).length,
      names: admins.map((u) => shortName(accountName(u))),
      admin: true
    }];
    bureaux.forEach((b) => {
      const members = accounts.filter((u) => !allOf(u) && (u.bureau_ids || []).includes(b.id));
      list.push({
        key: b.id,
        label: b.code || b.nom,
        title: b.nom,
        count: members.length,
        waiting: pending.filter((a) => !allOf(a) && (a.bureau_ids || []).includes(b.id)).length,
        responsables: members.filter((u) => u.fonction === "responsable").map((u) => shortName(accountName(u))),
        equipe: members.filter((u) => u.fonction === "adjoint" || u.fonction === "secretaire").length
      });
    });
    const noneCount = accounts.filter((u) => !allOf(u) && !(u.bureau_ids || []).length).length;
    const noneWaiting = pending.filter((a) => !(a.bureau_ids || []).length).length;
    if (noneCount || noneWaiting) list.push({ key: NONE, label: "Sans bureau", title: "Personnes sans bureau", count: noneCount, waiting: noneWaiting, responsables: [], none: true });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureaux, accounts, pending]);
  const selectedTile = tiles.find((t) => t.key === bureauFilter);

  return (
    <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(16px,3vw,28px)" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>CITRAT-Board</h2>
      <p style={{ fontSize: 13, color: "oklch(0.52 0.005 90)", margin: "4px 0 16px" }}>Personnes ayant accès au Board, avec leur fonction et leurs bureaux.</p>

      {!loading && tiles.length > 0 && (
        <div style={{ margin: "18px 0 6px" }}>
          <OrgTiles label="Bureaux">
            {tiles.map((t) => {
              const on = bureauFilter === t.key;
              return (
                <OrgTile
                  key={t.key}
                  label={t.label}
                  sub={t.admin ? "Accès à tous les bureaux" : t.none ? "Personnes à rattacher" : t.title}
                  icon={t.admin ? "shield" : t.none ? "alert" : "pin"}
                  variant={t.admin ? "admin" : t.none ? "warn" : undefined}
                  value={t.count}
                  unit={`membre${t.count > 1 ? "s" : ""}`}
                  note={t.admin
                    ? (t.names.length ? <><b>{t.names.join(", ")}</b></> : "Aucun membre")
                    : t.none ? "À rattacher à un bureau"
                    : t.responsables.length ? <>Resp. <b>{t.responsables.join(", ")}</b></> : "Pas de responsable"}
                  noteWarn={!t.admin && (t.none || !t.responsables.length)}
                  stats={t.admin
                    ? [{ label: "En attente", value: t.waiting, tone: t.waiting ? "warn" : undefined }]
                    : [
                        { label: "Équipe", value: t.equipe || 0 },
                        { label: "En attente", value: t.waiting, tone: t.waiting ? "warn" : undefined }
                      ]}
                  badge={t.waiting}
                  badgeTone="warn"
                  badgeTitle="Affectations en attente de création de compte"
                  active={on}
                  muted={!t.count && !t.waiting}
                  onClick={() => setBureauFilter(on ? "" : t.key)}
                />
              );
            })}
          </OrgTiles>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        <input style={{ ...inputStyle, flex: "1 1 220px" }} placeholder="Rechercher un nom ou un e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" onClick={() => { setAdding((v) => !v); setError(null); }} disabled={loading} style={{ height: 36, padding: "0 14px", borderRadius: 10, border: "none", background: "#0C3D85", color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer" }}>
          {adding ? "Annuler" : "Ajouter une personne"}
        </button>
      </div>

      {adding && (
        <form onSubmit={addMember} style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "oklch(0.98 0.003 90)", border: "1px solid oklch(0.92 0.005 90)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <FormSelect style={{ ...inputStyle, flex: "1 1 320px" }} value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} aria-label="Utilisateur">
            <option value="">{candidates.length ? "Choisir un utilisateur" : "Aucun autre utilisateur"}</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{accountName(u) === u.email ? u.email : `${accountName(u)} (${u.email})`}</option>)}
          </FormSelect>
          <FormSelect style={{ ...inputStyle, flex: "0 1 200px" }} value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} aria-label="Fonction">
            {FONCTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </FormSelect>
          <BureauChips bureaux={bureaux} bureauIds={form.bureau_ids} disabled={saving} locked={form.fonction === "admin"} onToggle={(id) => setForm({ ...form, bureau_ids: toggled(form.bureau_ids, id) })} />
          <button type="submit" disabled={saving} style={{ height: 36, padding: "0 14px", borderRadius: 10, border: "none", background: "#0C3D85", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Enregistrement…" : "Ajouter"}
          </button>
        </form>
      )}

      {error && <div role="alert" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "oklch(0.97 0.02 25)", color: "oklch(0.45 0.16 25)", fontSize: 13 }}>{error}</div>}

      {loading ? (
        <p style={{ fontSize: 13, color: "oklch(0.52 0.005 90)", marginTop: 16 }}>Chargement…</p>
      ) : !effFilter ? null : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>
              {selectedTile ? selectedTile.title : "Résultats de recherche · tous les bureaux"}
            </span>
            {bureauFilter && (
              <button type="button" onClick={() => setBureauFilter("")} style={{ height: 30, padding: "0 12px", borderRadius: 10, border: "1px solid oklch(0.92 0.005 90)", background: "#fff", color: "oklch(0.52 0.005 90)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Fermer
              </button>
            )}
          </div>
          <h3 style={{ ...titleStyle, marginTop: 8 }}>Comptes ({shownAccounts.length})</h3>
          {shownAccounts.length === 0 && <p style={{ fontSize: 13, color: "oklch(0.52 0.005 90)" }}>Aucun compte pour ce filtre.</p>}
          {shownAccounts.map((u) => {
            const ids = u.bureau_ids || [];
            return (
              <Row
                key={u.id}
                name={accountName(u)}
                email={u.email}
                fonction={isPortalAdmin(u) ? "admin" : u.fonction}
                bureauIds={ids}
                bureaux={bureaux}
                disabled={saving || isPortalAdmin(u)}
                onFonction={(fonction) => saveUser(u.id, fonction === "admin" ? { fonction, bureau_ids: allIds } : { fonction })}
                onToggleBureau={(id) => saveUser(u.id, { bureau_ids: toggled(ids, id) })}
                onRemove={isPortalAdmin(u) ? undefined : () => removeMember(u)}
                removeDisabled={currentUser?.id === u.id}
              />
            );
          })}

          <h3 style={titleStyle}>Affectations préparées, compte pas encore créé ({shownPending.length})</h3>
          <p style={{ fontSize: 12, color: "oklch(0.52 0.005 90)", margin: "0 0 4px" }}>Appliquées à la première connexion, sauf la fonction Direction, à attribuer une fois le compte créé.</p>
          {shownPending.length === 0 && <p style={{ fontSize: 13, color: "oklch(0.52 0.005 90)" }}>Aucune affectation pour ce filtre.</p>}
          {shownPending.map((a) => {
            const ids = a.bureau_ids || [];
            return (
              <Row
                key={a.id}
                name={pendingName(a)}
                email={a.email}
                fonction={a.fonction}
                bureauIds={ids}
                bureaux={bureaux}
                disabled={saving}
                tag="EN ATTENTE"
                onFonction={(fonction) => savePending(a, fonction === "admin" ? { fonction, bureau_ids: allIds } : { fonction })}
                onToggleBureau={(id) => savePending(a, { bureau_ids: toggled(ids, id) })}
                onRemove={() => removePending(a)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
