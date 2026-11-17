import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  STORE_KEY, DKEYS, INIT_ART, newWiz, diffState, jv, ROLES, ACTIVE_ROLES, applyTheme,
  L, TYPES, LVS, LET, WTYPES, wCnt, defCommuns, DEST, n0, CLAUSES, statusOf, hspOf, TYPE_COPRO, VILLAS
} from '@/lib/engine';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const blank = () => ({
  screen: 'dossiers', role: null, colorMode: null, did: null, dossiers: {}, wiz: newWiz(),
  info: { nom: '', adresse: '', commune: '', ville: '', tf: '', section: '', parcelle: '', ilot: '', usage: 'mixte', geometre: '', notaire: '', ref: '' },
  bats: [], hasSS: false, communs: [], dxfRules: {}, plans: {}, lots: [],
  coefType: { appartement: 1, commerce: 1, bureau: 1, cave: 0.2, box: 0.35, local: 0.2, parking: 0.25 },
  coefAnnexe: { balcon: 0.2, terrasse: 0.25, jardin: 0.1 },
  coefEtageAsc: { '-1': 1, '0': 1 }, coefEtageSans: { '-1': 1, '0': 1 },
  baseGen: 1000, grids: [], owners: [], articles: INIT_ART.map(a => ({ ...a })),
  sel: null, gridSel: null, artSel: 'a1', ownSel: null, eddTab: 'edd',
  diffusion: null, toast: '', newOwner: '', ajust: {}, avant: null, mesure: '', notes: '',
  journals: {}, metas: {}, theme: 'marine'
});

// Métadonnées d'un dossier stockées hors du contenu : intervenants, certification, validation.
const metaOf = r => ({ membres: r.membres || [], certif: r.certif || null, valid: r.valid || null, owner: r.created_by_id || null, createdBy: r.created_by || null, supprime: !!r.supprime, supprimeLe: r.supprime_le || null, syndic: r.syndic || null, maj: r.updated_date || null });
const normEmail = e => String(e || '').trim().toLowerCase();
const NO_META = Object.freeze({});

const pick = s => Object.fromEntries(DKEYS.map(k => [k, s[k]]));
// Identifiant provisoire d'un dossier pas encore enregistré en base.
const isLocalId = id => /^d\d{10,}$/.test(String(id || ''));
// Empreinte courte d'un contenu (évite de garder deux copies complètes en mémoire).
const hash = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return str.length + ':' + h; };
const remoteDisabled = () => typeof window !== 'undefined' && window.__COPROCIV_OFFLINE__ === true;

const Ctx = createContext(null);

export function CoprocivProvider({ children }) {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const isAdmin = !!user && user.role === 'admin';

  // Profil métier attribué automatiquement : tout compte ayant accès à COPROCIV sans profil
  // devient « géomètre-expert » (côté serveur, pour que les droits de la base suivent).
  const autoProfilAsked = useRef(false);
  useEffect(() => {
    if (!user || user.copro_profil || autoProfilAsked.current || remoteDisabled()) return;
    autoProfilAsked.current = true;
    base44.functions.invoke('coproAutoProfil', {})
      .then((res) => { if (res?.data?.updated && auth.refreshUser) auth.refreshUser(); })
      .catch(() => { /* sans profil enregistré, le module reste utilisable en géomètre côté affichage */ });
  }, [user?.id, user?.copro_profil]); // eslint-disable-line react-hooks/exhaustive-deps

  const [rawState, setRawState] = useState(blank);
  // Les mises à jour renvoient souvent un objet PARTIEL ({ lots }, { wiz }…) :
  // on fusionne toujours avec l'état courant.
  const setState = useCallback((u) => {
    setRawState(s => {
      const patch = typeof u === 'function' ? u(s) : u;
      return patch === s ? s : { ...s, ...patch };
    });
  }, []);
  const stateRef = useRef(rawState);
  stateRef.current = rawState;

  const [savedAt, setSavedAt] = useState(null);
  const [sync, setSync] = useState(remoteDisabled() ? 'local' : 'loading'); // loading | saving | saved | error | local
  const [toast, setToast] = useState('');
  const ready = useRef(false);
  const saveTimer = useRef(null);
  const remoteTimer = useRef(null);
  const toastTimer = useRef(null);
  const origins = useRef({});
  const cachedSent = useRef({});  // empreintes envoyées lors de la session précédente
  const remoteSaved = useRef({});   // id -> dernier contenu envoyé (JSON)
  const creating = useRef(new Set());
  const remoteOn = useRef(false);
  const errShown = useRef(false);
  const flushing = useRef(null); // envoi en cours d'un dossier qu'on vient de quitter

  const showToast = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);

  // ---------- Profil effectif ----------
  // Admin : peut basculer entre les profils pour contrôler chaque vue.
  // Autres comptes : profil enregistré sur le compte (géomètre-expert par défaut, attribué automatiquement).
  // Sans compte (mode local) : bascule libre comme avant.
  // Version actuelle : seuls les profils géomètre-expert et notaire sont ouverts (syndic et copropriétaire plus tard).
  const act = r => (r && ACTIVE_ROLES.includes(r) ? r : null);
  const effRole = !user ? (act(rawState.role) || 'geometre')
    : isAdmin ? (act(rawState.role) || act(user.copro_profil) || 'geometre')
      : (act(user.copro_profil) || 'geometre');
  const canSwitchRole = !user || isAdmin;
  // Actions irréversibles ou globales (suppression, corbeille, duplication, profils) : administrateur uniquement.
  const canAdmin = !user || isAdmin;
  const canAdminRef = useRef(canAdmin);
  canAdminRef.current = canAdmin;
  const roleRef = useRef(effRole);
  roleRef.current = effRole;

  const curMeta = (rawState.metas || {})[rawState.did] || NO_META;
  const st = useMemo(() => statusOf(rawState, curMeta), [rawState.info, rawState.bats, rawState.hasSS, rawState.lots, rawState.communs, rawState.coefType, rawState.coefAnnexe, rawState.coefEtageAsc, rawState.coefEtageSans, rawState.baseGen, rawState.grids, rawState.articles, curMeta]); // eslint-disable-line react-hooks/exhaustive-deps
  const state = useMemo(() => ({ ...rawState, role: effRole, savedAt, sync, meta: curMeta, certified: st.certified, validated: st.validated, staleCertif: st.staleCertif, staleValid: st.staleValid }), [rawState, effRole, savedAt, sync, curMeta, st]);

  // ---------- Cache navigateur ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        origins.current = d.origins || {};
        const st = d.state || {};
        delete st.savedAt; delete st.sync;
        setState(s => ({ ...s, ...st, toast: '' }));
        setSavedAt(d.at || null);
        cachedSent.current = d.sent || {};
      }
    } catch (e) { /* cache illisible : on repart de zéro */ }
    ready.current = true;
  }, [setState]);

  useEffect(() => {
    if (!ready.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ state: { ...rawState, toast: '' }, origins: origins.current, sent: remoteSaved.current, at: Date.now() }));
        if (!remoteOn.current) setSavedAt(Date.now());
      } catch (e) {
        if (!remoteOn.current) showToast("Enregistrement impossible : espace du navigateur plein");
      }
    }, 400);
  }, [rawState, showToast]);

  useEffect(() => { applyTheme(rawState.theme || 'marine'); }, [rawState.theme]);

  // ---------- Base de données ----------
  const renameDossier = useCallback((oldId, newId) => {
    setState(s => {
      const ds = { ...s.dossiers };
      if (ds[oldId]) { ds[newId] = ds[oldId]; delete ds[oldId]; }
      const js = { ...(s.journals || {}) };
      if (js[oldId]) { js[newId] = js[oldId]; delete js[oldId]; }
      const ms = { ...(s.metas || {}) };
      if (ms[oldId]) { ms[newId] = { ...ms[oldId], ...(ms[newId] || {}) }; delete ms[oldId]; }
      return { dossiers: ds, journals: js, metas: ms, did: s.did === oldId ? newId : s.did };
    });
  }, [setState]);

  const payloadOf = (data, journal) => ({
    nom: (data.info && data.info.nom) || 'Copropriété sans nom',
    ref: (data.info && data.info.ref) || '',
    data, journal: journal || []
  });

  const pushNew = useCallback(async (localId, data, journal) => {
    if (creating.current.has(localId)) return;
    creating.current.add(localId);
    try {
      const m = (stateRef.current.metas || {})[localId] || {};
      const rec = await base44.entities.CoproDossier.create({ ...payloadOf(data, journal), local_id: localId, membres: m.membres || [] });
      remoteSaved.current[rec.id] = hash(JSON.stringify(payloadOf(data, journal)));
      setState(s => ({ metas: { ...(s.metas || {}), [rec.id]: metaOf(rec) } }));
      renameDossier(localId, rec.id);
    } catch (e) {
      setSync('error');
      if (!errShown.current) { errShown.current = true; showToast("Dossier non enregistré en ligne — conservé dans ce navigateur"); }
    } finally {
      creating.current.delete(localId);
    }
  }, [renameDossier, showToast]);

  const loadRemote = useCallback(async (initial) => {
    if (remoteDisabled()) return;
    if (flushing.current) { try { await flushing.current; } catch (e) { /* déjà signalé */ } }
    try {
      const list = await base44.entities.CoproDossier.list('-updated_date', 500);
      remoteOn.current = true;
      const s = stateRef.current;
      const byLocal = {};
      list.forEach(r => { if (r.local_id) byLocal[r.local_id] = r.id; });
      const remoteIds = new Set(list.map(r => r.id));

      // Migration : dossiers saisis dans le navigateur avant le passage en base.
      if (initial) {
        const localDs = { ...s.dossiers, ...(s.did ? { [s.did]: pick(s) } : {}) };
        for (const [id, data] of Object.entries(localDs)) {
          if (remoteIds.has(id)) continue;
          if (byLocal[id]) { renameDossier(id, byLocal[id]); continue; }
          await pushNew(id, data, (s.journals || {})[id]);
        }
      }

      const cur = stateRef.current;
      const sentSnapshot = { ...remoteSaved.current };
      const ds = {}, js = { ...(cur.journals || {}) }, ms = { ...(cur.metas || {}) };
      list.forEach(r => {
        ds[r.id] = r.data || {};
        js[r.id] = r.journal || [];
        ms[r.id] = metaOf(r);
        remoteSaved.current[r.id] = hash(JSON.stringify(payloadOf(r.data || {}, r.journal || [])));
      });
      // Dossiers créés pendant le chargement mais pas encore listés.
      Object.keys(cur.dossiers).forEach(id => { if (!ds[id] && !remoteIds.has(id) && cur.dossiers[id]) ds[id] = cur.dossiers[id]; });
      setState(st => {
        const did = st.did;
        if (did && !ds[did] && !isLocalId(did)) {
          return { ...blank(), dossiers: ds, journals: js, metas: ms, theme: st.theme, role: st.role, screen: 'dossiers' };
        }
        // Le dossier ouvert est rechargé depuis la base (modifs des autres intervenants),
        // sauf s'il a des modifications locales non encore envoyées.
        const local = did && hash(JSON.stringify(payloadOf(pick(st), (st.journals || {})[did])));
        const prev = initial ? cachedSent.current[did] : sentSnapshot[did];
        const reload = did && ds[did] && (prev === undefined || prev === local);
        return reload ? { ...ds[did], dossiers: ds, journals: js, metas: ms } : { dossiers: ds, journals: js, metas: ms };
      });
      setSync('saved');
      setSavedAt(Date.now());
    } catch (e) {
      remoteOn.current = false;
      setSync('local');
      if (initial) showToast('Connexion à la base impossible — travail dans ce navigateur uniquement');
    }
  }, [pushNew, renameDossier, setState, showToast]);

  const userId = user && user.id;
  useEffect(() => {
    // Différé d'un tour pour que le cache du navigateur soit déjà appliqué (migration).
    const t = setTimeout(() => loadRemote(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Recharge la liste à chaque retour sur « Mes dossiers » (dossiers des autres intervenants).
  const prevScreen = useRef(rawState.screen);
  useEffect(() => {
    if (rawState.screen === 'dossiers' && prevScreen.current !== 'dossiers' && remoteOn.current) loadRemote(false);
    prevScreen.current = rawState.screen;
  }, [rawState.screen, loadRemote]);

  // Envoi des modifications du dossier ouvert.
  // Une modification encore en attente est envoyée immédiatement si l'on change de dossier
  // (ouverture d'un autre dossier, duplication, corbeille) : rien n'est perdu.
  const pending = useRef(null);
  const flushPending = useCallback(async (pd) => {
    if (!pd || isLocalId(pd.did)) return;
    const p = payloadOf(pd.data, pd.journal);
    const key = hash(JSON.stringify(p));
    if (remoteSaved.current[pd.did] === key) return;
    try { await base44.entities.CoproDossier.update(pd.did, p); remoteSaved.current[pd.did] = key; }
    catch (e) { setSync('error'); }
  }, []);
  useEffect(() => {
    if (!remoteOn.current) return;
    // Copropriétaire et lecture seule : consultation uniquement, aucun envoi du contenu.
    if (roleRef.current === 'coproprietaire' || roleRef.current === 'lecture') return;
    const s = rawState;
    if (pending.current && pending.current.did !== s.did) { const pd = pending.current; pending.current = null; clearTimeout(remoteTimer.current); flushing.current = flushPending(pd).finally(() => { flushing.current = null; }); }
    if (!s.did) return;
    clearTimeout(remoteTimer.current);
    pending.current = { did: s.did, data: pick(s), journal: (s.journals || {})[s.did] || [] };
    remoteTimer.current = setTimeout(async () => {
      pending.current = null;
      const did = s.did;
      const data = pick(s), journal = (s.journals || {})[did] || [];
      if (isLocalId(did)) { setSync('saving'); await pushNew(did, data, journal); setSync('saved'); setSavedAt(Date.now()); return; }
      const p = payloadOf(data, journal);
      const key = hash(JSON.stringify(p));
      if (remoteSaved.current[did] === key) return;
      setSync('saving');
      try {
        await base44.entities.CoproDossier.update(did, p);
        remoteSaved.current[did] = key;
        setSync('saved');
        setSavedAt(Date.now());
        errShown.current = false;
      } catch (e) {
        setSync('error');
        if (!errShown.current) { errShown.current = true; showToast('Échec de l’enregistrement en ligne — nouvel essai à la prochaine modification'); }
      }
    }, 800);
  }, [rawState, pushNew, showToast, flushPending]);

  // ---------- Journal ----------
  const roleLabel = useCallback(r => (ROLES.find(x => x[0] === r) || ['', 'Lecture seule'])[1], []);
  const who = useCallback(() => {
    const lab = roleLabel(effRole);
    return user && user.full_name ? user.full_name + ' (' + lab + ')' : lab;
  }, [effRole, user, roleLabel]);

  const addLog = useCallback((s, items) => {
    const js = { ...(s.journals || {}) };
    let list = [...(js[s.did] || [])];
    const now = Date.now(), w = who();
    items.forEach(([key, txt, before, after]) => {
      const top = list[0];
      if (top && top.key === key && top.who === w && now - top.t < 90000) {
        list[0] = { ...top, t: now, after: jv(after) };
      } else {
        list.unshift({ key, t: now, who: w, txt, before: jv(before), after: jv(after) });
      }
    });
    js[s.did] = list.slice(0, 500);
    return js;
  }, [who]);

  const ed = useCallback((fn) => {
    setState(s => {
      const n = fn(s);
      return { ...n, journals: addLog(s, diffState(s, n)) };
    });
  }, [addLog, setState]);

  // Entrée de journal libre (copropriétaires, validation…)
  const logOnly = useCallback((key, txt, before, after) => {
    setState(s => (s.did ? { journals: addLog(s, [[key, txt, before, after]]) } : {}));
  }, [addLog, setState]);

  // ---------- Lots ----------
  const setLot = useCallback((id, k, v) => {
    ed(s => ({ lots: s.lots.map(l => l.id === id ? { ...l, [k]: v, ...(k === 'surface' ? { prov: false, srcSurf: 'manuel' } : {}), ...(k === 'parcelle' ? { srcParcelle: 'manuel', ...(l.type === 'terrain' ? { prov: false } : {}) } : {}), ...(k === 'des' ? { desProv: false } : {}) } : l) }));
  }, [ed]);

  const setLots = useCallback((patches) => {
    // patches : { [lotId]: { champ: valeur } }
    ed(s => ({ lots: s.lots.map(l => patches[l.id] ? { ...l, ...patches[l.id], ...('surface' in patches[l.id] ? { prov: false, srcSurf: 'manuel' } : {}) } : l) }));
  }, [ed]);

  // Parties d'un lot situées sur d'autres niveaux (duplex, triplex, combles, mezzanine…).
  // Coefficient d'étage par défaut d'un niveau qui n'en a pas encore (même échelle qu'à la création).
  const levelCoefs = (s, niv) => {
    const out = {};
    const n = +niv;
    if (s.coefEtageAsc[n] == null) out.coefEtageAsc = { ...s.coefEtageAsc, [n]: n <= 1 ? 1 : +(1 + 0.01 * (n - 1)).toFixed(2) };
    if (s.coefEtageSans[n] == null) out.coefEtageSans = { ...s.coefEtageSans, [n]: n <= 1 ? 1 : +Math.max(0.7, n === 2 ? 0.98 : n === 3 ? 0.95 : 0.95 - 0.03 * (n - 3)).toFixed(2) };
    return out;
  };
  const addPart = useCallback((lotId) => ed(s => {
    let niveau = 0;
    const lots = s.lots.map(l => {
      if (l.id !== lotId) return l;
      const used = [l.niveau, ...(l.extra || []).map(p => +p.niveau)];
      niveau = Math.max(...used) + 1;
      return { ...l, extra: [...(l.extra || []), { id: 'p' + Date.now().toString(36), niveau, lib: '', surface: '', annexe: 'aucune', sa: 0, coef: 1 }] };
    });
    return { lots, ...levelCoefs(s, niveau) };
  }), [ed]);
  const setPart = useCallback((lotId, partId, patch) => ed(s => ({
    lots: s.lots.map(l => l.id !== lotId ? l : { ...l, extra: (l.extra || []).map(p => p.id === partId ? { ...p, ...patch, ...('surface' in patch ? { src: 'manuel' } : {}) } : p) }),
    ...('niveau' in patch ? levelCoefs(s, patch.niveau) : {})
  })), [ed]);
  const delPart = useCallback((lotId, partId) => ed(s => ({ lots: s.lots.map(l => l.id !== lotId ? l : { ...l, extra: (l.extra || []).filter(p => p.id !== partId) }) })), [ed]);

  const nextId = useCallback(() => Math.max(0, ...stateRef.current.lots.map(x => parseInt(x.id) || 0)) + 1, []);

  const split = useCallback((id) => {
    const a = String(nextId()), b = String(nextId() + 1);
    ed(s => {
      const l = s.lots.find(x => x.id === id);
      const s1 = Math.round(n0(l.surface) / 2 * 100) / 100;
      const orig = l.origine && l.origine.length ? l.origine : [id];
      // En mode Import des plans, les deux nouveaux lots attendent leur surface d'un plan réimporté.
      const pl = s.saisie === 'plans' ? { prov: true, srcSurf: null } : {};
      const A = { ...l, id: a, des: l.des + ' — partie 1', surface: s1, origine: orig, descOk: null, descTxt: '', ...pl };
      const B = { ...l, id: b, des: l.des + ' — partie 2', surface: Math.round((n0(l.surface) - s1) * 100) / 100, extra: [], pieces: [], origine: orig, descOk: null, descTxt: '', ...pl };
      const lots = [];
      s.lots.forEach(x => x.id === id ? lots.push(A, B) : lots.push(x));
      return { lots, sel: a, grids: s.grids.map(g => g.members.includes(id) ? { ...g, members: [...g.members.filter(m => m !== id), a, b] } : g) };
    });
    showToast('Lot ' + id + ' divisé en lots ' + a + ' et ' + b + ' — voir le modificatif');
  }, [ed, nextId, showToast]);

  const del = useCallback((id) => {
    ed(s => ({ lots: s.lots.filter(l => l.id !== id), grids: s.grids.map(g => ({ ...g, members: g.members.filter(m => m !== id) })), sel: s.sel === id ? (s.lots[0] || {}).id : s.sel }));
    showToast('Lot ' + id + ' supprimé');
  }, [ed, showToast]);

  // ---------- Dossiers ----------
  const openDossier = useCallback((id) => {
    setState(s => {
      if (id === s.did) return { screen: 'overview' };
      const ds = { ...s.dossiers, ...(s.did ? { [s.did]: pick(s) } : {}) };
      return { ...blank(), ...ds[id], did: id, dossiers: ds, journals: s.journals, metas: s.metas, theme: s.theme, role: s.role, screen: 'overview', eddTab: 'edd' };
    });
  }, [setState]);

  const deleteDossier = useCallback((id) => {
    if (!canAdminRef.current) { showToast('Suppression réservée à l’administrateur'); return; }
    setState(s => {
      const ds = { ...s.dossiers };
      delete ds[id];
      const js = { ...(s.journals || {}) };
      delete js[id];
      delete origins.current[id];
      if (id !== s.did) return { dossiers: ds, journals: js };
      return { ...blank(), dossiers: ds, journals: js, metas: s.metas, did: null, screen: 'dossiers', theme: s.theme, role: s.role };
    });
    delete remoteSaved.current[id];
    if (remoteOn.current && !isLocalId(id)) {
      base44.entities.CoproDossier.delete(id).then(
        () => showToast('Dossier supprimé'),
        () => { showToast('Suppression refusée par la base — rechargement'); loadRemote(false); }
      );
    } else showToast('Dossier supprimé');
  }, [setState, showToast, loadRemote]);

  const setWiz = useCallback((patch) => setState(s => ({ wiz: { ...s.wiz, ...patch } })), [setState]);
  const setWizBat = useCallback((i, patch) => setState(s => ({ wiz: { ...s.wiz, bats: s.wiz.bats.map((b, bi) => bi === i ? { ...b, ...patch } : b) } })), [setState]);
  const addWizBat = useCallback(() => {
    setState(s => {
      const idx = s.wiz.bats.length;
      if (idx >= LET.length) return s;
      return { wiz: { ...s.wiz, bats: [...s.wiz.bats, { name: 'Bâtiment ' + LET[idx], etages: 3, lift: false }] } };
    });
  }, [setState]);
  const removeWizBat = useCallback((i) => setState(s => ({ wiz: { ...s.wiz, bats: s.wiz.bats.filter((_, bi) => bi !== i) } })), [setState]);

  const createDossier = useCallback(() => {
    setState(s => {
      const W = s.wiz;
      const id = 'd' + Date.now();
      // Type de copropriété : les immeubles (verticale, mixte) et/ou l'ensemble des villas (horizontale, mixte).
      const T = TYPE_COPRO[W.type] ? W.type : 'verticale';
      const ss = T !== 'horizontale' && !!W.ss;
      const bats = T === 'horizontale' ? [] : W.bats.map((b, i) => ({ id: LET[i], name: (b.name || '').trim() || ('Bâtiment ' + LET[i]), etages: Math.max(0, parseInt(b.etages) || 0), lift: !!b.lift, equip: '' }));
      const nV = T === 'verticale' ? 0 : Math.max(0, Math.min(200, parseInt(W.nVillas) || 0));
      const nT = T === 'verticale' ? 0 : Math.max(0, Math.min(200, parseInt(W.nTerr) || 0));
      if (T !== 'verticale') bats.push({ id: VILLAS, name: 'Villas', etages: Math.max(0, Math.min(3, parseInt(W.vNiv) || 0)), lift: false, villas: true, equip: '' });
      const lots = [];
      let k = 1;
      const S = n0(W.surf) || 60;
      if (W.mode === 'types') {
        bats.forEach((b, bi) => {
          if (b.villas) return;
          for (let n = 0; n <= b.etages; n++) {
            let j = 0;
            WTYPES.forEach(([type]) => {
              const N = wCnt(W, bi, n, type);
              for (let q = 0; q < N; q++) { j++; lots.push(L(String(k++), b.id, n, type, TYPES[type].l + ' ' + b.id + ' · ' + LVS(n) + ' n° ' + j, S, 1, '')); }
            });
          }
        });
      }
      const vS = n0(W.vSurf) || 120, vP = n0(W.vParc) || 400, tP = n0(W.tParc) || 500;
      for (let j = 0; j < nV; j++) lots.push({ ...L(String(k++), VILLAS, 0, 'villa', 'Villa n° ' + (j + 1), vS, 1, ''), parcelle: vP });
      for (let j = 0; j < nT; j++) lots.push({ ...L(String(k++), VILLAS, 0, 'terrain', 'Lot de terrain n° ' + (j + 1), 0, 1, ''), parcelle: tP });
      if (ss) {
        for (let j = 0; j < n0(W.caves); j++) lots.push(L(String(k++), 'SS', -1, 'cave', 'Cave n° ' + (j + 1), 6, 1, ''));
        for (let j = 0; j < n0(W.boxes); j++) lots.push(L(String(k++), 'SS', -1, 'box', 'Box n° ' + (j + 1), 15, 1, ''));
        for (let j = 0; j < n0(W.locs); j++) lots.push(L(String(k++), 'SS', -1, 'local', 'Local annexe n° ' + (j + 1), 4, 1, ''));
        for (let j = 0; j < n0(W.parks); j++) lots.push(L(String(k++), 'SS', -1, 'parking', 'Stationnement P' + (j + 1), 12.5, 1, ''));
      }
      const maxE = Math.max(0, ...bats.map(b => b.etages));
      const asc = { '-1': 1 }, sans = { '-1': 1 };
      for (let n = 0; n <= maxE; n++) {
        asc[n] = n <= 1 ? 1 : +(1 + 0.01 * (n - 1)).toFixed(2);
        sans[n] = n <= 1 ? 1 : +Math.max(0.7, n === 2 ? 0.98 : n === 3 ? 0.95 : 0.95 - 0.03 * (n - 3)).toFixed(2);
      }
      const grids = [];
      bats.filter(b => b.lift).forEach(b => grids.push({ id: 'asc' + b.id, name: 'Ascenseur', scope: 'Bât. ' + b.id, base: 1000, method: 'sp', prog: 20, members: lots.filter(l => l.bat === b.id && l.niveau >= 1).map(l => l.id), budget: 0 }));
      if (ss) grids.push({ id: 'ss', name: 'Sous-sol & parkings', scope: 'Commun', base: 100, method: 'egal', prog: 0, members: lots.filter(l => l.bat === 'SS').map(l => l.id), budget: 0 });
      const count = new Set([...Object.keys(s.dossiers), s.did].filter(Boolean)).size;
      const info = {
        nom: W.nom.trim(), adresse: W.adresse.trim(), commune: W.commune.trim(), ville: W.ville.trim(),
        tf: W.tf.trim(), acd: (W.acd || '').trim(), contenance: (W.contenance || '').trim(), section: (W.section || '').trim(), parcelle: (W.parcelle || '').trim(), ilot: (W.ilot || '').trim(),
        usage: W.usage, geometre: W.geometre.trim(), notaire: W.notaire.trim(), ref: new Date().getFullYear() + '-' + (118 + count)
      };
      lots.forEach(l => { if (l.bat !== 'SS') { l.prov = true; l.desProv = true; } });
      const D = {
        info, typeCopro: T, bats, hasSS: ss, lots, communs: defCommuns(bats, ss),
        coefType: { appartement: 1, commerce: 1, bureau: 1, cave: 0.2, box: 0.35, local: 0.2, parking: 0.25, villa: 1, terrain: 1 },
        coefAnnexe: { balcon: 0.2, terrasse: 0.25, jardin: 0.1, parcelle: 0.1 },
        coefEtageAsc: asc, coefEtageSans: sans, baseGen: 1000, grids, owners: [], ajust: {}, avant: null, mesure: '', notes: '', saisie: W.saisie || null,
        articles: [...INIT_ART.map(a => a.id === 'a4' ? { ...a, x: DEST[W.usage] } : { ...a }), ...(T !== 'verticale' ? CLAUSES.filter(c => /horizontale/i.test(c.t)).map((c, n) => ({ id: 'av' + n, t: c.t, k: 'text', x: c.x, ref: 'Art. 379', custom: true })) : [])],
        diffusion: null, plans: {}, sel: lots[0] ? lots[0].id : null, gridSel: grids[0] ? grids[0].id : null, artSel: 'a1', ownSel: null
      };
      const dossiers = { ...s.dossiers, ...(s.did ? { [s.did]: pick(s) } : {}), [id]: D };
      const metas = { ...(s.metas || {}), [id]: { membres: [], certif: null, valid: null, owner: user ? user.id : null, createdBy: user ? user.email : null } };
      return { ...D, did: id, dossiers, metas, screen: 'lots', eddTab: 'edd', wiz: newWiz() };
    });
    showToast('Dossier créé — déposez les plans puis saisissez les surfaces');
  }, [setState, showToast, user]);

  // Duplication : copie complète du contenu, sans certification, validation ni intervenants.
  const duplicateDossier = useCallback((id) => {
    if (!canAdminRef.current) { showToast('Duplication réservée à l’administrateur'); return; }
    setState(s => {
      const src = id === s.did ? pick(s) : s.dossiers[id];
      if (!src) return {};
      const nid = 'd' + Date.now();
      const copy = JSON.parse(JSON.stringify(src));
      const count = new Set([...Object.keys(s.dossiers), s.did].filter(Boolean)).size;
      copy.info = { ...(copy.info || {}), nom: ((copy.info || {}).nom || 'Copropriété') + ' (copie)', ref: new Date().getFullYear() + '-' + (118 + count) };
      const dossiers = { ...s.dossiers, ...(s.did ? { [s.did]: pick(s) } : {}), [nid]: copy };
      const metas = { ...(s.metas || {}), [nid]: { membres: [], certif: null, valid: null, owner: user ? user.id : null, createdBy: user ? user.email : null } };
      return { ...blank(), ...copy, did: nid, dossiers, metas, journals: { ...(s.journals || {}), [nid]: [] }, theme: s.theme, role: s.role, screen: 'overview', eddTab: 'edd' };
    });
    showToast('Dossier dupliqué — vous travaillez sur la copie');
  }, [setState, showToast, user]);

  // Corbeille : suppression réversible.
  const trashDossier = useCallback(async (id, v) => {
    if (!canAdminRef.current) { showToast('Corbeille réservée à l’administrateur'); return; }
    const patch = { supprime: !!v, supprime_le: v ? Date.now() : null };
    if (remoteOn.current && !isLocalId(id)) {
      try { await base44.entities.CoproDossier.update(id, patch); }
      catch (e) { showToast('Opération refusée par la base'); return; }
    }
    setState(s => {
      const metas = { ...(s.metas || {}), [id]: { ...((s.metas || {})[id] || {}), supprime: !!v, supprimeLe: patch.supprime_le } };
      if (v && id === s.did) {
        const ds = { ...s.dossiers, [id]: pick(s) };
        return { ...blank(), dossiers: ds, journals: s.journals, metas, did: null, screen: 'dossiers', theme: s.theme, role: s.role };
      }
      return { metas };
    });
    showToast(v ? 'Dossier placé dans la corbeille' : 'Dossier restauré');
  }, [setState, showToast]);

  // ---------- Navigation / préférences ----------
  const setScreen = useCallback((screen) => setState({ screen }), [setState]);
  const setRole = useCallback((role) => { if (canSwitchRole) setState({ role }); }, [setState, canSwitchRole]);
  const setTheme = useCallback((theme) => setState({ theme }), [setState]);
  const setColorMode = useCallback((colorMode) => setState({ colorMode }), [setState]);
  const setSel = useCallback((sel) => setState({ sel }), [setState]);
  const setEddTab = useCallback((eddTab) => setState({ eddTab }), [setState]);

  // ---------- Saisies ----------
  const setInfo = useCallback((patch) => ed(s => ({ info: { ...s.info, ...patch } })), [ed]);
  const setBat = useCallback((id, patch) => ed(s => ({ bats: s.bats.map(b => b.id === id ? { ...b, ...patch } : b) })), [ed]);
  const setCoef = useCallback((group, key, val) => ed(s => ({ [group]: { ...s[group], [key]: val } })), [ed]);
  const setBaseGen = useCallback((v) => { const n = parseInt(v); if (n > 0) ed(() => ({ baseGen: n })); }, [ed]);
  const addLot = useCallback(() => ed(s => {
    const id = String(Math.max(0, ...s.lots.map(x => parseInt(x.id) || 0)) + 1);
    const b = s.bats.find(x => !x.villas) || s.bats[0] || { id: 'A' };
    return { lots: [...s.lots, b.villas ? { ...L(id, b.id, 0, 'villa', 'Nouvelle villa', 0, 1, ''), parcelle: 0 } : L(id, b.id, 0, 'appartement', 'Nouveau lot', 0, 1, '')], sel: id };
  }), [ed]);

  const addGrid = useCallback(() => ed(s => {
    const id = 'g' + Date.now().toString(36);
    return { grids: [...s.grids, { id, name: 'Nouvelle grille', scope: 'Commun', base: 1000, method: 'sp', prog: 0, members: [], budget: 0 }], gridSel: id };
  }), [ed]);
  const setGrid = useCallback((id, patch) => ed(s => ({ grids: s.grids.map(g => g.id === id ? { ...g, ...patch } : g) })), [ed]);
  const delGrid = useCallback((id) => ed(s => {
    const rest = s.grids.filter(g => g.id !== id);
    return { grids: rest, gridSel: s.gridSel === id ? (rest[0] || {}).id : s.gridSel };
  }), [ed]);
  const toggleMember = useCallback((gid, lid) => ed(s => ({ grids: s.grids.map(g => {
    if (g.id !== gid) return g;
    const has = g.members.includes(lid);
    return { ...g, members: has ? g.members.filter(m => m !== lid) : [...g.members, lid] };
  }) })), [ed]);
  const setMembers = useCallback((gid, members) => ed(s => ({ grids: s.grids.map(g => g.id === gid ? { ...g, members } : g) })), [ed]);

  // ---------- Règlement ----------
  const setArt = useCallback((id, patch) => ed(s => ({ articles: s.articles.map(a => a.id === id ? { ...a, ...patch } : a) })), [ed]);
  const addArt = useCallback((clauseIdx) => ed(s => {
    const c = CLAUSES[clauseIdx];
    const id = 'a' + Date.now().toString(36);
    return { articles: [...s.articles, { id, t: c ? c.t : 'Nouvel article', k: 'text', x: c ? c.x : '', custom: true }], artSel: id };
  }), [ed]);
  const delArt = useCallback((id) => ed(s => {
    const rest = s.articles.filter(a => a.id !== id);
    return { articles: rest, artSel: s.artSel === id ? (rest[0] || {}).id : s.artSel };
  }), [ed]);
  const moveArt = useCallback((id, dir) => ed(s => {
    const a = [...s.articles];
    const i = a.findIndex(x => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= a.length) return {};
    [a[i], a[j]] = [a[j], a[i]];
    return { articles: a };
  }), [ed]);

  // ---------- Copropriétaires ----------
  const addOwner = useCallback(() => {
    const id = 'o' + Date.now().toString(36);
    setState(s => ({ owners: [...s.owners, { id, nom: '', kind: 'Personne physique', adresse: '', tel: '', email: '' }], ownSel: id }));
    logOnly('own+' + id, 'Copropriétaire ajouté', '—', 'nouveau');
  }, [setState, logOnly]);
  const setOwner = useCallback((id, patch) => {
    setState(s => ({ owners: s.owners.map(o => o.id === id ? { ...o, ...patch } : o) }));
    const o = stateRef.current.owners.find(x => x.id === id) || {};
    const k = Object.keys(patch)[0];
    logOnly('own:' + id + ':' + k, 'Copropriétaire ' + (o.nom || id) + ' · ' + k, o[k], patch[k]);
  }, [setState, logOnly]);
  const delOwner = useCallback((id) => ed(s => ({
    owners: s.owners.filter(o => o.id !== id),
    lots: s.lots.map(l => l.owner === id ? { ...l, owner: '' } : l),
    ownSel: s.ownSel === id ? null : s.ownSel
  })), [ed]);

  // ---------- Statut ----------
  // Certification / validation : enregistrées hors du contenu, avec l'empreinte du contenu certifié.
  // La base n'accepte la certification que d'un géomètre et la validation que d'un notaire.
  const writeMeta = useCallback(async (field, value, okMsg, forDid) => {
    const s = stateRef.current;
    const did = forDid || s.did;
    if (!did) return false;
    if (remoteOn.current && !isLocalId(did)) {
      try {
        await base44.entities.CoproDossier.update(did, { [field]: value });
      } catch (e) {
        showToast('Opération refusée par la base : votre profil n’y est pas autorisé');
        return false;
      }
    }
    setState(x => ({ metas: { ...(x.metas || {}), [did]: { ...((x.metas || {})[did] || {}), [field]: value } } }));
    if (okMsg) showToast(okMsg);
    return true;
  }, [setState, showToast]);
  const stamp = () => {
    const s = stateRef.current;
    return { par: user ? user.email : 'local', nom: user ? (user.full_name || user.email) : 'local', le: Date.now(), empreinte: statusOf(s, {}).h };
  };
  const setCertified = useCallback(async (v) => {
    const ok = await writeMeta('certif', v ? stamp() : null);
    if (!ok) return;
    if (!v) await writeMeta('valid', null);
    logOnly('cert', v ? 'EDD certifié par le géomètre' : 'Certification retirée', '', '');
  }, [writeMeta, logOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const setValidated = useCallback(async (v) => {
    const ok = await writeMeta('valid', v ? stamp() : null);
    if (ok) logOnly('valid', v ? 'EDD validé par le notaire' : 'Validation retirée', '', '');
  }, [writeMeta, logOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intervenants invités (par e-mail) : seuls eux, le créateur et l'administrateur voient le dossier.
  const setMembres = useCallback(async (list, forDid) => {
    const clean = [...new Set((list || []).map(normEmail).filter(e => /.+@.+\..+/.test(e)))];
    const ok = await writeMeta('membres', clean, 'Intervenants mis à jour', forDid);
    if (ok && (!forDid || forDid === stateRef.current.did)) logOnly('membres', 'Intervenants du dossier', '', clean.join(', ') || 'aucun');
  }, [writeMeta, logOnly]);
  const setDiffusion = useCallback((d) => setState({ diffusion: d }), [setState]);
  const setGridSel = useCallback((gridSel) => setState({ gridSel }), [setState]);
  const setArtSel = useCallback((artSel) => setState({ artSel }), [setState]);
  const setOwnSel = useCallback((ownSel) => setState({ ownSel }), [setState]);
  const setCommuns = useCallback((communs) => ed(() => ({ communs })), [ed]);
  // ---------- Parties communes ----------
  const addCommun = useCallback((patch) => ed(s => ({ communs: [...(s.communs || []), { id: 'pc' + Date.now().toString(36), nom: '', bat: (s.bats[0] || {}).id || 'ENS', niveau: 0, loc: '', surface: '', nature: 'pcg', cle: 'gen', ...(patch || {}) }] })), [ed]);
  const setCommun = useCallback((id, patch) => ed(s => ({ communs: (s.communs || []).map(c => c.id === id ? { ...c, ...patch, ...(patch.nature === 'pcg' ? { cle: 'gen' } : {}) } : c) })), [ed]);
  const delCommun = useCallback((id) => ed(s => ({ communs: (s.communs || []).filter(c => c.id !== id) })), [ed]);
  const setDxfRule = useCallback((layer, role) => setState(s => ({ dxfRules: { ...(s.dxfRules || {}), [layer]: role } })), [setState]);
  // ---------- Module Syndic : enregistré dans le champ `syndic` du dossier (hors contenu certifié) ----------
  const syndicTimer = useRef(null);
  const setSyndic = useCallback((fn) => {
    const did = stateRef.current.did;
    if (!did) return;
    let next = null;
    setState(s => {
      const m = (s.metas || {})[did] || {};
      next = typeof fn === 'function' ? fn(m.syndic || {}) : { ...(m.syndic || {}), ...fn };
      return { metas: { ...(s.metas || {}), [did]: { ...m, syndic: next } } };
    });
    if (!remoteOn.current || isLocalId(did)) return;
    clearTimeout(syndicTimer.current);
    syndicTimer.current = setTimeout(async () => {
      const sy = ((stateRef.current.metas || {})[did] || {}).syndic;
      setSync('saving');
      try { await base44.entities.CoproDossier.update(did, { syndic: sy }); setSync('saved'); setSavedAt(Date.now()); }
      catch (e) { setSync('error'); showToast('Gestion du syndicat non enregistrée : profil syndic requis'); }
    }, 700);
  }, [setState, showToast]);

  // ---------- Pièces, descriptifs, ajustements, HSP, mesurage, modificatif, notes ----------
  // Saisie manuelle de pièces : une pièce dont la surface est retouchée à la main n'est plus « issue du plan ».
  const setPieces = useCallback((lotId, pieces) => ed(s => ({ lots: s.lots.map(l => {
    if (l.id !== lotId) return l;
    const old = Object.fromEntries((l.pieces || []).map(x => [x.id, x]));
    const ps = pieces.map(x => old[x.id] && String(old[x.id].surface) !== String(x.surface) ? { ...x, src: 'manuel' } : old[x.id] ? x : { ...x, src: 'manuel' });
    return { ...l, pieces: ps, ...(ps.some(x => (x.part || 'main') === 'main') ? { prov: false } : {}) };
  }) })), [ed]);
  // Mode de saisie des surfaces : l'un ou l'autre. Passer à l'import des plans rend provisoires les surfaces
  // non issues d'un plan ; revenir à la saisie manuelle rend toutes les surfaces modifiables (un retour à l'import
  // demandera de réimporter les plans). Rien n'est effacé.
  // Choix définitif : une fois le mode retenu, il ne change plus pour ce dossier.
  const setSaisie = useCallback((mode) => {
    if (rawState.saisie) { showToast('Le mode de saisie est définitif pour ce dossier'); return; }
    ed(s => {
      if (mode === 'plans') return { saisie: mode, lots: s.lots.map(l => l.srcSurf === 'plan' ? l : { ...l, prov: true }) };
      return { saisie: mode, lots: s.lots.map(l => ({ ...l, ...(l.srcSurf === 'plan' ? { srcSurf: 'manuel' } : {}), extra: (l.extra || []).map(p => p.src === 'plan' ? { ...p, src: 'manuel' } : p), pieces: (l.pieces || []).map(x => x.src === 'plan' ? { ...x, src: 'manuel' } : x) })) };
    });
    logOnly('saisie', 'Mode de saisie des surfaces', '', mode === 'plans' ? 'Import des plans (DXF)' : 'Saisie manuelle');
  }, [ed, logOnly, rawState.saisie, showToast]);
  const setLotDesc = useCallback((lotId, patch) => ed(s => ({ lots: s.lots.map(l => l.id === lotId ? { ...l, ...patch } : l) })), [ed]);
  const setAjust = useCallback((lotId, v) => ed(s => {
    const a = { ...(s.ajust || {}) };
    const n = parseInt(v) || 0;
    if (n) a[lotId] = n; else delete a[lotId];
    return { ajust: a };
  }), [ed]);
  const clearAjust = useCallback(() => ed(() => ({ ajust: {} })), [ed]);
  const setHsp = useCallback((patch) => ed(s => ({ hsp: { ...hspOf(s), ...patch } })), [ed]);
  const setMesure = useCallback((mesure) => ed(() => ({ mesure })), [ed]);
  const setAvant = useCallback((avant) => ed(() => ({ avant })), [ed]);
  const replaceLots = useCallback((lots) => ed(s => ({ lots, sel: lots[0] ? lots[0].id : null, grids: s.grids.map(g => ({ ...g, members: g.members.filter(m => lots.some(l => l.id === m)) })) })), [ed]);
  const setNotes = useCallback((notes) => setState({ notes }), [setState]);
  const setPlans = useCallback((plans) => ed(() => ({ plans })), [ed]);

  const value = {
    state, toast, showToast, user, isAdmin, canSwitchRole, canAdmin,
    ed, setLot, setLots, split, del, nextId, addPart, setPart, delPart,
    openDossier, deleteDossier, createDossier, duplicateDossier, trashDossier, reload: () => loadRemote(false),
    setPieces, setSaisie, setLotDesc, setAjust, clearAjust, setHsp, setMesure, setAvant, replaceLots, setNotes, setSyndic,
    setWiz, setWizBat, addWizBat, removeWizBat,
    setScreen, setRole, setTheme, setColorMode, setSel, setEddTab,
    setInfo, setBat, setCoef, setBaseGen, addLot,
    addGrid, setGrid, delGrid, toggleMember, setMembers,
    setArt, addArt, delArt, moveArt,
    addOwner, setOwner, delOwner,
    setValidated, setCertified, setDiffusion, setMembres,
    setGridSel, setArtSel, setOwnSel, setCommuns, setPlans,
    addCommun, setCommun, delCommun, setDxfRule,
    origins: origins.current
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCopro() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCopro must be used within CoprocivProvider');
  return ctx;
}
