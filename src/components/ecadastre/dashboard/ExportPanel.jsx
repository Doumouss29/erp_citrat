import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Map, FileText, Loader2, FileSpreadsheet, ChevronDown, ChevronUp, MapPinOff } from 'lucide-react';
import { collectesToGeoJSON, downloadGeoJSON } from '@/utils/ecadastre/geoJsonExport';

/**
 * Convertit un tableau de collectes en CSV et le télécharge
 */
function collectesToCSV(collectes, filename) {
  if (!collectes.length) return;

  const fields = [
    'id', 'commune', 'section', 'parcelle', 'lot', 'ilot', 'quartier',
    'reference_dgi', 'statut', 'date_collecte',
    'type_proprietaire',
    'prop_nom', 'prop_prenoms', 'prop_tel', 'prop_carte_identite',
    'societe_raison_sociale', 'societe_registre_commerce', 'societe_tel',
    'bien_nature_local', 'bien_nature_occupation', 'bien_nombre_niveaux',
    'bien_nombre_batiments', 'bien_nombre_pieces', 'bien_valeur_locative_mensuelle',
    'bien_annee_achevement', 'bien_equipe_eau', 'bien_equipe_electricite',
    'surface_imposable', 'valeur_venale',
    'latitude', 'longitude',
    'signature_agent', 'created_date',
  ];

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = fields.join(',');
  const rows = collectes.map(c => fields.map(f => escape(c[f])).join(','));
  const csv = [header, ...rows].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.download = filename || `collectes_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportPanel({ collectes, commune, dateLabel }) {
  const [exportingGeoJson, setExportingGeoJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const count = collectes?.length || 0;
  const [showNoGps, setShowNoGps] = useState(false);

  const collectesAvecGps = (collectes || []).filter(c => {
    const lat = parseFloat(c.latitude);
    const lon = parseFloat(c.longitude);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  });
  const countWithGps = collectesAvecGps.length;
  const collectesSansGps = (collectes || []).filter(c => {
    const lat = parseFloat(c.latitude);
    const lon = parseFloat(c.longitude);
    return isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180;
  });

  // Construit un nom de fichier : COMMUNE_periode (sans espaces ni caractères spéciaux)
  const buildFilename = (ext) => {
    const cleanCommune = (commune || 'export').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const cleanPeriode = (dateLabel || '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return cleanPeriode ? `${cleanCommune}_${cleanPeriode}.${ext}` : `${cleanCommune}.${ext}`;
  };

  const handleExportGeoJson = () => {
    setExportingGeoJson(true);
    try {
      const geoJson = collectesToGeoJSON(collectes);
      downloadGeoJSON(geoJson, buildFilename('geojson'));
    } finally {
      setExportingGeoJson(false);
    }
  };

  const handleExportCsv = () => {
    setExportingCsv(true);
    try {
      collectesToCSV(collectes, buildFilename('csv'));
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Exports SIG</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {count} collecte{count > 1 ? 's' : ''} filtrée{count > 1 ? 's' : ''}
            {commune ? ` · ${commune}` : ''}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </p>
        </div>
        <div className="text-3xl font-bold text-blue-700">{count}</div>
      </div>

      {count === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-4">
          Aucune collecte pour les filtres sélectionnés
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* GeoJSON */}
          <button
            onClick={handleExportGeoJson}
            disabled={exportingGeoJson}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200">
              {exportingGeoJson
                ? <Loader2 className="w-5 h-5 text-purple-700 animate-spin" />
                : <Map className="w-5 h-5 text-purple-700" />
              }
            </div>
            <div>
              <p className="font-bold text-slate-800">GeoJSON</p>
              <p className="text-xs text-slate-500">Format SIG · QGIS, ArcGIS, MapInfo</p>
              <p className="text-xs text-purple-600 font-semibold">{countWithGps} avec coordonnées GPS</p>
            </div>
          </button>

          {/* CSV */}
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200">
              {exportingCsv
                ? <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                : <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              }
            </div>
            <div>
              <p className="font-bold text-slate-800">CSV</p>
              <p className="text-xs text-slate-500">Tableur · Excel, Calc, Google Sheets</p>
            </div>
          </button>
        </div>
      )}
      {collectesSansGps.length > 0 && (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowNoGps(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <MapPinOff className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                {collectesSansGps.length} collecte{collectesSansGps.length > 1 ? 's' : ''} sans coordonnées GPS
              </span>
            </div>
            {showNoGps ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </button>
          {showNoGps && (
            <div className="divide-y divide-amber-100">
              {collectesSansGps.map((c, i) => (
                <div key={c.id || i} className="px-4 py-3 bg-white hover:bg-amber-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        {c.section ? `Section ${c.section}` : ''}
                        {c.parcelle ? ` · Parcelle ${c.parcelle}` : ''}
                        {c.lot ? ` · Lot ${c.lot}` : ''}
                        {c.ilot ? ` · Îlot ${c.ilot}` : ''}
                        {!c.section && !c.parcelle && !c.lot && !c.ilot ? 'Parcelle non renseignée' : ''}
                        {c.reference_dgi ? <span className="ml-2 text-xs font-normal text-slate-400">Réf: {c.reference_dgi}</span> : null}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {c.quartier && <span className="text-xs text-slate-400">📍 {c.quartier}</span>}
                        {c.signature_agent && <span className="text-xs text-slate-400">🧑‍💼 {c.signature_agent}</span>}
                        {c.date_collecte && <span className="text-xs text-slate-400">📅 {c.date_collecte}</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                      c.statut === 'validee' ? 'bg-green-100 text-green-700' :
                      c.statut === 'brouillon' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {c.statut || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}