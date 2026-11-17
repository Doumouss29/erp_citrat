import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  Users,
  Bike,
  Tablet,
  UserCheck,
  HeartPulse,
  Wand2,
  Car,
  SatelliteDish,
  Package,
} from "lucide-react";
import HSEPageHeader from "@/components/hse/HSEPageHeader";
import AgentForm from "@/components/bm/AgentForm";
import TierForm from "@/components/bm/TierForm";

const defaultEq = {
  nb_motos_impliques: 0,
  nb_motos_endommages: 0,
  nb_motos_detruits: 0,
  nb_vehicules_impliques: 0,
  nb_vehicules_endommages: 0,
  nb_vehicules_detruits: 0,
  nb_tablettes_impliques: 0,
  nb_tablettes_endommages: 0,
  nb_tablettes_detruits: 0,
  nb_gnss_impliques: 0,
  nb_gnss_endommages: 0,
  nb_gnss_detruits: 0,
  nb_autres_impliques: 0,
  nb_autres_endommages: 0,
  nb_autres_detruits: 0,
};

function currentTrim() {
  const d = new Date();
  const t = Math.floor(d.getMonth() / 3) + 1;
  return 'T' + t + ' ' + d.getFullYear();
}

function periodeOptions() {
  const opts = [];
  const year = new Date().getFullYear();
  for (let y = year + 1; y >= year - 2; y--) {
    for (let t = 4; t >= 1; t--) {
      opts.push('T' + t + ' ' + y);
    }
  }
  return opts;
}

export default function BMObservations() {
  const [periode, setPeriode] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('bm_periode') : null;
    return saved || currentTrim();
  });
  const [equipment, setEquipment] = useState(null);
  const [eqDraft, setEqDraft] = useState(defaultEq);
  const [savingEq, setSavingEq] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoLoadingEq, setAutoLoadingEq] = useState(false);
  const [agents, setAgents] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [allObsTotals, setAllObsTotals] = useState({ motos: { impliques: 0, endommages: 0, detruits: 0 }, vehicules: { impliques: 0, endommages: 0, detruits: 0 }, tablettes: { impliques: 0, endommages: 0, detruits: 0 }, gnss: { impliques: 0, endommages: 0, detruits: 0 }, autres: { impliques: 0, endommages: 0, detruits: 0 } });
  const [loading, setLoading] = useState(true);
  const [agentFormOpen, setAgentFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [tierFormOpen, setTierFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const initialLoadRef = React.useRef(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ag, ti, allObs] = await Promise.all([
        base44.entities.AgentImpliqueBM.list('-created_date', 1000),
        base44.entities.TiersImpacteBM.list('-created_date', 1000),
        base44.entities.ObservationBM.list('-created_date', 1000),
      ]);
      setAgents(ag);
      setTiers(ti);
      const eq = allObs[0] || null;
      setEquipment(eq);
      setAllObsTotals({
        motos: { impliques: allObs.reduce((s, o) => s + (o.nb_motos_impliques || 0), 0), endommages: allObs.reduce((s, o) => s + (o.nb_motos_endommages || 0), 0), detruits: allObs.reduce((s, o) => s + (o.nb_motos_detruits || 0), 0) },
        vehicules: { impliques: allObs.reduce((s, o) => s + (o.nb_vehicules_impliques || 0), 0), endommages: allObs.reduce((s, o) => s + (o.nb_vehicules_endommages || 0), 0), detruits: allObs.reduce((s, o) => s + (o.nb_vehicules_detruits || 0), 0) },
        tablettes: { impliques: allObs.reduce((s, o) => s + (o.nb_tablettes_impliques || 0), 0), endommages: allObs.reduce((s, o) => s + (o.nb_tablettes_endommages || 0), 0), detruits: allObs.reduce((s, o) => s + (o.nb_tablettes_detruits || 0), 0) },
        gnss: { impliques: allObs.reduce((s, o) => s + (o.nb_gnss_impliques || 0), 0), endommages: allObs.reduce((s, o) => s + (o.nb_gnss_endommages || 0), 0), detruits: allObs.reduce((s, o) => s + (o.nb_gnss_detruits || 0), 0) },
        autres: { impliques: allObs.reduce((s, o) => s + (o.nb_autres_impliques || 0), 0), endommages: allObs.reduce((s, o) => s + (o.nb_autres_endommages || 0), 0), detruits: allObs.reduce((s, o) => s + (o.nb_autres_detruits || 0), 0) },
      });
    } catch (e) {
      toast.error('Erreur de chargement: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setEq = (k, v) => setEqDraft((d) => ({ ...d, [k]: Number(v) || 0 }));

  const saveEquipment = async () => {
    setSavingEq(true);
    try {
      if (equipment?.id) {
        await base44.entities.ObservationBM.update(equipment.id, eqDraft);
      } else {
        const created = await base44.entities.ObservationBM.create({ periode, ...eqDraft });
        setEquipment(created);
      }
      toast.success('Équipements enregistrés');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setSavingEq(false);
    }
  };

  const saveAgent = async (data) => {
    try {
      if (editingAgent?.id) {
        await base44.entities.AgentImpliqueBM.update(editingAgent.id, data);
      } else {
        await base44.entities.AgentImpliqueBM.create(data);
      }
      setAgentFormOpen(false);
      setEditingAgent(null);
      toast.success('Agent enregistré');
      loadData();
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  const deleteAgent = async (agent) => {
    if (!window.confirm(`Supprimer l'agent ${agent.nom} ?`)) return;
    try {
      await base44.entities.AgentImpliqueBM.delete(agent.id);
      toast.success('Agent supprimé');
      loadData();
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  // Auto-charge les agents depuis les fiches HSE existantes pour la période
  const autoLoadAgents = async () => {
    setAutoLoading(true);
    try {
      const match = periode.match(/T(\d) (\d{4})/);
      if (!match) {
        toast.error('Période invalide');
        return;
      }
      const q = parseInt(match[1]);
      const year = parseInt(match[2]);
      const startMonth = (q - 1) * 3; // 0-based
      const endMonth = startMonth + 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, endMonth, 0, 23, 59, 59);

      // Récupère toutes les fiches HSE et filtre par date
      const allEvents = await base44.entities.HSEEvent.list('-date_event', 200);
      const periodEvents = allEvents.filter((e) => {
        if (!e.date_event) return false;
        const d = new Date(e.date_event);
        return d >= startDate && d <= endDate;
      });

      if (periodEvents.length === 0) {
        toast.info(`Aucune fiche HSE trouvée pour ${periode}`);
        return;
      }

      // Références déjà importées pour éviter les doublons
      const existingRefs = new Set(agents.map((a) => a.reference_fiche).filter(Boolean));

      const mapEquipment = (eq) => {
        const v = (eq || '').toUpperCase();
        if (v === 'MOTO') return 'Moto';
        if (v === 'VOITURE' || v === 'VEHICULE' || v === 'VÉHICULE') return 'Véhicule 4x4';
        return 'Aucun';
      };
      const mapAbsence = (sev) => {
        if (sev && sev.startsWith('G')) return 'Cas grave';
        if (sev && (sev.startsWith('M') || sev.startsWith('m'))) return 'Blessé léger';
        return 'Aucune';
      };

      const splitNames = (raw) =>
        (raw || '').split(/[,;&]|\set\s|\s\/\s/).map(s => s.trim()).filter(Boolean);
      const extractRole = (name) => {
        const m = name.match(/\(([^)]+)\)/);
        return { role: m ? m[1].trim() : null, clean: name.replace(/\s*\([^)]+\)\s*/g, ' ').trim() };
      };

      const toCreate = [];
      periodEvents.forEach((e) => {
        const ref = e.reference || ('Fiche ' + e.fiche_number);
        if (existingRefs.has(ref)) return;
        if (!e.persons_involved) return;
        splitNames(e.persons_involved).forEach((p) => {
          const { role, clean } = extractRole(p);
          toCreate.push({
            periode,
            nom: clean.toUpperCase(),
            categorie_agent: role || e.person_role || 'Non précisé',
            moyen_roulant_affecte: mapEquipment(e.equipment),
            reference_fiche: ref,
            cessation_travail: false,
            invalidite_temporaire: false,
            jours_arret: 0,
            categorie_absence: mapAbsence(e.severity),
            genre: 'Homme',
          });
        });
      });

      if (toCreate.length === 0) {
        toast.info('Tous les agents sont déjà importés pour cette période.');
        return;
      }

      await base44.entities.AgentImpliqueBM.bulkCreate(toCreate);
      toast.success(`${toCreate.length} agent(s) importé(s) depuis les fiches HSE`);
      loadData();
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setAutoLoading(false);
    }
  };

  // Auto-charge les équipements depuis les fiches HSE pour la période
  const autoLoadEquipment = async () => {
    setAutoLoadingEq(true);
    try {
      const match = periode.match(/T(\d) (\d{4})/);
      if (!match) { toast.error('Période invalide'); return; }
      const q = parseInt(match[1]);
      const year = parseInt(match[2]);
      const startMonth = (q - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);

      const allEvents = await base44.entities.HSEEvent.list('-date_event', 200);
      const periodEvents = allEvents.filter((e) => {
        if (!e.date_event) return false;
        const d = new Date(e.date_event);
        return d >= startDate && d <= endDate;
      });

      if (periodEvents.length === 0) {
        toast.info(`Aucune fiche HSE trouvée pour ${periode}`);
        return;
      }

      const counts = {
        nb_motos_impliques: 0, nb_motos_endommages: 0, nb_motos_detruits: 0,
        nb_vehicules_impliques: 0, nb_vehicules_endommages: 0, nb_vehicules_detruits: 0,
        nb_tablettes_impliques: 0, nb_tablettes_endommages: 0, nb_tablettes_detruits: 0,
        nb_gnss_impliques: 0, nb_gnss_endommages: 0, nb_gnss_detruits: 0,
        nb_autres_impliques: 0, nb_autres_endommages: 0, nb_autres_detruits: 0,
      };

      const classify = (eq, damages) => {
        const e = (eq || '').toLowerCase();
        const d = (damages || '').toLowerCase();
        // Niveau de dommage
        const detruit = /détruit|detruit|détruite|detruite|totalement\s+d/.test(d);
        const endommage = /endommag/.test(d);
        const level = detruit ? 'detruits' : (endommage ? 'endommages' : 'impliques');
        // Type d'équipement (moyens roulants séparés des autres)
        const types = [];
        if (/moto/.test(e)) types.push('motos');
        if (/véhicule|vehicule|voiture|4x4|camion|pick-up|pickup|autocar|bus/.test(e)) types.push('vehicules');
        if (/tablette/.test(e)) types.push('tablettes');
        if (/gnss|récepteur|recepteur/.test(e)) types.push('gnss');
        // Autres : tout le reste sauf moyens roulants déjà comptés
        const isKnown = /moto|véhicule|vehicule|voiture|4x4|camion|pick-?up|autocar|bus|tablette|gnss|récepteur|recepteur/.test(e);
        if (!isKnown && e && e !== 'aucun' && e !== 'none') types.push('autres');
        types.forEach((t) => {
          const key = `nb_${t}_${level}`;
          counts[key] = (counts[key] || 0) + 1;
        });
      };

      periodEvents.forEach((e) => classify(e.equipment, e.injuries_damages));

      setEqDraft(counts);
      // Sauvegarde automatique
      if (equipment?.id) {
        await base44.entities.ObservationBM.update(equipment.id, counts);
      } else {
        const created = await base44.entities.ObservationBM.create({ periode, ...counts });
        setEquipment(created);
      }
      toast.success('Équipements chargés et enregistrés depuis les fiches HSE');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setAutoLoadingEq(false);
    }
  };

  const saveTier = async (data) => {
    try {
      if (editingTier?.id) {
        await base44.entities.TiersImpacteBM.update(editingTier.id, data);
      } else {
        await base44.entities.TiersImpacteBM.create(data);
      }
      setTierFormOpen(false);
      setEditingTier(null);
      toast.success('Cas de tiers enregistré');
      loadData();
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  const deleteTier = async (tier) => {
    if (!window.confirm('Supprimer ce cas de tiers ?')) return;
    try {
      await base44.entities.TiersImpacteBM.delete(tier.id);
      toast.success('Cas supprimé');
      loadData();
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  // KPI synthèse
  const totalAgents = agents.length;
  const nbHommes = agents.filter((a) => a.genre === 'Homme').length;
  const nbFemmes = agents.filter((a) => a.genre === 'Femme').length;
  const pctH = totalAgents > 0 ? Math.round((nbHommes / totalAgents) * 100) : 0;
  const pctF = totalAgents > 0 ? Math.round((nbFemmes / totalAgents) * 100) : 0;
  const cessations = agents.filter((a) => a.cessation_travail).length;
  const invalidites = agents.filter((a) => a.invalidite_temporaire).length;
  const totalJours = agents.reduce((s, a) => s + (a.jours_arret || 0), 0);

  const EQ_CATS = [
    { label: 'Motos', key: 'motos', icon: Bike },
    { label: 'Véhicules', sub: '4x4, voitures, camions', key: 'vehicules', icon: Car },
    { label: 'Tablettes', key: 'tablettes', icon: Tablet },
    { label: 'Récepteurs GNSS', key: 'gnss', icon: SatelliteDish },
    { label: 'Autres équipements', key: 'autres', icon: Package },
  ];
  const eqTot = (k) => Object.values(allObsTotals).reduce((s, t) => s + (t[k] || 0), 0);
  const LEVELS = [
    { k: 'impliques', label: 'Impliqués', on: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' },
    { k: 'endommages', label: 'Endommagés', on: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
    { k: 'detruits', label: 'Détruits', on: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  ];
  const absenceTone = (c) => c === 'Cas grave' ? 'bg-red-100 text-red-700' : c === 'Blessé léger' ? 'bg-amber-100 text-amber-700' : c === 'Maladie' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600';
  const pill = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap';

  const SectionHead = ({ icon: Icon, tint, title, sub, count, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-5">
      <div className="flex items-start gap-3 min-w-0">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${tint}`}><Icon className="w-5 h-5" /></span>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {title}{typeof count === 'number' && <span className="ml-2 align-middle text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{count}</span>}
          </h2>
          {sub && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {children && <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-none [&>*:only-child]:col-span-2">{children}</div>}
    </div>
  );
  const btnMain = 'bg-[#c2580c] hover:bg-[#9a4200] text-white rounded-full h-10 px-4';
  const btnAlt = 'rounded-full h-10 px-4 border-slate-300 text-slate-700 hover:bg-slate-50';
  const RowActions = ({ onEdit, onDelete }) => (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit} aria-label="Modifier"><Pencil className="w-4 h-4" /></Button>
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onDelete} aria-label="Supprimer"><Trash2 className="w-4 h-4 text-red-600" /></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-x-hidden">
      <HSEPageHeader
        backTo="/hse"
        title="Indicateurs Banque Mondiale"
        subtitle="Agents, équipements et tiers touchés par les accidents"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Synthèse */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-3 sm:gap-5">
              <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0b5f5a 0%,#0f766e 55%,#c2580c 140%)' }}>
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" aria-hidden />
                <p className="relative text-xs font-semibold uppercase tracking-wider text-white/75">Agents impliqués · {periode}</p>
                <p className="relative mt-2 text-5xl font-bold tabular-nums leading-none">{totalAgents}</p>
                <div className="relative mt-5">
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-white/20">
                    <div className="bg-sky-300" style={{ width: `${pctH}%` }} />
                    <div className="bg-pink-300" style={{ width: `${pctF}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-300" />Hommes <b>{nbHommes}</b> <span className="text-white/70">({pctH}%)</span></span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-300" />Femmes <b>{nbFemmes}</b> <span className="text-white/70">({pctF}%)</span></span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))' }}>
                {[
                  { label: 'Cessations de travail', value: cessations, icon: HeartPulse, tint: 'bg-red-50 text-red-600', num: 'text-red-700' },
                  { label: 'Invalidités temporaires', value: invalidites, icon: UserCheck, tint: 'bg-orange-50 text-orange-600', num: 'text-orange-700' },
                  { label: "Jours d'arrêt (total)", value: totalJours, icon: HeartPulse, tint: 'bg-amber-50 text-amber-600', num: 'text-amber-700' },
                  { label: 'Cas de tiers', value: tiers.length, icon: Users, tint: 'bg-violet-50 text-violet-600', num: 'text-violet-700' },
                ].map((c) => (
                  <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.tint}`}><c.icon className="w-5 h-5" /></span>
                    <p className={`mt-3 text-3xl font-bold tabular-nums leading-none ${c.value > 0 ? c.num : 'text-slate-300'}`}>{c.value}</p>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-snug">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1 : Équipements */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <SectionHead icon={Package} tint="bg-sky-50 text-sky-700" title="Équipements touchés" sub="Impliqués, endommagés et détruits lors des accidents">
                <Button onClick={autoLoadEquipment} disabled={autoLoadingEq} variant="outline" className={btnAlt}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {autoLoadingEq ? 'Import...' : 'Charger depuis les fiches'}
                </Button>
              </SectionHead>

              {/* Totaux par niveau */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                {LEVELS.map((l) => (
                  <div key={l.k} className={`rounded-xl px-3 py-2.5 sm:py-3 ${l.on}`}>
                    <p className="text-2xl font-bold tabular-nums leading-none">{eqTot(l.k)}</p>
                    <p className="mt-1 text-xs font-semibold">{l.label}</p>
                  </div>
                ))}
              </div>

              {/* Mobile : une ligne compacte par équipement */}
              <ul className="sm:hidden divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {EQ_CATS.map((cat) => (
                  <li key={cat.key} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-none"><cat.icon className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">{cat.label}</span>
                    {LEVELS.map((l) => {
                      const v = allObsTotals[cat.key][l.k];
                      return <span key={l.k} title={l.label} className={`min-w-[1.9rem] text-center rounded-md px-1.5 py-0.5 text-sm font-bold ${v > 0 ? l.on : 'text-slate-300'}`}>{v}</span>;
                    })}
                  </li>
                ))}
                <li className="flex items-center justify-end gap-3 px-3 py-2 text-[12px] text-slate-500">
                  {LEVELS.map((l) => <span key={l.k} className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${l.dot}`} />{l.label}</span>)}
                </li>
              </ul>

              {/* Tablette / ordinateur : tableau */}
              <div className="hidden sm:block rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-600 text-xs uppercase tracking-wide">
                      <th className="py-3 px-4">Matériel</th>
                      {LEVELS.map((l) => <th key={l.k} className="py-3 px-4 text-center">{l.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {EQ_CATS.map((cat) => (
                      <tr key={cat.key} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><cat.icon className="w-4 h-4" /></span>
                            <span><span className="font-semibold text-slate-800">{cat.label}</span>{cat.sub && <span className="block text-xs text-slate-500">{cat.sub}</span>}</span>
                          </div>
                        </td>
                        {LEVELS.map((l) => {
                          const v = allObsTotals[cat.key][l.k];
                          return <td key={l.k} className="py-2.5 px-4 text-center"><span className={`inline-flex justify-center min-w-[2.2rem] px-2.5 py-1 rounded-md font-bold ${v > 0 ? l.on : 'text-slate-300'}`}>{v}</span></td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 2 : Agents impliqués */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <SectionHead icon={Users} tint="bg-teal-50 text-teal-700" title="Agents impliqués" sub="Agents touchés par les accidents de la période" count={agents.length}>
                <Button onClick={() => { setEditingAgent(null); setAgentFormOpen(true); }} className={btnMain}>
                  <Plus className="w-4 h-4 mr-1.5" /> Ajouter
                </Button>
                <Button onClick={autoLoadAgents} disabled={autoLoading} variant="outline" className={btnAlt}>
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  {autoLoading ? 'Import...' : 'Depuis les fiches'}
                </Button>
              </SectionHead>
              {agents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>Aucun agent renseigné.</p>
                </div>
              ) : (
                <>
                  {/* Mobile / tablette : cartes */}
                  <ul className="lg:hidden grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
                    {agents.map((a) => (
                      <li key={a.id} className="rounded-xl border border-slate-200 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 leading-snug">{a.nom}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{a.categorie_agent}{a.moyen_roulant_affecte && a.moyen_roulant_affecte !== 'Aucun' ? ` · ${a.moyen_roulant_affecte}` : ''}</p>
                          </div>
                          <RowActions onEdit={() => { setEditingAgent(a); setAgentFormOpen(true); }} onDelete={() => deleteAgent(a)} />
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <span className={`${pill} ${a.genre === 'Homme' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>{a.genre}</span>
                          {a.cessation_travail && <span className={`${pill} bg-red-100 text-red-700`}>Cessation</span>}
                          {a.invalidite_temporaire && <span className={`${pill} bg-orange-100 text-orange-700`}>Invalidité</span>}
                          {(a.jours_arret || 0) > 0 && <span className={`${pill} bg-amber-100 text-amber-800`}>{a.jours_arret} j d'arrêt</span>}
                          {a.categorie_absence && a.categorie_absence !== 'Aucune' && <span className={`${pill} ${absenceTone(a.categorie_absence)}`}>{a.categorie_absence}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Ordinateur : tableau */}
                  <div className="hidden lg:block rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-slate-600 text-xs uppercase tracking-wide">
                          <th className="py-3 px-3">Nom</th>
                          <th className="py-3 px-3">Catégorie</th>
                          <th className="py-3 px-3">Moyen roulant</th>
                          <th className="py-3 px-3">Genre</th>
                          <th className="py-3 px-3">Cessation</th>
                          <th className="py-3 px-3">Invalidité</th>
                          <th className="py-3 px-3 text-center">Jours arrêt</th>
                          <th className="py-3 px-3">Absence</th>
                          <th className="py-3 px-3 text-right"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map((a) => (
                          <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{a.nom}</td>
                            <td className="py-2.5 px-3 text-slate-600">{a.categorie_agent}</td>
                            <td className="py-2.5 px-3">{a.moyen_roulant_affecte && a.moyen_roulant_affecte !== 'Aucun' ? <span className={`${pill} bg-slate-100 text-slate-700`}>{a.moyen_roulant_affecte}</span> : <span className="text-slate-300">—</span>}</td>
                            <td className="py-2.5 px-3"><span className={`${pill} ${a.genre === 'Homme' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>{a.genre}</span></td>
                            <td className="py-2.5 px-3">{a.cessation_travail ? <span className={`${pill} bg-red-100 text-red-700`}>Oui</span> : <span className="text-slate-400">Non</span>}</td>
                            <td className="py-2.5 px-3">{a.invalidite_temporaire ? <span className={`${pill} bg-orange-100 text-orange-700`}>Oui</span> : <span className="text-slate-400">Non</span>}</td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{a.jours_arret || 0}</td>
                            <td className="py-2.5 px-3">{a.categorie_absence && a.categorie_absence !== 'Aucune' ? <span className={`${pill} ${absenceTone(a.categorie_absence)}`}>{a.categorie_absence}</span> : <span className="text-slate-300">—</span>}</td>
                            <td className="py-2.5 px-3"><RowActions onEdit={() => { setEditingAgent(a); setAgentFormOpen(true); }} onDelete={() => deleteAgent(a)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* Section 3 : Tiers impactés */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <SectionHead icon={Users} tint="bg-violet-50 text-violet-700" title="Communauté et usagers de la route" sub="Personnes tierces impactées et leurs biens (motos, véhicules, cultures…)" count={tiers.length}>
                <Button onClick={() => { setEditingTier(null); setTierFormOpen(true); }} className={btnMain}>
                  <Plus className="w-4 h-4 mr-1.5" /> Ajouter un cas
                </Button>
              </SectionHead>
              {tiers.length === 0 ? (
                <p className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl">Aucun cas de tiers renseigné.</p>
              ) : (
                <ul className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
                  {tiers.map((t) => (
                    <li key={t.id} className="rounded-xl border border-slate-200 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                          <span className={`${pill} bg-violet-100 text-violet-700`}>{t.type_bien}</span>
                          {t.reference_fiche && <span className="text-xs text-slate-500">Fiche {t.reference_fiche}</span>}
                        </div>
                        <RowActions onEdit={() => { setEditingTier(t); setTierFormOpen(true); }} onDelete={() => deleteTier(t)} />
                      </div>
                      <p className="mt-1.5 text-sm text-slate-800 leading-snug">{t.description}</p>
                      {t.details_bien && <p className="mt-1 text-xs text-slate-500">{t.details_bien}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <AgentForm
        open={agentFormOpen}
        onClose={() => { setAgentFormOpen(false); setEditingAgent(null); }}
        onSave={saveAgent}
        agent={editingAgent}
        periode={periode}
      />
      <TierForm
        open={tierFormOpen}
        onClose={() => { setTierFormOpen(false); setEditingTier(null); }}
        onSave={saveTier}
        tier={editingTier}
        periode={periode}
      />
    </div>
  );
}