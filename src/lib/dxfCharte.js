// COPROCIV — charte DXF : format imposé des plans de niveau, contrôle de conformité et gabarit.
// Un plan hors charte est refusé : on corrige le dessin, pas les chiffres.
import { parseDXF, inside, centroid } from '@/lib/dxfParse';
import { BATL, LVL } from '@/lib/engine';

export const CARTOUCHE = 'CP_CARTOUCHE';
// [calque, rôle, étiquette attendue, couleur ACI du gabarit]
export const CHARTE_LAYERS = [
  ['CP_LOT', 'Contour de chaque lot privatif (un seul contour par lot et par niveau) ; pour une villa : sa surface habitable', 'LOT 12', 5],
  ['CP_PARCELLE', 'Parcelle privative d’une villa ou d’un lot de terrain (copropriété horizontale, plan de masse)', 'LOT 12', 40],
  ['CP_PIECE', 'Pièces d’un lot, à l’intérieur de son contour (facultatif : détail et hauteurs sous plafond)', 'Séjour · HSP 2,50', 8],
  ['CP_ANNEXE', 'Balcon, loggia, terrasse ou jardin privatif d’un lot', 'LOT 12 BALCON', 3],
  ['CP_PCG', 'Partie commune générale', 'HALL, PALIER R+1…', 6],
  ['CP_PCS', 'Partie commune spéciale', 'PCS ASCENSEUR A…', 1],
  ['CP_DEDUIRE', 'Poteau, gaine, trémie : surface retirée du local qui le contient', 'aucune', 30]
];
const KIND = { CP_PARCELLE: 'parcelle', CP_LOT: 'lot', CP_PIECE: 'piece', CP_ANNEXE: 'annexe', CP_PCG: 'pcg', CP_PCS: 'pcs', CP_DEDUIRE: 'deduire' };
export const CARTOUCHE_ATTS = [['DOSSIER', 'Référence du dossier', 'ex. 2026-118'], ['BATIMENT', 'Code du bâtiment', 'A, B…, SS (sous-sol) ou V (villas)'], ['NIVEAU', 'Niveau du plan', 'SS, RDC, R+1, R+2…']];

export const niveauCode = n => n < 0 ? 'SS' : n === 0 ? 'RDC' : 'R+' + n;
export const parseNiveau = v => {
  const s = String(v || '').toUpperCase().replace(/\s/g, '');
  if (s === 'RDC' || s === 'R+0' || s === 'R0' || s === '0') return 0;
  if (/^(SS|S-SOL|SOUS-SOL|SOUSSOL|-1)$/.test(s)) return -1;
  const m = s.match(/^R\+?(\d{1,2})$/);
  return m ? +m[1] : null;
};

const RX_LOT = /\bLOT\s*(?:N\s*[°ºO.]?\s*)?(\d+[A-Z]?)\b/i;
const RX_LOT_G = /\bLOT\s*(?:N\s*[°ºO.]?\s*)?\d+[A-Z]?\b/gi;
const RX_SURF = /(\d+(?:[.,]\d{1,2})?)\s*m\s*[²2](?!\d)/i;
const RX_SURF_G = /(\d+(?:[.,]\d{1,2})?)\s*m\s*[²2](?!\d)/gi;
const RX_HSP = /\bHSP\s*[:=]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:m\b)?/i;
const RX_HSP_G = /\bHSP\s*[:=]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:m\b)?/gi;
const RX_PC_TAG = /\bP\s*\.?\s*C\s*\.?\s*[GS]\b\.?/gi;
const annexOf = t => /TERRASSE/i.test(t) ? 'terrasse' : /JARDIN/i.test(t) ? 'jardin' : 'balcon';
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const r2 = x => Math.round(x * 100) / 100;
const fr = x => r2(x).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nameOf = ts => [...new Set(ts.map(t => t.txt.replace(RX_LOT_G, '').replace(RX_SURF_G, '').replace(RX_HSP_G, '').replace(RX_PC_TAG, '').replace(/^[\s\-–:/.·,]+|[\s\-–:/.·,]+$/g, '').replace(/\s{2,}/g, ' ').trim()).filter(Boolean))].join(' – ');

// Points d'essai à l'intérieur d'un polygone (centre et sommets rentrés vers le centre).
function probes(pts) {
  const c = centroid(pts);
  const out = inside(c[0], c[1], pts) ? [c] : [];
  const step = Math.max(1, Math.floor(pts.length / 32));
  for (let i = 0; i < pts.length; i += step) {
    const [x, y] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    [[x, y], [(x + x2) / 2, (y + y2) / 2]].forEach(([u, v]) => { const p = [u + (c[0] - u) * 0.06, v + (c[1] - v) * 0.06]; if (inside(p[0], p[1], pts)) out.push(p); });
  }
  return out;
}

// Contrôle d'un fichier DXF au regard de la charte, pour le dossier s.
// Retour : { ok, errors: [{ msg, ids }], warns: [{ msg, ids }], bat, niveau, lots, pcs, polys, unitL, ignored }
export function checkCharte(txt, s, tol = 0.05) {
  const errors = [], warns = [];
  const E = (msg, ids = []) => errors.push({ msg, ids });
  const W = (msg, ids = []) => warns.push({ msg, ids });
  let d;
  try { d = parseDXF(txt, { meters: true }); } catch (e) { return { ok: false, errors: [{ msg: 'Fichier DXF illisible.', ids: [] }], warns: [], polys: [], lots: [], pcs: [] }; }
  const info = s.info || {};

  // 1. Unités
  if (d.ins !== 6) E(d.ins ? `Unités : le fichier est en ${d.unitL}, les surfaces seraient fausses. La charte impose le mètre (commande UNITES, $INSUNITS = 6).` : 'Unités : aucune unité déclarée dans le fichier. La charte impose le mètre (commande UNITES, $INSUNITS = 6).');

  // 2. Cartouche
  let bat = null, niveau = null;
  const carts = d.inserts.filter(b => String(b.name).toUpperCase() === CARTOUCHE);
  if (!carts.length) E('Cartouche absent : insérez le bloc CP_CARTOUCHE (attributs DOSSIER, BATIMENT, NIVEAU) — il est fourni dans le gabarit.');
  else if (carts.length > 1) E(`${carts.length} cartouches CP_CARTOUCHE : un fichier ne contient qu’un niveau d’un bâtiment.`);
  else {
    const a = carts[0].atts;
    if (norm(a.DOSSIER) !== norm(info.ref)) E(`Cartouche : dossier « ${a.DOSSIER || 'vide'} » au lieu de « ${info.ref} ». Ce plan n’appartient pas à ce dossier.`);
    const b = String(a.BATIMENT || '').trim().toUpperCase();
    const B = (s.bats || []).find(x => String(x.id).toUpperCase() === b);
    const codes = [...(s.bats || []).map(x => x.id), ...(s.hasSS ? ['SS'] : [])].join(', ');
    if (B) bat = B.id; else if (b === 'SS' && s.hasSS) bat = 'SS';
    else E(`Cartouche : bâtiment « ${a.BATIMENT || 'vide'} » inconnu du dossier (codes possibles : ${codes}).`);
    const n = parseNiveau(a.NIVEAU);
    if (n == null) E(`Cartouche : niveau « ${a.NIVEAU || 'vide'} » illisible (SS, RDC, R+1, R+2…).`);
    else niveau = n;
    if (bat === 'SS' && n != null && n >= 0) E('Cartouche : le plan du sous-sol se déclare avec NIVEAU = SS.');
    if (B && n != null && (n < 0 || n > (+B.etages || 0))) E(`Cartouche : le ${BATL(B.id)} va du RDC au R+${B.etages} ; le niveau ${niveauCode(n)} n’existe pas.`);
  }

  // 3. Calques et contours
  const up = l => String(l || '').toUpperCase();
  const unknown = [...new Set(d.items.map(it => up(it.layer)).filter(l => l.startsWith('CP_') && !KIND[l] && l !== CARTOUCHE))];
  if (unknown.length) E(`Calque(s) inconnu(s) de la charte : ${unknown.join(', ')}. Calques admis : ${CHARTE_LAYERS.map(x => x[0]).join(', ')}.`);
  const openCP = d.opens.filter(o => KIND[up(o.layer)]);
  if (openCP.length) {
    const by = {}; openCP.forEach(o => { by[up(o.layer)] = (by[up(o.layer)] || 0) + 1; });
    E(`Contours ouverts : ${Object.entries(by).map(([l, n]) => n + ' sur ' + l).join(', ')}. Chaque local doit être une polyligne fermée.`);
  }
  const polys = d.items.filter(it => KIND[up(it.layer)]).map((it, k) => ({ ...it, n: k + 1, kind: KIND[up(it.layer)], net: it.area, ded: 0, pr: probes(it.pts) }));
  const ignored = d.items.length - polys.length;
  if (!polys.length) E('Aucun contour sur les calques CP_ : le plan n’est pas dessiné selon la charte (utilisez le gabarit).');
  const texts = d.texts.filter(t => !t.attr);
  const textsIn = p => texts.filter(t => inside(t.x, t.y, p.pts));
  const of = k => polys.filter(p => p.kind === k);
  const ids = arr => arr.map(p => p.n);

  // 4. Lots
  const lotsById = {};
  of('lot').forEach(p => {
    const nums = [...new Set(textsIn(p).map(t => (t.txt.match(RX_LOT) || [])[1]).filter(Boolean).map(x => x.toUpperCase()))];
    if (!nums.length) return E(`Contour n° ${p.n} (CP_LOT) sans étiquette « LOT n » à l’intérieur.`, [p.n]);
    if (nums.length > 1) return E(`Contour n° ${p.n} (CP_LOT) contient plusieurs numéros de lot (${nums.join(', ')}).`, [p.n]);
    const L = (s.lots || []).find(l => String(l.id).toUpperCase() === nums[0]);
    if (!L) return E(`LOT ${nums[0]} (contour n° ${p.n}) n’existe pas dans le dossier.`, [p.n]);
    if (bat && L.bat !== bat) E(`LOT ${L.id} (contour n° ${p.n}) appartient au ${BATL(L.bat)}, pas au ${BATL(bat)} déclaré dans le cartouche.`, [p.n]);
    p.lot = L.id;
    (lotsById[L.id] = lotsById[L.id] || []).push(p);
  });
  Object.entries(lotsById).forEach(([id, ps]) => { if (ps.length > 1) E(`LOT ${id} dessiné ${ps.length} fois (contours ${ids(ps).join(', ')}) : un seul contour par lot et par niveau.`, ids(ps)); });
  const lotPolys = of('lot').filter(p => p.lot);

  // 5. Pièces
  of('piece').forEach(p => {
    const hosts = of('lot').filter(L => inside(...centroid(p.pts), L.pts) || p.pr.every(q => inside(q[0], q[1], L.pts)));
    if (!hosts.length) return E(`Pièce n° ${p.n} (CP_PIECE) hors de tout contour de lot.`, [p.n]);
    const host = hosts.sort((a, b) => a.area - b.area)[0];
    if (!host.lot) return; // contour de lot déjà en erreur : la pièce sera contrôlée après correction
    if (!p.pr.every(q => inside(q[0], q[1], host.pts))) E(`Pièce n° ${p.n} dépasse du contour du LOT ${host.lot}.`, [p.n, host.n]);
    const ts = textsIn(p);
    p.lot = host.lot;
    p.lib = nameOf(ts);
    const h = ts.map(t => (t.txt.match(RX_HSP) || [])[1]).find(Boolean);
    p.hsp = h ? parseFloat(h.replace(',', '.')) : '';
    if (!p.lib) E(`Pièce n° ${p.n} (LOT ${host.lot}) sans nom : écrivez « Séjour », « Chambre 1 »… à l’intérieur.`, [p.n]);
  });

  // 5 bis. Parcelles privatives (copropriété horizontale) : une par villa ou lot de terrain, contenant son contour bâti
  const parcById = {};
  of('parcelle').forEach(p => {
    const nums = [...new Set(textsIn(p).map(t => (t.txt.match(RX_LOT) || [])[1]).filter(Boolean).map(x => x.toUpperCase()))];
    if (nums.length !== 1) return E(`Parcelle n° ${p.n} (CP_PARCELLE) : écrivez le numéro du lot, ex. « LOT 12 » (un seul par parcelle).`, [p.n]);
    const L = (s.lots || []).find(l => String(l.id).toUpperCase() === nums[0]);
    if (!L) return E(`Parcelle n° ${p.n} : LOT ${nums[0]} n’existe pas dans le dossier.`, [p.n]);
    if (L.type !== 'villa' && L.type !== 'terrain') return E(`Parcelle n° ${p.n} : le LOT ${L.id} n’est ni une villa ni un lot de terrain (nature à corriger dans le dossier).`, [p.n]);
    if (bat && L.bat !== bat) E(`Parcelle n° ${p.n} (LOT ${L.id}) : le lot appartient au ${BATL(L.bat)}, pas au ${BATL(bat)} du cartouche.`, [p.n]);
    p.lot = L.id;
    (parcById[L.id] = parcById[L.id] || []).push(p);
  });
  Object.entries(parcById).forEach(([id, ps]) => { if (ps.length > 1) E(`LOT ${id} : ${ps.length} parcelles dessinées (contours ${ids(ps).join(', ')}) ; une seule par lot.`, ids(ps)); });
  lotPolys.forEach(p => {
    const P = (parcById[p.lot] || [])[0];
    if (P && !p.pr.every(q => inside(q[0], q[1], P.pts))) E(`LOT ${p.lot} : le contour bâti (n° ${p.n}) dépasse de sa parcelle (n° ${P.n}).`, [p.n, P.n]);
  });

  // 6. Annexes
  of('annexe').forEach(p => {
    const ts = textsIn(p);
    const nums = [...new Set(ts.map(t => (t.txt.match(RX_LOT) || [])[1]).filter(Boolean).map(x => x.toUpperCase()))];
    if (nums.length !== 1) return E(`Annexe n° ${p.n} (CP_ANNEXE) : écrivez le lot auquel elle appartient, ex. « LOT 12 BALCON ».`, [p.n]);
    const L = (s.lots || []).find(l => String(l.id).toUpperCase() === nums[0]);
    if (!L) return E(`Annexe n° ${p.n} : LOT ${nums[0]} n’existe pas dans le dossier.`, [p.n]);
    p.lot = L.id; p.ann = annexOf(ts.map(t => t.txt).join(' '));
  });

  // 7. Parties communes
  ['pcg', 'pcs'].forEach(k => of(k).forEach(p => {
    p.nom = nameOf(textsIn(p));
    if (!p.nom) E(`Partie commune n° ${p.n} (${k === 'pcg' ? 'CP_PCG' : 'CP_PCS'}) sans nom : écrivez « HALL », « PALIER R+1 »… à l’intérieur.`, [p.n]);
  }));

  // 8. Surfaces à déduire : retirées du plus petit local qui les contient
  const hosts = polys.filter(p => p.kind !== 'deduire');
  of('deduire').forEach(p => {
    const [x, y] = centroid(p.pts);
    const h = hosts.filter(q => q.area > p.area && inside(x, y, q.pts)).sort((a, b) => a.area - b.area)[0];
    if (!h) return E(`Surface à déduire n° ${p.n} (CP_DEDUIRE) hors de tout local.`, [p.n]);
    h.ded = r2(h.ded + p.area); h.net = r2(h.area - h.ded); p.into = h.n;
  });

  // 9. Chevauchements (lots, annexes et parties communes entre eux ; pièces d'un même lot entre elles)
  const tops = polys.filter(p => ['lot', 'annexe', 'pcg', 'pcs', 'parcelle'].includes(p.kind));
  const ovl = (A, B) => A.pr.some(q => inside(q[0], q[1], B.pts)) || B.pr.some(q => inside(q[0], q[1], A.pts));
  const tag = p => p.kind === 'lot' ? 'LOT ' + (p.lot || '?') : p.kind === 'annexe' ? 'annexe du LOT ' + (p.lot || '?') : p.kind === 'parcelle' ? 'parcelle du LOT ' + (p.lot || '?') : (p.nom || 'partie commune');
  // Une parcelle contient normalement le bâti et les annexes de son propre lot.
  const sameLotParc = (A, B) => (A.kind === 'parcelle' || B.kind === 'parcelle') && A.lot && A.lot === B.lot;
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    if (sameLotParc(tops[i], tops[j])) continue;
    if (ovl(tops[i], tops[j])) E(`Chevauchement : contour n° ${tops[i].n} (${tag(tops[i])}) et n° ${tops[j].n} (${tag(tops[j])}).`, [tops[i].n, tops[j].n]);
  }
  const pcs = of('piece').filter(p => p.lot);
  for (let i = 0; i < pcs.length; i++) for (let j = i + 1; j < pcs.length; j++) {
    if (pcs[i].lot === pcs[j].lot && ovl(pcs[i], pcs[j])) E(`Pièces n° ${pcs[i].n} et n° ${pcs[j].n} du LOT ${pcs[i].lot} se chevauchent.`, [pcs[i].n, pcs[j].n]);
  }

  // 10. Résultat par lot
  const lots = {};
  const lotOf = id => (lots[id] = lots[id] || { id, contour: null, parcelle: null, pieces: [], sa: 0, ann: null, polys: [] });
  of('parcelle').filter(p => p.lot).forEach(p => { const L = lotOf(p.lot); L.parcelle = p.net; L.polys.push(p.n); });
  lotPolys.forEach(p => { const L = lotOf(p.lot); L.contour = p.net; L.polys.push(p.n); });
  pcs.forEach(p => { const L = lotOf(p.lot); L.pieces.push({ lib: p.lib || 'Pièce', surface: p.net, hsp: p.hsp }); L.polys.push(p.n); });
  of('annexe').filter(p => p.lot).forEach(p => { const L = lotOf(p.lot); L.sa = r2(L.sa + p.net); L.ann = L.ann || p.ann; L.polys.push(p.n); });
  Object.values(lots).forEach(L => {
    L.surface = L.pieces.length ? r2(L.pieces.reduce((a, x) => a + x.surface, 0)) : L.contour;
    if (L.pieces.length && L.contour == null) E(`LOT ${L.id} : des pièces sont dessinées sans le contour du lot sur CP_LOT.`, L.polys);
    if (L.pieces.length && L.contour != null && L.surface > L.contour + tol) E(`LOT ${L.id} : la somme des pièces (${fr(L.surface)} m²) dépasse le contour du lot (${fr(L.contour)} m²).`, L.polys);
  });

  // 11. Surfaces écrites sur le plan (facultatives) : comparées aux surfaces calculées
  const ownerOf = t => polys.filter(p => p.kind !== 'deduire' && inside(t.x, t.y, p.pts)).sort((a, b) => a.area - b.area)[0];
  texts.forEach(t => {
    const m = t.txt.match(RX_SURF); if (!m) return;
    const p = ownerOf(t); if (!p) return;
    const decl = parseFloat(m[1].replace(',', '.'));
    const calc = p.kind === 'lot' && p.lot && lots[p.lot] ? lots[p.lot].surface : p.net;
    if (calc != null && Math.abs(calc - decl) > tol) W(`Contour n° ${p.n} (${p.kind === 'piece' ? p.lib || 'pièce' : tag(p)}) : surface écrite ${fr(decl)} m², calculée ${fr(calc)} m² (écart ${calc - decl > 0 ? '+' : ''}${fr(calc - decl)}).`, [p.n]);
  });

  // 12. Lots du niveau non dessinés (information)
  if (bat && niveau != null) {
    const missing = (s.lots || []).filter(l => l.bat === bat && (bat === 'V' || +l.niveau === niveau) && !lots[l.id]).map(l => l.id);
    if (missing.length) W(`${bat === 'SS' ? 'Lots du sous-sol' : bat === 'V' ? 'Villas et terrains' : 'Lots du ' + BATL(bat) + ' au ' + LVL(niveau)} absents de ce plan : ${missing.join(', ')}.`);
  }
  Object.values(lots).forEach(L => { const l = (s.lots || []).find(x => x.id === L.id); if (l && (l.type === 'villa' || l.type === 'terrain') && L.parcelle == null) W(`LOT ${L.id} : parcelle privative (CP_PARCELLE) non dessinée sur ce plan.`, L.polys); });
  if (ignored) W(`${ignored} contour(s) hors calques CP_ ignoré(s) (murs, mobilier, cotes…).`);

  // Parties communes regroupées par nom
  const pcMap = {};
  ['pcg', 'pcs'].forEach(k => of(k).filter(p => p.nom).forEach(p => { const key = k + '|' + norm(p.nom); pcMap[key] = pcMap[key] || { nom: p.nom, nature: k, surface: 0, polys: [] }; pcMap[key].surface = r2(pcMap[key].surface + p.net); pcMap[key].polys.push(p.n); }));

  const errIds = new Set(errors.flatMap(e => e.ids));
  return {
    ok: errors.length === 0, errors, warns, bat, niveau, unitL: d.unitL, ignored,
    lots: Object.values(lots).sort((a, b) => String(a.id).localeCompare(String(b.id), 'fr', { numeric: true })),
    pcs: Object.values(pcMap),
    polys: polys.map(p => ({ n: p.n, kind: p.kind, pts: p.pts, area: p.area, net: p.net, lot: p.lot, nom: p.nom || p.lib, err: errIds.has(p.n) }))
  };
}

// ---------- Écriture DXF (format R12, lisible par tous les logiciels de DAO) ----------
function writer() {
  const L = [];
  const g = (...kv) => { for (let i = 0; i < kv.length; i += 2) L.push(String(kv[i]), String(kv[i + 1])); };
  const poly = (layer, pts) => { g(0, 'POLYLINE', 8, layer, 66, 1, 10, 0, 20, 0, 30, 0, 70, 1); pts.forEach(([x, y]) => g(0, 'VERTEX', 8, layer, 10, x, 20, y, 30, 0)); g(0, 'SEQEND', 8, layer); };
  const rect = (layer, x0, y0, x1, y1) => poly(layer, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const text = (layer, x, y, h, t, center) => { g(0, 'TEXT', 8, layer, 10, x, 20, y, 30, 0, 40, h, 1, t); if (center) g(72, 1, 11, x, 21, y, 31, 0); };
  return { L, g, poly, rect, text };
}

function dxfDoc(entities, atts) {
  const w = writer();
  const { g } = w;
  g(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 6, 9, '$MEASUREMENT', 70, 1, 0, 'ENDSEC');
  g(0, 'SECTION', 2, 'TABLES');
  g(0, 'TABLE', 2, 'LTYPE', 70, 1, 0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, 0, 0, 'ENDTAB');
  const layers = [['0', 7], ...CHARTE_LAYERS.map(x => [x[0], x[3]]), [CARTOUCHE, 7], ['CP_INFO', 8]];
  g(0, 'TABLE', 2, 'LAYER', 70, layers.length);
  layers.forEach(([n, c]) => g(0, 'LAYER', 2, n, 70, 0, 62, c, 6, 'CONTINUOUS'));
  g(0, 'ENDTAB');
  g(0, 'TABLE', 2, 'STYLE', 70, 1, 0, 'STYLE', 2, 'STANDARD', 70, 0, 40, 0, 41, 1, 50, 0, 71, 0, 42, 0.25, 3, 'txt', 4, '', 0, 'ENDTAB');
  g(0, 'ENDSEC');
  // Bloc cartouche : cadre, titre et trois attributs
  g(0, 'SECTION', 2, 'BLOCKS', 0, 'BLOCK', 8, '0', 2, CARTOUCHE, 70, 2, 10, 0, 20, 0, 30, 0, 3, CARTOUCHE);
  [[0, 0, 24, 0], [24, 0, 24, 8], [24, 8, 0, 8], [0, 8, 0, 0], [0, 6, 24, 6]].forEach(([a, b, c, e]) => g(0, 'LINE', 8, '0', 10, a, 20, b, 30, 0, 11, c, 21, e, 31, 0));
  g(0, 'TEXT', 8, '0', 10, 0.6, 20, 6.6, 30, 0, 40, 0.8, 1, 'COPROCIV - PLAN DE NIVEAU (CHARTE DXF)');
  CARTOUCHE_ATTS.forEach(([tag, prompt], i) => {
    g(0, 'TEXT', 8, '0', 10, 0.6, 20, 4.4 - i * 1.8, 30, 0, 40, 0.6, 1, tag);
    g(0, 'ATTDEF', 8, '0', 10, 7, 20, 4.4 - i * 1.8, 30, 0, 40, 0.8, 1, '', 3, prompt, 2, tag, 70, 0);
  });
  g(0, 'ENDBLK', 8, '0', 0, 'ENDSEC');
  // Entités
  g(0, 'SECTION', 2, 'ENTITIES');
  const cx = 0, cy = -14;
  g(0, 'INSERT', 8, CARTOUCHE, 66, 1, 2, CARTOUCHE, 10, cx, 20, cy, 30, 0);
  CARTOUCHE_ATTS.forEach(([tag], i) => g(0, 'ATTRIB', 8, CARTOUCHE, 10, cx + 7, 20, cy + 4.4 - i * 1.8, 30, 0, 40, 0.8, 1, atts[tag] || '', 2, tag, 70, 0));
  g(0, 'SEQEND', 8, CARTOUCHE);
  // Rappel de la charte (calque CP_INFO, ignoré à l'import)
  ['Charte DXF COPROCIV : unites = metres, polylignes fermees, un fichier par niveau et par batiment.',
    'CP_LOT : contour du lot + texte LOT n  |  CP_PIECE : pieces (nom, HSP facultative)  |  CP_ANNEXE : LOT n BALCON',
    'CP_PCG / CP_PCS : parties communes nommees  |  CP_DEDUIRE : poteaux, gaines  |  autres calques ignores.']
    .forEach((t, i) => w.text('CP_INFO', 0, cy - 2 - i * 1.2, 0.6, t));
  entities(w);
  g(0, 'ENDSEC', 0, 'EOF');
  return w.L.join('\n') + '\n';
}

// Gabarit vierge pour un niveau d'un bâtiment : calques de la charte et cartouche prérempli.
export const gabaritDXF = (s, bat, niveau) => dxfDoc(() => {}, { DOSSIER: (s.info || {}).ref || '', BATIMENT: bat, NIVEAU: niveauCode(+niveau) });

// Exemple conforme construit avec les lots du dossier (pour comprendre la charte).
export function exempleDXF(s) {
  const lotsAll = s.lots || [];
  const groups = {};
  lotsAll.forEach(l => { const k = l.bat + '|' + l.niveau; (groups[k] = groups[k] || []).push(l); });
  const best = Object.entries(groups).sort((a, b) => ((a[0].startsWith('SS|') ? 1 : 0) - (b[0].startsWith('SS|') ? 1 : 0)) || (b[1].length - a[1].length))[0];
  // Plan de masse : toutes les villas et tous les terrains, quel que soit leur nombre d'étages.
  if (best && best[0].startsWith('V|')) best[1] = lotsAll.filter(l => l.bat === 'V');
  const [bat, niv] = best ? best[0].split('|') : [((s.bats || [])[0] || {}).id || 'A', '0'];
  const ls = best ? best[1].slice(0, 4) : [];
  if (bat === 'V') {
    // Copropriété horizontale : plan de masse avec parcelles privatives, villas et voie commune.
    return dxfDoc(w => {
      // Parcelles de part et d'autre d'une voie intérieure (8 par rangée au plus).
      const PW = 16, PH = 22, all = lotsAll.filter(l => l.bat === 'V').slice(0, 16), per = Math.min(8, Math.max(1, Math.ceil(all.length / 2)));
      const len = per * PW;
      w.rect('CP_PCG', 0, -6, len, 0);
      w.text('CP_PCG', len / 2, -3, 0.8, 'VOIE INTERIEURE', true);
      all.forEach((l, i) => {
        const x = (i % per) * PW, y = i < per ? 0 : -6 - PH;
        w.rect('CP_PARCELLE', x, y, x + PW, y + PH);
        w.text('CP_PARCELLE', x + PW / 2, y + PH - 1.5, 0.7, 'LOT ' + l.id, true);
        if (l.type === 'villa') {
          w.rect('CP_LOT', x + 3, y + 5, x + 13, y + 15);
          w.text('CP_LOT', x + 8, y + 10.6, 0.7, 'LOT ' + l.id, true);
          w.text('CP_LOT', x + 8, y + 9.2, 0.5, 'Villa', true);
          if (i === 0) { w.rect('CP_ANNEXE', x + 3, y + 15, x + 13, y + 17.5); w.text('CP_ANNEXE', x + 8, y + 16.2, 0.5, 'LOT ' + l.id + ' TERRASSE', true); }
        } else w.text('CP_PARCELLE', x + PW / 2, y + PH / 2, 0.5, 'Terrain a batir', true);
      });
    }, { DOSSIER: (s.info || {}).ref || '', BATIMENT: 'V', NIVEAU: 'RDC' });
  }
  return dxfDoc(w => {
    const W = 9, H = 10;
    w.rect('CP_PCG', 0, -2.5, Math.max(1, ls.length) * W, 0);
    w.text('CP_PCG', Math.max(1, ls.length) * W / 2, -1.25, 0.6, 'PALIER ' + niveauCode(+niv), true);
    ls.forEach((l, i) => {
      const x = i * W;
      w.rect('CP_LOT', x, 0, x + W, H);
      w.text('CP_LOT', x + W / 2, H - 1.2, 0.7, 'LOT ' + l.id, true);
      if (i === 0) {
        w.rect('CP_PIECE', x + 0.1, 0.1, x + 5, H - 0.1); w.text('CP_PIECE', x + 2.5, 5, 0.5, 'Sejour', true); w.text('CP_PIECE', x + 2.5, 4.2, 0.4, 'HSP 2,50', true);
        w.rect('CP_PIECE', x + 5.1, 0.1, x + W - 0.1, 5.9); w.text('CP_PIECE', x + 7, 3, 0.5, 'Chambre 1', true);
        w.rect('CP_PIECE', x + 5.1, 6, x + W - 0.1, H - 0.1); w.text('CP_PIECE', x + 7, 7.5, 0.5, 'Salle d eau', true);
      } else w.text('CP_LOT', x + W / 2, H / 2, 0.5, fr(W * H - (i === 2 ? 0.09 : 0)) + ' m2', true);
      if (i === 1) { w.rect('CP_ANNEXE', x + 1, H, x + W - 1, H + 1.5); w.text('CP_ANNEXE', x + W / 2, H + 0.75, 0.5, 'LOT ' + l.id + ' BALCON', true); }
      if (i === 2) w.rect('CP_DEDUIRE', x + 4.35, 2, x + 4.65, 2.3);
    });
  }, { DOSSIER: (s.info || {}).ref || '', BATIMENT: bat, NIVEAU: niveauCode(+niv) });
}
