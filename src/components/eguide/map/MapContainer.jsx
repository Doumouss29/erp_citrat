import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, Tooltip } from 'react-leaflet';
import { cn } from "@/lib/utils";
import { Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import 'leaflet/dist/leaflet.css';
import { formatLotSurface } from '@/utils/eguideFormatLotSurface';

const DEFAULT_STATUT_COLORS = {
  'Lot en vente': { couleur: '#ef4444', fond: 'transparent' },
  'Lot vendu': { couleur: '#000000', fond: '#22c55e' },
  'Lot réservé': { couleur: '#000000', fond: '#eab308' },
  'Lot non à vendre': { couleur: '#000000', fond: '#f97316' },
  'Lot non cessible': { couleur: '#000000', fond: '#f97316' }
};

function displayStatut(s) { return s === 'Lot non à vendre' ? 'Lot non cessible' : s; }

const AFFECTATION_ICONS = {
  'Habitat': '🏠',
  'Commerce': '🏪',
  'Équipement': '🏛️',
  'Espace vert': '🌳',
  'Voirie': '🛣️',
  'Autre': '📍'
};

function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom || 16);
    }
  }, [center, zoom, map]);
  
  return null;
}

function ZoomLevel() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  
  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => map.off('zoomend', handleZoom);
  }, [map]);
  
  return zoom;
}

function ViewportBounds() {
  const map = useMap();
  const [bounds, setBounds] = useState(null);
  
  useEffect(() => {
    const updateBounds = () => {
      const mapBounds = map.getBounds();
      setBounds({
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest()
      });
    };
    
    updateBounds();
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    
    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map]);
  
  return bounds;
}

function isPolygonInBounds(coordinates, bounds) {
  if (!bounds || !coordinates || coordinates.length === 0) return true;
  
  // Vérifier si au moins un point du polygone est dans les bounds
  for (const coord of coordinates) {
    const [lng, lat] = coord;
    if (lat >= bounds.south && lat <= bounds.north && 
        lng >= bounds.west && lng <= bounds.east) {
      return true;
    }
  }
  return false;
}

const LotPolygon = React.memo(function LotPolygon({ lot, ilot, onLotClick, lotissementNom, attributaire, statutColors, bounds }) {
  if (!lot.geometrie?.coordinates) return null;
  
  const rawCoords = lot.geometrie.coordinates[0] || [];
  if (rawCoords.length === 0) return null;
  
  const zoomLevel = ZoomLevel();
  if (zoomLevel < 16) return null; // Afficher les polygones à partir du zoom 16
  
  // Vérifier si le polygone est dans les bounds visibles
  if (!isPolygonInBounds(rawCoords, bounds)) return null;
  
  const coordinates = rawCoords.map(coord => [coord[1], coord[0]]);
  
  const config = statutColors[lot.statut] || DEFAULT_STATUT_COLORS[lot.statut] || DEFAULT_STATUT_COLORS['Lot en vente'];
  const showLabel = zoomLevel >= 18;
  
  return (
    <Polygon
      key={`${lot.id}-${lot.statut}-${attributaire}`}
      positions={coordinates}
      pathOptions={{
        color: config.couleur,
        fillColor: config.fond,
        fillOpacity: config.fond === 'transparent' ? 0 : 0.5,
        weight: 2,
        pane: 'markerPane'
      }}
    >
      {showLabel && (
        <Tooltip permanent direction="center" className="lot-label bg-transparent border-0 shadow-none">
          <span className="text-xs font-semibold" style={{ color: config.couleur }}>{lot.numero_lot}</span>
        </Tooltip>
      )}
      <Popup>
        <div className="p-2 min-w-48">
          <div className="space-y-1 text-xs">
            <p><span className="text-slate-500">Lotissement:</span> <span className="font-medium">{lotissementNom || 'N/A'}</span></p>
            <p><span className="text-slate-500">Îlot:</span> <span className="font-medium">{ilot?.numero_ilot || 'N/A'}</span></p>
            <p><span className="text-slate-500">Lot:</span> <span className="font-medium">{lot.numero_lot}</span></p>
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Statut:</span>
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-medium border"
                style={{ 
                  backgroundColor: config.fond === 'transparent' ? 'transparent' : config.fond,
                  borderColor: config.couleur,
                  color: config.fond === 'transparent' ? config.couleur : '#000000'
                }}
              >
                {displayStatut(lot.statut)}
              </span>
            </p>
            <p><span className="text-slate-500">Attributaire:</span> <span className="font-medium">{attributaire || 'Non attribué'}</span></p>
            <p><span className="text-slate-500">Surface:</span> <span className="font-medium">{formatLotSurface(lot.surface) || 'N/A'}</span></p>
            <p><span className="text-slate-500">Affectation:</span> <span className="font-medium">{AFFECTATION_ICONS[lot.affectation]} {lot.affectation || 'N/A'}</span></p>
          </div>
          <button
            onClick={() => onLotClick(lot, ilot)}
            className="mt-3 w-full bg-slate-900 text-white text-xs py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Voir les détails
          </button>
        </div>
      </Popup>
    </Polygon>
  );
}, (prevProps, nextProps) => {
  return prevProps.lot.id === nextProps.lot.id &&
         prevProps.lot.statut === nextProps.lot.statut &&
         prevProps.attributaire === nextProps.attributaire &&
         prevProps.bounds === nextProps.bounds;
});

const IlotPolygon = React.memo(function IlotPolygon({ ilot, bounds }) {
  if (!ilot.geometrie?.coordinates) return null;
  
  const rawCoords = ilot.geometrie.coordinates[0] || [];
  if (rawCoords.length === 0) return null;
  
  // Vérifier si le polygone est dans les bounds visibles
  if (!isPolygonInBounds(rawCoords, bounds)) return null;
  
  const coordinates = rawCoords.map(coord => [coord[1], coord[0]]);
  
  const zoomLevel = ZoomLevel();
  const showLabel = zoomLevel >= 16;
  
  return (
    <Polygon
      positions={coordinates}
      pathOptions={{
        color: '#22c55e',
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 2,
        pane: 'overlayPane'
      }}
    >
      {showLabel && (
        <Tooltip permanent direction="center" className="ilot-label bg-transparent border-0 shadow-none">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{ilot.numero_ilot}</span>
          </div>
        </Tooltip>
      )}
    </Polygon>
  );
});

// Fonds de carte. maxNativeZoom = dernier niveau réellement servi par chaque fournisseur :
// au-delà (zoom sur un lotissement), Leaflet agrandit les tuiles de ce niveau au lieu de
// demander des tuiles inexistantes, qui s'affichaient en gris/blanc.
const MAP_MAX_ZOOM = 21;
const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap',
    // Domaine unique recommandé par OSM (les sous-domaines a/b/c sont obsolètes)
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    options: { maxNativeZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin' }
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    options: { maxNativeZoom: 18 }
  },
  topo: {
    name: 'Topographique',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    options: { subdomains: 'abc', maxNativeZoom: 17, referrerPolicy: 'strict-origin-when-cross-origin' }
  }
  // Fonds CARTO « Clair » et « Sombre » retirés : le service affiche désormais un filigrane (clé requise).
};

function MapContent({ lots, ilots, showLots, showIlots, onLotClick, selectedLotissement, attributaires, statutColors, filteredLots, filteredIlots, statusFilter }) {
  const bounds = ViewportBounds();
  
  // Filtrer les lots par statut
  const displayedLots = useMemo(() => {
    if (statusFilter === 'all' || statusFilter === 'non-attribue') return filteredLots;
    return filteredLots.filter(lot => lot.statut === statusFilter);
  }, [filteredLots, statusFilter]);
  
  // Filtrer les îlots pour ne montrer que ceux qui contiennent des lots filtrés
  const displayedIlots = useMemo(() => {
    if (statusFilter === 'all' || statusFilter === 'non-attribue') return filteredIlots;
    const ilotIds = new Set(displayedLots.map(lot => lot.id_ilot));
    return filteredIlots.filter(ilot => ilotIds.has(ilot.id));
  }, [filteredIlots, displayedLots, statusFilter]);
  
  return (
    <>
      {/* Îlots layer */}
      {showIlots && displayedIlots.map(ilot => (
        <IlotPolygon 
          key={ilot.id} 
          ilot={ilot}
          bounds={bounds}
        />
      ))}
      
      {/* Lots layer */}
      {showLots && displayedLots.map(lot => {
        const ilot = ilots.find(i => i.id === lot.id_ilot);
        const lotAttributaires = attributaires.filter(a => a.id_lot === lot.id && a.actif);
        const attributaireNom = lotAttributaires.length > 0
          ? lotAttributaires.map(a => 
              a.type_attributaire === 'physique'
                ? `${a.prenom} ${a.nom}`
                : a.raison_sociale || a.nom
            ).join(' & ')
          : null;
        
        return (
          <LotPolygon
            key={lot.id}
            lot={lot}
            ilot={ilot}
            onLotClick={onLotClick}
            lotissementNom={selectedLotissement?.nom}
            attributaire={attributaireNom}
            statutColors={statutColors}
            bounds={bounds}
          />
        );
      })}
    </>
  );
}

export default function LotissementMap({ 
  lots = [], 
  ilots = [],
  center = [7.5400, -5.5471],
  zoom = 7,
  onLotClick,
  selectedLotissement,
  selectedIlot,
  showLots = true,
  showIlots = true,
  statusFilter = 'all',
  customCenter = null,
  customZoom = null,
  attributaires = []
}) {
  const [mapCenter, setMapCenter] = useState([7.5400, -5.5471]);
  const [mapZoom, setMapZoom] = useState(7);
  const [selectedLayer, setSelectedLayer] = useState('osm');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // Charger la configuration des couleurs
  const { data: configs = [] } = useQuery({
    queryKey: ['config-statuts'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'statuts_lots' })
  });

  const statutColors = (() => {
    const base = { ...DEFAULT_STATUT_COLORS };
    if (configs.length > 0 && configs[0].valeur?.statuts) {
      const map = configs[0].valeur.statuts.reduce((acc, s) => {
        acc[s.nom] = { couleur: s.couleur, fond: s.fond };
        return acc;
      }, {});
      // Synchroniser alias
      if (map['Lot non cessible'] && !map['Lot non à vendre']) map['Lot non à vendre'] = map['Lot non cessible'];
      if (map['Lot non à vendre'] && !map['Lot non cessible']) map['Lot non cessible'] = map['Lot non à vendre'];
      return { ...base, ...map };
    }
    return base;
  })();

  const legendEntries = useMemo(() => {
    const pairs = Object.entries(statutColors).map(([k, v]) => [displayStatut(k), v]);
    const map = new Map();
    pairs.forEach(([label, cfg]) => { if (!map.has(label)) map.set(label, cfg); });
    return Array.from(map.entries());
  }, [statutColors]);
  
  useEffect(() => {
    if (customCenter && customZoom) {
      setMapCenter(customCenter);
      setMapZoom(customZoom);
    } else if (selectedLotissement?.coordonnees_centre) {
      setMapCenter([
        selectedLotissement.coordonnees_centre.lat,
        selectedLotissement.coordonnees_centre.lng
      ]);
      setMapZoom(selectedLotissement.zoom_defaut || 16);
    } else {
      setMapCenter([7.5400, -5.5471]);
      setMapZoom(7);
    }
  }, [selectedLotissement, customCenter, customZoom]);
  
  const filteredLots = useMemo(() => 
    selectedIlot 
      ? lots.filter(lot => lot.id_ilot === selectedIlot.id)
      : lots,
    [lots, selectedIlot]
  );
  
  const filteredIlots = useMemo(() =>
    selectedIlot 
      ? ilots.filter(ilot => ilot.id === selectedIlot.id)
      : ilots,
    [ilots, selectedIlot]
  );
  
  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-slate-200 [&_div.leaflet-pane]:z-0">
      <MapContainer
        center={[7.592155, -5.37025]}
        zoom={7}
        className="w-full h-full"
        scrollWheelZoom={true}
        maxZoom={MAP_MAX_ZOOM}
      >
        <MapController center={mapCenter} zoom={mapZoom} />
        
        {/* key : recrée entièrement la couche à chaque changement de fond (options, attribution) */}
        <TileLayer
          key={selectedLayer}
          attribution={TILE_LAYERS[selectedLayer].attribution}
          url={TILE_LAYERS[selectedLayer].url}
          maxZoom={MAP_MAX_ZOOM}
          {...TILE_LAYERS[selectedLayer].options}
        />
        
        <MapContent 
          lots={lots}
          ilots={ilots}
          showLots={showLots}
          showIlots={showIlots}
          onLotClick={onLotClick}
          selectedLotissement={selectedLotissement}
          attributaires={attributaires}
          statutColors={statutColors}
          filteredLots={filteredLots}
          filteredIlots={filteredIlots}
          statusFilter={statusFilter}
        />
      </MapContainer>
      
      {/* Sélecteur de fonds de carte */}
      <div className="absolute top-4 right-4 z-[100]">
        <button
          onClick={() => setLayerMenuOpen(!layerMenuOpen)}
          className="bg-white w-8 h-8 rounded shadow-md flex items-center justify-center hover:bg-gray-50 border border-gray-300"
          title="Fonds de carte"
        >
          <Layers className="w-4 h-4 text-gray-700" />
        </button>
        
        {layerMenuOpen && (
          <div className="absolute top-10 right-0 bg-white rounded shadow-lg border border-gray-300 py-1 min-w-[140px]">
            {Object.entries(TILE_LAYERS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedLayer(key);
                  setLayerMenuOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors",
                  selectedLayer === key && "bg-blue-50 text-blue-600 font-medium"
                )}
              >
                {layer.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 z-[100]">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Légende</h4>
        <div className="space-y-1.5">
          {legendEntries.map(([statut, config]) => (
            <div key={statut} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border-2"
                style={{ 
                  borderColor: config.couleur,
                  backgroundColor: config.fond
                }}
              />
              <span className="text-xs text-slate-600">{displayStatut(statut)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}