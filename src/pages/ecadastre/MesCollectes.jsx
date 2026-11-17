import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCabinetOrg, resolveOrgId } from '@/lib/ecadastreCabinet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  User,
  Building2,
  Calendar,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Cloud,
} from 'lucide-react';
import { format, startOfWeek, addWeeks, isWithinInterval, parseISO, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const PROJECT_START = new Date('2026-03-30'); // Lundi 30 mars 2026 - début S14

function getWeekOptions() {
  const weeks = [];
  const now = new Date();
  let current = startOfWeek(PROJECT_START, { weekStartsOn: 1 });
  while (current <= now) {
    const end = addWeeks(current, 1);
    const weekNum = getISOWeek(current);
    weeks.push({
      value: current.toISOString(),
      label: `S${weekNum} (${format(current, 'dd/MM', { locale: fr })} – ${format(end, 'dd/MM/yyyy', { locale: fr })})`,
      start: new Date(current),
      end: new Date(end),
    });
    current = addWeeks(current, 1);
  }
  return weeks.reverse(); // les plus récentes en premier
}
import { createEcadastrePageUrl } from '@/lib/ecadastrePageUrl';
import CommuneGrid from '@/components/ecadastre/collecte/CommuneGrid';
import { useOfflineSync } from '@/components/ecadastre/offline/useOfflineSync';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { COLLECTE_LIST_FIELDS } from '@/utils/ecadastre/collectePhotos';

export default function MesCollectes() {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 500;
  const [adminOrg, setAdminOrg] = useState('');
  const [adminCommune, setAdminCommune] = useState('');
  const [filters, setFilters] = useState({ section: '', nature: '', quartier: '', statut: '', semaine: '' });
  const weekOptions = useMemo(() => getWeekOptions(), []);
  const { pendingCount } = useOfflineSync();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const orgIdFromUrl = urlParams.get('organisation_id');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Application interne : l'organisation est toujours celle du cabinet
  const { data: cabinet } = useCabinetOrg();
  const activeOrgId = resolveOrgId(orgIdFromUrl || adminOrg, user, cabinet);

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ['collectes'] });
  };

  const { data: superviseurOrg } = useQuery({
    queryKey: ['org-superviseur', activeOrgId],
    queryFn: () => base44.entities.Organisation.filter({ id: activeOrgId }),
    enabled: !!user && user.role === 'superviseur' && !!activeOrgId,
    select: (data) => data?.[0],
  });

  const superviseurCommunes = useMemo(() => {
    if (!user || user.role !== 'superviseur') return [];
    return [...(superviseurOrg?.communes || [])].sort();
  }, [user, superviseurOrg]);

  const effectiveCommune = adminCommune;

  const isAgent = !!user && user.role !== 'admin' && user.role !== 'superviseur';

  const canShowData = isAgent
    || (user?.role === 'superviseur' && !!effectiveCommune)
    || (user?.role === 'admin' && !!activeOrgId && !!effectiveCommune);

  const agentEnabled = !!user && isAgent;
  const superviseurEnabled = !!user && user.role === 'superviseur' && !!effectiveCommune;
  const adminEnabled = !!user && user.role === 'admin' && !!activeOrgId && !!effectiveCommune;
  const queryEnabled = agentEnabled || superviseurEnabled || adminEnabled;

  const { data: convocations = [] } = useQuery({
    queryKey: ['convocations', user?.organisation_id, effectiveCommune, activeOrgId],
    queryFn: async () => {
      if (!user) return [];
      const filterObj = { statut: 'active' };
      if (activeOrgId) filterObj.organisation_id = activeOrgId;
      if (effectiveCommune) filterObj.commune = effectiveCommune;
      return await base44.entities.ConvocationParcelle.filter(filterObj, '-created_date', 500);
    },
    enabled: queryEnabled,
  });

  const { data: collectesAll = [], isLoading, isFetching } = useQuery({
    queryKey: ['collectes', user?.id, user?.organisation_id, user?.role, effectiveCommune, activeOrgId],
    queryFn: async () => {
      if (!user) return [];
      const filterObj = {};
      if (user.role === 'admin') {
        if (activeOrgId) filterObj.organisation_id = activeOrgId;
        if (effectiveCommune) filterObj.commune = effectiveCommune;
      } else if (user.role === 'superviseur') {
        if (activeOrgId) filterObj.organisation_id = activeOrgId;
        if (effectiveCommune) filterObj.commune = effectiveCommune;
      } else {
        // agent terrain : ses propres collectes
        filterObj.created_by_id = user.id;
      }
      let all = [];
      let offset = 0;
      while (true) {
        const batch = await base44.entities.Collecte.filter(filterObj, '-created_date', PAGE_SIZE, offset, COLLECTE_LIST_FIELDS);
        all = all.concat(batch);
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return all;
    },
    enabled: queryEnabled,
    retry: 1,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000,
  });

  const collectes = Array.isArray(collectesAll) ? collectesAll : [];

  const { data: organisations = [] } = useQuery({
    queryKey: ['organisations'],
    queryFn: () => base44.entities.Organisation.list(),
    enabled: user?.role === 'admin',
  });

  const activeOrg = organisations.find(o => o.id === activeOrgId) || cabinet;

  const adminCommunesDisponibles = useMemo(() => {
    if (user?.role !== 'admin') return [];
    if (activeOrg) return [...(activeOrg.communes || [])].sort();
    return [];
  }, [user, activeOrg]);

  // Chargement initial
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
      </div>
    );
  }

  const getProprietaireName = (collecte) => {
    if (collecte.type_proprietaire === 'societe') return collecte.societe_raison_sociale || '';
    const nom = collecte.prop_nom || '';
    const prenoms = collecte.prop_prenoms || '';
    return [prenoms, nom].filter(Boolean).join(' ');
  };

  const filteredCollectes = collectes.filter(c => {
    const matchSection = !filters.section || c.section === filters.section;
    const matchNature = !filters.nature || c.nature === filters.nature;
    const matchQuartier = !filters.quartier || c.quartier === filters.quartier;
    const matchStatut = !filters.statut || c.statut === filters.statut;
    let matchSemaine = true;
    if (filters.semaine) {
      const week = weekOptions.find(w => w.value === filters.semaine);
      if (week && c.created_date) {
        const d = new Date(c.created_date);
        matchSemaine = d >= week.start && d < week.end;
      } else {
        matchSemaine = false;
      }
    }
    return matchSection && matchNature && matchQuartier && matchStatut && matchSemaine;
  });

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'brouillon': return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Brouillon</Badge>;
      case 'validee': return <Badge className="bg-green-100 text-green-800">Validée</Badge>;
      case 'complete': return <Badge className="bg-amber-100 text-amber-800">Complète</Badge>;
      default: return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const availableSections = [...new Set(collectes.map(c => c.section).filter(Boolean))].sort();
  const availableNatures = [...new Set(collectes.map(c => c.nature).filter(Boolean))].sort();
  const availableQuartiers = [...new Set(collectes.map(c => c.quartier).filter(Boolean))].sort();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20 md:pb-0">
        {/* Header */}
        <div className="text-slate-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
            <Button
              onClick={() => navigate(createEcadastrePageUrl('Accueil'))}
              className="!hidden"
            >
              <ChevronLeft className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold flex-1 min-w-0 truncate">
              {isAgent ? 'Mes collectes' : 'Collectes'}
            </h1>
            <div className="w-9 sm:w-10"></div>
          </div>
        </div>

        {/* Sélecteur commune superviseur */}
        {user?.role === 'superviseur' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <CommuneGrid
                communes={superviseurCommunes}
                orgId={activeOrgId}
                value={adminCommune}
                onChange={v => { setAdminCommune(v); setPage(1); setFilters({ section: '', nature: '', quartier: '', statut: '', semaine: '' }); }}
              />
            </div>
          </div>
        )}

        {/* Sélecteur de commune (admin) */}
        {user?.role === 'admin' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <CommuneGrid
                communes={adminCommunesDisponibles}
                orgId={activeOrgId}
                value={adminCommune}
                onChange={v => { setAdminCommune(v); setPage(1); setFilters({ section: '', nature: '', quartier: '', statut: '', semaine: '' }); }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {!canShowData && user?.role === 'admin' && (
            <p className="text-center text-slate-400 italic text-sm py-8">
              Sélectionnez une commune pour afficher les collectes.
            </p>
          )}
          {!canShowData && user?.role === 'superviseur' && (
            <p className="text-center text-slate-400 italic text-sm py-8">
              Sélectionnez une commune pour afficher les collectes.
            </p>
          )}
          {canShowData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-100 to-blue-200">
                  <CardContent className="p-3 sm:p-6 text-center">
                    <p className="text-2xl sm:text-4xl font-bold text-blue-700">{filteredCollectes.length}</p>
                    <p className="text-xs sm:text-sm text-blue-600 mt-1 font-semibold">Total</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-gradient-to-br from-amber-100 to-amber-200">
                  <CardContent className="p-3 sm:p-6 text-center">
                    <p className="text-2xl sm:text-4xl font-bold text-amber-700">
                      {filteredCollectes.filter(c => c.statut === 'brouillon').length}
                    </p>
                    <p className="text-xs sm:text-sm text-amber-600 mt-1 font-semibold">Brouillons</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-gradient-to-br from-green-100 to-green-200">
                  <CardContent className="p-3 sm:p-6 text-center">
                    <p className="text-2xl sm:text-4xl font-bold text-green-700">
                      {filteredCollectes.filter(c => c.statut === 'validee').length}
                    </p>
                    <p className="text-xs sm:text-sm text-green-600 mt-1 font-semibold">Validées</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-100 to-purple-200">
                  <CardContent className="p-3 sm:p-6 text-center">
                    <p className="text-2xl sm:text-4xl font-bold text-purple-700">{convocations.length}</p>
                    <p className="text-xs sm:text-sm text-purple-600 mt-1 font-semibold">Convocations</p>
                  </CardContent>
                </Card>
              </div>
              {pendingCount > 0 && (
                <div className="mt-4 flex justify-center">
                  <Link to={createEcadastrePageUrl('SyncOffline')}>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-semibold flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      <span>{pendingCount} à synchroniser</span>
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filters & List */}
        {canShowData && (
          <>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quartier</label>
                  <Select value={filters.quartier} onValueChange={(value) => setFilters({ ...filters, quartier: value === '__all__' ? '' : value })}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Tous les quartiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les quartiers</SelectItem>
                      {availableQuartiers.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Section</label>
                  <Select value={filters.section} onValueChange={(value) => setFilters({ ...filters, section: value === '__all__' ? '' : value })}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Toutes les sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes les sections</SelectItem>
                      {availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nature</label>
                  <Select value={filters.nature} onValueChange={(value) => setFilters({ ...filters, nature: value === '__all__' ? '' : value })}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Toutes les natures" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes les natures</SelectItem>
                      {availableNatures.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                  <Select value={filters.statut} onValueChange={(value) => setFilters({ ...filters, statut: value === '__all__' ? '' : value })}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les types</SelectItem>
                      <SelectItem value="brouillon">Brouillon</SelectItem>
                      <SelectItem value="complete">Complète</SelectItem>
                      <SelectItem value="validee">Validée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col col-span-2 sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Semaine</label>
                  <Select value={filters.semaine} onValueChange={(value) => setFilters({ ...filters, semaine: value === '__all__' ? '' : value })}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Toutes les semaines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes les semaines</SelectItem>
                      {weekOptions.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(filters.section || filters.nature || filters.quartier || filters.statut || filters.semaine) && (
                <div className="flex justify-start mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ section: '', nature: '', quartier: '', statut: '', semaine: '' })}
                    className="text-blue-800 border-blue-800 hover:bg-blue-50"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>

            {/* Liste */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
                </div>
              ) : filteredCollectes.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucune collecte</h3>
                    <p className="text-slate-500 mb-6">Commencez par créer votre première collecte</p>
                    <Link to={createEcadastrePageUrl('NouvelleCollecte')}>
                      <Button className="bg-blue-800 hover:bg-blue-900">
                        <Plus className="w-5 h-5 mr-2" />
                        Créer une collecte
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {filteredCollectes.slice(0, showAll ? filteredCollectes.length : 20).map((collecte) => (
                    <Link
                      key={collecte.id}
                      to={createEcadastrePageUrl('DetailCollecte') + `?id=${collecte.id}`}
                      className="block mb-2"
                    >
                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white rounded-lg">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-800 font-bold text-xs">
                                    {(collecte.commune || 'C')[0].toUpperCase()}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm">
                                  {collecte.commune || 'Commune non renseignée'}
                                </h3>
                              </div>
                              <div className="flex flex-col items-start gap-1.5 text-xs text-slate-600 pl-10">
                                <div className="flex items-center gap-1">
                                  {collecte.type_proprietaire === 'societe' ? (
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  <span className="text-xs truncate">{getProprietaireName(collecte)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-xs">
                                    {collecte.created_date ? format(new Date(collecte.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                                  </span>
                                </div>
                                {collecte.quartier && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs">{collecte.quartier}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(collecte.statut)}
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {filteredCollectes.length > 20 && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAll(!showAll)}
                        className="w-full sm:w-auto border-blue-800 text-blue-800 hover:bg-blue-50"
                      >
                        {showAll ? (
                          <>Voir moins <ChevronRight className="w-4 h-4 ml-2 -rotate-90" /></>
                        ) : (
                          <>Voir tout ({filteredCollectes.length} collectes) <ChevronRight className="w-4 h-4 ml-2 rotate-90" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}