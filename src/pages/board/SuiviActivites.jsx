import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { ensureUserBureauSynced } from "@/lib/autoSyncBureau";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Pencil, CheckCircle2, Clock, Eye, Download, Archive, RotateCcw } from 'lucide-react';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import PageHeader from '@/components/board/layout/PageHeader';
import FicheSuiviForm from '@/components/board/activites/FicheSuiviForm';
import FicheSuiviDetail from '@/components/board/activites/FicheSuiviDetail';

export default function SuiviActivites() {
  const [user, setUser] = useState(null);
  const [selectedBureauId, setSelectedBureauId] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedFiche, setSelectedFiche] = useState(null);
  const [typeFiche, setTypeFiche] = useState('hebdomadaire');
  const [activeBureauTab, setActiveBureauTab] = useState(null);
  const [showArchivedByBureau, setShowArchivedByBureau] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(ensureUserBureauSynced).then(setUser);
  }, []);

  const { data: bureaux } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => base44.entities.Bureau.list()
  });

  useEffect(() => {
    if (!user || !bureaux) return;
    if (user.role !== 'admin' && user.fonction !== 'admin') {
      // Chercher d'abord par email responsable, sinon par bureau_id stocké sur l'utilisateur, sinon premier bureau accessible
      const b = bureaux.find(b => b.responsable_email === user.email)
        || bureaux.find(b => b.id === user.data?.bureau_id)
        || bureaux.find(b => b.id === user.bureau_id)
        || bureaux[0];
      if (b) setSelectedBureauId(b.id);
    }
  }, [user, bureaux]);

  const isAdmin = user?.role === 'admin' || user?.fonction === 'admin';

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const numeroSemaine = getISOWeek(currentWeek);
  const annee = currentWeek.getFullYear();

  // Pour non-admin : toutes les fiches du bureau (sans filtre annee pour voir tout l'historique)
  const { data: fiches, isLoading } = useQuery({
    queryKey: ['suivi-activites', selectedBureauId],
    queryFn: () => base44.entities.SuiviActiviteSemaine.filter({ bureau_id: selectedBureauId }, '-semaine_debut', 200),
    enabled: !isAdmin && !!selectedBureauId
  });

  // Pour admin : toutes les fiches de l'année
  const { data: toutesLesFiches, isLoading: isLoadingAdmin } = useQuery({
    queryKey: ['suivi-activites-all', annee],
    queryFn: () => base44.entities.SuiviActiviteSemaine.filter({ annee }, '-semaine_debut'),
    enabled: !!isAdmin
  });

  const handleNew = (type, bureauId) => {
    setTypeFiche(type);
    setSelectedFiche(null);
    if (bureauId) setSelectedBureauId(bureauId);
    setShowForm(true);
  };

  const handleEdit = (fiche) => {
    setSelectedFiche(fiche);
    setTypeFiche(fiche.type_fiche);
    setSelectedBureauId(fiche.bureau_id);
    setShowForm(true);
  };

  const handleView = (fiche) => {
    setSelectedFiche(fiche);
    setShowDetail(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['suivi-activites'] });
    queryClient.invalidateQueries({ queryKey: ['suivi-activites-all'] });
    setShowForm(false);
    setSelectedFiche(null);
  };

  const handleUpdateActivityStatus = async (fiche, activityIndex, newStatus) => {
    const activities = fiche.activites_planifiees || [];
    if (activities[activityIndex]?.statut === newStatus) return;
    const updatedActivities = activities.map((activity, index) =>
      index === activityIndex ? { ...activity, statut: newStatus } : activity
    );

    // Mise à jour immédiate de la liste : un second changement sur la même fiche part ainsi des bonnes données.
    const applyToCache = (cached) => Array.isArray(cached)
      ? cached.map(f => f.id === fiche.id ? { ...f, activites_planifiees: updatedActivities } : f)
      : cached;
    queryClient.setQueriesData({ queryKey: ['suivi-activites'] }, applyToCache);
    queryClient.setQueriesData({ queryKey: ['suivi-activites-all'] }, applyToCache);

    try {
      await base44.entities.SuiviActiviteSemaine.update(fiche.id, {
        activites_planifiees: updatedActivities
      });
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error("Le statut n'a pas pu être enregistré");
    } finally {
      queryClient.invalidateQueries({ queryKey: ['suivi-activites'] });
      queryClient.invalidateQueries({ queryKey: ['suivi-activites-all'] });
    }
  };

  const handleArchiveActivity = async (fiche, activityIndex, archived) => {
    const updatedActivities = [...(fiche.activites_planifiees || [])];
    updatedActivities[activityIndex] = {
      ...updatedActivities[activityIndex],
      archive: archived,
      archive_date: archived ? new Date().toISOString() : null,
      archive_par_email: archived ? (user?.email || null) : null
    };
    await base44.entities.SuiviActiviteSemaine.update(fiche.id, {
      activites_planifiees: updatedActivities
    });
    handleSuccess();
  };

  const bureauActif = bureaux?.find(b => b.id === selectedBureauId);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  // Vue ADMIN : tous les bureaux
  if (isAdmin) {
    const bureauActifs = (bureaux?.filter(b => b.actif !== false) || []).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    const loading = isLoadingAdmin || !bureaux;
    const defaultTab = activeBureauTab || (bureauActifs[0]?.id);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader 
            title="Suivi des Activités"
            action={{
              icon: Download,
              label: "Voir / Imprimer",
              tooltip: "Télécharger et imprimer",
              onClick: () => {
                const bureauId = activeBureauTab || (bureaux?.filter(b => b.actif !== false)[0]?.id);
                if (bureauId) {
                  navigate(`${createPageUrl('ActivitesPDF')}?bureau_id=${bureauId}&annee=${annee}&semaine=${numeroSemaine}`);
                }
              }
            }}
          />

          {/* Navigation semaine + Onglets bureaux */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : (
            <Tabs value={defaultTab} onValueChange={setActiveBureauTab} className="w-full">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-4">
                  <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center flex-1">
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-1">
                      Semaine {numeroSemaine}
                    </div>
                    <p className="font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap">
                      {format(weekStart, 'dd MMM', { locale: fr })} — {format(weekEnd, 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <TabsList className="flex w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-6 h-auto gap-0">
                {bureauActifs.map((bureau, index) => (
                  <TabsTrigger 
                    key={bureau.id} 
                    value={bureau.id} 
                    className="flex-1 text-sm font-semibold px-2 py-3 rounded-lg text-center transition-all hover:bg-slate-50 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                  >
                    <span className="sm:hidden">{bureau.code}</span>
                    <span className="hidden sm:inline">{bureau.nom}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {bureauActifs.map(bureau => {
                const fichesBureau = toutesLesFiches?.filter(f => f.bureau_id === bureau.id) || [];
                const fichesHebdo = fichesBureau.filter(f => f.type_fiche === 'hebdomadaire' && f.numero_semaine === numeroSemaine && f.annee === annee);
                const fichesReportees = fichesBureau.filter(f => {
                  if (f.type_fiche !== 'hebdomadaire' || f.annee !== annee) return false;
                  if (f.numero_semaine >= numeroSemaine) return false;
                  return (f.activites_planifiees || []).some(a => a.statut !== 'realise');
                });
                const ficheDiligence = fichesBureau.filter(f => {
                  if (f.type_fiche !== 'diligence' || f.annee !== annee) return false;
                  if (f.numero_semaine > numeroSemaine) return false;
                  const activites = f.activites_planifiees || [];
                  if (activites.length === 0) return true;
                  return activites.some(a => a.statut !== 'realise');
                });
                const diligencesSemaine = ficheDiligence.filter(f => f.numero_semaine === numeroSemaine);
                const diligencesReportees = ficheDiligence.filter(f => f.numero_semaine < numeroSemaine);
                const reportees = [
                  ...fichesReportees.flatMap(fiche =>
                    (fiche.activites_planifiees || [])
                      .map((act, idx) => ({ fiche, act, idx }))
                      .filter(({ act }) => act.statut !== 'realise' && !act.archive)
                  ),
                  ...diligencesReportees.flatMap(fiche =>
                    (fiche.activites_planifiees || [])
                      .map((act, idx) => ({ fiche, act, idx }))
                      .filter(({ act }) => act.statut !== 'realise' && !act.archive)
                  )
                ];
                const archivees = [
                  ...fichesReportees.flatMap(fiche =>
                    (fiche.activites_planifiees || [])
                      .map((act, idx) => ({ fiche, act, idx }))
                      .filter(({ act }) => act.archive)
                  ),
                  ...diligencesReportees.flatMap(fiche =>
                    (fiche.activites_planifiees || [])
                      .map((act, idx) => ({ fiche, act, idx }))
                      .filter(({ act }) => act.archive)
                  )
                ];

                return (
                  <TabsContent key={bureau.id} value={bureau.id} className="space-y-8">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleNew('hebdomadaire', bureau.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Nouvelle fiche
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleNew('diligence', bureau.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Nouvelle diligence
                      </Button>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Fiches S{numeroSemaine} (Semaine courante)
                      </h2>
                      {fichesHebdo.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                          <p>Aucune fiche pour cette semaine</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {fichesHebdo.map(f => (
                            <FicheCard key={f.id} fiche={f} onEdit={handleEdit} onView={handleView} numeroSemaine={numeroSemaine} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                        Diligences (Semaine courante)
                      </h2>
                      {diligencesSemaine.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                          <p>Aucune diligence pour cette semaine</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {diligencesSemaine.map(f => (
                            <FicheCard key={f.id} fiche={f} onEdit={handleEdit} onView={handleView} numeroSemaine={numeroSemaine} />
                          ))}
                        </div>
                      )}
                    </div>

                    {(reportees.length > 0 || archivees.length > 0) && (
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500" />
                            Activités reportées
                          </h2>
                          {archivees.length > 0 && (
                            <button
                              onClick={() => setShowArchivedByBureau(prev => ({ ...prev, [bureau.id]: !prev[bureau.id] }))}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1.5 flex-shrink-0 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5 text-black" />
                              {showArchivedByBureau[bureau.id] ? 'Masquer' : 'Voir'} les activités radiées ({archivees.length})
                            </button>
                          )}
                        </div>
                        {reportees.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="text-left px-2 sm:px-4 py-3 text-slate-600 font-medium whitespace-nowrap">Semaine</th>
                                <th className="text-left px-2 sm:px-4 py-3 text-slate-600 font-medium">Activité / Diligence</th>
                                <th className="text-right px-2 sm:px-4 py-3 text-slate-600 font-medium whitespace-nowrap">Statut</th>
                                <th className="px-2 sm:px-4 py-3 w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {reportees.map(({ fiche, act, idx }) => {
                                const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                                return (
                                  <tr key={`${fiche.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-2 sm:px-4 py-3">
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-100 text-red-600 text-xs font-bold flex-shrink-0">
                                        S{fiche.numero_semaine}
                                      </span>
                                    </td>
                                    <td className="px-2 sm:px-4 py-3 text-slate-800 font-medium text-xs sm:text-sm">{act.description}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                                      <StatutSelect statut={act.statut} onChange={(statut) => handleUpdateActivityStatus(fiche, idx, statut)} />
                                    </td>
                                    <td className="px-2 sm:px-4 py-3 text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleArchiveActivity(fiche, idx, true)}
                                        className="h-7 w-7 flex-shrink-0"
                                        title="Radier cette activité"
                                      >
                                        <Archive className="w-4 h-4 text-black" />
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        )}
                        {showArchivedByBureau[bureau.id] && archivees.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Archive className="w-4 h-4 text-black" />
                              <h3 className="text-sm font-semibold text-slate-500">Activités radiées</h3>
                            </div>
                            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                  <tr>
                                    <th className="text-left px-2 sm:px-4 py-3 text-slate-500 font-medium whitespace-nowrap">Semaine</th>
                                    <th className="text-left px-2 sm:px-4 py-3 text-slate-500 font-medium">Activité / Diligence</th>
                                    <th className="text-right px-2 sm:px-4 py-3 text-slate-500 font-medium whitespace-nowrap">Statut</th>
                                    <th className="px-2 sm:px-4 py-3 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {archivees.map(({ fiche, act, idx }) => {
                                    const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                                    return (
                                      <tr key={`${fiche.id}-${idx}`} className="opacity-60">
                                        <td className="px-2 sm:px-4 py-3">
                                          <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-200 text-slate-500 text-xs font-bold flex-shrink-0">
                                            S{fiche.numero_semaine}
                                          </span>
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-slate-500 font-medium text-xs sm:text-sm">{act.description}</td>
                                        <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                                          <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap opacity-60 ${cfg.color}`}>{cfg.label}</span>
                                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-semibold whitespace-nowrap">Radiée</span>
                                          </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleArchiveActivity(fiche, idx, false)}
                                            className="h-7 w-7 flex-shrink-0"
                                            title="Réactiver cette activité"
                                          >
                                            <RotateCcw className="w-4 h-4 text-black" />
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>

        {showForm && (
          <FicheSuiviForm
            open={showForm}
            onOpenChange={setShowForm}
            fiche={selectedFiche}
            typeFiche={typeFiche}
            bureau={bureauActif}
            numeroSemaine={numeroSemaine}
            semaineDebut={weekStart}
            semaineFin={weekEnd}
            annee={annee}
            onSuccess={handleSuccess}
          />
        )}
        {showDetail && (
          <FicheSuiviDetail open={showDetail} onOpenChange={setShowDetail} fiche={selectedFiche} onEdit={handleEdit} />
        )}
      </div>
    );
  }

  // Vue BUREAU (non-admin)
  const fichesSemaine = fiches?.filter(f => {
    if (f.type_fiche !== 'hebdomadaire' || f.annee !== annee) return false;
    // Fiches de la semaine courante + fiches non complètes des semaines antérieures
    if (f.numero_semaine === numeroSemaine) return true;
    if (f.numero_semaine < numeroSemaine) {
      const activites = f.activites_planifiees || [];
      return activites.some(a => a.statut !== 'realise');
    }
    return false;
  }) || [];
  // Diligences
  const ficheDiligence = fiches?.filter(f => {
    if (f.type_fiche !== 'diligence' || f.annee !== annee) return false;
    if (f.numero_semaine > numeroSemaine) return false;
    const activites = f.activites_planifiees || [];
    if (activites.length === 0) return true;
    return activites.some(a => a.statut !== 'realise');
  }) || [];
  const diligencesSemaine = ficheDiligence.filter(f => f.numero_semaine === numeroSemaine);
  const diligencesReportees = ficheDiligence.filter(f => f.numero_semaine < numeroSemaine);
  const archivees = [
    ...fichesSemaine.filter(f => f.numero_semaine < numeroSemaine).flatMap(fiche =>
      (fiche.activites_planifiees || [])
        .map((act, idx) => ({ fiche, act, idx }))
        .filter(({ act }) => act.archive)
    ),
    ...diligencesReportees.flatMap(fiche =>
      (fiche.activites_planifiees || [])
        .map((act, idx) => ({ fiche, act, idx }))
        .filter(({ act }) => act.archive)
    )
  ];
  const fichesHebdo = fiches?.filter(f => f.type_fiche === 'hebdomadaire' && f.numero_semaine === numeroSemaine && f.annee === annee) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <PageHeader 
          title="Suivi des Activités"
          action={{
            icon: Download,
            label: "Voir / Imprimer",
            tooltip: "Télécharger et imprimer",
            onClick: () => {
              if (selectedBureauId) {
                navigate(`${createPageUrl('ActivitesPDF')}?bureau_id=${selectedBureauId}&annee=${annee}&semaine=${numeroSemaine}`);
              }
            },
            className: selectedBureauId ? "" : "opacity-50 cursor-not-allowed"
          }}
        />

        {/* Navigation semaine */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <div className="flex items-center">
            <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="px-4 py-5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors border-r border-slate-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center py-4 px-4">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-1">
                Semaine {numeroSemaine}
              </div>
              <p className="font-bold text-slate-800 text-base sm:text-xl whitespace-nowrap">
                {format(weekStart, 'dd MMM', { locale: fr })} — {format(weekEnd, 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
            <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="px-4 py-5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors border-l border-slate-100">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fiches semaine courante */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Fiches S{numeroSemaine} (Semaine courante)
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : (fichesHebdo.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
              <p>Aucune fiche pour cette semaine</p>
              <Button variant="outline" className="mt-3 text-sm" onClick={() => handleNew('hebdomadaire')}>
                <Plus className="w-4 h-4 mr-1" /> Créer une fiche
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {fichesHebdo.map(fiche => <FicheCard key={fiche.id} fiche={fiche} onEdit={handleEdit} onView={handleView} numeroSemaine={numeroSemaine} />)}
            </div>
          ))}
        </div>

        {/* Diligences semaine courante */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
            Diligences (Semaine courante)
          </h2>
          {diligencesSemaine.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
              <p>Aucune diligence pour cette semaine</p>
              <Button variant="outline" className="mt-3 text-sm" onClick={() => handleNew('diligence')}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter une diligence
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {diligencesSemaine.map(fiche => <FicheCard key={fiche.id} fiche={fiche} onEdit={handleEdit} onView={handleView} numeroSemaine={numeroSemaine} />)}
            </div>
          )}
        </div>

        {/* Activités et Diligences reportées */}
        {(fichesSemaine.filter(f => f.numero_semaine < numeroSemaine).length > 0 || diligencesReportees.length > 0 || archivees.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Activités reportées
              </h2>
              {archivees.length > 0 && (
                <button
                  onClick={() => setShowArchived(v => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1.5 flex-shrink-0 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5 text-black" />
                  {showArchived ? 'Masquer' : 'Voir'} les activités radiées ({archivees.length})
                </button>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-2 sm:px-4 py-3 text-slate-600 font-medium whitespace-nowrap">Semaine</th>
                    <th className="text-left px-2 sm:px-4 py-3 text-slate-600 font-medium">Activité / Diligence</th>
                    <th className="text-right px-2 sm:px-4 py-3 text-slate-600 font-medium whitespace-nowrap">Statut</th>
                    <th className="px-2 sm:px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fichesSemaine.filter(f => f.numero_semaine < numeroSemaine).flatMap(fiche =>
                    (fiche.activites_planifiees || [])
                      .map((act, idx) => ({ fiche, act, idx, type: 'activite' }))
                      .filter(({ act }) => act.statut !== 'realise' && !act.archive)
                      .map(({ fiche, act, idx, type }) => {
                        const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                        return (
                          <tr key={`${fiche.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 sm:px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-100 text-red-600 text-xs font-bold flex-shrink-0">
                                S{fiche.numero_semaine}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-slate-800 font-medium text-xs sm:text-sm">{act.description}</td>
                            <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                              <StatutSelect statut={act.statut} onChange={(statut) => handleUpdateActivityStatus(fiche, idx, statut)} />
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleArchiveActivity(fiche, idx, true)}
                                  className="h-7 w-7 flex-shrink-0"
                                  title="Radier cette activité"
                                >
                                  <Archive className="w-4 h-4 text-black" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                  {diligencesReportees.flatMap(fiche =>
                    (fiche.activites_planifiees || [])
                      .map((act, idx) => ({ fiche, act, idx, type: 'diligence' }))
                      .filter(({ act }) => act.statut !== 'realise' && !act.archive)
                      .map(({ fiche, act, idx, type }) => {
                        const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                        return (
                          <tr key={`${fiche.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2 sm:px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-100 text-red-600 text-xs font-bold flex-shrink-0">
                                S{fiche.numero_semaine}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-slate-800 font-medium text-xs sm:text-sm">{act.description}</td>
                            <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                              <StatutSelect statut={act.statut} onChange={(statut) => handleUpdateActivityStatus(fiche, idx, statut)} />
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleArchiveActivity(fiche, idx, true)}
                                  className="h-7 w-7 flex-shrink-0"
                                  title="Radier cette activité"
                                >
                                  <Archive className="w-4 h-4 text-black" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
            {showArchived && archivees.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Archive className="w-4 h-4 text-black" />
                  <h3 className="text-sm font-semibold text-slate-500">Activités radiées</h3>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-2 sm:px-4 py-3 text-slate-500 font-medium whitespace-nowrap">Semaine</th>
                        <th className="text-left px-2 sm:px-4 py-3 text-slate-500 font-medium">Activité / Diligence</th>
                        <th className="text-right px-2 sm:px-4 py-3 text-slate-500 font-medium whitespace-nowrap">Statut</th>
                        <th className="px-2 sm:px-4 py-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {archivees.map(({ fiche, act, idx }) => {
                        const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                        return (
                          <tr key={`${fiche.id}-${idx}`} className="opacity-60">
                            <td className="px-2 sm:px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-200 text-slate-500 text-xs font-bold flex-shrink-0">
                                S{fiche.numero_semaine}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-slate-500 font-medium text-xs sm:text-sm">{act.description}</td>
                            <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap opacity-60 ${cfg.color}`}>{cfg.label}</span>
                                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-semibold whitespace-nowrap">Radiée</span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleArchiveActivity(fiche, idx, false)}
                                className="h-7 w-7 flex-shrink-0"
                                title="Réactiver cette activité"
                              >
                                <RotateCcw className="w-4 h-4 text-black" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historique */}
         {(fichesHebdo.length > 0 || diligencesSemaine.length > 0) && (
           <div>
             <h2 className="text-base font-semibold text-slate-700 mb-3">Historique des fiches</h2>
             <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
               <table className="w-full text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="text-left px-4 py-3 text-slate-600 font-medium">Semaine</th>
                     <th className="text-left px-4 py-3 text-slate-600 font-medium hidden sm:table-cell">Période</th>
                     <th className="text-center px-4 py-3 text-slate-600 font-medium">Activités</th>
                     <th className="text-center px-4 py-3 text-slate-600 font-medium">Statut</th>
                     <th className="px-4 py-3"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {[...fichesHebdo, ...diligencesSemaine].slice(0, 10).map(fiche => {
                     const total = fiche.activites_planifiees?.length || 0;
                     const realisees = fiche.activites_planifiees?.filter(a => a.statut === 'realise').length || 0;
                     const label = fiche.type_fiche === 'diligence' ? 'Diligence' : `S${fiche.numero_semaine}/${fiche.annee}`;
                     return (
                       <tr key={fiche.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-3 font-medium text-slate-800">{label}</td>
                         <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                           {fiche.semaine_debut && format(new Date(fiche.semaine_debut), 'dd MMM', { locale: fr })}
                           {fiche.semaine_fin && ` → ${format(new Date(fiche.semaine_fin), 'dd MMM', { locale: fr })}`}
                         </td>
                         <td className="px-4 py-3 text-center text-slate-600">{realisees}/{total}</td>
                         <td className="px-4 py-3 text-center">
                           <Badge className={fiche.valide ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                             {fiche.valide ? 'Validée' : 'Brouillon'}
                           </Badge>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleView(fiche)}>
                             <Eye className="w-4 h-4 text-slate-400" />
                           </Button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           </div>
         )}
      </div>

      {showForm && (
        <FicheSuiviForm
          open={showForm}
          onOpenChange={setShowForm}
          fiche={selectedFiche}
          typeFiche={typeFiche}
          bureau={bureauActif}
          numeroSemaine={numeroSemaine}
          semaineDebut={weekStart}
          semaineFin={weekEnd}
          annee={annee}
          onSuccess={handleSuccess}
        />
      )}
      {showDetail && (
        <FicheSuiviDetail open={showDetail} onOpenChange={setShowDetail} fiche={selectedFiche} onEdit={handleEdit} />
      )}
    </div>
  );
}

const STATUT_CONFIG = {
  realise:    { label: 'Réalisé',    color: 'bg-green-100 text-green-700' },
  en_cours:   { label: 'En cours',   color: 'bg-blue-100 text-blue-700' },
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  reporte:    { label: 'Reporté',    color: 'bg-red-100 text-red-700' },
  planifie:   { label: 'Planifié',   color: 'bg-slate-100 text-slate-600' },
};

function StatutSelect({ statut, onChange }) {
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.planifie;
  return (
    <FormSelect
      value={statut}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Modifier le statut"
      title="Modifier le statut"
      className={`ml-auto h-7 w-[116px] gap-1 rounded-full border-transparent px-2.5 py-1 text-xs font-semibold shadow-none cursor-pointer ${cfg.color}`}
    >
      <option value="planifie">Planifié</option>
      <option value="en_cours">En cours</option>
      <option value="en_attente">En attente</option>
      <option value="reporte">Reporté</option>
      <option value="realise">Réalisé</option>
    </FormSelect>
  );
}

function FicheCard({ fiche, onEdit, onView, readOnly = false, numeroSemaine }) {
  const activites = fiche.activites_planifiees || [];
  const total = activites.length;
  const realisees = activites.filter(a => a.statut === 'realise').length;
  const enCours = activites.filter(a => a.statut === 'en_cours').length;
  const pct = total > 0 ? Math.round((realisees / total) * 100) : 0;
  const visibleActivites = activites.filter(a => {
    if (fiche.numero_semaine === numeroSemaine) return true;
    return a.statut !== 'realise';
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-800">
          {fiche.type_fiche === 'diligence' ? 'Diligence' : `Semaine ${fiche.numero_semaine} / ${fiche.annee}`}
        </span>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <Button 
              size="sm" 
              onClick={() => onEdit(fiche)}
              title="Modifier la fiche"
              className="text-xs h-7 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Modifié
            </Button>
          )}
        </div>
      </div>

      {/* Tableau des activités */}
      {visibleActivites.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2.5 text-slate-700 font-bold text-sm w-8">#</th>
                <th className="text-left px-3 py-2.5 text-slate-700 font-bold text-sm">Activité</th>
                <th className="text-right px-3 py-2.5 text-slate-700 font-bold text-sm w-28">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleActivites.map((act, i) => {
                const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      {fiche.numero_semaine < numeroSemaine ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-100 text-red-600 text-xs font-bold">
                          S{fiche.numero_semaine}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-semibold text-sm">{act.numero || i + 1}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 text-sm">{act.description}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}