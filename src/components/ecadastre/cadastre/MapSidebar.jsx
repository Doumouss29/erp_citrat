import React, { useEffect, useRef, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  PanelRightClose, SlidersHorizontal, Map as MapIcon, Hash, Layers,
  ChevronDown, LocateFixed, Info, X,
} from 'lucide-react';
import { TILE_LAYERS } from './TileLayerSwitcher';
import { LabelRenderer } from './LabelLayerControl';
import SectionSelectorPanel from './SectionSelectorPanel';
import UserLocationTarget, { TARGET_SVG } from './UserLocationTarget';
import { toast } from 'sonner';

const GPS_KEY = 'carte_gps_actif';

const TILE_ICONS = { osm: '🗺️', satellite: '🛰️', terrain: '⛰️' };

const LABEL_TOGGLES = [
  { key: 'ilot', label: "Numéro d'îlot", color: '#16a34a', hint: 'zoom 16+' },
  { key: 'lot', label: 'Numéro de lot', color: '#dc2626', hint: 'zoom 18+' },
  { key: 'parcelle', label: 'Numéro de parcelle', color: '#2563eb', hint: 'zoom 18+' },
];

function Section({ id, icon: Icon, title, summary, open, onToggle, children }) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full min-h-[60px] flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
      >
        <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-[15px] font-semibold text-slate-800">{title}</span>
          {summary && <span className="block text-xs text-slate-500 truncate">{summary}</span>}
        </span>
        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {/* Contenu toujours monté (conserve l'état et la surbrillance), simplement masqué */}
      <div className={open ? 'px-4 pb-4' : 'hidden'}>{children}</div>
    </div>
  );
}

function Toggle({ checked, color = '#2563eb' }) {
  return (
    <span
      className="relative inline-flex w-12 h-7 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? color : '#cbd5e1' }}
    >
      <span
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 23 : 3 }}
      />
    </span>
  );
}

const LEGEND_KEY = 'carte_legende_ouverte';

/**
 * Légende affichée directement sur la carte (coin inférieur gauche).
 * Repliable en une pastille pour libérer la vue ; le choix est mémorisé.
 */
function MapLegend({ sectionColors = [] }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(LEGEND_KEY);
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);

  const setAndSave = (v) => {
    setOpen(v);
    try { localStorage.setItem(LEGEND_KEY, v ? '1' : '0'); } catch {}
  };

  const colors = sectionColors.slice(0, 4).map((c) => c.slice(0, 7));

  return (
    <div
      ref={ref}
      className="absolute left-3"
      style={{ zIndex: 999, bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      {open ? (
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 pl-3 pr-1 py-1 max-w-[calc(100vw-24px)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Légende</span>
            <button
              onClick={() => setAndSave(false)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 touch-manipulation"
              title="Masquer la légende"
              aria-label="Masquer la légende"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-1.5 pb-2 pr-2 text-[13px] text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-5 h-3.5 rounded-sm border-2 flex-shrink-0" style={{ background: '#22c55e73', borderColor: '#16a34a' }} />
              Recensée
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-3.5 rounded-sm border-2 flex-shrink-0" style={{ background: '#94a3b880', borderColor: '#64748b' }} />
              Convocation laissée
            </li>
            <li className="flex items-center gap-2">
              <span className="flex gap-0.5 flex-shrink-0">
                {(colors.length ? colors : ['#3b82f6']).map((c) => (
                  <span key={c} className="w-2 h-3.5 rounded-sm border" style={{ background: `${c}33`, borderColor: c }} />
                ))}
              </span>
              À recenser
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5" dangerouslySetInnerHTML={{ __html: TARGET_SVG }} />
              Ma position
            </li>
          </ul>
        </div>
      ) : (
        <button
          onClick={() => setAndSave(true)}
          className="min-h-[48px] flex items-center gap-2 bg-white rounded-xl shadow-lg border border-slate-200 px-4 text-slate-800 hover:bg-slate-50 active:scale-95 transition touch-manipulation"
          title="Afficher la légende"
        >
          <Info className="w-5 h-5 text-blue-700" />
          <span className="text-[15px] font-semibold">Légende</span>
        </button>
      )}
    </div>
  );
}

/**
 * Barre latérale rétractable regroupant tous les outils de la carte.
 * À placer à l'intérieur du <MapContainer>.
 */
export default function MapSidebar({
  commune,
  geojsonDataList,
  sectionColors = [],
  // Sections
  organisationId,
  userId,
  selectedSectionIds = [],
  onSectionSelectionChange,
  allCadastreSections = [],
}) {
  const map = useMap();
  const panelRef = useRef(null);
  const toggleRef = useRef(null);

  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [openSections, setOpenSections] = useState({ sections: true, labels: false, tiles: false });

  const [activeTiles, setActiveTiles] = useState({ osm: false, satellite: false, terrain: false });
  const [labels, setLabels] = useState({ ilot: false, lot: false, parcelle: false });
  const [zoom, setZoom] = useState(map.getZoom());

  // Position GPS de l'agent (cible rouge) : activée / désactivée par le bouton de localisation
  const [gpsActive, setGpsActive] = useState(() => {
    try { return localStorage.getItem(GPS_KEY) !== '0'; } catch { return true; }
  });
  const [centerSignal, setCenterSignal] = useState(0);
  const [gpsStatus, setGpsStatus] = useState({ state: 'idle' });

  const setGps = (v) => {
    setGpsActive(v);
    if (!v) setGpsStatus({ state: 'idle' });
    try { localStorage.setItem(GPS_KEY, v ? '1' : '0'); } catch {}
  };

  const handleGpsStatus = (state, info) => {
    setGpsStatus({ state, info });
    if (state === 'error') toast.error(info);
  };

  // Empêcher les clics / défilements dans le panneau de déplacer la carte
  useEffect(() => {
    [panelRef.current, toggleRef.current].forEach((el) => {
      if (!el) return;
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    });
  }, []);

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => map.off('zoomend', onZoom);
  }, [map]);

  const toggleSection = (id) => setOpenSections((s) => ({ ...s, [id]: !s[id] }));

  const activeTileLabels = TILE_LAYERS.filter((t) => activeTiles[t.id]).map((t) => t.label);
  const activeLabelNames = LABEL_TOGGLES.filter((t) => labels[t.key]).map((t) => t.label.replace('Numéro de ', '').replace("Numéro d'", ''));
  const selectedCount = selectedSectionIds.length;

  // Centre la carte sur ma position (active le GPS si besoin)
  const locateMe = () => {
    if (!gpsActive) setGps(true);
    setCenterSignal((n) => n + 1);
    // Sur téléphone, le panneau couvre toute la carte : on le ferme pour voir la position
    if (typeof window !== 'undefined' && window.innerWidth < 640) setIsOpen(false);
  };

  const gpsSearching = gpsActive && gpsStatus.state === 'searching';

  return (
    <>
      {/* Couches rendues sur la carte */}
      {TILE_LAYERS.filter((t) => activeTiles[t.id]).map((tile) => (
        <TileLayer
          key={tile.id}
          url={tile.url}
          attribution={tile.attribution}
          {...(tile.tileLayerOptions || {})}
          opacity={activeTiles.satellite && activeTiles.osm && tile.id === 'satellite' ? 0.6 : 1}
        />
      ))}
      {(labels.ilot || labels.lot || labels.parcelle) && (
        <LabelRenderer
          geojsonDataList={geojsonDataList}
          showIlot={labels.ilot}
          showLot={labels.lot}
          showParcelle={labels.parcelle}
        />
      )}

      <UserLocationTarget active={gpsActive} centerSignal={centerSignal} onStatus={handleGpsStatus} />

      <MapLegend sectionColors={sectionColors} />

      {/* Bouton d'ouverture (visible quand le panneau est fermé) */}
      <div
        ref={toggleRef}
        className="absolute top-3 right-3 flex flex-col gap-3 items-end"
        style={{ zIndex: 1000, display: isOpen ? 'none' : 'flex' }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="min-h-[48px] flex items-center gap-2 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 active:scale-95 transition touch-manipulation"
          title="Ouvrir les outils de la carte"
        >
          <SlidersHorizontal className="w-5 h-5 text-blue-700" />
          <span className="text-[15px] font-semibold">Outils</span>
          {selectedCount > 0 && (
            <span className="bg-blue-600 text-white rounded-full text-xs font-bold px-2 py-1 leading-none">
              {selectedCount}
            </span>
          )}
        </button>
      </div>

      {/* Panneau latéral */}
      <div
        ref={panelRef}
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[380px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-out"
        style={{
          zIndex: 1001,
          transform: isOpen ? 'translateX(0)' : 'translateX(105%)',
          touchAction: 'pan-y',
        }}
        aria-hidden={!isOpen}
      >
        {/* En-tête */}
        <div className="flex items-center gap-2 pl-4 pr-2 py-2 bg-blue-900 text-white flex-shrink-0">
          <SlidersHorizontal className="w-5 h-5 text-blue-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold leading-tight">Outils de la carte</p>
            {commune && <p className="text-xs text-blue-300 truncate">{commune} · zoom {zoom}</p>}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="h-12 min-w-[48px] px-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center gap-1.5 flex-shrink-0 touch-manipulation"
            title="Fermer le panneau"
            aria-label="Fermer le panneau"
          >
            <PanelRightClose className="w-6 h-6" />
            <span className="text-sm font-semibold">Fermer</span>
          </button>
        </div>

        {/* Contenu défilant */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="px-4 py-3 border-b border-slate-100 space-y-2">
            <button
              onClick={() => setGps(!gpsActive)}
              className="w-full min-h-[56px] flex items-center gap-3 px-3 py-2 rounded-xl border-2 border-slate-200 hover:bg-slate-50 active:bg-slate-100 touch-manipulation"
              aria-pressed={gpsActive}
            >
              <span className="w-8 h-8 flex-shrink-0 [&>svg]:w-8 [&>svg]:h-8" dangerouslySetInnerHTML={{ __html: TARGET_SVG }} />
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold text-slate-800">Afficher ma position</span>
                <span className="block text-xs text-slate-500">
                  {!gpsActive
                    ? 'GPS coupé (économise la batterie)'
                    : gpsStatus.state === 'ok'
                      ? `Précision ± ${gpsStatus.info} m`
                      : gpsStatus.state === 'error'
                        ? 'Position indisponible'
                        : 'Recherche du signal GPS…'}
                </span>
              </span>
              <Toggle checked={gpsActive} color="#dc2626" />
            </button>
            {gpsActive && (
              <button
                onClick={locateMe}
                disabled={gpsStatus.state === 'error'}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 active:scale-[0.98] transition touch-manipulation disabled:opacity-50"
              >
                <LocateFixed className={`w-5 h-5 ${gpsSearching ? 'animate-pulse' : ''}`} />
                Centrer la carte sur ma position
              </button>
            )}
          </div>

          {onSectionSelectionChange && (
            <Section
              id="sections"
              icon={MapIcon}
              title="Sections cadastrales"
              summary={selectedCount > 0 ? `${selectedCount} / ${allCadastreSections.length} affichée${selectedCount > 1 ? 's' : ''}` : 'Aucune section affichée'}
              open={openSections.sections}
              onToggle={toggleSection}
            >
              <SectionSelectorPanel
                embedded
                organisationId={organisationId}
                commune={commune}
                userId={userId}
                selectedSectionIds={selectedSectionIds}
                onSelectionChange={onSectionSelectionChange}
                allSectionsMeta={allCadastreSections}
              />
            </Section>
          )}

          <Section
            id="labels"
            icon={Hash}
            title="Numéros sur la carte"
            summary={activeLabelNames.length ? activeLabelNames.join(', ') : 'Masqués'}
            open={openSections.labels}
            onToggle={toggleSection}
          >
            <div className="space-y-1.5">
              {LABEL_TOGGLES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setLabels((l) => ({ ...l, [t.key]: !l[t.key] }))}
                  className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 touch-manipulation"
                >
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="flex-1 text-left">
                    <span className="block text-sm font-medium text-slate-800">{t.label}</span>
                    <span className="block text-xs text-slate-400">Visible au {t.hint}</span>
                  </span>
                  <Toggle checked={labels[t.key]} color={t.color} />
                </button>
              ))}
            </div>
            {(labels.lot || labels.parcelle || labels.ilot) && zoom < 16 && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Zoomez davantage pour voir les numéros.
              </p>
            )}
          </Section>

          <Section
            id="tiles"
            icon={Layers}
            title="Fond de carte"
            summary={activeTileLabels.length ? activeTileLabels.join(' + ') : 'Aucun (économise les données)'}
            open={openSections.tiles}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-3 gap-2">
              {TILE_LAYERS.map((tile) => {
                const active = activeTiles[tile.id];
                return (
                  <button
                    key={tile.id}
                    onClick={() => setActiveTiles((p) => ({ ...p, [tile.id]: !p[tile.id] }))}
                    className={`min-h-[72px] rounded-xl border-2 py-3 px-1 text-center transition-colors touch-manipulation active:scale-95 ${
                      active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl leading-none mb-1.5">{TILE_ICONS[tile.id] || '🗺️'}</div>
                    <div className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-600'}`}>
                      {tile.id === 'osm' ? 'Plan' : tile.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Les fonds de carte consomment des données mobiles. Laissez-les désactivés si le réseau est faible.
            </p>
          </Section>

        </div>
      </div>
    </>
  );
}
