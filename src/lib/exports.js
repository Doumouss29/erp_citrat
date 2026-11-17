// COPROCIV — exports : Excel avec formules, Word (.docx), fiche d'immeuble (Excel, JSON, PDF).
// Les bibliothèques lourdes (exceljs, docx) ne sont chargées qu'au moment de l'export.
import { compute, addrOf, slug, LVL, levelsLabel, TYPES, BATL, METHODS, USAGE, natureOf, pcLoc, docTheme, hasParcelle, typeCoproOf, esc, hspOf, n0, descOf, jpOf, MESURE_DEF } from '@/lib/engine';
import { fillText, baseLabel, dossierInfo, brand, docHead } from '@/lib/docs';

// ---------- Utilitaires ----------
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fname = (s, what, ext) => `${slug((s.info || {}).ref || 'dossier')}_${slug((s.info || {}).nom || '')}_${what}.${ext}`.replace(/__+/g, '_');
const ownerName = (s, id) => ((s.owners || []).find(o => o.id === id) || {}).nom || '';
const statusLabel = s => s.validated ? 'Validé par le notaire' : s.certified ? 'Certifié par le géomètre — en attente du notaire' : 'Projet (non certifié)';
const sheetName = (t, used) => {
  let n = String(t).replace(/[[\]:*?/\\]/g, ' ').slice(0, 28).trim() || 'Feuille';
  let k = n, i = 2;
  while (used.has(k.toLowerCase())) k = n.slice(0, 25) + ' ' + i++;
  used.add(k.toLowerCase());
  return k;
};
const colL = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// ---------- Fiche d'immeuble (données communes Excel / JSON / PDF) ----------
export function ficheRows(s) {
  const c = compute(s);
  const grids = (s.grids || []);
  return {
    grids: grids.map(g => ({ id: g.id, nom: g.name, perimetre: g.scope || '', base: (c.g[g.id] || {}).base ?? +g.base })),
    lots: c.rows.map(r => ({
      numero: r.id,
      designation: r.des || '',
      nature: (TYPES[r.type] || {}).l || r.type,
      batiment: r.bat === 'SS' ? 'Sous-sol' : r.bat,
      escalier: r.escalier || '',
      etage: levelsLabel(r),
      niveau: r.niveau,
      surface_m2: Math.round(r.surfTot * 100) / 100,
      superficie_attestee_m2: r.superficie != null ? Math.round(r.superficie * 100) / 100 : null,
      descriptif: descOf(s, r, compute(s)),
      jouissances_privatives: jpOf(s, r.id).map(x => x.nom || ''),
      milliemes_generaux: `${r.tg}/${s.baseGen}`,
      tantiemes_generaux: r.tg,
      proprietaire: ownerName(s, r.owner),
      charges_speciales: grids.reduce((o, g) => { const G = c.g[g.id] || {}; const sh = (G.shares || {})[r.id]; if (sh != null) o[g.id] = `${sh}/${G.base ?? g.base}`; return o; }, {})
    }))
  };
}

export function ficheJson(s) {
  const i = s.info || {};
  const f = ficheRows(s);
  const out = {
    format: 'coprociv.fiche-immeuble', version: 1, genere_le: new Date().toISOString(),
    cadre_legal: "Loi n° 2019-576 du 26 juin 2019 — Code de la Construction et de l'Habitat, Livre 2, art. 379 à 407",
    statut: statusLabel(s),
    certification: s.certified ? (s.meta || {}).certif : null,
    validation: s.validated ? (s.meta || {}).valid : null,
    immeuble: { nom: i.nom || '', adresse: addrOf(i), titre_foncier: i.tf || '', acd: i.acd || '', contenance: i.contenance || '', section: i.section || '', parcelle: i.parcelle || '', ilot: i.ilot || '', usage: USAGE[i.usage] || i.usage || '', geometre: i.geometre || '', notaire: i.notaire || '', reference: i.ref || '' },
    base_tantiemes_generaux: s.baseGen,
    batiments: (s.bats || []).map(b => ({ code: b.id, nom: b.name, etages: b.etages, ascenseur: !!b.lift })),
    grilles: f.grids,
    lots: f.lots
  };
  download(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }), fname(s, 'fiche_immeuble', 'json'));
}

export function ficheHtml(s) {
  const i = s.info || {};
  const f = ficheRows(s);
  const gh = f.grids.map(g => `<th>${esc(g.nom)}<br><span style="font-weight:normal">${esc(g.perimetre)}</span></th>`).join('');
  const rows = f.lots.map(l => `<tr><td>${esc(l.numero)}</td><td>${esc(l.designation)}</td><td>${esc(l.batiment)}</td><td>${esc(l.escalier)}</td><td>${esc(l.etage)}</td><td class="n">${esc(l.milliemes_generaux)}</td>${f.grids.map(g => `<td class="n">${esc(l.charges_speciales[g.id] || '—')}</td>`).join('')}</tr>`).join('');
  const page = '@page{size:A4 landscape;@bottom-right{content:"Page " counter(page) " / " counter(pages);font:7.5pt Manrope,Arial,sans-serif;color:#777}}';
  return `<!doctype html><html lang="fr"><head>${docHead(s, 'Fiche d’immeuble — ' + esc(i.nom || ''), page)}</head><body>${s.validated ? '' : '<div class="draftmark">PROJET</div>'}<div class="doc">
${brand('Dossier <b>' + esc(i.ref || '—') + '</b><br>' + esc(statusLabel(s)), true)}
<h1 class="simple">Fiche d'immeuble</h1><p class="sub">${esc(i.nom || '')} — ${esc(addrOf(i))}</p>
<div class="boxes" style="margin-bottom:10pt"><div class="box"><h4>L’immeuble</h4><table class="kv"><tr><td>Titre foncier</td><td>${esc(i.tf || '—')}</td></tr><tr><td>ACD</td><td>${esc(i.acd || '—')}</td></tr><tr><td>Section / parcelle</td><td>${esc((i.section || '—') + ' / ' + (i.parcelle || '—'))}</td></tr><tr><td>Contenance</td><td>${esc(i.contenance || '—')}</td></tr></table></div><div class="box"><h4>Intervenants</h4><table class="kv"><tr><td>Géomètre-expert</td><td>${esc(i.geometre || '—')}</td></tr><tr><td>Notaire</td><td>${esc(i.notaire || '—')}</td></tr><tr><td>Lots</td><td>${f.lots.length}</td></tr></table></div></div>
<table><thead><tr><th>N°</th><th>Désignation</th><th>Bâtiment</th><th>Escalier</th><th>Étage</th><th class="n">Tantièmes généraux</th>${gh}</tr></thead><tbody>${rows}</tbody></table>
</div></body></html>`;
}

// ---------- Excel ----------
const HEAD = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1D3D' } }, alignment: { vertical: 'middle', wrapText: true } };
const styleHead = row => row.eachCell(c => { c.font = HEAD.font; c.fill = HEAD.fill; c.alignment = HEAD.alignment; });
const thin = { style: 'thin', color: { argb: 'FFBFC5D2' } };
const border = ws => ws.eachRow(r => r.eachCell(c => { c.border = { top: thin, left: thin, bottom: thin, right: thin }; }));
const INPUT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } }; // cellules de saisie modifiables

// Feuille de répartition au plus fort reste, entièrement en formules.
// lines : [{ cells: [...valeurs colonnes info], w: formule ou valeur du poids, ref: valeur COPROCIV }]
function allocBlock(ws, startRow, n, cols, baseRef) {
  const r0 = startRow, r1 = startRow + n - 1;
  const { W, RAW, INT, REM, RANK, QP, REF, GAP, ADJ } = cols;
  for (let k = 0; k < n; k++) {
    const r = r0 + k;
    const row = ws.getRow(r);
    row.getCell(RAW).value = { formula: `IF(SUM($${colL(W - 1)}$${r0}:$${colL(W - 1)}$${r1})=0,0,${colL(W - 1)}${r}/SUM($${colL(W - 1)}$${r0}:$${colL(W - 1)}$${r1})*${baseRef})` };
    row.getCell(INT).value = { formula: `INT(${colL(RAW - 1)}${r})` };
    row.getCell(REM).value = { formula: `${colL(RAW - 1)}${r}-${colL(INT - 1)}${r}` };
    row.getCell(RANK).value = { formula: `COUNTIF($${colL(REM - 1)}$${r0}:$${colL(REM - 1)}$${r1},">"&${colL(REM - 1)}${r})+COUNTIF($${colL(REM - 1)}$${r0}:${colL(REM - 1)}${r},${colL(REM - 1)}${r})` };
    row.getCell(QP).value = { formula: `${colL(INT - 1)}${r}+IF(AND(${colL(W - 1)}${r}>0,${colL(RANK - 1)}${r}<=${baseRef}-SUM($${colL(INT - 1)}$${r0}:$${colL(INT - 1)}$${r1})),1,0)` + (ADJ ? `+${colL(ADJ - 1)}${r}` : '') };
    if (GAP) row.getCell(GAP).value = { formula: `${colL(QP - 1)}${r}-${colL(REF - 1)}${r}` };
    row.getCell(RAW).numFmt = '0.0000';
    row.getCell(REM).numFmt = '0.0000';
  }
}

export async function exportExcel(s) {
  const ExcelJS = (await import('exceljs')).default;
  const c = compute(s);
  const i = s.info || {};
  const wb = new ExcelJS.Workbook();
  wb.creator = 'COPROCIV';
  wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };
  const used = new Set();

  // 1. Dossier
  const D = wb.addWorksheet(sheetName('Dossier', used));
  D.columns = [{ width: 34 }, { width: 70 }];
  const meta = [
    ['Copropriété', i.nom], ['Adresse', addrOf(i)], ['Titre foncier', i.tf], ['ACD', i.acd], ['Contenance', i.contenance],
    ['Section / parcelle', `${i.section || '—'} / ${i.parcelle || '—'}`], ['Îlot / lot', i.ilot], ['Usage', USAGE[i.usage] || i.usage],
    ['Géomètre-expert', i.geometre], ['Notaire', i.notaire], ['Référence', i.ref], ['Statut', statusLabel(s)],
    ['Cadre légal', "Loi n° 2019-576 du 26 juin 2019 — CCH, Livre 2, art. 379 à 407"],
    ['Exporté le', new Date().toLocaleString('fr-FR')]
  ];
  meta.forEach(([a, b]) => D.addRow([a, b || '—']));
  const baseRow = D.addRow(['Base des tantièmes généraux', +s.baseGen]);
  baseRow.getCell(2).fill = INPUT;
  const BASE = `Dossier!$B$${baseRow.number}`;
  const H = hspOf(s);
  const hS = D.addRow(['HSP — seuil (m)', +H.seuil]), hM = D.addRow(['HSP — hauteur minimale (m)', +H.min]), hC = D.addRow(['HSP — coef. entre minimum et seuil', +H.coefBas]);
  [hS, hM, hC].forEach(r => { r.getCell(2).fill = INPUT; });
  const HS = `Dossier!$B$${hS.number}`, HM = `Dossier!$B$${hM.number}`, HC = `Dossier!$B$${hC.number}`;
  D.addRow([]);
  D.addRow(['Mode d’emploi', "Les cellules jaunes sont des saisies : modifiez une surface, un coefficient ou la base, Excel recalcule les surfaces pondérées et les tantièmes (plus fort reste). La colonne « Écart » compare au calcul COPROCIV."]);
  D.getColumn(1).font = { bold: true };
  D.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  // 2. Pièces (si des lots sont saisis pièce par pièce)
  const hasPieces = c.rows.some(r => r.hasPieces);
  let XL = 1;
  if (hasPieces) {
    const X = wb.addWorksheet(sheetName('Pièces', used), { views: [{ state: 'frozen', ySplit: 1 }] });
    X.columns = [{ header: 'Lot', width: 7 }, { header: 'Partie', width: 12 }, { header: 'Pièce', width: 22 }, { header: 'Surface (m²)', width: 12 }, { header: 'HSP (m)', width: 9 }, { header: 'Coef. HSP', width: 10 }, { header: 'Coef. pièce', width: 10 }, { header: 'Surface retenue', width: 14 }, { header: 'Hors attestation', width: 12 }];
    styleHead(X.getRow(1));
    c.rows.forEach(r => r.parts.forEach(p => (p.pieces || []).forEach(x => {
      const row = X.addRow([String(r.id), p.pid, x.lib || '', n0(x.surface), x.hsp === '' || x.hsp == null ? null : +x.hsp, null, x.coef === '' || x.coef == null ? 1 : +x.coef, null, x.exclu ? 'oui' : '']);
      const n = row.number;
      row.getCell(6).value = { formula: `IF(E${n}="",1,IF(E${n}<${HM},0,IF(E${n}<${HS},${HC},1)))` };
      row.getCell(8).value = { formula: `D${n}*F${n}*G${n}` };
      row.getCell(8).numFmt = '0.00';
      [4, 5, 7].forEach(k => { row.getCell(k).fill = INPUT; });
    })));
    XL = X.rowCount;
    border(X);
  }

  // 3. Pondération (une ligne par partie de lot)
  const P = wb.addWorksheet(sheetName('Pondération', used), { views: [{ state: 'frozen', ySplit: 1 }] });
  P.columns = [
    { header: 'Lot', width: 7 }, { header: 'Partie', width: 16 }, { header: 'Bâtiment', width: 11 }, { header: 'Niveau', width: 12 },
    { header: 'Surface retenue (m²)', width: 13 }, { header: 'Coef. nature', width: 11 }, { header: 'Surface annexe (m²)', width: 13 },
    { header: 'Coef. annexe', width: 11 }, { header: 'Coef. niveau', width: 11 }, { header: 'Coef. partie', width: 11 }, { header: 'Surface pondérée', width: 15 },
    { header: 'Clé de partie', width: 12 }, { header: 'Surface réelle (m²)', width: 13 }
  ];
  styleHead(P.getRow(1));
  c.rows.forEach(r => r.parts.forEach(p => {
    const row = P.addRow([String(r.id), p.main ? 'Principale' : ((p.lib || '').trim() || LVL(+p.niveau)), BATL(r.bat), LVL(+p.niveau), +p.surface || 0, r.ct, p.saEff || 0, p.ca || 0, p.ce, p.cp, null, p.pid]);
    const n = row.number;
    if ((p.pieces || []).length) {
      row.getCell(5).value = { formula: `SUMIFS('Pièces'!$H$2:$H$${XL},'Pièces'!$A$2:$A$${XL},A${n},'Pièces'!$B$2:$B$${XL},L${n})`, result: p.seff };
      row.getCell(13).value = { formula: `SUMIFS('Pièces'!$D$2:$D$${XL},'Pièces'!$A$2:$A$${XL},A${n},'Pièces'!$B$2:$B$${XL},L${n})`, result: p.surface };
    } else {
      row.getCell(5).fill = INPUT;
      row.getCell(13).value = { formula: `E${n}`, result: +p.surface || 0 };
    }
    row.getCell(11).value = { formula: `(E${n}*F${n}+G${n}*H${n})*I${n}*J${n}`, result: p.v };
    [6, 7, 8, 9, 10].forEach(k => { row.getCell(k).fill = INPUT; });
    row.getCell(11).numFmt = '0.00';
    row.getCell(5).numFmt = '0.00';
  }));
  const pLast = P.rowCount;
  border(P);

  // 3. Tantièmes généraux
  const T = wb.addWorksheet(sheetName('Tantièmes généraux', used), { views: [{ state: 'frozen', ySplit: 1 }] });
  T.columns = [
    { header: 'Lot', width: 7 }, { header: 'Bâtiment', width: 11 }, { header: 'Niveau(x)', width: 18 }, { header: 'Nature', width: 14 },
    { header: 'Désignation', width: 36 }, { header: 'Surface totale (m²)', width: 13 }, { header: 'Coef. situation', width: 11 },
    { header: 'Surface pondérée du lot', width: 15 }, { header: 'Quote-part brute', width: 13 }, { header: 'Partie entière', width: 11 },
    { header: 'Reste', width: 10 }, { header: 'Rang du reste', width: 10 }, { header: 'Tantièmes', width: 11 },
    { header: 'Calcul COPROCIV', width: 12 }, { header: 'Écart', width: 8 }, { header: 'Propriétaire', width: 28 }, { header: 'Ajustement manuel', width: 11 }
  ];
  styleHead(T.getRow(1));
  const t0 = 2;
  c.rows.forEach(r => {
    const row = T.addRow([String(r.id), BATL(r.bat), levelsLabel(r), (TYPES[r.type] || {}).l || r.type, r.des || '', null, +r.situation || 0]);
    const n = row.number;
    row.getCell(6).value = { formula: `SUMIF('Pondération'!$A$2:$A$${pLast},A${n},'Pondération'!$M$2:$M$${pLast})`, result: r.surfTot };
    row.getCell(17).value = r.adj || 0;
    row.getCell(17).fill = INPUT;
    row.getCell(8).value = { formula: `SUMIF('Pondération'!$A$2:$A$${pLast},A${n},'Pondération'!$K$2:$K$${pLast})*G${n}`, result: r.sp };
    row.getCell(7).fill = INPUT;
    row.getCell(8).numFmt = '0.00';
    row.getCell(14).value = r.tg;
    row.getCell(16).value = ownerName(s, r.owner);
  });
  const t1 = T.rowCount;
  if (t1 >= t0) {
    allocBlock(T, t0, t1 - t0 + 1, { W: 8, RAW: 9, INT: 10, REM: 11, RANK: 12, QP: 13, REF: 14, GAP: 15, ADJ: 17 }, BASE);
    const tot = T.addRow(['Total']);
    const n = tot.number;
    tot.getCell(6).value = { formula: `SUM(F${t0}:F${t1})` };
    tot.getCell(8).value = { formula: `SUM(H${t0}:H${t1})` };
    tot.getCell(13).value = { formula: `SUM(M${t0}:M${t1})` };
    tot.getCell(14).value = c.sumTg;
    tot.getCell(15).value = { formula: `IF(M${n}=${BASE},"Équilibré","À vérifier")` };
    tot.font = { bold: true };
  }
  border(T);
  T.getColumn(13).font = { bold: true };

  // 4. Une feuille par grille de charges spéciales
  (s.grids || []).forEach(g => {
    const G = c.g[g.id] || { shares: {}, weights: {} };
    const ws = wb.addWorksheet(sheetName('Grille ' + g.name, used), { views: [{ state: 'frozen', ySplit: 4 }] });
    ws.columns = [{ width: 8 }, { width: 34 }, { width: 12 }, { width: 14 }, { width: 11 }, { width: 13 }, { width: 13 }, { width: 11 }, { width: 10 }, { width: 10 }, { width: 11 }, { width: 12 }, { width: 8 }, { width: 16 }];
    const meth = (METHODS.find(m => m[0] === g.method) || ['', g.method])[1];
    ws.addRow(['Base', G.base ?? +g.base]).getCell(2).fill = INPUT;
    ws.addRow(['Budget annuel (FCFA)', +g.budget || 0]).getCell(2).fill = INPUT;
    const ex = g.excl || {};
    ws.addRow(['Clé', `${meth}${g.prog && g.method !== 'lot' ? ` · majoration ${g.prog} % par étage` : ''}${ex.annexes ? ' · annexes exclues' : ''}${ex.niveauxSup ? ' · niveaux supplémentaires exclus' : ''} · ${g.scope || ''}`]);
    const h = ws.addRow(['Lot', 'Désignation', 'Niveau', 'Base de répartition', 'Facteur d’étage', 'Poids', 'Quote-part brute', 'Partie entière', 'Reste', 'Rang du reste', 'Quote-part', 'Calcul COPROCIV', 'Écart', 'Montant annuel (FCFA)']);
    styleHead(h);
    const r0 = 5;
    const members = c.rows.filter(r => G.weights[r.id] != null);
    members.forEach(r => {
      const lc = g.levelCoefs ? g.levelCoefs[r.niveau] : null;
      const fac = g.method === 'lot' ? 1 : (lc != null && lc !== '') ? n0(lc) : (r.niveau > 0 ? 1 + n0(g.prog) / 100 * (r.niveau - 1) : 1);
      const b = fac ? G.weights[r.id] / fac : G.weights[r.id];
      const row = ws.addRow([String(r.id), r.des || '', LVL(r.niveau), b, fac]);
      const n = row.number;
      row.getCell(6).value = { formula: `D${n}*E${n}`, result: G.weights[r.id] };
      row.getCell(12).value = G.shares[r.id];
      row.getCell(14).value = { formula: `IF($B$1=0,0,K${n}/$B$1*$B$2)` };
      row.getCell(14).numFmt = '#,##0';
      row.getCell(4).fill = INPUT; row.getCell(5).fill = INPUT;
    });
    if (members.length) {
      allocBlock(ws, r0, members.length, { W: 6, RAW: 7, INT: 8, REM: 9, RANK: 10, QP: 11, REF: 12, GAP: 13 }, '$B$1');
      const tot = ws.addRow(['Total']);
      const n = tot.number, r1 = n - 1;
      tot.getCell(11).value = { formula: `SUM(K${r0}:K${r1})` };
      tot.getCell(12).value = G.sum;
      tot.getCell(14).value = { formula: `SUM(N${r0}:N${r1})` };
      tot.getCell(14).numFmt = '#,##0';
      tot.font = { bold: true };
    }
    ws.getColumn(1).font = { bold: true };
    border(ws);
  });

  // 5. Fiche d'immeuble
  addFicheSheet(wb, s, sheetName("Fiche d'immeuble", used));

  // 6. Parties communes
  const C = wb.addWorksheet(sheetName('Parties communes', used));
  C.columns = [{ header: 'Désignation', width: 30 }, { header: 'Nature', width: 18 }, { header: 'Bâtiment', width: 12 }, { header: 'Emplacement', width: 16 }, { header: 'Grille', width: 22 }, { header: 'Surface (m²)', width: 12 }];
  styleHead(C.getRow(1));
  (s.communs || []).forEach(x => C.addRow([x.nom || '', natureOf(x) === 'pcs' ? 'Spéciale (P.C.S.)' : 'Générale (P.C.G.)', BATL(x.bat), pcLoc(x), natureOf(x) === 'pcs' ? (((s.grids || []).find(g => g.id === x.cle) || {}).name || 'à préciser') : '—', x.surface !== '' && x.surface != null ? +x.surface : null]));
  border(C);

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fname(s, 'EDD_calculs', 'xlsx'));
}

function addFicheSheet(wb, s, name) {
  const f = ficheRows(s);
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  const cols = ['numero', 'designation', 'batiment', 'escalier', 'etage', 'milliemes-generaux', ...f.grids.map(g => 'tantiemes-' + slug(g.nom).toLowerCase().replace(/_/g, '-') + (g.perimetre ? '-' + slug(g.perimetre).toLowerCase().replace(/_/g, '-') : ''))];
  ws.columns = cols.map((h, k) => ({ header: h, width: k === 1 ? 36 : 16 }));
  styleHead(ws.getRow(1));
  f.lots.forEach(l => ws.addRow([l.numero, l.designation, l.batiment, l.escalier, l.etage, l.milliemes_generaux, ...f.grids.map(g => l.charges_speciales[g.id] || '')]));
  border(ws);
  return ws;
}

export async function exportFicheExcel(s) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'COPROCIV';
  addFicheSheet(wb, s, "Fiche d'immeuble");
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fname(s, 'fiche_immeuble', 'xlsx'));
}

// ---------- Word ----------
// Même structure que les PDF : page de garde, sommaire, sections numérotées, en-tête et pied de page paginé.
// Couleur principale : celle du thème de l'application (fixée à chaque export).
let NAVY = '0F1D3D';
const GOLD = 'A87B2A', GOLD_L = 'D9A54A', GREY = '5A606B', TITLE_FONT = 'Cinzel', TEXT_FONT = 'Manrope';
const applyTheme = s => { NAVY = docTheme(s).p.replace('#', '').toUpperCase(); };
async function docxKit() {
  const d = await import('docx');
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType } = d;
  const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, before: o.before }, alignment: o.align, keepNext: o.keepNext, children: [new TextRun({ text: String(text ?? ''), bold: o.bold, italics: o.italic, size: o.size, color: o.color, font: o.font, allCaps: o.caps, characterSpacing: o.spacing })] });
  const bd = { style: BorderStyle.SINGLE, size: 4, color: 'CFD4DE' };
  const cell = (t, o = {}) => new TableCell({
    width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined,
    borders: { top: bd, bottom: bd, left: bd, right: bd },
    shading: o.head ? { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' } : o.foot ? { type: ShadingType.CLEAR, fill: 'E9ECF2', color: 'auto' } : o.zebra ? { type: ShadingType.CLEAR, fill: 'F5F6F9', color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [new Paragraph({ alignment: o.num ? AlignmentType.RIGHT : AlignmentType.LEFT, children: String(t ?? '').split('\n').map((x, k) => new TextRun({ text: x, break: k ? 1 : undefined, bold: !!o.head || !!o.foot || !!o.bold, size: 17, font: TEXT_FONT, color: o.head ? 'FFFFFF' : o.foot ? NAVY : undefined })) })]
  });
  // Tableau de données : en-tête marine répété sur chaque page, lignes alternées, dernière ligne en total si demandé.
  const table = (head, rows, numCols = [], widths = null, total = false) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // Largeurs explicites en twips (largeur utile ≈ 9 700) : Word et LibreOffice les respectent.
    ...(widths ? { columnWidths: widths.map(w => Math.round(w * 97)), layout: d.TableLayoutType.FIXED } : {}),
    rows: [new TableRow({ tableHeader: true, children: head.map((h, k) => cell(h, { head: true, w: widths && widths[k], num: numCols.includes(k) })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((v, k) => cell(v, { num: numCols.includes(k), w: widths && widths[k], zebra: ri % 2 === 1, foot: total && ri === rows.length - 1, bold: k === 0 })) }))]
  });
  // Tableau clé / valeur sans bordures (page de garde).
  const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const kv = rows => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, borders: { top: nb, bottom: nb, left: nb, right: nb }, children: [new Paragraph({ children: [new TextRun({ text: k, size: 18, color: GREY, font: TEXT_FONT })] })] }),
      new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, borders: { top: nb, bottom: nb, left: nb, right: nb }, children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 19 })] })] })
    ] }))
  });
  // Encadré titré (page de garde) : filet marine en haut.
  const box = (title, inner) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: { style: BorderStyle.SINGLE, size: 18, color: NAVY }, bottom: bd, left: bd, right: bd },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 16, color: NAVY, font: TEXT_FONT, characterSpacing: 20 })] }), inner]
    })] })]
  });
  const H = (num, text, ref) => new Paragraph({
    keepNext: true, spacing: { before: 360, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: NAVY, space: 2 } },
    children: [new TextRun({ text: num + '   ', bold: true, size: 26, color: GOLD, font: TITLE_FONT }), new TextRun({ text, bold: true, size: 26, color: NAVY, font: TITLE_FONT }), ...(ref ? [new TextRun({ text: '   ' + ref, size: 16, color: '777777', font: TEXT_FONT })] : [])]
  });
  const H3 = text => new Paragraph({ keepNext: true, spacing: { before: 200, after: 80 }, children: [new TextRun({ text, bold: true, size: 23, color: NAVY })] });
  return { d, P, H, H3, table, kv, box, AlignmentType };
}

function blocksFor(s, K) {
  const c = compute(s);
  const D = dossierInfo(s, c);
  const { P, H3, table, kv, box, AlignmentType } = K;
  const { Paragraph, TextRun, PageBreak } = K.d;
  const i = s.info || {};
  const LOI = 'loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l’Habitat';
  // Page de garde.
  const cover = (kind, title, law) => [
    // Bandeau de marque COPROCIV, aux couleurs du thème de l'application.
    new K.d.Table({ width: { size: 100, type: K.d.WidthType.PERCENTAGE }, rows: [new K.d.TableRow({ children: [new K.d.TableCell({
      shading: { type: K.d.ShadingType.CLEAR, fill: NAVY, color: 'auto' }, margins: { top: 200, bottom: 200, left: 260, right: 260 },
      borders: { top: { style: BorderStyle2(K), size: 0, color: NAVY }, left: { style: BorderStyle2(K), size: 0, color: NAVY }, right: { style: BorderStyle2(K), size: 0, color: NAVY }, bottom: { style: BorderStyle2(K), size: 24, color: GOLD_L } },
      children: [new Paragraph({ tabStops: [{ type: K.d.TabStopType.RIGHT, position: 9000 }], children: [new TextRun({ text: '◆  ', color: GOLD_L, size: 22 }), new TextRun({ text: 'COPROCIV', bold: true, size: 32, color: 'FFFFFF', font: TITLE_FONT, characterSpacing: 60 }), new TextRun({ text: '\tCOPROPRIÉTÉ · CÔTE D’IVOIRE', bold: true, size: 15, color: 'C3CADB', font: TEXT_FONT, characterSpacing: 30 })] })]
    })] })] }),
    new Paragraph({ spacing: { after: 300 }, children: [] }),
    P(kind, { align: AlignmentType.CENTER, bold: true, caps: true, size: 18, color: GOLD, font: TEXT_FONT, spacing: 60, before: 1200 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 }, children: [new TextRun({ text: title, bold: true, size: 52, color: NAVY, font: TITLE_FONT })] }),
    P(law, { align: AlignmentType.CENTER, size: 19, color: GREY }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 60 }, children: [new TextRun({ text: '———', color: GOLD })] }),
    P(i.nom || 'Copropriété', { align: AlignmentType.CENTER, bold: true, size: 32, color: NAVY, after: 40, font: TITLE_FONT }),
    P(addrOf(i) || '', { align: AlignmentType.CENTER, color: GREY, after: 900 }),
    box('L’immeuble', kv(D.immeuble)), P(' ', { after: 60 }),
    box('Composition', kv(D.compo)), P(' ', { after: 60 }),
    box('Intervenants', kv(D.acteurs)),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, border: { top: { style: BorderStyle2(K), size: 8, color: D.status.ok ? '2F7D4F' : GOLD, space: 4 }, bottom: { style: BorderStyle2(K), size: 8, color: D.status.ok ? '2F7D4F' : GOLD, space: 4 } }, children: [new TextRun({ text: D.status.t.toUpperCase(), bold: true, size: 18, color: D.status.ok ? '2F7D4F' : '7A5410', font: TEXT_FONT })] }),
    P('Dossier ' + (i.ref || '—') + ' · édité le ' + D.edition + ' · empreinte du contenu ' + D.empreinte, { align: AlignmentType.CENTER, size: 15, color: '777777', before: 120 })
  ];
  const sommaire = items => [
    new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle2(K), size: 10, color: NAVY, space: 2 } }, children: [new TextRun({ text: 'Sommaire', bold: true, size: 30, color: NAVY, font: TITLE_FONT })] }),
    ...items.map((t, k) => new Paragraph({ spacing: { after: 80 }, tabStops: [{ type: K.d.TabStopType.RIGHT, position: 9600, leader: 'dot' }], children: [new TextRun({ text: (k + 1) + '.  ', bold: true, color: GOLD }), new TextRun({ text: t[0] }), ...(t[1] ? [new TextRun({ text: '\t' + t[1], size: 17, color: '777777', font: TEXT_FONT })] : [])] })),
    new Paragraph({ children: [new PageBreak()] })
  ];
  const fmS = x => (Math.round((+x || 0) * 100) / 100).toLocaleString('fr-FR');
  const edd = () => {
    // Copropriété horizontale ou mixte : colonne de la parcelle privative.
    const hp = c.rows.some(r => hasParcelle(r));
    const pc = r => hasParcelle(r) && n0(r.parcelle) ? fmS(r.parcelle) : '—';
    const totP = c.rows.reduce((a, r) => a + (hasParcelle(r) ? n0(r.parcelle) : 0), 0);
    return table(['Lot', 'Bâtiment', 'Niveau', 'Nature', 'Désignation', 'Surface (m²)', ...(hp ? ['Parcelle (m²)'] : []), 'Quote-part'],
      [...c.rows.map(r => [r.id, BATL(r.bat), levelsLabel(r), (TYPES[r.type] || {}).l || r.type, r.des || '', r.type === 'terrain' ? '—' : fmS(r.surfTot), ...(hp ? [pc(r)] : []), `${r.tg} / ${s.baseGen}`]),
        ['Total', '', '', '', c.rows.length + ' lots', fmS(c.totalSu), ...(hp ? [fmS(totP)] : []), `${c.sumTg} / ${s.baseGen}`]], hp ? [5, 6, 7] : [5, 6], hp ? [6, 9, 11, 10, 29, 11, 11, 13] : [6, 10, 13, 11, 34, 12, 14], true);
  };
  const immeuble = () => [
    P(`${typeCoproOf(s) === 'horizontale' ? 'L’ensemble immobilier' : 'L’immeuble'} sis ${addrOf(i) || '…'}, objet du titre foncier ${i.tf || '…'}${i.acd ? ', ACD ' + i.acd : ''}, cadastré ${D.immeuble[3][1]}${i.contenance ? ', d’une contenance de ' + i.contenance : ''}, est divisé en ${c.rows.length} lots.`),
    table(['Bâtiment', 'Niveaux', 'Ascenseur', 'Lots'], [...(s.bats || []).map(b => [b.villas ? 'Ensemble de villas' : b.name, b.villas && !b.etages ? 'RDC' : 'RDC à R+' + b.etages, b.villas ? 'sans objet' : b.lift ? 'oui' : 'non', String(c.rows.filter(r => r.bat === b.id).length)]), ...(s.hasSS ? [['Sous-sol', '—', '—', String(c.rows.filter(r => r.bat === 'SS').length)]] : [])], [3], [40, 25, 20, 15]),
    new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: 'Méthode de mesurage : ', bold: true, size: 19 }), new TextRun({ text: s.mesure || MESURE_DEF_W, size: 19, color: '333333' })] })
  ];
  const communs = () => {
    const out = [];
    [['pcg', 'Parties communes générales', 'Elles appartiennent indivisément à l’ensemble des copropriétaires.'], ['pcs', 'Parties communes spéciales', 'Elles appartiennent aux seuls copropriétaires des lots de la grille à laquelle elles sont affectées.']].forEach(([nat, t, d]) => {
      const l = (s.communs || []).filter(x => natureOf(x) === nat);
      out.push(H3(t)); out.push(P(d, { size: 19, color: GREY }));
      out.push(l.length ? table(['Désignation', 'Bâtiment', 'Emplacement', ...(nat === 'pcs' ? ['Affectée à'] : []), 'Surface (m²)'],
        l.map(x => [x.nom || '—', BATL(x.bat), pcLoc(x), ...(nat === 'pcs' ? [(((s.grids || []).find(g => g.id === x.cle) || {}).name || 'à préciser')] : []), x.surface !== '' && x.surface != null ? fmS(x.surface) : '—']), [nat === 'pcs' ? 4 : 3]) : P('Néant.', { italic: true }));
    });
    return out;
  };
  const grilles = () => {
    const out = [];
    (s.grids || []).forEach((g, k) => {
      const G = c.g[g.id] || { shares: {} };
      const meth = (METHODS.find(m => m[0] === g.method) || ['', g.method])[1];
      const B = G.base ?? g.base;
      out.push(H3(`${k + 1}. ${g.name}${g.scope ? ' — ' + g.scope : ''}`));
      out.push(P(`Clé de répartition : ${meth}${g.prog && g.method !== 'lot' ? `, majoration de ${g.prog} % par étage` : ''}. Base : ${B}.`, { italic: true, size: 19, color: GREY }));
      out.push(table(['Lot', 'Désignation', 'Quote-part'], Object.entries(G.shares).map(([id, sh]) => [id, (c.rows.find(r => r.id === id) || {}).des || '', `${sh} / ${B}`]), [2], [12, 63, 25]));
    });
    if (!out.length) out.push(P('Aucune charge spéciale : toutes les charges sont réparties selon les quotes-parts générales.', { italic: true }));
    return out;
  };
  const stamp = (lab, m) => m ? `${lab} le ${new Date(m.le).toLocaleDateString('fr-FR')} par ${m.nom || m.par} (empreinte ${String(m.empreinte || '').slice(0, 12)})` : '';
  const signatures = () => [
    P(' '),
    table(['Le géomètre-expert', 'Le notaire'], [[`${i.geometre || ''}\n${s.certified ? stamp('Certifié', (s.meta || {}).certif) : 'Certification : en attente'}\n\n\n`, `${i.notaire || ''}\n${s.validated ? stamp('Validé', (s.meta || {}).valid) : 'Validation : en attente'}\n\n\n`]], [], [50, 50])
  ];
  // Désignation détaillée, regroupée par bâtiment.
  const descs = () => {
    const out = []; let bat = null;
    c.rows.forEach(r => {
      if (r.bat !== bat) { bat = r.bat; out.push(H3(BATL(r.bat))); }
      const bl = { left: { style: BorderStyle2(K), size: 18, color: GOLD, space: 8 } };
      out.push(new Paragraph({ keepNext: true, border: bl, spacing: { before: 120, after: 0 }, children: [new TextRun({ text: `Lot n° ${r.id} — ${r.des || ''}`, bold: true, color: NAVY })] }));
      out.push(new Paragraph({ keepNext: true, border: bl, spacing: { after: 0 }, children: [new TextRun({ text: `${(TYPES[r.type] || {}).l || r.type} · ${levelsLabel(r)} · ${fmS(r.surfTot)} m²`, size: 17, color: GREY, font: TEXT_FONT })] }));
      out.push(new Paragraph({ keepNext: true, border: bl, spacing: { after: 0 }, children: [new TextRun({ text: descOf(s, r, c), size: 21 })] }));
      out.push(new Paragraph({ border: bl, spacing: { after: 120 }, children: [new TextRun({ text: 'Quote-part des parties communes générales : ', size: 17, font: TEXT_FONT, color: NAVY }), new TextRun({ text: `${r.tg} / ${s.baseGen}`, bold: true, size: 17, font: TEXT_FONT, color: NAVY })] }));
    });
    return out;
  };
  return { cover, sommaire, immeuble, edd, communs, grilles, signatures, descs, P, H: K.H, D, LOI };
}
const BorderStyle2 = K => K.d.BorderStyle.SINGLE;
const MESURE_DEF_W = MESURE_DEF;

// Document en deux sections : page de garde (sans en-tête ni pied), puis contenu avec en-tête et pagination.
async function writeDocx(K, s, title, coverChildren, children, name) {
  const { Document, Packer, Header, Footer, Paragraph, TextRun, PageNumber, AlignmentType, TabStopType, BorderStyle } = K.d;
  const i = s.info || {};
  const margin = { top: 1200, bottom: 1100, left: 1100, right: 1100, header: 500, footer: 500 };
  const header = new Header({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9700 }], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CFD4DE', space: 4 } }, children: [new TextRun({ text: title, bold: true, size: 16, color: NAVY, font: TEXT_FONT }), new TextRun({ text: '\t' + (i.nom || '') + (s.validated ? '' : ' · PROJET'), size: 16, color: '777777', font: TEXT_FONT })] })] });
  const footer = new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9700 }], children: [new TextRun({ text: 'Dossier ' + (i.ref || '—') + ' · ' + (i.geometre || ''), size: 15, color: '777777', font: TEXT_FONT }), new TextRun({ children: ['\tPage ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: 15, color: '777777', font: TEXT_FONT })] })] });
  const doc = new Document({
    creator: 'COPROCIV', title: title + ' — ' + (i.nom || ''),
    styles: { default: { document: { run: { font: TEXT_FONT, size: 20 } } } },
    sections: [
      { properties: { page: { margin } }, children: coverChildren },
      { properties: { page: { margin } }, headers: { default: header }, footers: { default: footer }, children }
    ]
  });
  const blob = await Packer.toBlob(doc);
  download(blob, name);
  void AlignmentType;
}

export async function exportReglementDocx(s) {
  applyTheme(s);
  const K = await docxKit();
  const B = blocksFor(s, K);
  const arts = s.articles || [];
  const children = [...B.sommaire([...arts.map(a => [a.t, a.ref ? 'CCH ' + a.ref : '']), ['Signatures']])];
  arts.forEach((a, k) => {
    children.push(B.H('Article ' + (k + 1), a.t, a.ref ? 'CCH ' + a.ref : ''));
    fillText(a.x, s).split(/\n\s*\n|\n/).filter(t => t.trim()).forEach(t => children.push(B.P(t, { align: K.AlignmentType.JUSTIFIED })));
    if (a.k === 'edd') { children.push(B.edd()); children.push(...B.communs()); }
    if (a.k === 'grilles') children.push(...B.grilles());
  });
  children.push(B.H('—', 'Signatures'), ...B.signatures());
  await writeDocx(K, s, 'Règlement de copropriété', B.cover('Acte de copropriété', 'Règlement de copropriété', 'Établi conformément aux articles 379 à 407 de la ' + B.LOI + '.'), children, fname(s, 'reglement_copropriete', 'docx'));
}

export async function exportEddDocx(s) {
  applyTheme(s);
  const K = await docxKit();
  const B = blocksFor(s, K);
  const parts = [['Désignation générale de l’immeuble', 'CCH art. 379'], ['Tableau récapitulatif des lots'], ['Désignation détaillée des lots'], ['Parties communes'], ['Répartition des charges spéciales'], ['Certification et validation']];
  const children = [
    ...B.sommaire(parts),
    B.H('1.', parts[0][0], parts[0][1]), ...B.immeuble(),
    B.H('2.', parts[1][0]), B.P(`Quotes-parts des parties communes générales exprimées en ${baseLabel(s.baseGen)}.`, { italic: true, size: 19 }), B.edd(),
    B.H('3.', parts[2][0]), ...B.descs(),
    B.H('4.', parts[3][0]), ...B.communs(),
    B.H('5.', parts[4][0]), ...B.grilles(),
    B.H('6.', parts[5][0]), ...B.signatures()
  ];
  await writeDocx(K, s, 'État descriptif de division', B.cover('Acte de copropriété', 'État descriptif de division', 'Établi en application de l’article 379 de la ' + B.LOI + '.'), children, fname(s, 'EDD', 'docx'));
}