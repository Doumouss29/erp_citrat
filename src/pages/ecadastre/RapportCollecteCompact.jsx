import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCabinetOrg, resolveOrgId } from '@/lib/ecadastreCabinet';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronLeft, Download, Filter, MapPin, Calendar } from 'lucide-react';
import ExportDataModal from '@/components/ecadastre/collecte/ExportDataModal';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createEcadastrePageUrl } from '@/lib/ecadastrePageUrl';
import ReportFilters from '@/components/ecadastre/collecte/ReportFilters';

function getWeekOptions() {
  const options = [];
  const today = new Date();
  const projectStart = new Date('2026-03-30'); // Lundi 30 mars 2026 - début S14
  const firstWeekStart = startOfWeek(projectStart, { weekStartsOn: 1 });
  let i = 0;
  while (true) {
    const ref = subWeeks(today, i);
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    const end = endOfWeek(ref, { weekStartsOn: 1 });
    if (start < firstWeekStart) break;
    const label = i === 0
      ? `Semaine en cours (${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM', { locale: fr })})`
      : `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM', { locale: fr })} (S${format(start, 'w', { locale: fr })})`;
    options.push({ value: `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`, label, start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
    i++;
  }
  return options;
}

const WEEK_OPTIONS = getWeekOptions();

export default function RapportCollecteCompact() {
  const navigate = useNavigate();
  const [filteredCollectes, setFilteredCollectes] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const urlParams = new URLSearchParams(window.location.search);
  const shouldPrint = urlParams.get('print') === 'true';
  const orgIdFromUrl = urlParams.get('organisation_id');

  const getNatureOccupationLabel = (val) => {
    const map = {
      'proprietaire': 'LOCAL OCCUPÉ PAR LE PROPRIÉTAIRE',
      'usine': 'USINE',
      'local_commercial': 'LOCAL COMMERCIAL',
      'local_professionnel': 'LOCAL PROFESSIONNEL OU ATELIER',
      'entrepot': 'ENTREPÔT',
      'habitation_louee': 'HABITATION LOUÉE',
      'inoccupe': 'LOCAL INOCCUPÉ',
      '1': 'LOCAL OCCUPÉ PAR LE PROPRIÉTAIRE',
      '2': 'USINE',
      '5': 'LOCAL COMMERCIAL',
      '6': 'LOCAL PROFESSIONNEL OU ATELIER',
      '7': 'ENTREPÔT',
      '8': 'HABITATION LOUÉE',
      '0': 'LOCAL INOCCUPÉ',
    };
    return map[val] || val || '';
  };

  const formatNature = (nature) => {
    if (!nature) return '';
    return nature.toLowerCase() === 'battie' ? 'BÂTIE' : nature;
  };

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Application interne : organisation du cabinet par défaut
  const { data: cabinet } = useCabinetOrg();
  const fallbackOrgId = resolveOrgId(orgIdFromUrl, user, cabinet);

  const { data: selectedOrg } = useQuery({
    queryKey: ['organisation', fallbackOrgId],
    queryFn: () => base44.entities.Organisation.filter({ id: fallbackOrgId }).then(r => r?.[0]),
    enabled: !!fallbackOrgId,
  });

  const weekParts = selectedWeek ? selectedWeek.split('_') : null;
  const dateDebut = weekParts?.[0] || '';
  const dateFin = weekParts?.[1] || '';
  const filtersReady = !!selectedCommune && !!selectedWeek;

  const communesDisponibles = useMemo(() => {
    if (!user) return [];
    if (user.role === 'superviseur' && user.communes_supervisees?.length > 0) return user.communes_supervisees;
    return selectedOrg?.communes || [];
  }, [user, selectedOrg]);

  const orgId = fallbackOrgId;

  const { data: collectes, isLoading } = useQuery({
    queryKey: ['collectes-compact', orgId, selectedCommune, dateDebut, dateFin],
    queryFn: async () => {
      if (!user || !selectedCommune || !dateDebut) return [];
      const filter = { commune: selectedCommune, date_collecte: { $gte: dateDebut, $lte: dateFin } };
      if (orgId) filter.organisation_id = orgId;
      let all = [];
      let offset = 0;
      while (true) {
        const batch = await base44.entities.Collecte.filter(filter, '-date_collecte', 500, offset);
        all = all.concat(batch);
        if (batch.length < 500) break;
        offset += 500;
      }
      return all;
    },
    enabled: !userLoading && !!user && filtersReady,
  });

  // Compteurs par commune (fiches / validées / brouillons) pour le tableau de bord
  const { data: totalByCommune = { rows: [] } } = useQuery({
    queryKey: ['collecte-total-commune', orgId, communesDisponibles],
    queryFn: () => base44.entities.Collecte.aggregate({
      query: { ...(orgId ? { organisation_id: orgId } : {}), commune: { $in: communesDisponibles } },
      groupBy: 'commune'
    }),
    enabled: communesDisponibles.length > 0,
  });

  const { data: valideeByCommune = { rows: [] } } = useQuery({
    queryKey: ['collecte-validee-commune', orgId, communesDisponibles],
    queryFn: () => base44.entities.Collecte.aggregate({
      query: { ...(orgId ? { organisation_id: orgId } : {}), commune: { $in: communesDisponibles }, statut: 'validee' },
      groupBy: 'commune'
    }),
    enabled: communesDisponibles.length > 0,
  });

  const { data: brouillonByCommune = { rows: [] } } = useQuery({
    queryKey: ['collecte-brouillon-commune', orgId, communesDisponibles],
    queryFn: () => base44.entities.Collecte.aggregate({
      query: { ...(orgId ? { organisation_id: orgId } : {}), commune: { $in: communesDisponibles }, statut: 'brouillon' },
      groupBy: 'commune'
    }),
    enabled: communesDisponibles.length > 0,
  });

  const communeStats = useMemo(() => {
    const totalMap = {};
    const valMap = {};
    const brouMap = {};
    (totalByCommune?.rows || []).forEach(r => { totalMap[r.commune] = r.count; });
    (valideeByCommune?.rows || []).forEach(r => { valMap[r.commune] = r.count; });
    (brouillonByCommune?.rows || []).forEach(r => { brouMap[r.commune] = r.count; });
    return communesDisponibles.map(c => ({
      nom: c,
      fiches: totalMap[c] || 0,
      validees: valMap[c] || 0,
      brouillons: brouMap[c] || 0,
    }));
  }, [communesDisponibles, totalByCommune, valideeByCommune, brouillonByCommune]);

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @page { 
        size: A4; 
        margin: 12mm;
      }
      @media print {
        .print-hide { display: none !important; }
        body { margin: 0; padding: 0; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        @page { margin: 0; }
        html { margin: 0; }
      }
    `;
    document.head.appendChild(style);
    document.title = '';
    return () => document.head.removeChild(style);
  }, []);


  React.useEffect(() => {
    if (collectes && collectes.length > 0) {
      const ids = urlParams.get('ids');
      if (ids) {
        const idList = ids.split(',');
        setFilteredCollectes(collectes.filter(c => idList.includes(c.id)));
      } else {
        setFilteredCollectes(collectes);
      }
    }
  }, [collectes, shouldPrint]);

  React.useEffect(() => {
    if (shouldPrint && filteredCollectes && filteredCollectes.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [shouldPrint, filteredCollectes]);

  const handlePrint = () => {
    const ids = filteredCollectes.map(c => c.id).join(',');
    navigate(`${createEcadastrePageUrl('RapportCollecteCompact')}?print=true&ids=${ids}`);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
      </div>
    );
  }

  if (!filtersReady) {
    const communeSelected = !!selectedCommune;
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="text-slate-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
            {/* Retour uniquement pour revenir à la liste des communes (la navigation de l'application remplace le retour à l'accueil) */}
            <Button
              onClick={() => setSelectedCommune('')}
              className={`${communeSelected ? '' : '!hidden '}bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 w-10 sm:w-auto sm:px-4 p-0 flex items-center justify-center flex-shrink-0`}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold flex-1 min-w-0 truncate">Rapport Compact</h1>
            <div className="w-9 sm:w-24 flex-shrink-0"></div>
          </div>
        </div>

        {!communeSelected ? (
          /* Tableau de bord — cartes de communes */
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700 mb-6">
                Choisir une commune <span className="text-red-500">*</span>
              </p>
              {communesDisponibles.length === 0 ? (
                <p className="text-center text-sm text-slate-400 italic py-8">
                  Aucune commune n'est encore configurée (Administration › Communes).
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {communeStats.map((c) => (
                    <button
                      key={c.nom}
                      onClick={() => setSelectedCommune(c.nom)}
                      className="text-left bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-purple-600" />
                        </span>
                        <h3 className="text-lg font-bold text-slate-800">{c.nom}</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center px-1">
                          <div className="text-2xl font-bold text-slate-800">{c.fiches}</div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">Fiches</div>
                        </div>
                        <div className="text-center bg-green-50 rounded-lg py-2">
                          <div className="text-2xl font-bold text-green-600">{c.validees}</div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">Validées</div>
                        </div>
                        <div className="text-center bg-amber-50 rounded-lg py-2">
                          <div className="text-2xl font-bold text-amber-700">{c.brouillons}</div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">Brouillons</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-center text-xs text-slate-400 italic mt-6">
                Sélectionnez une commune pour afficher les collectes.
              </p>
            </div>
          </div>
        ) : (
          /* Semaine — cartes cliquables */
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Commune sélectionnée</p>
                  <h3 className="text-lg font-bold text-slate-800 uppercase">{selectedCommune}</h3>
                </div>
              </div>
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700 mb-6">
                Choisir une semaine <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {WEEK_OPTIONS.map((w, i) => (
                  <button
                    key={w.value}
                    onClick={() => setSelectedWeek(w.value)}
                    className={`text-left bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 ${
                      selectedWeek === w.value
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        i === 0 ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Calendar className={`w-4 h-4 ${i === 0 ? 'text-green-600' : 'text-blue-600'}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {i === 0 ? 'Semaine en cours' : `Semaine ${w.label.match(/S(\d+)/)?.[1] || ''}`}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {w.label.replace(/\(S\d+\)/, '').replace('Semaine en cours ', '').replace(/[()]/g, '').trim() || w.label}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-400 italic mt-6">
                Sélectionnez une semaine pour afficher les données.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
      </div>
    );
  }

  if (!collectes || collectes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
            <Button onClick={() => { setSelectedCommune(''); setSelectedWeek(''); }} className="bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 w-10 sm:w-auto sm:px-4 p-0 flex items-center justify-center flex-shrink-0">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" /><span className="hidden sm:inline">Retour</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold flex-1 min-w-0 truncate">Rapport Compact</h1>
            <div className="w-9 sm:w-24 flex-shrink-0"></div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pt-16 flex flex-col items-center gap-4">
          <p className="text-slate-600 text-center">Aucune collecte validée pour <strong>{selectedCommune}</strong> sur cette semaine.</p>
          <Button variant="outline" onClick={() => { setSelectedCommune(''); setSelectedWeek(''); }}>Changer les filtres</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="print-hide text-slate-900">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              onClick={() => { setSelectedCommune(''); setSelectedWeek(''); setFilteredCollectes([]); }}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 h-9 w-9 sm:h-10 sm:w-auto sm:px-4 p-0 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold flex-1 min-w-0 truncate">Rapport Compact</h1>
            {user?.role === 'admin' && (
              <Button
                onClick={() => setIsExportModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white h-9 px-3 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Export</span>
              </Button>
            )}
            {user?.role !== 'admin' && <div className="w-9 sm:w-10"></div>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="print-hide max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <ReportFilters collectes={collectes} onFilter={setFilteredCollectes} onPrint={handlePrint} />
      </div>

      {user?.role === 'admin' && collectes && (
        <ExportDataModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          collectes={collectes}
        />
      )}

      {/* Reports */}
      <div className="max-w-[210mm] mx-auto bg-white sm:max-w-[210mm]">
        {filteredCollectes.map((collecte, index) => (
          <div key={collecte.id} className="text-black" style={{fontSize: '12px', fontFamily: 'Times New Roman, serif', pageBreakBefore: index > 0 ? 'always' : 'auto'}}>
            {/* PAGE 1 */}
            <div className="page p-4 sm:p-8">
              {/* Header */}
              <div className="border border-black p-2 mb-2 text-center">
                <div className="font-bold text-base tracking-wide">MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</div>
                <div className="text-xs font-bold mt-1">DIRECTION GÉNÉRALE DES IMPÔTS<br/>DIRECTION DU CADASTRE</div>
                <div className="text-xs mt-1">TEL 22 - 68 - 97 / 21 - 84 - 67</div>
              </div>

              {/* Info Parcelle */}
              <div className="border border-black mb-1.5 sm:mb-2">
                <div className="p-1.5 text-center font-bold uppercase border-b border-black">
                  OPÉRATION DE RECENSEMENT DES PROPRIÉTAIRES FONCIERS
                </div>
                <div className="p-1.5 sm:p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs">
                  <div className="flex gap-2"><span>Commune :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.commune || ''}</span></div>
                  <div className="flex gap-2"><span>Section :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.section || ''}</span></div>
                  <div className="flex gap-2"><span>Parcelle :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.parcelle || ''}</span></div>
                  <div className="flex gap-2"><span>Code exemption :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.code_exemption || ''}</span></div>
                  <div className="flex gap-2"><span>Année ACQ :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.annee_acq || ''}</span></div>
                  <div className="flex gap-2"><span>Nature :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{formatNature(collecte.nature)}</span></div>
                  <div className="flex gap-2"><span>Surf. imposable :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.surface_imposable || ''}</span></div>
                  <div className="flex gap-2"><span>Val. vénale :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.valeur_venale || ''}</span></div>
                  <div className="flex gap-2"><span>Code VV :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.code_vv || ''}</span></div>
                  <div className="flex gap-2"><span>Quartier :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.quartier || ''}</span></div>
                  <div className="flex gap-2"><span>Code quartier :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.code_quartier || ''}</span></div>
                  <div className="flex gap-2"><span>T.F. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.tf || ''}</span></div>
                  <div className="flex gap-2"><span>Lot :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.lot || ''}</span></div>
                  <div className="flex gap-2"><span>Ilot :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.ilot || ''}</span></div>
                  <div className="flex gap-2"><span>N° Appart. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.num_appartement || ''}</span></div>
                  <div className="flex gap-2"><span>Niveau appart. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.niveau_appartement || ''}</span></div>
                  <div className="flex gap-2"><span>Latitude (Y) :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.latitude || ''}</span></div>
                  <div className="flex gap-2"><span>Longitude (X) :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.longitude || ''}</span></div>
                  <div></div>
                </div>
                <table className="w-full border-collapse" style={{borderTop: '1px solid black'}}>
                  <tbody>
                    <tr>
                      <td style={{width: '60%', borderRight: '1px solid black', padding: '6px 4px'}}></td>
                      <td className="text-xs font-bold" style={{width: '40%', padding: '6px 6px'}}>
                        <div style={{display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap'}}>
                          <span>DGI IN 99 –</span>
                          <span>{collecte.reference_dgi || '000001'}</span>
                          <span style={{flex: 1, borderBottom: '1px dotted black', display: 'inline-block', minWidth: '60px'}}></span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 1 - Propriétaire */}
              <div className="py-0.5 sm:py-1 font-bold uppercase text-xs sm:text-sm mb-0.5 sm:mb-1">
                1 - RENSEIGNEMENTS CONCERNANT LE PROPRIÉTAIRE
              </div>

              {/* Particulier */}
              <div className="text-xs font-bold mb-0.5 sm:mb-1">a) Si le propriétaire est un particulier</div>
              <div className="border border-black p-1.5 sm:p-2 mb-1.5 sm:mb-2">
                <div className="flex justify-between mb-2">
                <span className="font-bold">Identité du propriétaire</span>
                <div className="flex gap-2 text-xs">
                  <span>N° compte contribuable :</span>
                  <span className="border-b border-dotted border-black font-bold uppercase" style={{minWidth: '150px'}}>{collecte.prop_compte_contribuable || ''}</span>
                </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                <div className="flex gap-1 sm:gap-2"><span className="min-w-fit">Nom :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_nom || ''}</span></div>
                <div className="flex gap-2"><span>Prénoms :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_prenoms || ''}</span></div>
                <div className="flex gap-2"><span>Date naissance :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_date_naissance || ''}</span></div>
                <div className="flex gap-2"><span>Lieu naissance :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_lieu_naissance || ''}</span></div>
                <div className="flex gap-2"><span>Sous-Préfecture :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_sous_prefecture || ''}</span></div>
                <div className="flex gap-2"><span>Pays :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_pays || ''}</span></div>
                <div className="flex gap-2"><span>N° carte identité :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_carte_identite || ''}</span></div>
                <div className="flex gap-2"><span>Nationalité :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_nationalite || ''}</span></div>
                <div className="flex gap-2"><span>Autre pièce :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_autre_piece || ''}</span></div>
                <div className="flex gap-2"><span>N° :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_autre_piece_numero || ''}</span></div>
                <div className="flex gap-2"><span>Nom Père :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_nom_pere || ''}</span></div>
                <div className="flex gap-2"><span>Nom Mère :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_nom_mere || ''}</span></div>
                </div>
              </div>

              {/* Adresse résidence */}
              <div className="border border-black p-1.5 sm:p-2 mb-1.5 sm:mb-2">
                <div className="font-bold text-xs mb-1">Adresse de résidence</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                  <div className="flex gap-2"><span>Adresse postale :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_adresse_postale || ''}</span></div>
                  <div className="flex gap-2"><span>B.P. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_bp || ''}</span></div>
                  <div className="flex gap-2"><span>Ville :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_ville || ''}</span></div>
                  <div className="flex gap-2"><span>Tél. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_tel || ''}</span></div>
                  <div className="flex gap-2"><span>Quartier :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_quartier_residence || ''}</span></div>
                  <div className="flex gap-2"><span>T.F. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_adresse_tf || ''}</span></div>
                  <div className="flex gap-2"><span>Informations complémentaires :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prop_infos_complementaires || ''}</span></div>
                  <div></div>
                </div>
              </div>

              {/* Situation famille + Profession */}
              <div className="border border-black p-1.5 sm:p-2 mb-1.5 sm:mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <div className="font-bold text-xs mb-1">Situation de famille (1)</div>
                    <div className="text-xs font-bold uppercase">{collecte.situation_familiale || ''}</div>
                  </div>
                  <div>
                    <div className="font-bold text-xs mb-1">Nombre d'enfants à charge (2) :</div>
                    <div className="border-b border-dotted border-black text-xs font-bold uppercase">{collecte.nombre_enfants || ''}</div>
                  </div>
                </div>
              </div>

              <div className="border border-black p-1.5 sm:p-2 mb-1.5 sm:mb-2">
                <div className="font-bold text-xs mb-1">Adresse professionnelle</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                  <div className="flex gap-2"><span>Profession :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_profession || ''}</span></div>
                  <div className="flex gap-2"><span>Service employeur :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_service_employeur || ''}</span></div>
                  <div className="flex gap-2"><span>Adresse postale :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_adresse_postale || ''}</span></div>
                  <div className="flex gap-2"><span>B.P. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_bp || ''}</span></div>
                  <div className="flex gap-2"><span>Ville :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_ville || ''}</span></div>
                  <div className="flex gap-2"><span>Tél. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_tel || ''}</span></div>
                  <div className="flex gap-2"><span>Quartier :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.prof_quartier || ''}</span></div>
                  <div></div>
                </div>
              </div>

              {/* Footer - Signature Propriétaire Particulier */}
              {collecte.type_proprietaire === 'particulier' && (
              <div className="mt-4 text-xs">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span>Date :</span>
                    <span>
                      {collecte.prop_signature_date ? (() => { try { const d = new Date(collecte.prop_signature_date); return isNaN(d) ? '' : format(d, 'dd/MM/yyyy'); } catch { return ''; } })() : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <div>Signature,</div>
                    {collecte.prop_photo_signature && (
                      <div className="my-2 flex justify-end">
                        <img src={collecte.prop_photo_signature} alt="Signature" className="max-h-[35px] max-w-[150px] h-auto w-auto" />
                      </div>
                    )}
                    <div className="mb-4">
                      {collecte.prop_signature || ''}
                    </div>
                  </div>
                </div>
                  </div>
                  )}
            </div>

            {/* PAGE 2 */}
            <div className="page p-4 sm:p-8">
              {/* Société */}
              <div className="text-xs font-bold mb-0.5 sm:mb-1">b) Si le propriétaire est une société ou autre personne morale ou une entreprise individuelle (3)</div>
              <div className="border border-black p-1.5 sm:p-2 mb-1.5 sm:mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                  <div className="flex gap-2"><span>Nom ou raison sociale :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_raison_sociale || ''}</span></div>
                  <div className="flex gap-2"><span>N° Compte contribuable :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_compte_contribuable || ''}</span></div>
                  <div className="flex gap-2"><span>N° Registre de Commerce :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_registre_commerce || ''}</span></div>
                  <div className="flex gap-2"><span>Tél. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_tel || ''}</span></div>
                  <div className="flex gap-2"><span>Adresse postale :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_adresse_postale || ''}</span></div>
                  <div className="flex gap-2"><span>B.P. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_bp || ''}</span></div>
                  <div className="flex gap-2"><span>Ville :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_ville || ''}</span></div>
                  <div className="flex gap-2"><span>Quartier :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_quartier || ''}</span></div>
                  <div className="flex gap-2"><span>Ilot :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_ilot || ''}</span></div>
                  <div className="flex gap-2"><span>Lot :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_lot || ''}</span></div>
                  <div className="flex gap-2"><span>T.F. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.societe_tf || ''}</span></div>
                  <div></div>
                </div>
              </div>

              {/* Footer - Signature Propriétaire Société */}
              {collecte.type_proprietaire === 'societe' && (
              <div className="mt-4 text-xs">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span>Date :</span>
                    <span>
                      {(() => { const safeFormat = (d) => { try { const dt = new Date(d); return isNaN(dt) ? '' : format(dt, 'dd/MM/yyyy'); } catch { return ''; } }; return safeFormat(collecte.societe_signature_date) || safeFormat(collecte.prop_signature_date); })()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div>Signature,</div>
                    {(collecte.societe_photo_signature || collecte.prop_photo_signature) && (
                      <div className="my-2 flex justify-end">
                        <img src={collecte.societe_photo_signature || collecte.prop_photo_signature} alt="Signature" className="max-h-[35px] max-w-[150px] h-auto w-auto" />
                      </div>
                    )}
                    <div className="mb-4">
                      {collecte.societe_signature || collecte.prop_signature || ''}
                    </div>
                  </div>
                </div>
                  </div>
                  )}

              <div className="py-0.5 sm:py-1 font-bold uppercase text-xs sm:text-sm mb-1 sm:mb-2">
                2 - RENSEIGNEMENTS CONCERNANT LE BIEN
              </div>

              <div className="border border-black p-1.5 sm:p-2">
                <div className="flex gap-2 text-xs mb-2">
                  <span>Description de l'immeuble :</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>

                <div className="flex gap-2 text-xs mb-3">
                  <span>Nature du local (4) :</span>
                  <span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.bien_nature_local || ''}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs mb-2 sm:mb-3">
                  <div className="flex gap-1 sm:gap-2">
                    <span className="min-w-fit">Le local est-il équipé d'eau ?</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold uppercase">{collecte.bien_equipe_eau ? 'Oui' : 'Non'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>d'électricité ?</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold uppercase">{collecte.bien_equipe_electricite ? 'Oui' : 'Non'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>Nombre de niveaux :</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold uppercase">{collecte.bien_nombre_niveaux || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>Nombre de bâtiments :</span>
                    <span className="border-b border-dotted border-black flex-1 font-bold uppercase">{collecte.bien_nombre_batiments || ''}</span>
                  </div>
                </div>

                <div className="text-xs font-bold mb-1 sm:mb-2">Préciser (5) :</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs mb-2 sm:mb-3">
                  <div>- Année d'achèvement des travaux : <span className="border-b border-dotted border-black font-bold uppercase">{collecte.bien_annee_achevement || ''}</span></div>
                  <div>- Nature de l'occupation : <span className="border-b border-dotted border-black font-bold uppercase">{getNatureOccupationLabel(collecte.bien_nature_occupation)}</span></div>
                  <div>- Valeur locative mensuelle : <span className="border-b border-dotted border-black font-bold uppercase">{collecte.bien_valeur_locative_mensuelle || ''}</span></div>
                  <div>- Nombre de pièces : <span className="border-b border-dotted border-black font-bold uppercase">{collecte.bien_nombre_pieces || ''}</span></div>
                </div>

                <div className="mt-8 text-right text-xs">
                  <div style={{marginBottom: '10px'}}>Nom et signature de l'Agent recenseur</div>
                  {collecte.signature_agent_photo && (
                    <div style={{marginBottom: '5px', display: 'flex', justifyContent: 'flex-end'}}>
                      <img src={collecte.signature_agent_photo} alt="Signature" style={{maxHeight: '40px', maxWidth: '150px'}} />
                    </div>
                  )}
                  <div style={{minWidth: '200px', display: 'inline-block'}}>
                    {collecte.signature_agent || ''}
                  </div>
                </div>
              </div>
            </div>

            {/* PAGE 3 */}
            <div className="page p-4 sm:p-8">
              <div className="py-1 font-bold uppercase text-sm mb-4">
                3 - TABLEAU DE SYNTHÈSE
              </div>

              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="font-bold">
                    <th className="border border-black p-2 text-left">AN. ACH. TRAV.</th>
                    <th className="border border-black p-2 text-left">NATURE DE L'OCCUPATION (6)</th>
                    <th className="border border-black p-2 text-left">VAL. LOCAT. AN.</th>
                    <th className="border border-black p-2 text-left">NB. PIECES</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length: 8}).map((_, i) => {
                    const row = collecte.tableau_synthese?.[i];
                    return (
                      <tr key={i} style={{height: '18mm'}}>
                        <td className="border border-black p-2 font-bold uppercase">{row?.annee_achevement || ''}</td>
                        <td className="border border-black p-2 font-bold uppercase">{getNatureOccupationLabel(row?.nature_occupation)}</td>
                        <td className="border border-black p-2 font-bold uppercase">{row?.valeur_locative_annuelle || ''}</td>
                        <td className="border border-black p-2 font-bold uppercase">{row?.nombre_pieces || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGE 4 */}
            <div className="page p-4 sm:p-8">
              <div className="py-1 font-bold uppercase text-sm mb-4">
                4 - GESTION <span className="text-xs normal-case">(si le bien est géré par une Agence, un huissier ou autre)</span>
              </div>

              <div className="border border-black p-1.5 sm:p-2 mb-2 sm:mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                  <div className="flex gap-2"><span>Nom / raison sociale de l'Agence :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_raison_sociale || ''}</span></div>
                  <div className="flex gap-2"><span>N° Compte contribuable :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_compte_contribuable || ''}</span></div>
                  <div className="flex gap-2"><span>Adresse postale :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_adresse_postale || ''}</span></div>
                  <div className="flex gap-2"><span>B.P. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_bp || ''}</span></div>
                  <div className="flex gap-2"><span>Ville :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_ville || ''}</span></div>
                  <div className="flex gap-2"><span>Tél. :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_tel || ''}</span></div>
                  <div className="flex gap-2"><span>Quartier :</span><span className="flex-1 border-b border-dotted border-black font-bold uppercase">{collecte.agence_quartier || ''}</span></div>
                  <div></div>
                </div>
              </div>

              <div className="text-xs leading-relaxed" style={{marginTop: '10px'}}>
                <div>(1) Mettre une croix dans la case correspondant à votre disposition ;</div>
                <div>(2) Enfants à charge : mineurs, étudiants jusqu'à 25 ans, handicapés ;</div>
                <div>(3) État, Ambassade, Culte, O.N.G., Commune ;</div>
                <div>(4) Précisez : immeuble collectif/maison/logement/cour commune ; local commercial/industriel/artisanal/bureau ;</div>
                <div>(6) 1-Propriétaire ; 2-Usine ; 5-Commercial ; 6-Professionnel/atelier ; 7-Entrepôt ; 8-Habitation logée ; 0-Inoccupé.</div>
              </div>
            </div>

            {/* PAGE 5 */}
            <div className="page p-4 sm:p-8">
              <div className="py-1 font-bold uppercase text-sm mb-4">
                5 - PHOTOS / PIÈCES JOINTES
              </div>

              {/* Photos d'identité */}
              <div className="mb-6">
                <div className="text-xs font-bold mb-3">A) Photos d'identité du propriétaire :</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs mb-2">Photo carte d'identité (recto) :</div>
                    {collecte.prop_photo_carte_identite_recto ? (
                      <img src={collecte.prop_photo_carte_identite_recto} alt="Carte identité recto" className="w-full border border-black" style={{maxHeight: '80mm'}} />
                    ) : (
                      <div className="border border-black p-4 text-center text-xs text-slate-400" style={{height: '80mm', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Aucune photo</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs mb-2">Photo carte d'identité (verso) :</div>
                    {collecte.prop_photo_carte_identite_verso ? (
                      <img src={collecte.prop_photo_carte_identite_verso} alt="Carte identité verso" className="w-full border border-black" style={{maxHeight: '80mm'}} />
                    ) : (
                      <div className="border border-black p-4 text-center text-xs text-slate-400" style={{height: '80mm', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Aucune photo</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Photos de l'immeuble */}
              <div>
                <div className="text-xs font-bold mb-3">B) Photos de l'immeuble :</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs mb-2">Photo générale :</div>
                    {collecte.bien_photo_general ? (
                      <img src={collecte.bien_photo_general} alt="Photo générale" className="w-full border border-black" style={{maxHeight: '60mm'}} />
                    ) : (
                      <div className="border border-black p-4 text-center text-xs text-slate-400" style={{height: '60mm', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Aucune photo</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs mb-2">Photo façade :</div>
                    {collecte.bien_photo_facade ? (
                      <img src={collecte.bien_photo_facade} alt="Photo façade" className="w-full border border-black" style={{maxHeight: '60mm'}} />
                    ) : (
                      <div className="border border-black p-4 text-center text-xs text-slate-400" style={{height: '60mm', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Aucune photo</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs mb-2">Photo entrée :</div>
                    {collecte.bien_photo_entree ? (
                      <img src={collecte.bien_photo_entree} alt="Photo entrée" className="w-full border border-black" style={{maxHeight: '60mm'}} />
                    ) : (
                      <div className="border border-black p-4 text-center text-xs text-slate-400" style={{height: '60mm', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Aucune photo</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}