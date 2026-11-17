import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Building2, MapPin, Calendar, Plus, Trash2, ChevronUp, ChevronDown, Check, AlertTriangle, Layers, Users, Wrench, Ban, Flag, Phone, Mail, Pencil } from 'lucide-react';
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from "sonner";
import { getActiviteColor } from "@/lib/activiteColors";

const statutConfig = {
  en_cours: { label: 'En cours', className: 'bg-statut-cours-bg text-statut-cours', dot: 'bg-statut-cours', accent: 'border-l-statut-cours', tint: 'from-brand-light/40 via-card to-card', liseret: 'bg-statut-cours' },
  termine: { label: 'Terminé', className: 'bg-statut-termine-bg text-statut-termine', dot: 'bg-statut-termine', accent: 'border-l-statut-termine', tint: 'from-secondary/40 via-card to-card', liseret: 'bg-statut-termine' },
  en_arret: { label: 'En arrêt', className: 'bg-primary/10 text-primary', dot: 'bg-primary', accent: 'border-l-primary', tint: 'from-primary/5 via-card to-card', liseret: 'bg-primary' }
};
const causeLabel = { technique: 'Problème technique', administratif: 'Problème administratif', financier: 'Problème financier', autre: 'Autre' };
const prioriteLabel = { normale: 'Normale', haute: 'Haute', urgente: 'Urgente' };

// Statuts possibles pour chaque entrée de "Travaux réalisés"
const travailStatutConfig = {
  termine: { label: 'Terminé', className: 'bg-statut-termine-bg text-statut-termine', dot: 'bg-statut-termine' },
  en_cours: { label: 'En cours', className: 'bg-statut-cours-bg text-statut-cours', dot: 'bg-statut-cours' },
  reporte: { label: 'Reporté', className: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  bloque: { label: 'Bloqué', className: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
};
const travailStatutOptions = [
  { value: 'termine', label: 'Terminé' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'reporte', label: 'Reporté' },
  { value: 'bloque', label: 'Bloqué' },
];

function MetaItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-brand" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ProjetDetailPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const projetId = urlParams.get('id');

  useEffect(() => { base44.auth.me().then(setUser); }, []);
  const [editMode, setEditMode] = useState(false);

  const { data: bureaux } = useQuery({ queryKey: ['bureaux'], queryFn: () => base44.entities.Bureau.list() });
  const { data: projet, isLoading } = useQuery({
    queryKey: ['projet', projetId],
    queryFn: async () => {
      const all = await base44.entities.Projet.list();
      return all.find(p => p.id === projetId) || null;
    },
    enabled: !!projetId
  });

  // Étapes
  const [newEtape, setNewEtape] = useState('');
  const etapes = projet?.etapes || [];
  const faitCount = etapes.filter(e => e.fait).length;
  const pct = etapes.length > 0 ? Math.round((faitCount / etapes.length) * 100) : 0;

  const saveEtapes = async (newEtapes) => {
    const avancement = newEtapes.length > 0 ? Math.round(newEtapes.filter(e => e.fait).length / newEtapes.length * 100) : 0;
    await base44.entities.Projet.update(projet.id, { etapes: newEtapes, avancement });
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
    queryClient.invalidateQueries({ queryKey: ['projets'] });
  };
  const addEtape = async () => {
    if (!newEtape.trim()) return;
    await saveEtapes([...etapes, { titre: newEtape.trim(), fait: false, ordre: etapes.length + 1 }]);
    setNewEtape('');
  };
  const toggleEtape = async (idx) => {
    await saveEtapes(etapes.map((e, i) => i === idx ? { ...e, fait: !e.fait } : e));
  };
  const renameEtape = async (idx, titre) => {
    await saveEtapes(etapes.map((e, i) => i === idx ? { ...e, titre } : e));
  };
  const removeEtape = async (idx) => {
    await saveEtapes(etapes.filter((_, i) => i !== idx).map((e, i) => ({ ...e, ordre: i + 1 })));
  };
  const moveEtape = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= etapes.length) return;
    const arr = [...etapes];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    await saveEtapes(arr.map((e, i) => ({ ...e, ordre: i + 1 })));
  };

  // Interlocuteurs
  const [newInterloc, setNewInterloc] = useState({ nom: '', fonction: '', telephone: '', email: '' });
  const interlocuteurs = projet?.interlocuteurs || [];
  const saveInterlocuteurs = async (list) => {
    await base44.entities.Projet.update(projet.id, { interlocuteurs: list });
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
  };
  const addInterloc = async () => {
    if (!newInterloc.nom.trim()) { toast.error("Le nom est requis"); return; }
    await saveInterlocuteurs([...interlocuteurs, newInterloc]);
    setNewInterloc({ nom: '', fonction: '', telephone: '', email: '' });
  };
  const removeInterloc = async (idx) => {
    await saveInterlocuteurs(interlocuteurs.filter((_, i) => i !== idx));
  };

  // Travaux réalisés
  const travaux = projet?.travaux_realises || [];
  const [newTravail, setNewTravail] = useState('');
  const addTravail = async () => {
    if (!newTravail.trim()) return;
    const entry = { date: format(new Date(), 'yyyy-MM-dd'), texte: newTravail.trim(), statut: 'en_cours' };
    await base44.entities.Projet.update(projet.id, { travaux_realises: [entry, ...travaux] });
    setNewTravail('');
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
  };
  const removeTravail = async (idx) => {
    await base44.entities.Projet.update(projet.id, { travaux_realises: travaux.filter((_, i) => i !== idx) });
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
  };
  const updateTravailStatut = async (idx, statut) => {
    const updated = travaux.map((t, i) => i === idx ? { ...t, statut } : t);
    await base44.entities.Projet.update(projet.id, { travaux_realises: updated });
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
  };

  // Blocage
  const [bloque, setBloque] = useState(false);
  const [cause, setCause] = useState('');
  const [descBlocage, setDescBlocage] = useState('');
  useEffect(() => {
    if (projet) {
      setBloque(!!projet.bloque);
      setCause(projet.cause_blocage || '');
      setDescBlocage(projet.description_blocage || '');
    }
  }, [projet]);
  const toggleBloque = async (checked) => {
    setBloque(checked);
    if (!checked) {
      await base44.entities.Projet.update(projet.id, { bloque: false, cause_blocage: '', description_blocage: '' });
      setCause(''); setDescBlocage('');
      toast.success("Blocage levé");
    } else {
      await base44.entities.Projet.update(projet.id, { bloque: true });
      toast.success("Projet marqué comme bloqué");
    }
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
    queryClient.invalidateQueries({ queryKey: ['projets'] });
  };
  const onCauseChange = async (val) => {
    setCause(val);
    await base44.entities.Projet.update(projet.id, { cause_blocage: val });
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
    queryClient.invalidateQueries({ queryKey: ['projets'] });
  };
  const onDescBlur = async () => {
    if (descBlocage === (projet.description_blocage || '')) return;
    await base44.entities.Projet.update(projet.id, { description_blocage: descBlocage });
    queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
    queryClient.invalidateQueries({ queryKey: ['projets'] });
  };

  if (!projetId || isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!projet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Projet introuvable.</p>
          <Button onClick={() => navigate(createPageUrl('SuiviProjets'))}><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
        </div>
      </div>
    );
  }

  const bureau = bureaux?.find(b => b.id === projet.bureau_id);
  const stCfg = statutConfig[projet.statut] || statutConfig.en_cours;
  const actColor = getActiviteColor(projet.type_activite);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate(createPageUrl('SuiviProjets'))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux projets
          </Button>
          {editMode ? (
            <Button variant="outline" onClick={() => setEditMode(false)}>
              <Check className="w-4 h-4 mr-2" /> Terminer l'édition
            </Button>
          ) : (
            <Button onClick={() => setEditMode(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Editer
            </Button>
          )}
        </div>

        {/* En-tête */}
        <div className={`rounded-2xl border border-border overflow-hidden mb-6 shadow-sm bg-gradient-to-br ${stCfg.tint}`}>
          <div className={`h-1.5 ${projet.bloque ? 'bg-destructive' : stCfg.liseret}`} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="flex-1 min-w-0">
                <h1 className="font-heading text-2xl font-bold text-foreground leading-tight tracking-tight">{projet.titre}</h1>
                {projet.type_activite && (
                  <span className={`inline-block mt-2 text-xs font-heading font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md border ${actColor.classes}`}>{projet.type_activite}</span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge className={`${stCfg.className} gap-1.5 border border-current/10`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                  {stCfg.label}
                </Badge>
                {projet.bloque && (
                  <Badge className="bg-destructive/10 text-destructive gap-1 border border-destructive/25"><AlertTriangle className="w-3 h-3" />Bloqué</Badge>
                )}
              </div>
            </div>

            {/* Métadonnées */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 py-4 px-4 -mx-1 rounded-xl bg-card/60 border border-border/60">
              <MetaItem icon={Building2} label="Bureau" value={bureau?.nom || '—'} />
              <MetaItem icon={MapPin} label="Localité" value={projet.localite || '—'} />
              <MetaItem icon={Calendar} label="Début" value={projet.date_debut ? new Date(projet.date_debut).toLocaleDateString('fr-FR') : '—'} />
              <MetaItem icon={Calendar} label="Fin prévue" value={projet.date_fin_prevue ? new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR') : '—'} />
            </div>

            {/* Description dédiée */}
            {projet.description && (
              <div className="mt-4 rounded-xl bg-card/60 border border-border/60 p-4">
                <p className="text-[11px] font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                {projet.description.includes(',') && projet.description.split(',').length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {projet.description.split(',').map((tag, i) => (
                      <span key={i} className="inline-block text-xs font-medium bg-secondary text-foreground/80 border border-border rounded-full px-2.5 py-1">{tag.trim()}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{projet.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Bandeau blocage */}
          {projet.bloque && (
            <div className="bg-destructive/10 border-t border-destructive/25 px-6 py-3.5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-sm text-destructive leading-relaxed">
                <span className="font-semibold">Projet bloqué</span>
                {projet.cause_blocage && ` · ${causeLabel[projet.cause_blocage] || projet.cause_blocage}`}
                {projet.description_blocage && <span className="text-destructive/80"> — {projet.description_blocage}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Onglets */}
        <Tabs defaultValue="etapes" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-xl p-1.5 h-auto gap-1 shadow-sm">
            <TabsTrigger value="etapes" className="gap-1.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm text-foreground/70">
              <Layers className="w-3.5 h-3.5" /> Étapes
              {etapes.length > 0 && <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{faitCount}/{etapes.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="travaux" className="gap-1.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm text-foreground/70">
              <Wrench className="w-3.5 h-3.5" /> Travaux
              {travaux.length > 0 && <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{travaux.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="interlocuteurs" className="gap-1.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm text-foreground/70">
              <Users className="w-3.5 h-3.5" /> Interlocuteurs
              {interlocuteurs.length > 0 && <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{interlocuteurs.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="blocage" className="gap-1.5 rounded-lg data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm text-foreground/70">
              <Ban className="w-3.5 h-3.5" /> Blocage
            </TabsTrigger>
          </TabsList>

          {/* Étapes */}
          <TabsContent value="etapes" className="mt-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border/60 bg-secondary/60 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Étapes du projet</h2>
                <span className="text-sm text-slate-500">{faitCount}/{etapes.length} · <span className="font-semibold text-slate-700">{pct}%</span></span>
              </div>
              <div className="p-5">
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : actColor.bar}`} style={{ width: `${pct}%` }} />
                </div>

                {etapes.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Aucune étape. Ajoutez les étapes de votre projet ci-dessous.</p>
                ) : (
                  <div className="flex flex-wrap items-stretch gap-y-3">
                    {etapes.map((e, idx) => (
                      <React.Fragment key={idx}>
                        <div className="relative flex flex-col items-center group" style={{ minWidth: '120px', maxWidth: '180px', flex: '1 1 120px' }}>
                          {/* Node */}
                          <button
                            onClick={editMode ? () => toggleEtape(idx) : undefined}
                            disabled={!editMode}
                            className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2 ${e.fait ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-500/30' : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400'}`}
                            title={e.fait ? 'Marquer non fait' : 'Marquer fait'}
                          >
                            {e.fait ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                          </button>
                          {/* Label (texte non barré même lorsque l'étape est validée) */}
                          {editMode ? (
                            <input
                              value={e.titre}
                              onChange={ev => renameEtape(idx, ev.target.value)}
                              className={`mt-2 w-full text-center text-xs font-medium bg-transparent border-none outline-none focus:bg-slate-50 rounded px-1 py-1 ${e.fait ? 'text-slate-500' : 'text-slate-700'}`}
                            />
                          ) : (
                            <p className={`mt-2 w-full text-center text-xs font-medium px-1 py-1 ${e.fait ? 'text-slate-500' : 'text-slate-700'}`}>{e.titre}</p>
                          )}
                          {/* Actions */}
                          {editMode && (
                            <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-sm border border-slate-100 px-0.5">
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveEtape(idx, -1)} disabled={idx === 0} title="Déplacer avant"><ChevronUp className="w-3 h-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveEtape(idx, 1)} disabled={idx === etapes.length - 1} title="Déplacer après"><ChevronDown className="w-3 h-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500 hover:bg-red-50" onClick={() => removeEtape(idx)} title="Supprimer"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          )}
                        </div>
                        {/* Arrow connector */}
                        {idx < etapes.length - 1 && (
                          <div className="flex items-center self-start mt-4 px-1 text-slate-300 flex-shrink-0">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {editMode && (
                  <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                    <Input value={newEtape} onChange={e => setNewEtape(e.target.value)} placeholder="Nouvelle étape..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEtape(); } }} />
                    <Button onClick={addEtape}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Travaux réalisés */}
          <TabsContent value="travaux" className="mt-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border/60 bg-secondary/60">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Travaux réalisés</h2>
              </div>
              <div className="p-5">
              {editMode && (
                <>
                  <Textarea value={newTravail} onChange={e => setNewTravail(e.target.value)} rows={2} placeholder="Décrire ce qui a été fait..." className="mb-2" />
                  <Button size="sm" onClick={addTravail} className="mb-5"><Plus className="w-4 h-4 mr-1" /> Ajouter une entrée</Button>
                </>
              )}
              <div className="space-y-3">
                {travaux.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Aucun travail enregistré.</p>}
                {travaux.map((t, idx) => {
                  const tCfg = travailStatutConfig[t.statut] || travailStatutConfig.en_cours;
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl p-3.5 flex gap-3">
                      <div className="w-1 bg-slate-200 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          {editMode ? (
                            <FormSelect
                              value={t.statut || 'en_cours'}
                              onChange={(e) => updateTravailStatut(idx, e.target.value)}
                              className="w-40 h-8 text-xs rounded-lg border border-border bg-card px-2 outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              {travailStatutOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </FormSelect>
                          ) : (
                            <Badge className={`${tCfg.className} gap-1.5 border border-current/10`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tCfg.dot}`} />
                              {tCfg.label}
                            </Badge>
                          )}
                          {editMode && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50 flex-shrink-0" onClick={() => removeTravail(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.texte}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </TabsContent>

          {/* Interlocuteurs */}
          <TabsContent value="interlocuteurs" className="mt-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border/60 bg-secondary/60">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Interlocuteurs / représentants</h2>
              </div>
              <div className="p-5">
              <div className="space-y-2 mb-5">
                {interlocuteurs.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Aucun interlocuteur enregistré.</p>}
                {interlocuteurs.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{it.nom}</p>
                        {it.fonction && <p className="text-xs text-slate-500">{it.fonction}</p>}
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {it.telephone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{it.telephone}</span>}
                          {it.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{it.email}</span>}
                        </div>
                      </div>
                    </div>
                    {editMode && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50 flex-shrink-0" onClick={() => removeInterloc(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                ))}
              </div>
              {editMode && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Ajouter un interlocuteur</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input value={newInterloc.nom} onChange={e => setNewInterloc(p => ({ ...p, nom: e.target.value }))} placeholder="Nom *" />
                    <Input value={newInterloc.fonction} onChange={e => setNewInterloc(p => ({ ...p, fonction: e.target.value }))} placeholder="Fonction / rôle" />
                    <Input value={newInterloc.telephone} onChange={e => setNewInterloc(p => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone" />
                    <Input value={newInterloc.email} onChange={e => setNewInterloc(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                    <div className="md:col-span-2 flex justify-end">
                      <Button size="sm" onClick={addInterloc}><Plus className="w-4 h-4 mr-1" /> Ajouter l'interlocuteur</Button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </TabsContent>

          {/* Blocage */}
          <TabsContent value="blocage" className="mt-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/60 bg-secondary/60">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Gestion du blocage</h2>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Projet bloqué</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Activez l'option pour signaler ce projet comme bloqué. La cause et la description s'enregistrent automatiquement.</p>
                  </div>
                  <Switch checked={bloque} onCheckedChange={toggleBloque} disabled={!editMode} />
                </div>

                {bloque && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                    <div className="rounded-lg border border-border bg-card p-4">
                      <Label className="mb-2 block">Cause du blocage</Label>
                      <Select value={cause} onValueChange={onCauseChange} disabled={!editMode}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner la cause..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technique">Problème technique</SelectItem>
                          <SelectItem value="administratif">Problème administratif</SelectItem>
                          <SelectItem value="financier">Problème financier</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <Label className="mb-2 block">Description du blocage</Label>
                      <Textarea value={descBlocage} onChange={e => setDescBlocage(e.target.value)} onBlur={onDescBlur} readOnly={!editMode} rows={3} placeholder="Expliquez la cause et le contexte du blocage..." />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}