import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Map, ChevronDown, ChevronRight, Search, AlertTriangle, Loader2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

function normalizeText(value) {
  return String(value == null ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// Clé de stockage local par utilisateur
function getStorageKey(userId, organisationId) {
  return `cadastre_sections_${userId || 'guest'}_${organisationId || ''}`;
}

function loadSavedSections(userId, organisationId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, organisationId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSections(userId, organisationId, sectionIds) {
  try {
    localStorage.setItem(getStorageKey(userId, organisationId), JSON.stringify(sectionIds));
  } catch {}
}

export default function SectionSelectorPanel({
  organisationId,
  commune,
  userId,
  selectedSectionIds,
  onSelectionChange,
  allSectionsMeta, // optionnel : données déjà chargées par le parent
  embedded = false, // intégré dans la barre latérale (liste toujours visible)
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showAllWarning, setShowAllWarning] = useState(false);
  const initializedRef = useRef(false);

  // Charger la liste des sections (métadonnées uniquement, pas les GeoJSON)
  // Si allSectionsMeta est fourni par le parent, on l'utilise directement
  const { data: fetchedSections = [], isLoading } = useQuery({
    queryKey: ['cadastre-meta', organisationId, commune],
    queryFn: async () => {
      const all = await base44.entities.CadastreCommunal.filter(
        { organisation_id: organisationId },
        '-created_date',
        1000
      );
      return all.filter((s) => normalizeText(s.commune) === normalizeText(commune));
    },
    enabled: !!organisationId && !!commune && !allSectionsMeta?.length,
    staleTime: 5 * 60 * 1000,
  });
  const allSections = allSectionsMeta?.length ? allSectionsMeta : fetchedSections;

  // Restaurer la sélection sauvegardée au premier chargement
  useEffect(() => {
    if (initializedRef.current) return;
    if (!allSections.length) return;
    initializedRef.current = true;

    const saved = loadSavedSections(userId, organisationId);
    if (saved && saved.length > 0) {
      // Garder uniquement les IDs qui existent encore
      const validIds = saved.filter((id) => allSections.some((s) => s.id === id));
      if (validIds.length > 0) {
        onSelectionChange(validIds);
        return;
      }
    }
    // Aucune sauvegarde : pas de sélection automatique
    onSelectionChange([]);
  }, [allSections, userId, organisationId]);

  // Persister la sélection à chaque changement
  useEffect(() => {
    if (!initializedRef.current) return;
    saveSections(userId, organisationId, selectedSectionIds);
  }, [selectedSectionIds, userId, organisationId]);

  const selectedCount = selectedSectionIds.length;
  const selectedParcelles = useMemo(
    () =>
      allSections
        .filter((s) => selectedSectionIds.includes(s.id))
        .reduce((sum, s) => sum + (s.nombre_parcelles || 0), 0),
    [allSections, selectedSectionIds]
  );

  const toggleSection = (id) => {
    const next = selectedSectionIds.includes(id)
      ? selectedSectionIds.filter((x) => x !== id)
      : [...selectedSectionIds, id];
    onSelectionChange(next);
  };

  const selectAll = () => {
    onSelectionChange(allSections.map((s) => s.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const handleShowAll = () => {
    setShowAllWarning(true);
  };

  const confirmShowAll = () => {
    onSelectionChange(allSections.map((s) => s.id));
    setShowAllWarning(false);
    setIsOpen(false);
  };

  if (embedded) {
    // Libellé lisible : "QRT_ANANGUIE_EXT" -> "ANANGUIE EXT"
    const prettyName = (name) =>
      String(name || '').replace(/^QRT[_\s-]*/i, '').replace(/_/g, ' ').trim() || name;
    const sortedSections = [...allSections].sort((a, b) =>
      prettyName(a.nom_section).localeCompare(prettyName(b.nom_section), 'fr', { numeric: true })
    );
    const allSelected = allSections.length > 0 && selectedCount === allSections.length;

    return (
      <div className="space-y-3">
        {/* Résumé + actions */}
        <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
          <div className="text-xs leading-snug text-slate-500">
            <div>
              <b className="text-base text-slate-800">{selectedCount}</b> / {allSections.length} section{allSections.length > 1 ? 's' : ''}
            </div>
            {selectedCount > 0 && <div>{selectedParcelles.toLocaleString('fr-FR')} parcelles affichées</div>}
          </div>
          <button
            onClick={allSelected ? deselectAll : selectAll}
            className={`min-h-[44px] text-sm font-semibold px-4 rounded-xl border-2 transition-colors touch-manipulation active:scale-95 ${
              allSelected
                ? 'border-slate-300 text-slate-600 bg-white hover:bg-slate-100'
                : 'border-blue-600 text-blue-700 bg-white hover:bg-blue-50'
            }`}
          >
            {allSelected ? 'Tout masquer' : 'Tout afficher'}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        ) : allSections.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Aucune section trouvée</p>
        ) : (
          // Grille de grandes cases faciles à toucher (pas de défilement imbriqué :
          // c'est le panneau entier qui défile)
          <div className="grid grid-cols-2 gap-2">
            {sortedSections.map((section) => {
              const isSelected = selectedSectionIds.includes(section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  title={section.nom_section}
                  aria-pressed={isSelected}
                  className={`min-h-[56px] flex items-center gap-2.5 px-3 py-2 text-left rounded-xl border-2 transition-colors touch-manipulation active:scale-[0.97] ${
                    isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border-2 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 12 12" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6.5l2.5 2.5L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm leading-snug break-words ${isSelected ? 'font-bold text-blue-900' : 'font-semibold text-slate-700'}`}>
                      {prettyName(section.nom_section)}
                    </span>
                    <span className={`block text-xs tabular-nums ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                      {(section.nombre_parcelles || 0).toLocaleString('fr-FR')} parc.
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ pointerEvents: 'auto', zIndex: 1000, marginTop: '140px', marginRight: '8px' }}
    >
      <div className="leaflet-control" style={{ position: 'relative' }}>
        {/* Bouton toggle */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          title="Sélectionner les sections cadastrales"
          style={{
            background: selectedCount > 0 ? 'rgb(var(--tw-blue-50, 239 246 255))' : 'white',
            border: `2px solid ${selectedCount > 0 ? 'rgb(var(--tw-blue-600, 37 99 235))' : 'rgba(0,0,0,0.2)'}`,
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: selectedCount > 0 ? 'rgb(var(--tw-blue-600, 37 99 235))' : '#374151',
          }}
        >
          <Map size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>Sections</span>
          {selectedCount > 0 && (
            <span style={{
              background: 'rgb(var(--tw-blue-600, 37 99 235))', color: 'white', borderRadius: '9999px',
              padding: '1px 5px', fontSize: '10px', lineHeight: '1.4',
            }}>
              {selectedCount}
            </span>
          )}
        </button>

        {/* Panneau déroulant */}
        {isOpen && (
          <div
            className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{ zIndex: 9999, touchAction: 'pan-y' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="bg-blue-900 text-white px-3 py-2.5">
              <p className="font-bold text-sm">{commune}</p>
              <p className="text-xs text-blue-300">
                {allSections.length} section{allSections.length > 1 ? 's' : ''} disponible{allSections.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 hover:underline transition-colors font-medium"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Tout cocher
                </button>
                <span className="text-slate-300 mx-1">|</span>
                <button
                  onClick={deselectAll}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 hover:underline transition-colors font-medium"
                >
                  <Square className="w-3.5 h-3.5" /> Tout décocher
                </button>
              </div>
            </div>

            {/* Liste des sections */}
            <div className="max-h-64 overflow-y-auto" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : allSections.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Aucune section trouvée</p>
              ) : (
                allSections.map((section) => {
                  const isSelected = selectedSectionIds.includes(section.id);
                  return (
                    <label
                      key={section.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSection(section.id)}
                        className="accent-blue-600 w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{section.nom_section}</p>
                        <p className="text-[10px] text-slate-400">
                          {(section.nombre_parcelles || 0).toLocaleString()} parcelle{section.nombre_parcelles > 1 ? 's' : ''}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Pied de panneau */}
            <div className="border-t border-slate-100 px-3 py-2 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-semibold"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}