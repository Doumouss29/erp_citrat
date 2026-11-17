import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCabinetOrg, resolveOrgId } from '@/lib/ecadastreCabinet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronDown, Map, MapPin, AlertTriangle } from 'lucide-react';
import { createEcadastrePageUrl } from '@/lib/ecadastrePageUrl';
import { toast } from 'sonner';
import CadastreMapCollecte from '@/components/ecadastre/cadastre/CadastreMapCollecte';
import CollecteFormDrawer from '@/components/ecadastre/cadastre/CollecteFormDrawer';
import CommunePicker from '@/components/ecadastre/cadastre/CommunePicker';

function normalizeText(value) {
  return String(value == null ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// Champs légers nécessaires à la carte (sans les photos base64 qui alourdissent les fiches)
const COLLECTE_MAP_FIELDS = ['id', 'commune', 'section', 'parcelle', 'lot', 'ilot', 'quartier', 'statut'];

export default function CollecteParCarte() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedOrganisationId = searchParams.get('organisation_id') || '';
  const [selectedParcelle, setSelectedParcelle] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [validatedParcelles, setValidatedParcelles] = useState([]);
  const [activeSections, setActiveSections] = useState([]);
  const handleSectionsLoaded = useCallback(setActiveSections, []);
  const queryClient = useQueryClient();

  // IDs des sections sélectionnées par l'utilisateur
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Application interne : organisation du cabinet par défaut
  const { data: cabinet } = useCabinetOrg();
  const effectiveOrganisationId = resolveOrgId(selectedOrganisationId, user, cabinet);

  const { data: organisation } = useQuery({
    queryKey: ['organisation', effectiveOrganisationId],
    queryFn: () => base44.entities.Organisation.filter({ id: effectiveOrganisationId }).then(r => r[0]),
    enabled: !!effectiveOrganisationId,
  });

  // Les agents (role=user) ne voient que leur commune assignée
  // Les superviseurs voient leurs communes supervisées
  // Les admins voient toutes les communes de l'organisation
  const communeOptions = (() => {
    if (!user) return [];
    if (user.role === 'admin') return organisation?.communes || [];
    if (user.role === 'superviseur') return user.communes_supervisees?.length > 0 ? user.communes_supervisees : (organisation?.communes || []);
    // role === 'user' : uniquement la commune assignée
    return user.commune ? [user.commune] : [];
  })();
  const [selectedCommune, setSelectedCommune] = useState('');

  useEffect(() => {
    setSelectedCommune(communeOptions[0] || '');
  }, [effectiveOrganisationId, communeOptions]);

  // Réinitialiser la sélection de sections au changement de commune
  useEffect(() => {
    setSelectedSectionIds([]);
  }, [selectedCommune]);

  // Charger les métadonnées de toutes les sections de la commune (pas les GeoJSON)
  const { data: allCadastreSections = [] } = useQuery({
    queryKey: ['cadastre-meta', effectiveOrganisationId, selectedCommune],
    queryFn: async () => {
      const all = await base44.entities.CadastreCommunal.filter(
        { organisation_id: effectiveOrganisationId },
        '-created_date',
        1000
      );
      return all.filter((s) => normalizeText(s.commune) === normalizeText(selectedCommune));
    },
    enabled: !!effectiveOrganisationId && !!selectedCommune,
    staleTime: 5 * 60 * 1000,
  });

  // Sections sélectionnées avec leurs métadonnées complètes
  const selectedSections = allCadastreSections.filter((s) => selectedSectionIds.includes(s.id));

  // Charger les collectes déjà faites pour marquer les parcelles
  // Double filtrage : API par commune exacte + client par normalisation (casse)
  const { data: collectesExistantes = [] } = useQuery({
    queryKey: ['collectes-carte', effectiveOrganisationId, selectedCommune],
    queryFn: async () => {
      const normCommune = normalizeText(selectedCommune);
      const all = [];
      let page = 0;
      const pageSize = 1000;
      // On tente d'abord avec la commune telle quelle, puis on filtre par normalisation
      while (true) {
        const batch = await base44.entities.Collecte.filter(
          { organisation_id: effectiveOrganisationId, commune: selectedCommune },
          '-created_date',
          pageSize,
          page * pageSize,
          COLLECTE_MAP_FIELDS
        );
        all.push(...batch);
        if (batch.length < pageSize) break;
        page++;
        if (page > 20) break;
      }
      // Si rien trouvé avec la commune exacte, essayer sans filtre commune (fallback insensible casse)
      if (all.length === 0) {
        let page2 = 0;
        while (true) {
          const batch = await base44.entities.Collecte.filter(
            { organisation_id: effectiveOrganisationId },
            '-created_date',
            pageSize,
            page2 * pageSize,
            COLLECTE_MAP_FIELDS
          );
          const filtered = batch.filter(c => normalizeText(c.commune) === normCommune);
          all.push(...filtered);
          if (batch.length < pageSize) break;
          page2++;
          if (page2 > 20) break;
        }
      }
      return all;
    },
    enabled: !!effectiveOrganisationId && !!selectedCommune,
  });

  const { data: convocations = [] } = useQuery({
    queryKey: ['convocations-carte', effectiveOrganisationId, selectedCommune],
    queryFn: async () => {
      const normCommune = normalizeText(selectedCommune);
      // Essai avec filtre commune exacte
      let results = await base44.entities.ConvocationParcelle.filter(
        { organisation_id: effectiveOrganisationId, commune: selectedCommune, statut: 'active' },
        '-created_date',
        5000
      );
      // Fallback si rien trouvé
      if (results.length === 0) {
        const all = await base44.entities.ConvocationParcelle.filter(
          { organisation_id: effectiveOrganisationId, statut: 'active' },
          '-created_date',
          5000
        );
        results = all.filter(c => normalizeText(c.commune) === normCommune);
      }
      return results;
    },
    enabled: !!effectiveOrganisationId && !!selectedCommune,
  });

  const handleParcelleClick = (attrs) => {
    setSelectedParcelle(attrs);
    setIsFormOpen(true);
  };

  const handleLeaveConvocation = async (parcelleAttrs) => {
    await base44.entities.ConvocationParcelle.create({
      organisation_id: effectiveOrganisationId,
      commune: parcelleAttrs.commune,
      section: parcelleAttrs.section,
      parcelle: parcelleAttrs.parcelle,
      lot: parcelleAttrs.lot,
      ilot: parcelleAttrs.ilot,
      quartier: parcelleAttrs.quartier,
      coordX: parcelleAttrs.coordX ? String(parcelleAttrs.coordX) : '',
      coordY: parcelleAttrs.coordY ? String(parcelleAttrs.coordY) : '',
      surface: parcelleAttrs.surface,
      statut: 'active'
    });
    queryClient.invalidateQueries({ queryKey: ['convocations-carte', effectiveOrganisationId] });
    toast.success('Convocation enregistrée');
  };

  const handleCollecteValidated = () => {
    setValidatedParcelles(prev => [...prev, { ...selectedParcelle, collecteId: Date.now() }]);
    queryClient.invalidateQueries({ queryKey: ['collectes-carte', effectiveOrganisationId, selectedCommune] });
    queryClient.invalidateQueries({ queryKey: ['convocations-carte', effectiveOrganisationId] });
    setIsFormOpen(false);
    setSelectedParcelle(null);
    toast.success('Recensement enregistré !');
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedParcelle(null);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Un agent sans commune assignée ne peut pas accéder à la carte
  if (user?.role === 'user' && !user?.commune) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-slate-700 font-semibold text-center">Aucune commune assignée</p>
        <p className="text-slate-500 text-sm text-center mt-1">Contactez votre administrateur pour qu'il vous assigne une commune.</p>
        <Button className="mt-4" onClick={() => navigate(createEcadastrePageUrl('Accueil'))}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen supports-[height:100dvh]:h-dvh bg-slate-900">
      {/* En-tête : grands boutons adaptés au tactile */}
      <header
        className="bg-blue-900 text-white flex-shrink-0 shadow-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4 px-2 sm:px-4 min-h-[64px] py-2">
          <button
            onClick={() => navigate(createEcadastrePageUrl('Accueil'))}
            className="h-12 min-w-[48px] px-2 sm:px-3 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 flex items-center justify-center gap-1 flex-shrink-0 touch-manipulation transition-colors"
            aria-label="Retour à l'accueil"
            title="Retour"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="hidden sm:inline text-sm font-semibold pr-1">Retour</span>
          </button>

          {/* Titre + organisation, centrés ; titre raccourci sur petit écran */}
          <div className="min-w-0 text-center">
            <h1 className="font-bold uppercase tracking-wide leading-tight text-[15px] sm:text-lg lg:text-xl flex items-center justify-center gap-2">
              <Map className="hidden md:block w-5 h-5 text-blue-200 flex-shrink-0" />
              <span className="sm:hidden">Recensement</span>
              <span className="hidden sm:inline truncate">Recensement par carte</span>
            </h1>
            {(organisation?.nom || selectedCommune) && (
              <p className="text-[11px] sm:text-xs text-blue-200 font-medium uppercase tracking-wide truncate mt-0.5">
                {organisation?.nom}
                {/* Cabinet · commune, sur tous les écrans */}
                {selectedCommune && (
                  <span>{organisation?.nom ? ' · ' : ''}{selectedCommune}</span>
                )}
              </p>
            )}
          </div>

          {/* Commune : sélecteur pour admin/superviseur, pastille pour les agents */}
          {(user?.role === 'admin' || user?.role === 'superviseur') && communeOptions.length > 1 ? (
            <CommunePicker value={selectedCommune} options={communeOptions} onChange={setSelectedCommune} />
          ) : selectedCommune ? (
            <span className="h-12 min-w-[48px] flex items-center justify-center gap-2 px-3 sm:px-4 rounded-xl bg-white/15 text-white font-bold text-base flex-shrink-0 max-w-[42vw]" title={selectedCommune}>
              <MapPin className="w-6 h-6 sm:w-5 sm:h-5 text-blue-200 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{selectedCommune}</span>
            </span>
          ) : null}
        </div>
      </header>

      {/* Carte plein écran */}
      <div className="flex-1 relative">
        {selectedCommune && effectiveOrganisationId ? (
          <>
            <CadastreMapCollecte
              commune={selectedCommune}
              organisationId={effectiveOrganisationId}
              collectesExistantes={collectesExistantes}
              convocations={convocations}
              validatedParcelles={validatedParcelles}
              onParcelleClick={handleParcelleClick}
              onLeaveConvocation={handleLeaveConvocation}
              onSectionsLoaded={handleSectionsLoaded}
              isAdmin={user?.role === 'admin'}
              selectedSections={selectedSections}
              userId={user?.id}
              selectedSectionIds={selectedSectionIds}
              onSectionSelectionChange={setSelectedSectionIds}
              allCadastreSections={allCadastreSections}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Map className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Aucune commune configurée</p>
              <p className="text-sm mt-1">Configurez les communes dans Administration › Communes</p>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire de collecte en drawer */}
      <CollecteFormDrawer
        isOpen={isFormOpen}
        onClose={handleFormClose}
        parcelleAttrs={selectedParcelle}
        user={user}
        organisationId={effectiveOrganisationId}
        onValidated={handleCollecteValidated}
      />
    </div>
  );
}