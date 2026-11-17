import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';

// Limites de fusion
const MERGE_LIMITS = {
  MAX_DOCS: 20,
  MAX_TOTAL_BYTES: 15 * 1024 * 1024, // 15MB
  MAX_TOTAL_PAGES: 400,
  FETCH_TIMEOUT_MS: 600000, // 10 minutes
};

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchImageAsDataUrl(url) {
  validateFetchUrl(url);
  const res = await safeFetch(url);
  if (!res.ok) throw new Error(`Fetch image failed (${res.status})`);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const bytes = new Uint8Array(await res.arrayBuffer());
  const b64 = bytesToBase64(bytes);
  if (contentType.includes('png')) return { dataUrl: `data:image/png;base64,${b64}`, fmt: 'PNG' };
  return { dataUrl: `data:image/jpeg;base64,${b64}`, fmt: 'JPEG' };
}

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
    } catch {}
  }
  return '';
}

async function addArmoirieFromConfig(doc, base44, { x = 15, y = 12, w = 22, h = 22 } = {}) {
  try {
    const configs = await base44.asServiceRole.entities.ConfigurationApp.filter({ cle: 'armoirie' }, '', 10);
    if (!configs?.length) return false;
    const url = extractUrlFromConfigValue(configs[0].valeur);
    if (!url) return false;
    const img = await fetchImageAsDataUrl(url);
    doc.addImage(img.dataUrl, 'PNG', x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/é/g, 'e').replace(/É/g, 'E')
    .replace(/è/g, 'e').replace(/È/g, 'E')
    .replace(/ê/g, 'e').replace(/Ê/g, 'E')
    .replace(/ë/g, 'e').replace(/Ë/g, 'E')
    .replace(/à/g, 'a').replace(/À/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/ô/g, 'o').replace(/Ô/g, 'O')
    .replace(/ù/g, 'u').replace(/Ù/g, 'U')
    .replace(/û/g, 'u').replace(/Û/g, 'U')
    .replace(/ï/g, 'i').replace(/Ï/g, 'I')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

function isAttestationDocument(d) {
  const desc = String(d?.description || '').toLowerCase();
  const name = String(d?.nom_fichier || '').toLowerCase();
  const type = String(d?.type_document || '').toLowerCase();
  return type === 'attestation'
    || desc === '__attestation_cession__'
    || desc === '__attestation_lot__'
    || desc.includes('attestation_cession')
    || desc.includes('attestation_lot')
    || name.includes('attestation_cession')
    || name.includes('attestation cession')
    || name.includes('attestation_lot')
    || name.includes('attestation lot');
}

function isGuideDocument(d) {
  const desc = String(d?.description || '').toLowerCase();
  return desc === '__guide_global__';
}

function isProbablyCoverDocument(d) {
  const name = String(d?.nom_fichier || '').toLowerCase();
  const desc = String(d?.description || '').toLowerCase();
  const type = String(d?.type_document || '').toLowerCase();
  const hasCoverWord = name.includes('couverture') || name.includes('cover') || name.includes('page_de_garde') || name.includes('page de garde');
  const descCover = desc.includes('couverture') || desc.includes('cover') || desc.includes('page_de_garde') || desc.includes('page de garde') || desc === '__cover__';
  return type === 'cover' || hasCoverWord || descCover;
}

function isEligibleSelectedDocument(d, selectedDocumentIdsSet) {
  if (!d?.url_fichier) return false;
  if (isProbablyCoverDocument(d) || isGuideDocument(d) || isAttestationDocument(d)) return false;
  if (selectedDocumentIdsSet) return selectedDocumentIdsSet.has(d.id);
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'lotissement');
    if (denied) return denied;
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const id_lotissement = body?.id_lotissement;
    const familyName = String(body?.family_name || '').trim().toUpperCase();
    const volume = body?.volume || '';
    const selectedDocumentIdsSet = Array.isArray(body?.selected_document_ids)
      ? new Set(body.selected_document_ids.filter(Boolean))
      : null;

    if (!id_lotissement) {
      return Response.json({ error: 'Lotissement manquant' }, { status: 400 });
    }

    const lotissement = await base44.entities.LotissementEguide.get(id_lotissement);

    // 1) Page de garde en mode paysage (identique à l'aperçu)
    const cover = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWc = cover.internal.pageSize.getWidth();
    const pageHc = cover.internal.pageSize.getHeight();

    // Couleurs
    const orangeRGB = { r: 245, g: 124, b: 0 }; // #F57C00
    const greenRGB = { r: 46, g: 125, b: 50 };   // #2E7D32

    // Charger config (logos, libellés...)
    const allCfgs = await base44.asServiceRole.entities.ConfigurationApp.filter({ cle: { $nin: ['_eguide_archive_prive', '_eguide_import_maps'] } }, '', 200);
    const cfgMap = {};
    (allCfgs || []).forEach((c) => { cfgMap[c.cle] = c.valeur; });
    const coverConf = cfgMap?.cover_page || {};

    const cgesnDefault = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696e905b63602ecb4e50760b/c5bb7384d_images.png';
    const mcluDefault = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696e905b63602ecb4e50760b/4b7a1c449_logo_MCLU.png';
    const rightLogoUrl = extractUrlFromConfigValue(coverConf.right_logo_url) || mcluDefault;

    const paysRaw = String(coverConf.pays || "CÔTE D'IVOIRE").toUpperCase();
    const paysCore = paysRaw.replace(/^(RÉPUBLIQUE|REPUBLIQUE)\s+DE\s+/, '').trim();
    const headerCountry = `RÉPUBLIQUE DE ${paysCore}`;

    // Nettoyage des labels
    const regionDisp = String(lotissement.region || '').toUpperCase().replace(/^(REGION|RÉGION)\s+/, '').trim();
    const sousPrefectureDisp = String(coverConf.sous_prefecture || lotissement.sous_prefecture || '').toUpperCase().replace(/^(SOUS[-\s]PR[ÉE]FECTURE\s+DE\s+|SOUS[-\s]PR[ÉE]FECTURE\s+)/, '').trim();
    const communeDisp = String(lotissement.commune || '').trim()
      ? String(lotissement.commune || '').toUpperCase().replace(/^(COMMUNE\s+DE\s+|COMMUNE\s+)/, '').trim()
      : '';
    const displayLotissementNom = String((coverConf.lotissement_nom || lotissement.nom || 'LOTISSEMENT')).toUpperCase();
    const lotissementTitle = String(coverConf.titre_lotissement || '').trim().toUpperCase();
    const coverDateText = (() => {
      const raw = String(coverConf.date_couverture || '').trim();
      if (!raw) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-');
        return `${day}/${month}/${year}`;
      }
      return raw;
    })();
    const decretFront = (() => {
      const d = String(coverConf.arrete_approbation || '');
      return d.replace('N°16-008/MCU/DGUF/DU/SDAF', 'N°16-0080/MCU/DGUF/DU/SDAF');
    })();

    // Fond
    cover.setFillColor(255, 255, 255);
    cover.rect(0, 0, pageWc, pageHc, 'F');

    // Coins décoratifs supprimés pour correspondre à l’aperçu

    // Arrière-plan image (faible opacité)
    try {
      const bgUrl = extractUrlFromConfigValue(coverConf.background_image_url);
      if (bgUrl) {
        const bgImg = await fetchImageAsDataUrl(bgUrl);
        try { const gs = new cover.GState({ opacity: 0.18 }); cover.setGState(gs); } catch (_) {}
        cover.addImage(bgImg.dataUrl, bgImg.fmt, 0, 0, pageWc, pageHc);
        try { const gs2 = new cover.GState({ opacity: 1 }); cover.setGState(gs2); } catch (_) {}
      }
    } catch (_) {}

    // Header droit
    const margin = 14;
    const rightW = 120;
    const rightX = pageWc - margin - rightW;

    cover.setFont('helvetica', 'bold');
    cover.setFontSize(10);
    cover.setTextColor(245, 124, 0);
    cover.text(cleanText(headerCountry), rightX + rightW / 2, 16, { align: 'center' });

    try {
      const rImg = await fetchImageAsDataUrl(rightLogoUrl);
      const lw = 26, lh = 18; const lx = rightX + (rightW - lw) / 2;
      cover.addImage(rImg.dataUrl, rImg.fmt, lx, 19, lw, lh);
    } catch (_) {}

    const ministere = cleanText(String(coverConf.ministere_nom || "MINISTERE DE LA CONSTRUCTION, DU LOGEMENT ET DE L'URBANISME.").toUpperCase());
    cover.setFont('helvetica', 'bold');
    cover.setTextColor(27, 94, 32);
    cover.setFontSize(8);
    cover.text(ministere, rightX + rightW / 2, 41, { align: 'center' });

    // Bloc gauche centré
    cover.setTextColor(15, 23, 42);
    let y = 16; const xL = margin; const blockW = 60; const centerX = xL + blockW / 2;
    if (regionDisp) {
      cover.setFont('helvetica', 'bold'); cover.setFontSize(10);
      const needsDe = !/^(DE|DES|DU|D’|D')\s+/.test(regionDisp);
      const regionLabel = `RÉGION ${needsDe ? 'DE ' : ''}${regionDisp}`;
      cover.text(cleanText(regionLabel), centerX, y, { align: 'center' }); y += 6;
    }
    if (sousPrefectureDisp) {
      cover.setFont('helvetica', 'normal'); cover.setFontSize(10);
      cover.text(cleanText(`SOUS-PRÉFECTURE DE ${sousPrefectureDisp}`), centerX, y, { align: 'center' }); y += 5;
    }
    if (communeDisp) {
      cover.setFont('helvetica', 'italic'); cover.setFontSize(10);
      cover.text(cleanText(`COMMUNE DE ${communeDisp}`), centerX, y, { align: 'center' }); y += 3;
    }
    cover.setDrawColor(51, 65, 85); cover.setLineWidth(0.5); cover.line(centerX - 10, y + 1, centerX + 10, y + 1); y += 4;
    const villageModel = cleanText(String(((coverConf.localite_nom || lotissement.village || lotissement.nom || ''))).toUpperCase().replace(/^(VILLAGE)(\s+DE\s+)?/, '').trim().split(/\s+/)[0] || '');
    if (villageModel) { cover.setFont('helvetica','bold'); cover.setTextColor(29, 78, 216); cover.setFontSize(10.5); cover.text(`VILLAGE DE ${villageModel}`, centerX, y + 4, { align: 'center' }); cover.setTextColor(15, 23, 42); }

    // Titre centré aligné à l'aperçu
    const contentCenterY = lotissementTitle ? pageHc / 2 + 12 : pageHc / 2 + 6;
    const contentCenterX = pageWc / 2 - 2;
    const titleCenterX = contentCenterX - 14;
    const lotissementNameY = contentCenterY + 2;

    if (lotissementTitle) {
      cover.setFont('helvetica', 'bold');
      cover.setTextColor(51, 65, 85);
      cover.setFontSize(15);
      try { if (typeof cover.setCharSpace === 'function') cover.setCharSpace(2.8); } catch (_) {}
      cover.text(lotissementTitle, titleCenterX, contentCenterY - 24, { align: 'center' });
      try { if (typeof cover.setCharSpace === 'function') cover.setCharSpace(0); } catch (_) {}
    }

    cover.setFont('helvetica', 'bold'); cover.setTextColor(0, 106, 78); cover.setFontSize(46);
    try { if (typeof cover.setCharSpace === 'function') cover.setCharSpace(0.6); } catch (_) {}
    cover.text(displayLotissementNom, contentCenterX, lotissementNameY, { align: 'center' });
    try { if (typeof cover.setCharSpace === 'function') cover.setCharSpace(0); } catch (_) {}

    if (familyName) {
      cover.setFont('helvetica', 'bold');
      cover.setTextColor(30, 41, 59);
      cover.setFontSize(18);
      cover.text(familyName, contentCenterX, lotissementNameY + 16, { align: 'center' });
    }

    if (decretFront) { cover.setFont('helvetica', 'normal'); cover.setTextColor(51, 65, 85); cover.setFontSize(11); cover.text(`ARRÊTÉ D’APPROBATION N° ${decretFront.toUpperCase()}` , contentCenterX, familyName ? lotissementNameY + 26 : lotissementNameY + 14, { align: 'center' }); }

    if (coverDateText) {
      cover.setFont('helvetica', 'normal');
      cover.setTextColor(71, 85, 105);
      cover.setFontSize(12);
      cover.text(coverDateText, pageWc - 14, pageHc - 18, { align: 'right' });
    }

    // Bandeau bas bicolore
    const barH = 8;
    cover.setFillColor(orangeRGB.r, orangeRGB.g, orangeRGB.b); cover.rect(0, pageHc - barH, pageWc * 0.75, barH, 'F');
    cover.setFillColor(greenRGB.r, greenRGB.g, greenRGB.b); cover.rect(pageWc * 0.75, pageHc - barH, pageWc * 0.25, barH, 'F');

    const coverBytes = cover.output('arraybuffer');

    // 2) Fusionner avec les documents officiels (PDF)
    const merged = await PDFDocument.create();

    // Ajouter la couverture
    const coverDoc = await PDFDocument.load(coverBytes);
    const coverPages = await merged.copyPages(coverDoc, coverDoc.getPageIndices());
    coverPages.forEach((p) => merged.addPage(p));

    try {
      const docs = await base44.entities.Document.filter({ id_lotissement }, '', 1000);
      const sortedDocs = [...docs].sort((a, b) => {
        const pa = a.type_document === 'decret' ? 1 : 0;
        const pb = b.type_document === 'decret' ? 1 : 0;
        if (pa !== pb) return pb - pa; // decret d'abord
        const da = new Date(a.created_date || 0).getTime();
        const db = new Date(b.created_date || 0).getTime();
        return db - da; // puis recents
      });

      let totalBytes = (coverBytes?.byteLength) || 0;
      let totalPages = coverPages.length;
      let addedDocs = 0;

      for (const d of sortedDocs) {
        if (addedDocs >= MERGE_LIMITS.MAX_DOCS) break;
        if (totalBytes >= MERGE_LIMITS.MAX_TOTAL_BYTES) break;
        if (totalPages >= MERGE_LIMITS.MAX_TOTAL_PAGES) break;

        const url = d.url_fichier;
        if (!isEligibleSelectedDocument(d, selectedDocumentIdsSet)) continue;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), MERGE_LIMITS.FETCH_TIMEOUT_MS);
        let res;
        try {
          validateFetchUrl(url);
          res = await safeFetch(url, { signal: controller.signal });
        } catch (_) {
          clearTimeout(timer);
          continue;
        }
        clearTimeout(timer);

        if (!res.ok) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('pdf')) continue;

        const clHeader = res.headers.get('content-length');
        if (clHeader) {
          const cl = parseInt(clHeader, 10);
          if (isFinite(cl) && cl > 0 && (totalBytes + cl) > MERGE_LIMITS.MAX_TOTAL_BYTES) {
            break;
          }
        }

        let extBytes;
        try {
          extBytes = await res.arrayBuffer();
        } catch (_) {
          continue;
        }
        if ((totalBytes + extBytes.byteLength) > MERGE_LIMITS.MAX_TOTAL_BYTES) break;

        try {
          const extDoc = await PDFDocument.load(extBytes);
          const extPages = await merged.copyPages(extDoc, extDoc.getPageIndices());
          if ((totalPages + extPages.length) > MERGE_LIMITS.MAX_TOTAL_PAGES) break;
          extPages.forEach((p) => merged.addPage(p));
          totalBytes += extBytes.byteLength;
          totalPages += extPages.length;
          addedDocs += 1;
        } catch (_) {
          // ignorer si illisible
        }
      }
    } catch (_) {
      // on renvoie au moins la couverture
    }

    const finalBytes = await merged.save();

    return new Response(finalBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=couverture_et_documents_${String(lotissement.nom || 'lotissement').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      },
    });
  } catch (error) {
    console.error('downloadCoverAndDocs:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});