import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { Buffer } from 'npm:buffer@6.0.3';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';
import { hsePerms, quarterBounds, nextQuarter, filterEvents, photoCandidates, MAX_PHOTOS } from '../../shared/hseRapport.ts';

// Annexe photos : image téléchargée puis réduite (1400 px max, JPEG) pour garder un PDF léger.
// Si la réduction est impossible, l'image d'origine est utilisée (JPEG/PNG), sinon un cadre vide.
async function loadPdfImage(url) {
  try {
    validateFetchUrl(url);
    const res = await safeFetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12 * 1024 * 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    try {
      const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');
      const img = await Image.decode(bytes);
      const max = 1400;
      if (img.width > max || img.height > max) {
        if (img.width >= img.height) img.resize(max, Image.RESIZE_AUTO);
        else img.resize(Image.RESIZE_AUTO, max);
      }
      const jpg = await img.encodeJPEG(72);
      return { data: jpg, fmt: 'JPEG', w: img.width, h: img.height };
    } catch (_e) {
      if (isJpeg || isPng) return { data: bytes, fmt: isJpeg ? 'JPEG' : 'PNG', w: 0, h: 0 };
      return null;
    }
  } catch (_e) {
    return null;
  }
}

// Cache des polices Unicode (Inter) embarquees pour le support des accents francais.
let fontCache = null;

// Normalise le texte pour jsPDF helvetica (WinAnsiEncoding) :
// on PRESERVE les accents francais (e, a, c, u...) qui sont supportes,
// on remplace juste les caracteres Unicode non supportes (fleches, tirets longs, indices, guillemets courbes).
const s = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[→←↔]/g, '->')
    .replace(/[–—]/g, '-')
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[₀]/g, '0').replace(/[₁]/g, '1');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'hse');
    if (denied) return denied;
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Récupérer le cookie et le header Authorization pour les fetch d'images
    const authCookie = req.headers.get('cookie') || '';
    const authHeader = req.headers.get('authorization') || '';

    const { eventId, exportAll: legacyAll, rapportId } = await req.json();

    // Rapport trimestriel (entité RapportHSE) : période, zones, textes et annexes viennent du rapport.
    let R = null;
    if (rapportId) {
      const perms = await hsePerms(base44, user);
      if (!perms.canPrepare) return Response.json({ error: 'Seul le Référent HSE peut générer le rapport' }, { status: 403 });
      R = await base44.asServiceRole.entities.RapportHSE.get(String(rapportId)).catch(() => null);
      if (!R) return Response.json({ error: 'Rapport introuvable' }, { status: 404 });
      if (R.statut !== 'Brouillon') return Response.json({ error: 'Rapport validé : le PDF est figé' }, { status: 409 });
    }
    const exportAll = legacyAll || !!R;

    // Ancien rapport complet (toutes périodes) : administrateurs et profil "Référent HSE".
    // L'export d'une fiche individuelle reste accessible a tous les utilisateurs.
    if (legacyAll && !R && user.role !== 'admin') {
      const email = String(user.email || '').trim().toLowerCase();
      const responsables = await base44.asServiceRole.entities.ResponsableHSE.list('nom', 500).catch(() => []);
      const isReferent = (responsables || []).some((r) =>
        String(r.email || '').trim().toLowerCase() === email && r.profil === 'Référent HSE');
      if (!isReferent) {
        return Response.json({ error: 'Reserved to administrators and HSE referents' }, { status: 403 });
      }
    }

    let events = [];
    if (exportAll) {
      events = await base44.entities.HSEEvent.filter({}, 'fiche_number', 5000);
      if (R) events = filterEvents(events, R);
      events.sort((a, b) => a.fiche_number - b.fiche_number);
    } else if (eventId) {
      events = await base44.entities.HSEEvent.filter({ id: eventId });
    }

    if (events.length === 0 && !exportAll) {
      return Response.json({ error: 'No events found' }, { status: 404 });
    }

    const doc = new jsPDF();

    // Police Unicode embarquee (Inter) pour un rendu fiable des accents francais.
    // Les TTF statiques sont recuperes via jsDelivr puis enregistres en VFS sous le nom
    // 'helvetica' afin que tous les appels setFont('helvetica', ...) existants utilisent
    // automatiquement la police embarquee (normal / bold / italic). En cas d'echec de
    // telechargement, on retombe sur la police helvetica standard de jsPDF.
    if (fontCache === null) {
      try {
        const toB64 = async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error('font fetch ' + res.status);
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          return btoa(bin);
        };
        const [reg, bold, ital] = await Promise.all([
          toB64('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.4.2/400Regular/Inter_400Regular.ttf'),
          toB64('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.4.2/700Bold/Inter_700Bold.ttf'),
          toB64('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.4.2/400Regular_Italic/Inter_400Regular_Italic.ttf'),
        ]);
        fontCache = { reg, bold, ital };
      } catch (e) {
        fontCache = false;
      }
    }
    if (fontCache) {
      doc.addFileToVFS('helvetica.ttf', fontCache.reg);
      doc.addFont('helvetica.ttf', 'helvetica', 'normal');
      doc.addFileToVFS('helvetica-italic.ttf', fontCache.ital);
      doc.addFont('helvetica-italic.ttf', 'helvetica', 'italic');
      doc.addFileToVFS('helvetica-bold.ttf', fontCache.bold);
      doc.addFont('helvetica-bold.ttf', 'helvetica', 'bold');
      doc.setFont('helvetica', 'normal');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let pageNum = 1;

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
    };

    // Normalise le trajet en "DEPART -> ARRIVEE" quel que soit le format stocké
    const formatTrajet = (event) => {
      const dep = (event.departure_point || '').trim().toUpperCase();
      const arr = (event.arrival_point || '').trim().toUpperCase();
      if (dep && arr) return s(dep) + ' -> ' + s(arr);
      // Fallback : nettoyage des anciens champs location (ex: "Guiglo->Blolekin", "Axe Guiglo - Blolekin")
      const loc = (event.location || '').trim().toUpperCase();
      if (!loc) return '-';
      // Normalise les séparateurs divers en " -> "
      return s(loc
        .replace(/\s*->\s*/g, ' -> ')
        .replace(/^AXE\s+/i, '')
        .replace(/\s*-\s*/g, ' -> ')
      );
    };

    const addHeader = () => {
      // Pas d'en-tete sur les pages internes
    };

    const addFooter = () => {
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('GROUPEMENT CAG - Rapport HSE | ' + new Date().toLocaleDateString('fr-FR'), margin, pageHeight - 6);
      doc.text('Page ' + pageNum, pageWidth - margin, pageHeight - 6, { align: 'right' });
    };

    const newPage = () => {
      doc.addPage();
      pageNum++;
      addFooter();
    };

    // Saute a une nouvelle page s'il n'y a pas assez d'espace restant
    const ensureSpace = (needed) => {
      if (y + needed > pageHeight - 18) {
        newPage();
        y = 20;
      }
    };

    // Titre de section style Word : texte gras souligne, pas de fond
    const sectionTitle = (text, y) => {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(s(text).toUpperCase(), margin, y);
      doc.setDrawColor(30, 41, 59);
      doc.line(margin, y + 2, margin + contentWidth, y + 2);
      return y + 10;
    };

    // Sous-titre gras simple
    const subTitle = (text, y) => {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(s(text), margin, y);
      return y + 8;
    };

    // Texte normal
    const bodyText = (text, y, indent) => {
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(s(text), contentWidth - (indent || 0));
      doc.text(lines, margin + (indent || 0), y);
      return y + lines.length * 5;
    };

    // Ligne de tableau simple
    const tableHeader = (headers, colWidths, y) => {
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      let x = margin;
      headers.forEach((h, i) => {
        doc.text(s(h), x + 2, y + 5.5);
        x += colWidths[i];
      });
      return y + 8;
    };

    const tableRow = (cells, colWidths, y, isOdd) => {
      doc.setFillColor(isOdd ? 248 : 255, isOdd ? 248 : 255, isOdd ? 248 : 255);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + 8, margin + contentWidth, y + 8);
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      let x = margin;
      cells.forEach((cell, i) => {
        const t = doc.splitTextToSize(s(String(cell)), colWidths[i] - 3);
        doc.text(t[0], x + 2, y + 5.5);
        x += colWidths[i];
      });
      return y + 8;
    };

    // =====================================================
    // PAGE DE COUVERTURE
    // =====================================================
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 65, pageWidth, 120, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GROUPEMENT CAG', pageWidth / 2, 42, { align: 'center' });

    // Calcul dynamique de la periode
    const datesValides = events.filter(e => e.date_event).map(e => new Date(e.date_event)).sort((a,b)=>a-b);
    const moisFr = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    let periodeStr = 'Periode non definie';
    if (datesValides.length > 0) {
      const d1 = datesValides[0];
      const d2 = datesValides[datesValides.length - 1];
      if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
        periodeStr = moisFr[d1.getMonth()] + ' ' + d1.getFullYear();
      } else {
        periodeStr = moisFr[d1.getMonth()] + ' ' + d1.getFullYear() + ' - ' + moisFr[d2.getMonth()] + ' ' + d2.getFullYear();
      }
    }

    if (R) periodeStr = quarterBounds(R.annee, R.trimestre).label;
    const zonesLabel = R ? ((R.zones && R.zones.length ? R.zones : ['Worodougou', 'Cavally']).join(' et ')) : '';

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(R ? 'RAPPORT TRIMESTRIEL HSE' : 'RAPPORT PERIODIQUE HSE', pageWidth / 2, 86, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38);
    doc.text('ACCIDENTS - INCIDENTS - PRESQU\'ACCIDENTS', pageWidth / 2, 99, { align: 'center' });

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(margin + 20, 105, pageWidth - margin - 20, 105);

    // Periode
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Periode : ' + periodeStr + (R ? '   |   Zones : ' + zonesLabel : ''), pageWidth / 2, 116, { align: 'center' });

    // Rectangle zones d'intervention
    const zonesBoxX = margin + 10;
    const zonesBoxW = contentWidth - 20;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.rect(zonesBoxX, 121, zonesBoxW, 48, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ZONES D\'INTERVENTION', pageWidth / 2, 128, { align: 'center' });

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.3);
    doc.line(zonesBoxX + 4, 130, zonesBoxX + zonesBoxW - 4, 130);

    // Worodougou
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Worodougou :', zonesBoxX + 8, 137);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Séguéla  -  Worofla  -  Morondo  -  Massala  -  Ouahama  -  Notou  -  Somina  -  Sifie  -  Kouego', zonesBoxX + 8, 143);

    // Cavally
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Cavally :', zonesBoxX + 8, 153);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Guiglo  -  Blolequin  -  Nizahon  -  Tai  -  Keibly  -  Behebo  -  Oulaitaibly', zonesBoxX + 8, 159);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text('PROGRAMME DE RENFORCEMENT DE LA SÉCURISATION FONCIÈRE RURALE (PRESFOR)', pageWidth / 2, 212, { align: 'center' });
    doc.text('Document établi par le Département HSE - Groupement CAG', pageWidth / 2, 220, { align: 'center' });
    doc.text('Date d\'édition : ' + new Date().toLocaleDateString('fr-FR'), pageWidth / 2, 228, { align: 'center' });
    addFooter();

    // =====================================================
    // SOMMAIRE
    // =====================================================
    newPage();
    let y = 20;
    y = sectionTitle('SOMMAIRE', y);
    y += 4;

    // Annexes : fiches individuelles (optionnelles) puis photos (rapport trimestriel)
    const withFiches = !R || R.inclure_fiches !== false;
    const withPhotos = !!R && R.inclure_photos !== false;
    let annexNo = 11;
    const fichesSectionNo = withFiches ? annexNo++ : null;
    const photosSectionNo = withPhotos ? annexNo++ : null;
    const annexItems = [];
    if (withFiches) annexItems.push([fichesSectionNo + '.', 'Annexes - Fiches individuelles de consignation (ordre chronologique inverse)']);
    if (withPhotos) annexItems.push([photosSectionNo + '.', 'Annexe - Photos des événements du trimestre']);

    const sommItems = [
      ['1.', 'Introduction'],
      ['2.', 'Contexte opérationnel et période couverte'],
      ['3.', 'Indicateurs Clés HSE (KPI)'],
      ['4.', 'Codage standard utilisé'],
      ['5.', 'Registre consolidé des incidents et accidents'],
      ['6.', 'Analyse approfondie des événements significatifs'],
      ['7.', 'Plan d\'Actions Correctives et Préventives (CAPA)'],
      ['8.', 'Registre des risques'],
      ['9.', 'Suivi des recommandations antérieures'],
      ['10.', 'Conclusion et recommandations'],
      ...annexItems,
    ];

    sommItems.forEach(([num, titre], idx) => {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, margin + contentWidth, y);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', num ? 'bold' : 'normal');
      doc.text(num, margin + 2, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(s(titre), margin + 14, y + 6);
      y += 10;
    });

    // =====================================================
    // INTRODUCTION & CONTEXTE
    // =====================================================
    newPage();
    y = 20;

    y = sectionTitle('1. Introduction', y);
    const bodyTextLineSpaced = (text, startY, indent) => {
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text, contentWidth - (indent || 0));
      lines.forEach((line, i) => {
        doc.text(line, margin + (indent || 0), startY + i * 6);
      });
      return startY + lines.length * 6;
    };

    y = bodyTextLineSpaced('Dans le cadre de la mise en œuvre du Programme de Renforcement de la Sécurisation Foncière Rurale (PRESFOR), le Groupement CAG déploie des équipes terrain dans les régions du Worodougou et du Cavally. Ces opérations impliquent de nombreux déplacements sur des axes routiers souvent dégradés, exposant les agents à des risques significatifs en matière de sécurité.', y, 0);
    y += 5;
    y = bodyTextLineSpaced('Le présent rapport périodique HSE constitue un outil de pilotage et de suivi de la sinistralité sur la période ' + periodeStr + '. Il consolide l\'ensemble des événements déclarés (accidents, incidents et presqu\'accidents) par les agents et chefs d\'équipe sur le terrain, et en propose une analyse systématique.', y, 0);
    y += 5;
    y = bodyTextLineSpaced('Ce document s\'inscrit dans la démarche d\'amélioration continue de la gestion des risques HSE du Groupement CAG, conformément aux référentiels internes et aux attentes des partenaires institutionnels (AFOR, Banque Mondiale). Il vise à identifier les causes profondes des événements, à proposer des mesures correctives adaptées et à prévenir toute récurrence.', y, 0);
    y += 5;
    y = bodyTextLineSpaced('Sur la période couverte, ' + events.length + ' événement(s) ont été déclarés, dont ' + events.filter(e=>e.event_type_code==='A').length + ' accident(s), ' + events.filter(e=>e.event_type_code==='I').length + ' incident(s) et ' + events.filter(e=>e.event_type_code==='PA').length + ' presqu\'accident(s).' + (R && R.deces_invalidite ? ' Un ou plusieurs événements graves (décès ou invalidité permanente) sont à déplorer sur cette période.' : ' Aucun décès ni invalidité permanente n\'est à déplorer sur cette période.'), y, 0);
    y += 10;

    y = sectionTitle('2. Contexte opérationnel et période couverte', y);

    const contexteRows = [
      ['Entité', 'Groupement CAG - Programme PRESFOR'],
      ['Période couverte', periodeStr],
      ['Zone Worodougou', 'Séguéla, Worofla, Morondo, Massala, Ouahama, Notou, Somina, Sifié, Kouego'],
      ['Zone Cavally', 'Guiglo, Blolequin, Nizahon, Taï, Keibly, Behebo, Oulaitaibly'],
      ['Activités concernées', 'Sécurisation foncière rurale, déplacements terrain, enquêtes de terrain, opérations de bureau'],
      ['Effectifs exposés', 'Commissaires enquêteurs, conducteurs, agents GNSS, ISF, chefs d\'équipe'],
      ['Nombre d\'événements déclarés', String(events.length) + ' (' + events.filter(e=>e.event_type_code==='A').length + ' accident(s), ' + events.filter(e=>e.event_type_code==='I').length + ' incident(s), ' + events.filter(e=>e.event_type_code==='PA').length + ' presqu\'accident(s))'],
      ['Référent HSE', 'Département HSE - Groupement CAG'],
    ];

    contexteRows.forEach(([label, val], i) => {
      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + 9, margin + contentWidth, y + 9);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, y + 6);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      const vLines = doc.splitTextToSize(val, contentWidth - 72);
      doc.text(vLines[0], margin + 70, y + 6);
      y += 9;
    });

    // =====================================================
    // KPI
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('3. Indicateurs Clés HSE (KPI)', y);

    const totalEvents = events.length;
    const accidents = events.filter(e => e.event_type_code === 'A').length;
    const incidents = events.filter(e => e.event_type_code === 'I').length;
    const presquAcc = events.filter(e => e.event_type_code === 'PA').length;
    const grave = events.filter(e => e.severity && e.severity.startsWith('G')).length;
    const modere = events.filter(e => e.severity && e.severity.startsWith('M')).length;
    const mineur = events.filter(e => e.severity && e.severity.startsWith('m')).length;
    const ouverts = events.filter(e => e.status === 'Ouvert').length;
    const clos = events.filter(e => e.status === 'Clos').length;
    const worodougou = events.filter(e => e.zone === 'Worodougou').length;
    const cavally = events.filter(e => e.zone === 'Cavally').length;
    const tauxCloture = totalEvents > 0 ? Math.round((clos / totalEvents) * 100) : 0;

    const kpiRows = [
      ['Nombre total d\'evenements declares', String(totalEvents), 'Toutes categories confondues'],
      ['Accidents (A)', String(accidents), 'Avec blessures ou degats materiels'],
      ['Incidents (I)', String(incidents), 'Sans consequences graves'],
      ['Presqu\'accidents (PA)', String(presquAcc), 'Evenements evites de justesse'],
      ['Gravite G0 - Grave', String(grave), 'Blessures graves ou degats majeurs'],
      ['Gravite M1 - Modere', String(modere), 'Blessures moderees'],
      ['Gravite m1 - Mineur', String(mineur), 'Blessures legeres'],
      ['Zone Worodougou', String(worodougou), 'Séguéla, Worofla, Morondo, Massala'],
      ['Zone Cavally', String(cavally), 'Guiglo, Blolequin, Nizahon, Tai, Keibly'],
      ['Fiches ouvertes', String(ouverts), 'En cours de suivi'],
      ['Fiches closes', String(clos), 'Traites et clotures'],
      ['Taux de cloture global', tauxCloture + '%', 'Objectif : 100% dans les 30 jours'],
      ['Deces ou invalidite permanente', '0', 'Aucun evenement de ce type'],
    ];

    const kColW = [contentWidth * 0.48, contentWidth * 0.12, contentWidth * 0.40];
    y = tableHeader(['INDICATEUR', 'VALEUR', 'COMMENTAIRE'], kColW, y);
    kpiRows.forEach((row, i) => { y = tableRow(row, kColW, y, i % 2 === 0); });

    // =====================================================
    // CODAGE STANDARD
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('4. Codage standard utilisé', y);
    y += 2;

    y = subTitle('Types d\'événements', y);
    const tColW = [contentWidth * 0.12, contentWidth * 0.25, contentWidth * 0.63];
    y = tableHeader(['CODE', 'TYPE', 'DEFINITION'], tColW, y);
    [
      ['A', 'Accident', 'Evenement imprevu causant blessures ou dommages materiels'],
      ['I', 'Incident', 'Evenement sans consequences directes graves'],
      ['PA', 'Presqu\'accident', 'Situation dangereuse evitee de justesse'],
    ].forEach((row, i) => { y = tableRow(row, tColW, y, i % 2 === 0); });

    y += 8;
    y = subTitle('Niveaux de gravité', y);
    const gColW = [contentWidth * 0.12, contentWidth * 0.20, contentWidth * 0.68];
    y = tableHeader(['CODE', 'NIVEAU', 'DESCRIPTION'], gColW, y);
    [
      ['G0', 'Grave', 'Deces, invalidite permanente, hospitalisation prolongee'],
      ['M1', 'Modere', 'Arret de travail, degats significatifs'],
      ['m1', 'Mineur', 'Premiers soins, degats mineurs'],
    ].forEach((row, i) => { y = tableRow(row, gColW, y, i % 2 === 0); });

    y += 8;
    y = subTitle('Catégories d\'événements', y);
    const eColW = [contentWidth * 0.20, contentWidth * 0.80];
    y = tableHeader(['CODE', 'CATEGORIE'], eColW, y);
    [
      ['V01', 'Accident de circulation'],
      ['E01', 'Environnement / animaux'],
      ['R01', 'Incident lie au relief / terrain'],
      ['H01', 'Chaleur / deshydratation'],
      ['O01', 'Outils / manipulation materiels'],
      ['C01', 'Presque-accident declare'],
    ].forEach((row, i) => { y = tableRow(row, eColW, y, i % 2 === 0); });

    // =====================================================
    // REGISTRE CONSOLIDE
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('5. Registre consolidé des incidents et accidents', y);
    y += 2;

    const rColW = [
      contentWidth * 0.06,
      contentWidth * 0.18,
      contentWidth * 0.11,
      contentWidth * 0.08,
      contentWidth * 0.09,
      contentWidth * 0.10,
      contentWidth * 0.26,
      contentWidth * 0.12,
    ];
    const rHeaders = ['No', 'Reference', 'Date', 'Type', 'Gravite', 'Zone', 'Trajet', 'Statut'];

    y = tableHeader(rHeaders, rColW, y);

    events.forEach((event, ri) => {
      if (y > pageHeight - 25) {
        newPage();
        y = 20;
        y = tableHeader(rHeaders, rColW, y);
      }
      const trajet = formatTrajet(event);
      const sevLabel = s(event.severity || '').replace(/[₀0]/g,'0').replace(/[₁1]/g,'1');
      const rowData = [
        String(event.fiche_number || ''),
        s(event.reference || ''),
        formatDate(event.date_event),
        s(event.event_type_code || ''),
        sevLabel,
        s(event.zone || ''),
        trajet,
        s(event.status || ''),
      ];

      // Draw row with status color
      doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 248 : 255);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + 8, margin + contentWidth, y + 8);

      let rx = margin;
      rowData.forEach((cell, ci) => {
        if (ci === 7) {
          doc.setTextColor(event.status === 'Ouvert' ? 220 : 16, event.status === 'Ouvert' ? 50 : 130, event.status === 'Ouvert' ? 20 : 60);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(7.5);
        const t = doc.splitTextToSize(cell, rColW[ci] - 3);
        doc.text(t[0], rx + 2, y + 5.5);
        rx += rColW[ci];
      });
      y += 8;
    });

    // =====================================================
    // ANALYSE APPROFONDIE
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('6. Analyse approfondie des événements significatifs', y);
    y += 2;

    doc.setTextColor(100, 70, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Méthodologie : Application de la méthode des "5 Pourquoi" pour chaque événement significatif.', margin, y);
    y += 10;

    // Trier par date décroissante et prendre les 4 plus récents
    const sigEvents = [...events].sort((a, b) => new Date(b.date_event) - new Date(a.date_event));

    if (sigEvents.length === 0) {
      y = bodyText('Aucun evenement significatif a analyser sur cette periode.', y, 0);
    } else {
      sigEvents.slice(0, 4).forEach((event) => {
        if (y > pageHeight - 70) {
          newPage();
          y = 20;
        }
        const sevLabel = s(event.severity || '').replace(/[₀]/g,'0').replace(/[₁]/g,'1');
        // Titre fiche
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Fiche No' + event.fiche_number + ' - ' + s(event.reference) + ' | ' + s(event.event_type) + ' | ' + sevLabel, margin, y);
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, y + 2, margin + contentWidth, y + 2);
        y += 8;

        const analysisRows = [
          ['Date', formatDate(event.date_event)],
          ['Trajet', formatTrajet(event) + ' (' + s(event.zone || '') + ')'],
          ['Circonstances', s(event.circumstances || 'Non renseignees')],
          ['Blessures / Degats', s(event.injuries_damages || 'Aucun')],
          ['Mesures immediates', s(event.immediate_measures || 'Non renseignees')],
        ];

        analysisRows.forEach(([label, val]) => {
          const valLines = doc.splitTextToSize(val, contentWidth - 55);
          const rowH = Math.max(8, valLines.length * 5 + 3);
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y, contentWidth, rowH, 'F');
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, y + rowH, margin + contentWidth, y + rowH);
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text(label, margin + 2, y + 5.5);
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(valLines, margin + 52, y + 5.5);
          y += rowH;
        });
        y += 8;
      });
    }

    // =====================================================
    // PLAN CAPA
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('7. Plan d\'Actions Correctives et Préventives (CAPA)', y);
    y += 2;

    doc.setTextColor(6, 95, 70);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Taux de cloture : ' + tauxCloture + '% (' + clos + '/' + totalEvents + ' fiches closes) - Objectif : 100%', margin, y);
    y += 10;

    const cColW = [contentWidth*0.05, contentWidth*0.20, contentWidth*0.30, contentWidth*0.18, contentWidth*0.13, contentWidth*0.14];
    const cHeaders = ['No', 'EVENEMENT', 'ACTION CORRECTIVE', 'RESPONSABLE', 'ECHEANCE', 'STATUT'];
    y = tableHeader(cHeaders, cColW, y);

    events.forEach((e, i) => {
      // Calculer la hauteur nécessaire pour la ligne (basée sur le contenu le plus long)
      const actionText = e.immediate_measures ? s(e.immediate_measures) : 'A definir';
      const actionLines = doc.splitTextToSize(actionText, cColW[2] - 4);
      const rowH = Math.max(8, actionLines.length * 4.5 + 4);

      if (y + rowH > pageHeight - 20) {
        newPage();
        y = 20;
        y = tableHeader(cHeaders, cColW, y);
      }

      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255);
      doc.rect(margin, y, contentWidth, rowH, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

      const cells = [
        String(i + 1),
        'Fiche No' + e.fiche_number + ' - ' + s(e.event_type || ''),
        actionText,
        s(e.supervisor || 'A designer'),
        e.closure_date ? formatDate(e.closure_date) : 'En cours',
        s(e.status || 'Ouvert'),
      ];

      let rx = margin;
      cells.forEach((cell, ci) => {
        if (ci === 5) {
          doc.setTextColor(e.status === 'Ouvert' ? 220 : 16, e.status === 'Ouvert' ? 50 : 130, e.status === 'Ouvert' ? 20 : 60);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(7.5);
        if (ci === 2) {
          // Action corrective : afficher sur plusieurs lignes
          doc.text(actionLines, rx + 2, y + 5.5);
        } else {
          const t = doc.splitTextToSize(String(cell), cColW[ci] - 4);
          doc.text(t[0], rx + 2, y + 5.5);
        }
        rx += cColW[ci];
      });
      y += rowH;
    });

    // =====================================================
    // REGISTRE DES RISQUES (synthese dynamique des fiches)
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('8. Registre des risques', y);
    y += 2;

    // ── Analyse complete des circonstances de toutes les fiches ──
    const allCirc = events.map(e => s(e.circumstances || '') + ' ' + s(e.injuries_damages || '')).join(' ').toLowerCase();

    // Comptages par type
    const accidentCount = events.filter(e => e.event_type_code === 'A').length;
    const incidentCount = events.filter(e => e.event_type_code === 'I').length;
    const paCount = events.filter(e => e.event_type_code === 'PA').length;
    const graveCount = events.filter(e => e.severity && e.severity.startsWith('G')).length;

    // Comptages par theme de circonstance
    const nbCircCirculation = events.filter(e => {
      const c = s(e.circumstances || '').toLowerCase();
      return /vehicule|moto|conduire|route|chaussee|circulation|camion|engin|voiture|accident|freinage|vitesse/.test(c);
    }).length;

    const nbCircRenversement = events.filter(e => {
      const c = s(e.circumstances || '').toLowerCase();
      return /renvers|capot|retourne|bascul|tonneau|pente|gliss/.test(c);
    }).length;

    const nbCircCollision = events.filter(e => {
      const c = s(e.circumstances || '').toLowerCase();
      return /collision|heurt|tiers|percuter|choc|usager|pieton/.test(c);
    }).length;

    const nbCircChute = events.filter(e => {
      const c = s(e.circumstances || '').toLowerCase();
      return /chute|tomber|glisser|trébucher|trebuch|sol|pied|instable/.test(c);
    }).length;

    const nbCircAnimal = events.filter(e => {
      const c = s(e.circumstances || '').toLowerCase();
      return /serpent|animal|morsure|piq|insecte|bête|faune/.test(c);
    }).length;

    const nbCircChaleur = events.filter(e => {
      const c = s(e.circumstances || '').toLowerCase();
      return /chaleur|soleil|deshydrat|fatigue|malaise|temperature/.test(c);
    }).length;

    // Zones concernees par les accidents
    const zonesAcc = [...new Set(events.filter(e => e.event_type_code === 'A').map(e => s(e.zone || '')).filter(Boolean))];
    const zonesStr = zonesAcc.length > 0 ? zonesAcc.join(' & ') : 'Worodougou & Cavally';

    // Niveaux dynamiques
    const niveauAccident = accidentCount >= 5 ? 'Tres eleve' : accidentCount >= 2 ? 'Eleve' : accidentCount >= 1 ? 'Moyen' : 'Faible';
    const niveauRenversement = nbCircRenversement >= 3 ? 'Tres eleve' : nbCircRenversement >= 1 ? 'Eleve' : 'Moyen';
    const niveauCollision = nbCircCollision >= 2 ? 'Eleve' : nbCircCollision >= 1 ? 'Moyen' : 'Faible';
    const niveauChute = nbCircChute >= 2 ? 'Eleve' : nbCircChute >= 1 ? 'Moyen' : 'Faible';
    const niveauAnimal = nbCircAnimal >= 1 ? 'Moyen' : 'Faible';
    const niveauChaleur = nbCircChaleur >= 1 ? 'Moyen' : 'Faible';

    // Causes extraites dynamiquement
    const causeRoute = /degrad|nid.de.poule|boue|glissant|etroit|impratic/.test(allCirc)
      ? 'Etat degrade des routes et pistes en zones ' + zonesStr
      : 'Conditions routieres difficiles sur les axes ' + zonesStr;
    const causeTerrain = /pente|relief|instable|boueux|accidente/.test(allCirc)
      ? 'Terrain accidente et pistes impraticables (boue, relief)' : 'Terrain difficile en milieu rural';
    const causeCollision = /vitesse|imprudence|comportement|usager|pieton/.test(allCirc)
      ? 'Comportements imprudents d\'usagers tiers sur les routes'
      : 'Interaction avec des tiers sur les axes routiers';
    const causeChute = /sol mouille|instable|trébucher|trebuch|pas de main courante/.test(allCirc)
      ? 'Sol instable, terrain glissant ou absence de protections'
      : 'Terrain irregular, deplacements sur sol instable';

    // Actions selon statut
    const ficheOuvertes = events.filter(e => e.status === 'Ouvert').length;
    const actionCirc = ficheOuvertes > 0 ? 'Suivi actif (' + ficheOuvertes + ' ouvertes)' : 'Fiches closes';

    const nbNote = events.length;
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const noteText = 'NB : Synthese automatique basee sur l\'analyse des circonstances de ' + nbNote + ' fiche(s). ' +
      nbCircCirculation + ' fiche(s) impliquent un vehicule/moto, ' + nbCircRenversement + ' renversement(s), ' +
      nbCircCollision + ' collision(s), ' + nbCircChute + ' chute(s).';
    const noteLines = doc.splitTextToSize(noteText, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 6;

    // Tableau avec lignes multi-hauteur pour ne pas tronquer
    const rqColW = [contentWidth*0.28, contentWidth*0.13, contentWidth*0.38, contentWidth*0.21];
    y = tableHeader(['RISQUE IDENTIFIE', 'NIVEAU', 'CAUSE PRINCIPALE (analyse circonstances)', 'ACTION'], rqColW, y);

    const riskRows = [
      [
        'Accident de circulation\n(' + accidentCount + ' fiche(s) / ' + nbCircCirculation + ' impliquant un vehicule)',
        niveauAccident,
        causeRoute,
        actionCirc
      ],
      [
        'Renversement / perte de controle\n(' + nbCircRenversement + ' fiche(s))',
        niveauRenversement,
        causeTerrain,
        nbCircRenversement > 0 ? 'Actions engagees' : 'Vigilance'
      ],
      [
        'Collision avec tiers\n(' + nbCircCollision + ' fiche(s))',
        niveauCollision,
        causeCollision,
        'A surveiller'
      ],
      [
        'Chutes / blessures terrain\n(' + nbCircChute + ' fiche(s))',
        niveauChute,
        causeChute,
        'EPI requis'
      ],
      [
        'Morsure d\'animaux / piqures\n(' + nbCircAnimal + ' fiche(s))',
        niveauAnimal,
        'Faune sauvage (serpents, insectes) lors des operations terrain',
        'Sensibilisation'
      ],
      [
        'Deshydratation / chaleur\n(' + nbCircChaleur + ' fiche(s))',
        niveauChaleur,
        'Temperatures elevees lors des deplacements et travaux terrain',
        'Sensibilisation'
      ],
    ];

    // Tableau avec hauteur de ligne adaptee au contenu
    riskRows.forEach((row, i) => {
      // Calculer la hauteur max de la ligne selon le contenu le plus long
      const cellTexts = row.map((cell, ci) => doc.splitTextToSize(String(cell), rqColW[ci] - 4));
      const maxLines = Math.max(...cellTexts.map(t => t.length));
      const rowH = Math.max(12, maxLines * 5 + 6);

      if (y + rowH > pageHeight - 20) {
        newPage();
        y = 20;
        y = tableHeader(['RISQUE IDENTIFIE', 'NIVEAU', 'CAUSE PRINCIPALE (analyse circonstances)', 'ACTION'], rqColW, y);
      }

      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 248 : 255);
      doc.rect(margin, y, contentWidth, rowH, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

      let rx = margin;
      cellTexts.forEach((lines, ci) => {
        // Couleur du niveau
        if (ci === 1) {
          const niv = String(row[ci]).toLowerCase();
          if (niv.includes('tres')) doc.setTextColor(185, 28, 28);
          else if (niv.includes('eleve')) doc.setTextColor(220, 100, 20);
          else if (niv.includes('moyen')) doc.setTextColor(100, 100, 20);
          else doc.setTextColor(40, 120, 40);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(7.5);
        doc.text(lines, rx + 2, y + 5.5);
        rx += rqColW[ci];
      });
      y += rowH;
    });

    const drawListSection = (title, items, currentY) => {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, currentY);
      currentY += 7;
      items.forEach((item) => {
        const lines = doc.splitTextToSize('- ' + item, contentWidth - 8);
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, margin + 4, currentY);
        currentY += lines.length * 5.5;
      });
      return currentY + 3;
    };

    // =====================================================
    // RÉPONSES AUX OBSERVATIONS DE LA BANQUE MONDIALE
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('9. Suivi des recommandations antérieures', y);
    y += 2;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const introLines = doc.splitTextToSize(s('Le présent chapitre a pour objet de répondre aux observations formulées par la Banque mondiale à la suite de l’examen du rapport trimestriel sur les incidents et accidents. Il vise également à assurer le suivi des recommandations émises dans le précédent rapport trimestriel. À cet effet, les sections qui suivent présentent les informations complémentaires ainsi que les précisions demandées.'), contentWidth);
    introLines.forEach((line, i) => { doc.text(line, margin, y + i * 7); });
    y += introLines.length * 7 + 3;

    // --- Recommandations du précédent rapport trimestriel (liste texte) ---
    ensureSpace(40);
    y = drawListSection('Recommandations du précédent rapport trimestriel', R
      ? ((R.recommandations_precedentes || []).length
        ? R.recommandations_precedentes.map((r) => s(r.texte) + ' - ' + (r.etat || 'En cours'))
        : ['Aucune recommandation antérieure'])
      : [
      'Fourniture immédiate d\'EPI à tous les agents terrain',
      'Renforcement des contrôles techniques des motos et véhicules',
      'Signalisation temporaire des zones dangereuses (Worodougou et Cavally)',
      'Coordination formalisée avec les services de voirie et mairies',
      'Formation spécifique à la conduite sur terrains boueux et routes dégradées',
      'Création d\'un fonds dédié à l\'entretien des véhicules et équipements de sécurité',
      'Mise en place d\'un système de monitoring GPS pour les déplacements à risque',
      'Désignation de référents sécurité dans chaque zone opérationnelle',
      'Intégration des critères HSE dans l\'évaluation des prestataires et sous-traitants',
    ], y);
    y += 1;

    // --- Récupération des données Banque Mondiale renseignées par les secrétaires ---
    // Vue globale : toutes périodes confondues (pas de filtre temporel)
    // Réservé aux administrateurs (données d'accidents agrégées).
    let agentsBM = [];
    let tiersBM = [];
    let obsAll = [];
    if (user.role === 'admin' || R) {
    try {
      obsAll = await base44.asServiceRole.entities.ObservationBM.filter({});
    } catch(e) {}
    try { agentsBM = await base44.asServiceRole.entities.AgentImpliqueBM.filter({}); } catch(e) {}
    try { tiersBM = await base44.asServiceRole.entities.TiersImpacteBM.filter({}); } catch(e) {}
    } // end admin guard
    // Rapport trimestriel : uniquement les données Banque Mondiale saisies pour ce trimestre (période "T1 2026").
    if (R) {
      const P = 'T' + R.trimestre + ' ' + R.annee;
      obsAll = obsAll.filter((o) => o.periode === P);
      agentsBM = agentsBM.filter((o) => o.periode === P);
      tiersBM = tiersBM.filter((o) => o.periode === P);
    }
    // Calcules hors du bloc admin : ces totaux sont utilises plus bas dans le rapport.
    const sumField = (field) => obsAll.reduce((sum, o) => sum + (o[field] || 0), 0);
    const obsTotals = {
      nb_motos_impliques: sumField('nb_motos_impliques'),
      nb_motos_endommages: sumField('nb_motos_endommages'),
      nb_motos_detruits: sumField('nb_motos_detruits'),
      nb_vehicules_impliques: sumField('nb_vehicules_impliques'),
      nb_vehicules_endommages: sumField('nb_vehicules_endommages'),
      nb_vehicules_detruits: sumField('nb_vehicules_detruits'),
      nb_tablettes_impliques: sumField('nb_tablettes_impliques'),
      nb_tablettes_endommages: sumField('nb_tablettes_endommages'),
      nb_tablettes_detruits: sumField('nb_tablettes_detruits'),
      nb_gnss_impliques: sumField('nb_gnss_impliques'),
      nb_gnss_endommages: sumField('nb_gnss_endommages'),
      nb_gnss_detruits: sumField('nb_gnss_detruits'),
      nb_autres_impliques: sumField('nb_autres_impliques'),
      nb_autres_endommages: sumField('nb_autres_endommages'),
      nb_autres_detruits: sumField('nb_autres_detruits'),
    };
    const totalEqImpliques = obsTotals.nb_motos_impliques + obsTotals.nb_vehicules_impliques + obsTotals.nb_tablettes_impliques + obsTotals.nb_gnss_impliques + obsTotals.nb_autres_impliques;
    y = drawListSection(R ? 'Synthèse du trimestre' : 'Synthèse globale (toutes périodes cumulées)', [
      agentsBM.length + ' agent(s) impliqué(s) dans les accidents, renseigné(s) à ce jour',
      tiersBM.length + ' cas de tiers (membres de la communauté / usagers de la route) renseigné(s)',
      totalEqImpliques + ' équipement(s) impliqué(s) (motos, véhicules, tablettes, GNSS, autres)',
    ], y);
    y += 4;

    // --- 11.1 Catégorie d'agents et affectation des moyens roulants ---
    ensureSpace(50);
    y = subTitle('9.1 Catégorie d\'agents du projet à qui les moyens roulants sont affectés', y);
    y += 2;
    const agentCats = {};
    agentsBM.forEach(a => {
      const cat = s(a.categorie_agent || 'Non précisé');
      if (!agentCats[cat]) agentCats[cat] = { count: 0, vehicles: {} };
      agentCats[cat].count++;
      const v = s(a.moyen_roulant_affecte || 'Non précisé');
      agentCats[cat].vehicles[v] = (agentCats[cat].vehicles[v] || 0) + 1;
    });
    const acColW = [contentWidth * 0.35, contentWidth * 0.15, contentWidth * 0.50];
    y = tableHeader(['CATEGORIE D\'AGENT', 'NOMBRE', 'MOYENS ROULANTS AFFECTES'], acColW, y);
    let acIdx = 0;
    const acHeaders = ['CATEGORIE D\'AGENT', 'NOMBRE', 'MOYENS ROULANTS AFFECTES'];
    Object.entries(agentCats).forEach(([cat, data]) => {
      const vStr = Object.entries(data.vehicles).map(([v, c]) => v + ' (' + c + ')').join(', ');
      if (y + 8 > pageHeight - 18) {
        newPage();
        y = 20;
        y = tableHeader(acHeaders, acColW, y);
      }
      y = tableRow([cat, String(data.count), vStr], acColW, y, acIdx % 2 === 0);
      acIdx++;
    });
    if (acIdx === 0) y = tableRow(['Aucun agent renseigne', '0', '-'], acColW, y, true);
    y += 8;

    // --- 11.2 Implications des accidents sur la disponibilité des agents ---
    ensureSpace(50);
    y = subTitle('9.2 Implications des accidents sur la disponibilité des agents', y);
    y += 2;
    const impColW = [contentWidth * 0.05, contentWidth * 0.25, contentWidth * 0.18, contentWidth * 0.18, contentWidth * 0.12, contentWidth * 0.22];
    const impHeaders = ['No', 'AGENT', 'CESSATION TRAVAIL', 'INVALIDITE TEMP.', 'JOURS ARRET', 'CATEGORIE ABSENCE'];
    y = tableHeader(impHeaders, impColW, y);
    if (agentsBM.length === 0) {
      y = tableRow(['-', 'Aucun agent renseigne', '-', '-', '-', '-'], impColW, y, true);
    } else {
      agentsBM.forEach((a, i) => {
        if (y > pageHeight - 25) { newPage(); y = 20; y = tableHeader(impHeaders, impColW, y); }
        const row = [String(i + 1), s(a.nom || '-'), a.cessation_travail ? 'Oui' : 'Non', a.invalidite_temporaire ? 'Oui' : 'Non', String(a.jours_arret || 0), s(a.categorie_absence || '-')];
        y = tableRow(row, impColW, y, i % 2 === 0);
      });
    }
    y += 8;

    // --- 11.3 Estimation de la durée des absences ---
    ensureSpace(50);
    y = subTitle('9.3 Estimation de la durée des absences (prise en charge sanitaire)', y);
    y += 2;
    const durColW = [contentWidth * 0.30, contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.20];
    y = tableHeader(['CATEGORIE', 'NOMBRE DE CAS', 'DUREE MOYENNE (j)', 'TOTAL JOURS'], durColW, y);
    const absCats3 = ['Blessé léger', 'Cas grave', 'Maladie'];
    absCats3.forEach((cat, i) => {
      const items = agentsBM.filter(a => s(a.categorie_absence) === cat);
      const nb = items.length;
      const total = items.reduce((sum, a) => sum + (a.jours_arret || 0), 0);
      const moy = nb > 0 ? (total / nb).toFixed(1) : '-';
      y = tableRow([cat, String(nb), moy, String(total)], durColW, y, i % 2 === 0);
    });
    y += 8;

    // --- 11.4 Équipements impliqués, endommagés et détruits ---
    ensureSpace(50);
    y = subTitle('9.4 Équipements impliqués, endommagés et détruits', y);
    y += 2;
    const dmgColW = [contentWidth * 0.40, contentWidth * 0.20, contentWidth * 0.20, contentWidth * 0.20];
    y = tableHeader(['EQUIPEMENT', 'IMPLIQUES', 'ENDOMMAGES', 'TOT. DETRUITS'], dmgColW, y);
    y = tableRow(['Motos', String(obsTotals.nb_motos_impliques), String(obsTotals.nb_motos_endommages), String(obsTotals.nb_motos_detruits)], dmgColW, y, true);
    y = tableRow(['Vehicules (4x4, voitures, camions)', String(obsTotals.nb_vehicules_impliques), String(obsTotals.nb_vehicules_endommages), String(obsTotals.nb_vehicules_detruits)], dmgColW, y, false);
    y = tableRow(['Tablettes', String(obsTotals.nb_tablettes_impliques), String(obsTotals.nb_tablettes_endommages), String(obsTotals.nb_tablettes_detruits)], dmgColW, y, true);
    y = tableRow(['Recepteurs GNSS', String(obsTotals.nb_gnss_impliques), String(obsTotals.nb_gnss_endommages), String(obsTotals.nb_gnss_detruits)], dmgColW, y, false);
    y = tableRow(['Autres equipements', String(obsTotals.nb_autres_impliques), String(obsTotals.nb_autres_endommages), String(obsTotals.nb_autres_detruits)], dmgColW, y, true);
    y += 8;

    // --- 11.5 Agents mobilisés impliqués dans les accidents — répartition par genre ---
    ensureSpace(50);
    y = subTitle('9.5 Agents mobilisés pour la collecte de données impliqués dans les accidents', y);
    y += 2;
    const totalAgentsAcc = agentsBM.length;
    const nbHommesBM = agentsBM.filter(a => s(a.genre) === 'Homme').length;
    const nbFemmesBM = agentsBM.filter(a => s(a.genre) === 'Femme').length;
    const pctH = totalAgentsAcc > 0 ? Math.round(nbHommesBM / totalAgentsAcc * 100) : 0;
    const pctF = totalAgentsAcc > 0 ? Math.round(nbFemmesBM / totalAgentsAcc * 100) : 0;
    y = bodyText('Nombre total d\'agents impliques dans les accidents : ' + totalAgentsAcc, y, 0);
    y += 4;
    const genColW = [contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.25];
    y = tableHeader(['GENRE', 'NOMBRE', 'POURCENTAGE', 'OBSERVATIONS'], genColW, y);
    y = tableRow(['Hommes', String(nbHommesBM), pctH + '%', '-'], genColW, y, true);
    y = tableRow(['Femmes', String(nbFemmesBM), pctF + '%', '-'], genColW, y, false);
    y = tableRow(['Total', String(totalAgentsAcc), '100%', '-'], genColW, y, true);
    y += 8;

    // --- 11.6 Membres de la communauté et usagers de la route impactés ---
    ensureSpace(50);
    y = subTitle('9.6 Membres de la communauté et usagers de la route concernés', y);
    y += 2;
    y = bodyText('Nombre de cas de tiers renseignes (membres de la communaute / usagers de la route) : ' + tiersBM.length, y, 0);
    y += 4;
    const tiersColW = [contentWidth * 0.05, contentWidth * 0.18, contentWidth * 0.40, contentWidth * 0.15, contentWidth * 0.22];
    const tiersHeaders = ['No', 'REFERENCE FICHE', 'DESCRIPTION', 'TYPE DE BIEN', 'DETAILS'];
    y = tableHeader(tiersHeaders, tiersColW, y);
    if (tiersBM.length === 0) {
      y = tableRow(['-', '-', 'Aucun cas de tiers renseigne', '-', '-'], tiersColW, y, true);
    } else {
      tiersBM.forEach((t, i) => {
        if (y > pageHeight - 20) { newPage(); y = 20; y = tableHeader(tiersHeaders, tiersColW, y); }
        y = tableRow([String(i + 1), s(t.reference_fiche || '-'), s(t.description || '-'), s(t.type_bien || '-'), s(t.details_bien || '-')], tiersColW, y, i % 2 === 0);
      });
    }
    y += 8;

    // --- 11.7 Évaluation des activités PAE et PPSPS ---
    ensureSpace(50);
    y = subTitle('9.7 Évaluation des activités PAE et PPSPS du trimestre', y);
    y += 2;
    y = bodyText('Le tableau ci-dessous presente l\'etat d\'execution des activites prevues au Plan d\'Action Environnemental (PAE) et au Plan de Prevention et de Securite (PPSPS).', y, 0);
    y += 4;
    const paColW = [contentWidth * 0.05, contentWidth * 0.45, contentWidth * 0.20, contentWidth * 0.15, contentWidth * 0.15];
    y = tableHeader(['No', 'ACTIVITE', 'STATUT', 'TAUX', 'OBSERVATIONS'], paColW, y);
    const paRows = R
      ? ((R.pae_ppsps || []).filter((r) => r.activite).length
        ? R.pae_ppsps.filter((r) => r.activite).map((r, i) => [String(i + 1), r.activite, r.statut || '-', r.taux || '-', r.observations || '-'])
        : [['-', 'Aucune activite renseignee', '-', '-', '-']])
      : [
      ['1', 'Activite PAE a renseigner', 'Execute', 'A renseigner', '-'],
      ['2', 'Activite PAE a renseigner', 'En cours', 'A renseigner', '-'],
      ['3', 'Activite PAE a renseigner', 'Non debute', 'A renseigner', '-'],
      ['4', 'Activite PPSPS a renseigner', 'Execute', 'A renseigner', '-'],
      ['5', 'Activite PPSPS a renseigner', 'En cours', 'A renseigner', '-'],
      ['6', 'Activite PPSPS a renseigner', 'Non debute', 'A renseigner', '-'],
    ];
    paRows.forEach((r, i) => { if (y > pageHeight - 22) { newPage(); y = 20; } y = tableRow(r, paColW, y, i % 2 === 0); });
    y += 4;
    y = bodyText(R ? 'Synthese : ' + (R.pae_synthese || 'non renseignee.') : 'Synthese : A renseigner (nombre d\'activites executees / en cours / non debutees et taux global par categorie).', y, 0);
    y += 8;

    // --- 11.8 Planification des activités — avril à juin 2026 ---
    ensureSpace(50);
    const nq = R ? nextQuarter(R.annee, R.trimestre) : null;
    y = subTitle('9.8 Planification des activités - ' + (R ? quarterBounds(nq.annee, nq.trimestre).label : 'trimestre avril à juin 2026'), y);
    y += 2;
    const plColW = [contentWidth * 0.05, contentWidth * 0.45, contentWidth * 0.20, contentWidth * 0.15, contentWidth * 0.15];
    const plHeaders = ['No', 'ACTIVITE PREVUE', 'PERIODE', 'RESPONSABLE', 'BUDGET'];
    y = tableHeader(plHeaders, plColW, y);
    const plRows = R
      ? (R.planification || []).filter((r) => r.activite).map((r, i) => [String(i + 1), r.activite, r.periode || '-', r.responsable || '-', r.budget || '-'])
      : Array.from({ length: 6 }, (_, k) => [String(k + 1), 'Activite a renseigner', 'Avr-Juin 2026', 'A designer', 'A renseigner']);
    if (!plRows.length) plRows.push(['-', 'Aucune activite planifiee', '-', '-', '-']);
    plRows.forEach((r, k) => {
      if (y > pageHeight - 20 && k > 0) { newPage(); y = 20; y = tableHeader(plHeaders, plColW, y); }
      y = tableRow(r, plColW, y, k % 2 === 0);
    });

    // =====================================================
    // CONCLUSION ET RECOMMANDATIONS
    // =====================================================
    newPage();
    y = 20;
    y = sectionTitle('10. Conclusion et recommandations', y);
    y += 2;

    const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (R) {
      y = drawListSection('Progres constates sur la periode', [
        R.deces_invalidite
          ? 'Evenement(s) grave(s) (deces ou invalidite permanente) a deplorer sur la periode : ' + totalEvents + ' evenement(s) declare(s)'
          : 'Aucun evenement grave (deces ou invalidite permanente) malgre ' + totalEvents + ' evenement(s) declare(s)',
        ...lines(R.progres),
      ], y);
      if (lines(R.risques).length) y = drawListSection('Risques restant a maitriser', lines(R.risques), y);
      if (y > pageHeight - 60) { newPage(); y = 20; }
      y = drawListSection('Recommandations pour le trimestre suivant', (R.recommandations || []).length ? R.recommandations : ['Aucune recommandation'], y);
    } else {
    y = drawListSection('Progres constates sur la periode', [
      'Aucun evenement grave (deces ou invalidite permanente) malgre ' + totalEvents + ' incidents declares',
      'Declaration systematique des incidents par les agents de terrain',
      'Prise de conscience collective des enjeux securite dans les deux zones',
      'Mise en place progressive d\'une culture de reporting HSE',
    ], y);

    y = drawListSection('Risques restant a maitriser', [
      'Etat degrade des infrastructures routieres (zones Worodougou et Cavally)',
      'Comportements a risque des tiers (usagers de la route, ouvriers)',
      'Absence d\'equipements de protection individuelle (EPI)',
      'Conditions meteorologiques defavorables en saison des pluies',
      'Defaillances mecaniques des vehicules et motos',
    ], y);

    if (y > pageHeight - 80) {
      newPage();
      y = 20;
    }

    y = drawListSection('Urgences operationnelles', [
      'Fourniture immediate d\'EPI a tous les agents terrain',
      'Renforcement des controles techniques des motos et vehicules',
      'Signalisation temporaire des zones dangereuses (Worodougou et Cavally)',
      'Coordination formalisee avec les services de voirie et mairies',
      'Formation specifique a la conduite sur terrains boueux et routes degradees',
    ], y);

    y = drawListSection('Recommandations strategiques', [
      'Creation d\'un fonds dedie a l\'entretien des vehicules et equipements de securite',
      'Mise en place d\'un systeme de monitoring GPS pour les deplacements a risque',
      'Designation de referents securite dans chaque zone operationnelle',
      'Integration des criteres HSE dans l\'evaluation des prestataires et sous-traitants',
    ], y);
    } // fin contenu par défaut (ancien rapport)

    // =====================================================
    // ANNEXES : FICHES INDIVIDUELLES + PHOTOS
    // =====================================================
    const addSingleEventPage = async (event) => {
      doc.addPage();
      pageNum++;
      addFooter();

      let fy = 15;
      const sevLabel = s(event.severity || '').replace(/[₀]/g,'0').replace(/[₁]/g,'1');

      // ── Bloc titre avec bordure arrondie ──
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, fy, contentWidth, 20, 2, 2, 'FD');

      // Titre fiche
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('FICHE No' + event.fiche_number + ' - ' + s(event.reference || ''), margin + 4, fy + 8);

      // Badge statut
      const stColor = event.status === 'Ouvert' ? [249, 115, 22] : [16, 185, 129];
      doc.setFillColor(...stColor);
      doc.roundedRect(pageWidth - margin - 22, fy + 3, 18, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(s(event.status), pageWidth - margin - 13, fy + 8, { align: 'center' });

      // Sous-titre type / gravite
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Type: ' + s(event.event_type || '') + ' (' + s(event.event_type_code || '') + ')  |  Gravite: ' + sevLabel, margin + 4, fy + 16);
      fy += 26;

      // ── Grille champs 2 colonnes ──
      const halfW = (contentWidth - 3) / 2;
      const fieldBox = (label, value, x, w, y, h) => {
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(x, y, w, h, 1, 1, 'FD');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), x + 3, y + 5);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, w - 6);
        doc.text(lines[0], x + 3, y + 11);
      };

      // Ligne 1 : Date | Heure
      fieldBox('Date', formatDate(event.date_event), margin, halfW, fy, 15);
      fieldBox('Heure', s(event.time_event || '-'), margin + halfW + 3, halfW, fy, 15);
      fy += 17;

      // Ligne 2 : Trajet (lieu) | Zone
      const trajetVal = formatTrajet(event);
      fieldBox('Lieu', trajetVal, margin, halfW, fy, 15);
      fieldBox('Zone', s(event.zone || '-'), margin + halfW + 3, halfW, fy, 15);
      fy += 17;

      // Ligne 3 : Personne(s) impliquée(s) — pleine largeur
      fieldBox('Personne(s) impliquee(s)', s(event.persons_involved || '-'), margin, contentWidth, fy, 15);
      fy += 17;

      // Ligne 4 : Fonction | Materiel
      fieldBox('Fonction', s(event.person_role || '-'), margin, halfW, fy, 15);
      fieldBox('Materiel', s(event.equipment || '-'), margin + halfW + 3, halfW, fy, 15);
      fy += 20;

      // ── Section colorée helper ──
      const coloredSection = (label, content, bgR, bgG, bgB, labelR, labelG, labelB, y) => {
        const sanitized = s(content || 'Non precise');
        const lines = doc.splitTextToSize(sanitized, contentWidth - 8);
        const h = Math.max(18, lines.length * 5.5 + 12);
        doc.setFillColor(bgR, bgG, bgB);
        doc.setDrawColor(bgR - 20, bgG - 20, bgB - 20);
        doc.roundedRect(margin, y, contentWidth, h, 2, 2, 'FD');
        doc.setTextColor(labelR, labelG, labelB);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), margin + 4, y + 7);
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, margin + 4, y + 14);
        return y + h + 4;
      };

      // Circonstances — fond gris bleuté
      fy = coloredSection('Circonstances', event.circumstances, 241, 245, 249, 71, 85, 105, fy);
      // Blessures / Dégâts — fond rouge clair
      fy = coloredSection('Blessures / Degats', event.injuries_damages, 254, 242, 242, 185, 28, 28, fy);
      // Mesures immédiates — fond vert clair
      fy = coloredSection('Mesures immediates', event.immediate_measures, 240, 253, 244, 21, 128, 61, fy);

      // ── Suivi administratif ──
      const adminLines1 = 'Declaration: ' + formatDate(event.declaration_date) + '  |  Cloture: ' + (event.closure_date ? formatDate(event.closure_date) : 'En cours');
      const adminLines2 = 'Responsable: ' + s(event.supervisor || '-') + '  |  Observations: ' + s(event.observations || 'Neant');
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(margin, fy, contentWidth, 22, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('SUIVI ADMINISTRATIF', margin + 4, fy + 6);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(adminLines1, margin + 4, fy + 13);
      doc.text(adminLines2, margin + 4, fy + 19);
      fy += 28;



      // ── Signatures ──
      if (fy < pageHeight - 25) {
        const sigW = 55;
        doc.setDrawColor(150, 150, 150);
        doc.line(margin + 5, fy + 8, margin + 5 + sigW, fy + 8);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('Signature Agent', margin + 5 + sigW / 2, fy + 13, { align: 'center' });
        doc.line(pageWidth - margin - 5 - sigW, fy + 8, pageWidth - margin - 5, fy + 8);
        doc.text('Signature Superviseur', pageWidth - margin - 5 - sigW / 2, fy + 13, { align: 'center' });
      }
    };

    // Titre de section 11 pour les annexes
    if (withFiches) {
    newPage();
    y = 20;
    y = sectionTitle(fichesSectionNo + '. Annexes - Fiches individuelles de consignation', y);
    y += 4;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Les fiches sont classees du plus recent au plus ancien.', margin, y);
    y += 10;

    // ── KPI Summary Cards ──
    const kpiCards = [
      { label: 'Total Evenements', value: String(totalEvents), bg: [30, 41, 59], fg: [255,255,255], vfg: [255,255,255] },
      { label: 'Accidents', value: String(accidents), bg: [254, 226, 226], fg: [185, 28, 28], vfg: [185, 28, 28] },
      { label: 'Incidents', value: String(incidents), bg: [254, 249, 195], fg: [161, 98, 7], vfg: [161, 98, 7] },
      { label: "Presqu'accidents", value: String(presquAcc), bg: [219, 234, 254], fg: [30, 64, 175], vfg: [30, 64, 175] },
      { label: 'En cours', value: String(ouverts), bg: [255, 237, 213], fg: [154, 52, 18], vfg: [154, 52, 18] },
      { label: 'Clotures', value: String(clos), bg: [209, 250, 229], fg: [6, 95, 70], vfg: [6, 95, 70] },
    ];

    const cardsPerRow = 3;
    const cardGap = 3;
    const cardW = (contentWidth - cardGap * (cardsPerRow - 1)) / cardsPerRow;
    const cardH = 22;

    kpiCards.forEach((card, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      const cx = margin + col * (cardW + cardGap);
      const cy = y + row * (cardH + 6);
      
      doc.setFillColor(...card.bg);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');

      // Valeur (grande)
      doc.setTextColor(...card.vfg);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, cx + cardW / 2, cy + 13, { align: 'center' });

      // Label (petit)
      doc.setTextColor(...card.fg);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, cx + cardW / 2, cy + 19, { align: 'center' });
    });
    y += 2 * (cardH + 6) + 2;

    if (exportAll) {
      // Trier du plus récent au plus ancien
      const sortedEvents = [...events].sort((a, b) => new Date(b.date_event) - new Date(a.date_event));
      for (const event of sortedEvents) {
        await addSingleEventPage(event);
      }
    } else {
      await addSingleEventPage(events[0]);
    }
    } // fin annexe fiches

    // =====================================================
    // ANNEXE PHOTOS (rapport trimestriel)
    // =====================================================
    if (withPhotos) {
      const excl = new Set(R.photos_exclues || []);
      const photos = (await photoCandidates(base44, R, events)).filter((p) => !excl.has(p.key)).slice(0, MAX_PHOTOS);
      newPage();
      y = 20;
      y = sectionTitle(photosSectionNo + '. Annexe - Photos des evenements du trimestre', y);
      if (!photos.length) {
        y = bodyText('Aucune photo retenue pour ce trimestre.', y, 0);
      } else {
        y = bodyText(photos.length + ' photo(s), classees par fiche puis galerie. Chaque legende indique la fiche, le type d\'evenement, la date et le lieu.', y, 0);
        y += 3;
        const cols = Number(R.photos_par_page) === 2 ? 1 : 2;
        const gap = 6;
        const cellW = (contentWidth - gap * (cols - 1)) / cols;
        const cellH = (pageHeight - 20 - 20 - gap) / 2; // 2 rangées par page
        const imgH = cellH - 12;
        const stopAt = Date.now() + 100000; // au-delà, cadres vides plutôt qu'un dépassement de délai
        let col = 0;
        for (const p of photos) {
          if (col === 0 && y + cellH > pageHeight - 16) { newPage(); y = 20; }
          const x = margin + col * (cellW + gap);
          const img = Date.now() < stopAt ? await loadPdfImage(p.url) : null;
          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(248, 250, 252);
          doc.rect(x, y, cellW, imgH, 'FD');
          let placed = false;
          if (img) {
            try {
              let w = img.w, h = img.h;
              if (!w || !h) { const props = doc.getImageProperties(img.data); w = props.width; h = props.height; }
              const ratio = w / h;
              let dw = cellW - 2, dh = dw / ratio;
              if (dh > imgH - 2) { dh = imgH - 2; dw = dh * ratio; }
              doc.addImage(img.data, img.fmt, x + (cellW - dw) / 2, y + (imgH - dh) / 2, dw, dh, undefined, 'FAST');
              placed = true;
            } catch (_e) { placed = false; }
          }
          if (!placed) {
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text('Image non disponible', x + cellW / 2, y + imgH / 2, { align: 'center' });
          }
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          const cap = doc.splitTextToSize(s(p.legende), cellW);
          doc.text(cap.slice(0, 2), x, y + imgH + 4.5);
          col++;
          if (col === cols) { col = 0; y += cellH + gap; }
        }
      }
    }

    const pdfBytes = doc.output('arraybuffer');

    // Rapport trimestriel : PDF archivé dans le rapport (stockage privé) puis renvoyé pour téléchargement.
    if (R) {
      const name = 'rapport_hse_T' + R.trimestre + '_' + R.annee + '.pdf';
      const upload = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
        file: new File([new Uint8Array(pdfBytes)], name, { type: 'application/pdf' }),
      });
      if (!upload || !upload.file_uri) throw new Error('Archivage du PDF impossible');
      await base44.asServiceRole.entities.RapportHSE.update(R.id, {
        pdf_uri: upload.file_uri, pdf_genere_le: new Date().toISOString(), modifie_apres_pdf: false,
      });
      return Response.json({ pdfBase64: Buffer.from(pdfBytes).toString('base64'), filename: name });
    }

    const filename = exportAll
      ? 'rapport_periodique_hse_cag_2025.pdf'
      : 'fiche_hse_' + s(events[0].reference || String(events[0].fiche_number)) + '.pdf';

    // Envoye en base64 dans du JSON : functions.invoke (axios) decode la reponse en texte,
    // ce qui corromprait un PDF binaire.
    return Response.json({ pdfBase64: Buffer.from(pdfBytes).toString('base64'), filename });

  } catch (error) {
    console.error('exportHSEPDF:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});