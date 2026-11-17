import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function extractUrlFromConfigValue(valeur) {
  if (!valeur) return '';
  if (typeof valeur === 'object' && valeur.url) return String(valeur.url).trim();
  if (typeof valeur === 'string') {
    const s = valeur.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    try {
      const obj = JSON.parse(s);
      if (obj?.url) return String(obj.url).trim();
      if (obj?.value) return String(obj.value).trim();
    } catch (_) {}
  }
  return '';
}

function replacePlaceholders(str, map) {
  if (!str) return '';
  return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (map && k in map ? String(map[k] ?? '') : ''));
}

function formatCoverDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-');
    return `${day}/${month}/${year}`;
  }
  return text;
}

export default function CoverPreview({ lotissement, volume, familyName, exportRef }) {
  const { data: armoirieCfg = [] } = useQuery({
    queryKey: ['config-armoirie'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'armoirie' }),
  });

  const { data: themeCfg = [] } = useQuery({
    queryKey: ['config-theme'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'theme' }),
  });

  const { data: coverCfg = [] } = useQuery({
    queryKey: ['config-coverpage'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'cover_page' }),
  });

  const accent = '#F57C00';
  const orangeColor = '#F57C00';
  const greenColor = '#2E7D32';
  const cover = coverCfg?.[0]?.valeur || {};
  const cgesnLogoDefault = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696e905b63602ecb4e50760b/c5bb7384d_images.png';
  const mcluLogoDefault = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696e905b63602ecb4e50760b/4b7a1c449_logo_MCLU.png';
  const leftLogoUrl = extractUrlFromConfigValue(cover.left_logo_url) || cgesnLogoDefault;
  const rightLogoUrl = extractUrlFromConfigValue(cover.right_logo_url) || mcluLogoDefault;

  if (!lotissement) return null;

  const nom = String(lotissement.nom || '').toUpperCase();
  const region = String(lotissement.region || '').toUpperCase();
  const regionDisplay = region.replace(/^(REGION|RÉGION)\s+/, '').trim();
  const commune = String(lotissement.commune || '').toUpperCase();
  const hasCommune = !!String(lotissement.commune || '').trim();
  const decret = lotissement.decret;
  const decretDisplay = (() => {
    const d = String(decret || '');
    return d.replace('N°16-008/MCU/DGUF/DU/SDAF', 'N°16-0080/MCU/DGUF/DU/SDAF');
  })();

  // Derived fields from configuration (single definitions)
  const documentTitle = String(cover.document_nom || 'GUIDE').toUpperCase();
  function computeCtx() {
    const raw = String(lotissement.nom || '').trim().toUpperCase();
    const directVillage = String(lotissement.village || '').trim().toUpperCase();
    const v = directVillage || (raw ? raw.split(/\s+/)[0] : '');
    const communeCoreBase = String(commune || '').replace(/^(COMMUNE\s+DE\s+|COMMUNE\s+)/i, '').toUpperCase().trim();
    return {
      region: regionDisplay,
      sous_prefecture: String(cover.sous_prefecture || lotissement.sous_prefecture || '').toUpperCase().trim(),
      commune: communeCoreBase,
      village: v,
      nom_lotissement: nom,
      numero_approbation: decretDisplay,
      background_image: ''
    };
  }
  const lotNomTpl = String(cover.lotissement_nom || '').trim();
  const hasLotTpl = /\{\{\s*\w+\s*\}\}/.test(lotNomTpl);
  const displayLotissementNom = String(hasLotTpl ? replacePlaceholders(lotNomTpl, computeCtx()) : nom).toUpperCase();
  const lotissementTitleDisplay = String(cover.titre_lotissement || '').trim().toUpperCase();
  const decretTpl = String(cover.arrete_approbation || '').trim();
  const hasDecretTpl = /\{\{\s*\w+\s*\}\}/.test(decretTpl);
  const decretFinal = String(hasDecretTpl ? replacePlaceholders(decretTpl, computeCtx()) : decretTpl).trim();
  const coverDateDisplay = formatCoverDate(cover.date_couverture);
  const familyNameDisplay = String(familyName || '').trim().toUpperCase();

  const village = (() => {
    const direct = String(lotissement.village || '').trim().toUpperCase();
    if (direct) return direct;
    const raw = String(lotissement.nom || '').trim().toUpperCase();
    if (!raw) return '';
    const parts = raw.split(/\s+/);
    return parts[0] || '';
  })();
  const communeCoreBase = String(commune || '').replace(/^(COMMUNE\s+DE\s+|COMMUNE\s+)/i, '').toUpperCase().trim();
  const ctx = {
    region: regionDisplay,
    sous_prefecture: String(cover.sous_prefecture || lotissement.sous_prefecture || '').toUpperCase().trim(),
    commune: communeCoreBase,
    village,
    nom_lotissement: nom,
    numero_approbation: decretDisplay,
    background_image: ''
  };
  const paysTextRaw = String(cover.pays || "CÔTE D'IVOIRE").toUpperCase();
  const paysCore = paysTextRaw.replace(/^(RÉPUBLIQUE|REPUBLIQUE)\s+DE\s+/, '').trim();
  const headerCountry = `RÉPUBLIQUE DE ${paysCore}`;

  const ministereNom = String(cover.ministere_nom || "MINISTERE DE LA CONSTRUCTION, DU LOGEMENT ET DE L'URBANISME.").toUpperCase();
  const bgTpl = String(cover.background_image_url || '').trim();
  const hasBgTpl = /\{\{\s*\w+\s*\}\}/.test(bgTpl);
  const backgroundImageUrl = extractUrlFromConfigValue(hasBgTpl ? replacePlaceholders(bgTpl, ctx) : bgTpl);
  const villageTpl = String(cover.localite_nom || '').trim();
  const hasVillageTpl = /\{\{\s*\w+\s*\}\}/.test(villageTpl);
  const villageResolved = hasVillageTpl ? replacePlaceholders(villageTpl, ctx) : (villageTpl || village || '');
  const villageName = String(villageResolved).toUpperCase().replace(/^(VILLAGE)(\s+DE\s+)?/, '').trim();



  const regionFromCoverTpl = String(cover.region || '').trim();
  const hasRegionTpl = /\{\{\s*\w+\s*\}\}/.test(regionFromCoverTpl);
  const regionFromCover = (hasRegionTpl ? replacePlaceholders(regionFromCoverTpl, ctx) : region).toUpperCase();
  const regionForDisplay = (regionFromCover || region).replace(/^(REGION|RÉGION)\s+/, '').trim();
  const sousPrefectureTpl = String(cover.sous_prefecture || '').trim();
  const hasSousPrefectureTpl = /\{\{\s*\w+\s*\}\}/.test(sousPrefectureTpl);
  const sousPrefectureFromCover = (hasSousPrefectureTpl ? replacePlaceholders(sousPrefectureTpl, ctx) : String(cover.sous_prefecture || lotissement.sous_prefecture || '')).toUpperCase();
  const sousPrefectureForDisplay = (sousPrefectureFromCover || '').replace(/^(SOUS[-\s]PR[ÉE]FECTURE\s+DE\s+|SOUS[-\s]PR[ÉE]FECTURE\s+)/, '').trim();
  const communeFromCoverTpl = String(cover.commune || '').trim();
  const hasCommuneTpl = /\{\{\s*\w+\s*\}\}/.test(communeFromCoverTpl);
  const communeFromCover = (hasCommuneTpl ? replacePlaceholders(communeFromCoverTpl, ctx) : commune).toUpperCase();
  const communeForDisplay = hasCommune
    ? (communeFromCover || commune).replace(/^(COMMUNE\s+DE\s+|COMMUNE\s+)/, '').trim()
    : '';
  const operationTextUpper = String(cover.type_operation || 'RÉGULARISATION DU PLAN DE LOTISSEMENT').toUpperCase();



  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle style={{ color: accent }}>Page de garde (aperçu)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 sm:p-8">
          <div
            ref={exportRef}
            className="relative overflow-hidden rounded-md border border-slate-300"
            style={{ aspectRatio: '297/210', backgroundColor: '#f3f4f6' }}
          >
            {/* Image de fond + overlay */}
            {backgroundImageUrl && (
              <img src={backgroundImageUrl} alt="Fond" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <div className="absolute inset-0 bg-white/80" />

            {/* En-tête: gauche/droite */}
            <div className="absolute top-6 left-8 right-8 flex items-start justify-between">
              {/* Bloc gauche (modèle centré) */}
              <div className="text-slate-800 text-[11px] leading-5 text-center">
                {regionForDisplay && (
                  <div className="font-extrabold tracking-wide">{`RÉGION ${/^(DE|DES|DU|D’|D')\s+/.test(regionForDisplay) ? '' : 'DE '}${regionForDisplay}`}</div>
                )}
                {sousPrefectureForDisplay && (
                  <div className="font-medium">SOUS-PRÉFECTURE DE {sousPrefectureForDisplay}</div>
                )}
                {communeForDisplay && (
                  <div className="italic">COMMUNE DE {communeForDisplay}</div>
                )}
                {(regionForDisplay || sousPrefectureForDisplay || communeForDisplay) && (
                  <div className="h-[1px] w-14 bg-slate-700 my-1 mx-auto" />
                )}
                {villageName && (
                  <div className="font-extrabold text-blue-700 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]">VILLAGE DE {villageName}</div>
                )}
              </div>

              {/* Bloc droit (centré) */}
              <div className="w-[52%] text-center">
                <div className="text-center text-[11px] font-bold" style={{ color: '#F57C00' }}>{headerCountry}</div>
                <div className="flex justify-center my-2">
                  <img src={rightLogoUrl} alt="Logo officiel" className="h-14 object-contain" />
                </div>
                <div className="text-center text-[8px] sm:text-[9px] md:text-[10px] font-bold whitespace-nowrap" style={{ color: '#1B5E20' }}>
                  {ministereNom}
                </div>
              </div>
            </div>

            {/* Contenu centré */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                {lotissementTitleDisplay && (
                  <div className="mb-5 -translate-x-3 text-sm sm:text-lg md:text-xl font-semibold tracking-[0.2em] text-slate-700">
                    {lotissementTitleDisplay}
                  </div>
                )}
                <div className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-wide" style={{ color: '#006A4E' }}>
                  {displayLotissementNom || 'LOTISSEMENT'}
                </div>
                {familyNameDisplay && (
                  <div className="mt-3 text-lg sm:text-2xl font-semibold text-slate-800">
                    {familyNameDisplay}
                  </div>
                )}
                {decretFinal && (
                  <div className="mt-3 text-xs sm:text-sm text-slate-700">
                    ARRÊTÉ D’APPROBATION N° {decretFinal}
                  </div>
                )}
              </div>
            </div>

            {coverDateDisplay && (
              <div className="absolute bottom-14 right-8 text-sm font-medium text-slate-700">
                {coverDateDisplay}
              </div>
            )}

            {/* Pied de page: bandeau bicolore */}
            <div className="absolute bottom-0 left-0 right-0 h-8 flex">
              <div style={{ width: '75%', backgroundColor: orangeColor }} />
              <div style={{ width: '25%', backgroundColor: greenColor }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}