import { FormSelect } from "@/components/ui/form-select";
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCabinetOrg, resolveOrgId } from '@/lib/ecadastreCabinet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronDown, Loader2, Map as MapIcon, RefreshCw, CheckCircle2, MailWarning,
  Target, Users, Gauge, Download, CalendarDays, MapPin, UserRound, Pencil,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { createEcadastrePageUrl } from '@/lib/ecadastrePageUrl';
import ExportPanel from '@/components/ecadastre/dashboard/ExportPanel';
import {
  DASH_FIELDS, CONVOC_FIELDS, EXPORT_FIELDS, PERIODS, periodRange, inRange, ficheDate, norm, todayStr,
  parcelKey, agentLabel, buildTimeSeries, fmtDate,
} from '@/components/ecadastre/dashboard/supervision/supervisionUtils';

const PAGE = 500;
// Couleurs vérifiées (daltonisme) : vert / bleu
const SERIES = [
  { key: 'validee', label: 'Fiches validées', color: '#16a34a' },
  { key: 'convocations', label: 'Convocations', color: '#2563eb' },
];

async function fetchAll(entity, query, fields, sort = '-created_date', onProgress) {
  let all = [];
  let skip = 0;
  for (;;) {
    const batch = await entity.filter(query, sort, PAGE, skip, fields);
    all = all.concat(batch);
    onProgress?.(all.length);
    if (batch.length < PAGE) break;
    skip += PAGE;
  }
  return all;
}

/* ---------- Petits composants d'interface ---------- */

function Kpi({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    teal: 'bg-teal-50 text-teal-700',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 leading-tight">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-500 leading-snug">{sub}</p>}
    </div>
  );
}

function Panel({ title, icon: Icon, right, children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        {Icon && <Icon className="w-5 h-5 text-blue-800 flex-shrink-0" />}
        <h2 className="font-bold text-slate-800 text-[15px] flex-1">{title}</h2>
        {right}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function SelectField({ icon: Icon, label, value, onChange, children }) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-700 pointer-events-none" />
        <FormSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full h-12 rounded-xl border-2 border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer truncate"
        >
          {children}
        </FormSelect>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      </span>
    </label>
  );
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 80 ? 'bg-green-600' : pct >= 40 ? 'bg-blue-600' : 'bg-amber-500';
  return (
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1 capitalize">{d.label}</p>
      {SERIES.map((sr) => (
        <p key={sr.key} className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: sr.color }} />
          {sr.label} : <b className="text-slate-900 tabular-nums">{d[sr.key]}</b>
        </p>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */

export default function DashboardSuperviseur() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState('all');
  const [custom, setCustom] = useState({ from: '', to: todayStr() });
  const [commune, setCommune] = useState('');
  const [agentId, setAgentId] = useState('');
  const [openCommune, setOpenCommune] = useState(null);
  const [loaded, setLoaded] = useState(0);
  const [exportData, setExportData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Application interne : organisation du cabinet par défaut
  const { data: cabinet } = useCabinetOrg();
  const orgId = resolveOrgId(user?.role === 'admin' ? searchParams.get('organisation_id') : '', user, cabinet);

  const { data: organisation } = useQuery({
    queryKey: ['organisation-dash', orgId],
    queryFn: () => base44.entities.Organisation.filter({ id: orgId }).then((r) => r[0]),
    enabled: !!orgId,
  });

  // Communes visibles selon le rôle
  const communesScope = useMemo(() => {
    if (!user) return [];
    if (user.role === 'superviseur' && user.communes_supervisees?.length) return user.communes_supervisees;
    return organisation?.communes || [];
  }, [user, organisation]);
  const scopeSet = useMemo(() => new Set(communesScope.map(norm)), [communesScope]);
  const restrictScope = user?.role === 'superviseur' && user?.communes_supervisees?.length > 0;

  const { data: cadastres = [] } = useQuery({
    queryKey: ['dash-cadastres', orgId],
    queryFn: () => base44.entities.CadastreCommunal.filter({ organisation_id: orgId }, '-created_date', 2000, 0,
      ['id', 'commune', 'nom_section', 'nombre_parcelles']),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: allFiches = [], isLoading: fichesLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['dash-fiches', orgId],
    queryFn: () => fetchAll(base44.entities.Collecte, { organisation_id: orgId }, DASH_FIELDS, '-created_date', setLoaded),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allConvocs = [] } = useQuery({
    queryKey: ['dash-convocs', orgId],
    queryFn: () => fetchAll(base44.entities.ConvocationParcelle, { organisation_id: orgId }, CONVOC_FIELDS),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Noms des agents (si la liste des utilisateurs est accessible)
  const { data: users = [] } = useQuery({
    queryKey: ['dash-users', orgId],
    queryFn: async () => {
      try { return await base44.entities.User.filter({ organisation_id: orgId }); } catch { return []; }
    },
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000,
  });
  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const range = periodRange(period, custom);

  // Un export préparé ne correspond plus aux filtres dès qu'ils changent
  useEffect(() => { setExportData(null); }, [period, custom.from, custom.to, commune, agentId]);

  // Identité d'un agent = son nom normalisé (sans accents / majuscules / espaces multiples),
  // pour regrouper « SÉBASTIEN » et « SEBASTIEN » ou un même agent sur plusieurs comptes.
  const agentKeyOf = useMemo(() => {
    const cache = new Map();
    return (c) => {
      const raw = agentLabel(c, usersById);
      if (cache.has(raw)) return cache.get(raw);
      const k = raw === 'Non renseigné' ? '' : norm(raw).replace(/\s+/g, ' ');
      cache.set(raw, k);
      return k;
    };
  }, [usersById]);

  // Pour les convocations (sans nom saisi) : compte → agent le plus fréquent sur ses fiches
  const agentKeyById = useMemo(() => {
    const counts = new Map();
    allFiches.forEach((c) => {
      const k = agentKeyOf(c);
      if (!c.created_by_id || !k) return;
      const m = counts.get(c.created_by_id) || new Map();
      m.set(k, (m.get(k) || 0) + 1);
      counts.set(c.created_by_id, m);
    });
    const out = {};
    counts.forEach((m, id) => { out[id] = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]; });
    return out;
  }, [allFiches, agentKeyOf]);

  // Fiches dans le périmètre (communes du rôle + commune choisie + agent), toutes dates
  const scoped = useMemo(() => allFiches.filter((c) => {
    const cn = norm(c.commune);
    if (restrictScope && !scopeSet.has(cn)) return false;
    if (commune && cn !== norm(commune)) return false;
    if (agentId && agentKeyOf(c) !== agentId) return false;
    return true;
  }), [allFiches, restrictScope, scopeSet, commune, agentId, agentKeyOf]);

  const fiches = useMemo(() => scoped.filter((c) => inRange(ficheDate(c), range)), [scoped, range?.[0], range?.[1]]);

  const convocs = useMemo(() => allConvocs.filter((c) => {
    const cn = norm(c.commune);
    if (restrictScope && !scopeSet.has(cn)) return false;
    if (commune && cn !== norm(commune)) return false;
    if (agentId && agentKeyById[c.created_by_id] !== agentId) return false;
    return inRange((c.created_date || '').slice(0, 10), range);
  }), [allConvocs, restrictScope, scopeSet, commune, agentId, agentKeyById, range?.[0], range?.[1]]);

  // Liste des agents (pour le filtre) : un seul choix par nom, sans « Non renseigné »
  const agentOptions = useMemo(() => {
    const m = new Map(); // clé -> { orthographe -> nb }
    allFiches.forEach((c) => {
      if (restrictScope && !scopeSet.has(norm(c.commune))) return;
      const k = agentKeyOf(c);
      if (!k) return;
      const spellings = m.get(k) || new Map();
      const label = agentLabel(c, usersById).trim().replace(/\s+/g, ' ');
      spellings.set(label, (spellings.get(label) || 0) + 1);
      m.set(k, spellings);
    });
    // Libellé affiché = l'orthographe la plus utilisée
    return [...m.entries()]
      .map(([k, sp]) => [k, [...sp.entries()].sort((a, b) => b[1] - a[1])[0][0]])
      .sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [allFiches, usersById, restrictScope, scopeSet, agentKeyOf]);

  /* ----- Chiffres clés ----- */
  const today = todayStr();
  const kpi = useMemo(() => {
    const byStatus = { validee: 0, complete: 0, brouillon: 0 };
    const agents = new Set();
    const agentDays = new Set();
    let todayCount = 0;
    fiches.forEach((c) => {
      const s = byStatus[c.statut] !== undefined ? c.statut : 'brouillon';
      byStatus[s]++;
      const d = ficheDate(c);
      if (d === today) todayCount++;
      if (c.created_by_id) {
        agents.add(c.created_by_id);
        agentDays.add(`${c.created_by_id}|${d}`);
      }
    });
    return {
      total: fiches.length, todayCount, ...byStatus,
      agents: agents.size,
      perAgentDay: agentDays.size ? fiches.length / agentDays.size : 0,
    };
  }, [fiches, today]);

  /* ----- Cadastre du périmètre ----- */
  const cadastreStats = useMemo(() => {
    const communesSet = new Set();
    let parcelles = 0;
    let sections = 0;
    cadastres.forEach((s) => {
      const cn = norm(s.commune);
      if (restrictScope && !scopeSet.has(cn)) return;
      if (commune && cn !== norm(commune)) return;
      communesSet.add(cn);
      parcelles += s.nombre_parcelles || 0;
      sections++;
    });
    return { parcelles, sections, communes: communesSet.size };
  }, [cadastres, restrictScope, scopeSet, commune]);

  /* ----- Avancement vs objectifs (toutes dates) ----- */
  const defaultObjectif = organisation?.objectif_par_defaut || 2500;
  const objectifOf = (name) => {
    const v = organisation?.objectifs_communes?.[norm(name)];
    return v > 0 ? v : defaultObjectif;
  };

  const avancement = useMemo(() => {
    const communes = new Map();
    const getC = (name) => {
      const k = norm(name);
      if (!communes.has(k)) communes.set(k, { key: k, name: String(name).trim().toUpperCase(), done: new Set(), recent: new Set(), sections: new Map(), nbFiches: 0 });
      return communes.get(k);
    };
    // Toutes les communes du périmètre apparaissent, même sans fiche
    communesScope.forEach((c) => { if (!commune || norm(c) === norm(commune)) getC(c); });
    cadastres.forEach((s) => {
      const cn = norm(s.commune);
      if (!communes.has(cn)) return;
      const c = communes.get(cn);
      const sk = norm(s.nom_section);
      const sec = c.sections.get(sk) || { name: String(s.nom_section).trim(), total: 0, done: new Set() };
      sec.total += s.nombre_parcelles || 0;
      c.sections.set(sk, sec);
    });
    const recentFrom = periodRange('7d')[0];
    scoped.forEach((f) => {
      if (f.statut === 'brouillon') return;
      const key = parcelKey(f);
      if (!key) return;
      const c = getC(f.commune);
      c.nbFiches++;
      c.done.add(key);
      if (ficheDate(f) >= recentFrom) c.recent.add(key);
      const sk = norm(f.section);
      const sec = c.sections.get(sk) || { name: String(f.section || '—').trim(), total: 0, done: new Set() };
      sec.done.add(key);
      c.sections.set(sk, sec);
    });
    const list = [...communes.values()].map((c) => {
      const objectif = objectifOf(c.name);
      const doneCount = c.nbFiches;
      return {
        ...c,
        objectif,
        doneCount,
        reste: Math.max(0, objectif - doneCount),
        rythme: c.recent.size / 7, // parcelles / jour sur les 7 derniers jours
        pct: objectif ? (doneCount / objectif) * 100 : 0,
        sectionList: [...c.sections.values()]
          .filter((s) => s.done.size > 0)
          .map((s) => ({ ...s, doneCount: s.done.size }))
          .sort((a, b) => b.doneCount - a.doneCount),
      };
    }).sort((a, b) => b.pct - a.pct);
    const objectif = list.reduce((s, c) => s + c.objectif, 0);
    const done = list.reduce((s, c) => s + c.doneCount, 0);
    return { list, objectif, done, pct: objectif ? (done / objectif) * 100 : 0 };
  }, [cadastres, scoped, communesScope, commune, organisation]);

  // Modification des objectifs (admin uniquement)
  const isAdmin = user?.role === 'admin';
  const [editing, setEditing] = useState(null); // { key, value }
  const [savingObj, setSavingObj] = useState(false);
  const saveObjectif = async () => {
    if (!editing || !organisation) return;
    const n = parseInt(editing.value, 10);
    if (!(n > 0)) return;
    setSavingObj(true);
    try {
      const objectifs_communes = { ...(organisation.objectifs_communes || {}), [editing.key]: n };
      await base44.entities.Organisation.update(organisation.id, { objectifs_communes });
      queryClient.setQueryData(['organisation-dash', orgId], { ...organisation, objectifs_communes });
      setEditing(null);
    } finally {
      setSavingObj(false);
    }
  };

  /* ----- Série temporelle ----- */
  const series = useMemo(() => buildTimeSeries(fiches, range, convocs), [fiches, convocs, range?.[0], range?.[1]]);

  const periodLabel = period === 'custom'
    ? `${custom.from ? fmtDate(custom.from) : 'début'} → ${custom.to ? fmtDate(custom.to) : "aujourd'hui"}`
    : PERIODS.find((p) => p.id === period)?.label;

  const refresh = () => {
    setLoaded(0);
    setExportData(null);
    queryClient.invalidateQueries({ queryKey: ['dash-fiches', orgId] });
    queryClient.invalidateQueries({ queryKey: ['dash-convocs', orgId] });
  };

  // Export : on charge les fiches filtrées avec tous les champs utiles (sans photos), uniquement à la demande
  const prepareExport = async () => {
    setExportLoading(true);
    try {
      const ids = new Set(fiches.map((f) => f.id));
      const q = { organisation_id: orgId };
      if (range) q.date_collecte = { $gte: range[0], $lte: range[1] };
      const rows = await fetchAll(base44.entities.Collecte, q, EXPORT_FIELDS);
      setExportData(rows.filter((r) => ids.has(r.id)));
    } finally {
      setExportLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
      </div>
    );
  }

  if (!user || (user.role !== 'superviseur' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Accès refusé</h2>
        <button onClick={() => navigate(createEcadastrePageUrl('Accueil'))} className="h-12 px-5 rounded-xl bg-blue-800 text-white font-semibold">Retour</button>
      </div>
    );
  }

  const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');
  const fmtPct = (n) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

  return (
    <div className="min-h-screen bg-slate-100 pb-24 md:pb-8">
      {/* En-tête */}
      <header className="bg-blue-900 text-white sticky top-0 z-20 shadow-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4 px-2 sm:px-4 min-h-[64px] py-2">
          <button
            onClick={() => navigate(createEcadastrePageUrl('Accueil'))}
            className="h-12 min-w-[48px] px-2 sm:px-3 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center gap-1 touch-manipulation"
            aria-label="Retour à l'accueil"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="hidden sm:inline text-sm font-semibold pr-1">Retour</span>
          </button>
          <div className="text-center min-w-0">
            <h1 className="font-bold uppercase tracking-wide leading-tight text-[15px] sm:text-lg lg:text-xl truncate">
              <span className="sm:hidden">Supervision</span>
              <span className="hidden sm:inline">Supervision générale</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-blue-200 font-medium uppercase tracking-wide truncate mt-0.5">
              {commune || 'Toutes les communes'}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={isFetching}
            className="h-12 min-w-[48px] px-2 sm:px-3 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center gap-1.5 touch-manipulation disabled:opacity-60"
            aria-label="Actualiser les données"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-sm font-semibold">Actualiser</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Filtres (facultatifs) : une seule ligne sur grand écran */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Périodes : 5 cases qui tiennent sur la largeur du téléphone (libellés courts), sans défilement */}
            <div className="grid grid-cols-5 sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1 lg:flex-shrink-0" role="tablist" aria-label="Période">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={period === p.id}
                  aria-label={p.id === 'custom' ? 'Choisir des dates' : p.label}
                  onClick={() => setPeriod(p.id)}
                  className={`min-w-0 sm:flex-1 lg:flex-none h-10 px-1 sm:px-4 rounded-lg text-sm font-semibold whitespace-nowrap touch-manipulation transition-colors ${
                    period === p.id ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.id === 'custom' ? (
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /><span className="hidden sm:inline">Dates</span></span>
                  ) : (
                    <>
                      <span className="sm:hidden">{{ today: 'Auj.', '7d': '7 j', '30d': '30 j', all: 'Tout' }[p.id] || p.label}</span>
                      <span className="hidden sm:inline">{p.label}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 min-w-0">
              <SelectField icon={MapPin} label="Commune" value={commune} onChange={(v) => { setCommune(v); setOpenCommune(null); }}>
                <option value="">Toutes les communes</option>
                {communesScope.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectField>
              <SelectField icon={UserRound} label="Agent" value={agentId} onChange={setAgentId}>
                <option value="">Tous les agents</option>
                {agentOptions.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </SelectField>
            </div>
          </div>
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 lg:max-w-md">
              {[['from', 'Du'], ['to', 'Au']].map(([k, l]) => (
                <label key={k} className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-slate-400 pointer-events-none">{l}</span>
                  <input
                    type="date"
                    value={custom[k]}
                    onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                    className="w-full h-11 rounded-xl border-2 border-slate-200 pl-10 pr-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </label>
              ))}
            </div>
          )}
        </section>

        {fichesLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
            <p className="text-slate-600 text-sm font-medium">Chargement des fiches… {loaded > 0 && <b className="tabular-nums">{fmtInt(loaded)}</b>}</p>
          </div>
        ) : (
          <>
            {/* Chiffres clés */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi
                icon={MapIcon} label="Parcelles cadastrales" value={fmtInt(cadastreStats.parcelles)}
                sub={`${fmtInt(cadastreStats.sections)} sections · ${fmtInt(cadastreStats.communes)} commune${cadastreStats.communes > 1 ? 's' : ''}`}
              />
              <Kpi
                icon={CheckCircle2} tone="green" label="Validées" value={fmtInt(kpi.validee)}
                sub={`sur ${fmtInt(kpi.total)} fiches de la période`}
              />
              <Kpi icon={MailWarning} tone="blue" label="Convocations" value={fmtInt(convocs.length)} sub="laissées sur la période" />
              <Kpi
                icon={Target} tone="teal" label="Objectif atteint" value={fmtPct(avancement.pct)}
                sub={`${fmtInt(avancement.done)} / ${fmtInt(avancement.objectif)} parcelles (objectif)`}
              />
              <Kpi icon={Users} tone="indigo" label="Agents actifs" value={fmtInt(kpi.agents)} sub="ayant saisi sur la période" />
              <Kpi
                icon={Gauge} tone="amber" label="Rendement" value={kpi.perAgentDay.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                sub="fiches par agent et par jour travaillé"
              />
            </div>

            <div className="space-y-4">
              {/* Avancement par commune vs objectif */}
              <Panel title="Objectifs par commune" icon={Target}>
                {avancement.list.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune commune dans ce périmètre.</p>
                ) : (
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 items-start">
                    {avancement.list.map((c) => {
                      const open = openCommune === c.key;
                      const isEditing = editing?.key === c.key;
                      return (
                        <li key={c.key} className="rounded-xl border border-slate-200 bg-white">
                          <div className="px-3 pt-2.5 pb-2">
                            <div className="flex items-baseline justify-between gap-2 mb-2">
                              <span className="font-bold text-slate-800 uppercase text-sm tracking-wide truncate">{c.name}</span>
                              <span className="text-2xl font-extrabold text-slate-900 tabular-nums flex-shrink-0 leading-none">{fmtPct(c.pct)}</span>
                            </div>
                            <ProgressBar value={c.pct} />
                            <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-slate-500 tabular-nums">
                              {isEditing ? (
                                <span className="flex items-center gap-1.5">
                                  Objectif
                                  <input
                                    type="number" min="1" inputMode="numeric" autoFocus
                                    value={editing.value}
                                    onChange={(e) => setEditing({ key: c.key, value: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveObjectif(); if (e.key === 'Escape') setEditing(null); }}
                                    className="w-20 h-9 rounded-lg border-2 border-blue-400 px-2 text-sm font-bold text-slate-900"
                                  />
                                  <button onClick={saveObjectif} disabled={savingObj} className="h-9 px-3 rounded-lg bg-blue-800 text-white font-semibold disabled:opacity-50">
                                    {savingObj ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
                                  </button>
                                  <button onClick={() => setEditing(null)} className="h-9 px-2 rounded-lg text-slate-500 hover:bg-slate-100">Annuler</button>
                                </span>
                              ) : (
                                <span>
                                  <b className="text-slate-800">{fmtInt(c.doneCount)}</b> / {fmtInt(c.objectif)} parcelles
                                  {isAdmin && (
                                    <button
                                      onClick={() => setEditing({ key: c.key, value: String(c.objectif) })}
                                      className="ml-1.5 inline-flex items-center justify-center w-8 h-8 -my-2 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 align-middle"
                                      title="Modifier l'objectif" aria-label={`Modifier l'objectif de ${c.name}`}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </span>
                              )}
                              {!isEditing && (
                                <span className="text-right">
                                  {c.reste > 0 ? <>Reste <b className="text-slate-800">{fmtInt(c.reste)}</b></> : <b className="text-green-700">Objectif atteint ✓</b>}
                                </span>
                              )}
                            </div>
                            {!isEditing && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{fmtInt(c.nbFiches - c.done.size)} fiches en double</p>
                            )}
                          </div>
                          {c.sectionList.length > 0 && (
                            <button
                              onClick={() => setOpenCommune(open ? null : c.key)}
                              className="w-full h-10 px-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-800 hover:bg-slate-50 rounded-b-xl touch-manipulation"
                              aria-expanded={open}
                            >
                              {open ? 'Masquer le détail par section' : `Détail par section (${c.sectionList.length})`}
                              <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          {open && (
                            <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
                              {c.sectionList.map((s) => (
                                <div key={s.name} className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                                  <b className="block text-slate-800 truncate">{s.name}</b>
                                  <span className="tabular-nums text-slate-600">
                                    {fmtInt(s.doneCount)}{s.total ? <span className="text-slate-400"> / {fmtInt(s.total)}</span> : null}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-[11px] text-slate-400 mt-3">
                  Avancement = fiches complètes ou validées (hors brouillons), toutes dates confondues, comme dans CGET.
                  Objectif par défaut : {fmtInt(defaultObjectif)} parcelles par commune.
                </p>
              </Panel>

              {/* Évolution */}
              <Panel
                title={`Activité par ${series.unit}`}
                icon={CalendarDays}
                right={
                  <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600">
                    {SERIES.map((sr) => (
                      <span key={sr.key} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: sr.color }} />
                        {sr.label}
                      </span>
                    ))}
                  </div>
                }
              >
                <div className="flex sm:hidden flex-wrap items-center gap-3 text-xs text-slate-600 mb-2">
                  {SERIES.map((sr) => (
                      <span key={sr.key} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: sr.color }} />
                        {sr.label}
                      </span>
                    ))}
                </div>
                {series.data.length === 0 ? (
                  <p className="text-sm text-slate-500 py-10 text-center">Aucune activité sur la période.</p>
                ) : (
                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={series.data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="short" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} minTickGap={16} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.15)' }} />
{SERIES.map((sr) => (
                          <Bar key={sr.key} dataKey={sr.key} name={sr.label} fill={sr.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>
            </div>

            {/* Export */}
            <Panel title="Export des fiches" icon={Download}>
              {exportData ? (
                <ExportPanel collectes={exportData} commune={commune || 'Toutes communes'} dateLabel={periodLabel} />
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm text-slate-600 flex-1">
                    Exporter les <b>{fmtInt(kpi.total)}</b> fiches correspondant aux filtres (CSV ou GeoJSON, sans les photos).
                  </p>
                  <button
                    onClick={prepareExport}
                    disabled={exportLoading || kpi.total === 0}
                    className="h-12 px-5 rounded-xl bg-blue-800 text-white font-semibold flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
                  >
                    {exportLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    Préparer l'export
                  </button>
                </div>
              )}
            </Panel>

            <p className="text-center text-[11px] text-slate-400">
              Données mises à jour {dataUpdatedAt ? `à ${new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''} · {fmtInt(allFiches.length)} fiches chargées
            </p>
          </>
        )}
      </main>
    </div>
  );
}