import { centroid, inside } from '@/lib/dxfParse';

// COPROCIV — tri des polygones d'un plan DXF : lot privatif, partie commune ou à ignorer.
// Rien n'est figé sur un dossier : le rôle de chaque calque est deviné puis réglable,
// et le réglage est mémorisé dans le dossier (state.dxfRules).

export const ROLE_OPTS = [
  ['auto', 'Selon le libellé'],
  ['lot', 'Lots privatifs'],
  ['pc', 'Parties communes'],
  ['ignore', 'À ignorer (murs, cadre…)'],
  ['deduct', 'Surfaces à déduire (poteaux, gaines)']
];
export const COLOR_ROLE_OPTS = [['auto', 'Selon le calque'], ['lot', 'Lots privatifs'], ['pc', 'Parties communes'], ['ignore', 'À ignorer']];
const RX_DEDUCT_LAYER = /D[ÉE]DUI|D[ÉE]DUC|A_?DEDUIRE|SURF.?DED/i;

const RX_IGNORE_LAYER = /MUR|CLOISON|CADRE|CARTOUCH|AXE|COTA|COTE|HACH|TITRE|TEXTE?_?CART|DEFPOINTS|FACADE|STRUCT|POTEAU|FONDATION/i;
const RX_PC_LAYER = /P\.?_?C\.?_?S|P\.?_?C\.?_?G|COMMUN|PARTIE.?COM/i;
const RX_LOT_LAYER = /^LOTS?\b|PRIVATI|_LOTS?$|LOTS?_/i;

export const RX_PCS = /P\s*\.?\s*C\s*\.?\s*S\b\.?/i;
export const RX_PCG = /P\s*\.?\s*C\s*\.?\s*G\b\.?|PARTIES?\s+COMMUNES?/i;
const RX_PC_WORDS = /\bSAS\b|PALIER|HALL|ESCALIER|CIRCULATION|COULOIR|DÉGAGEMENT COMMUN|GAINE|ASCENSEUR|LOCAL\s+(V[ÉE]LO|POUBELLE|ORDURE|TECHNIQUE|COMPTEUR|ENTRETIEN|GARDIEN)|CAGE|RAMPE|LOGE|TOITURE|JARDIN COMMUN|COUR COMMUNE/i;
const RX_CARTOUCHE = /\bT\.?\s?F\.?\s*N|SECTION|PARCELLE|[ÉE]CHELLE|DRESS[ÉE]|CARTOUCHE|PLANCHE|INDICE|G[ÉE]OM[ÈE]TRE|COPROPRI[ÉE]T[ÉE]\s/i;
const RX_LOT = /\bLOT\s*(?:N\s*[°ºO.]?\s*)?(\d+)\b/i;
const RX_ANNEX = /BALCON|LOGGIA|TERRASSE|JARDIN(?!\s+COMMUN)|ANNEXE/i;

export const guessLayerRole = layer => {
  const L = String(layer || '');
  if (RX_DEDUCT_LAYER.test(L)) return 'deduct';
  if (RX_IGNORE_LAYER.test(L)) return 'ignore';
  if (RX_PC_LAYER.test(L)) return 'pc';
  if (RX_LOT_LAYER.test(L)) return 'lot';
  return 'auto';
};

export const annexOf = txt => /TERRASSE/i.test(txt) ? 'terrasse' : /JARDIN/i.test(txt) ? 'jardin' : 'balcon';

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

// Nom de la partie commune d'après le libellé : on retire « P.C.S. », les surfaces écrites, etc.
export function pcName(label, nature) {
  const parts = String(label || '').split(' · ')
    .map(t => t.replace(RX_PCS, '').replace(RX_PCG, '').replace(/(\d+(?:[.,]\d{1,2})?)\s*m\s*[²2]/gi, '').replace(/^[\s\-–:/.]+|[\s\-–:/.]+$/g, '').trim())
    .filter(Boolean);
  const nom = [...new Set(parts)].join(' – ');
  return nom || (nature === 'pcs' ? 'Partie commune spéciale' : 'Partie commune');
}

const isCartouche = it => it.label.length > 110 || (RX_CARTOUCHE.test(it.label) && it.label.split(' · ').length > 2);

// Proposition pour un polygone.
// Retour : { dest: 'ignore' | 'lot' | 'pc', lot, field: 'surface'|'sa', pc: 'new' | id, nom, nature, why }
export function classify(it, role, lots, communs) {
  const txt = it.layer + ' ' + it.label;
  const ign = why => ({ dest: 'ignore', lot: '', field: 'surface', pc: 'new', nom: '', nature: 'pcg', why });
  if (role === 'deduct') return ign(it.deductInto >= 0 ? 'surface déduite du local n° ' + (it.deductInto + 1) : 'surface à déduire — aucun local ne la contient');
  if (role === 'ignore') return ign('calque à ignorer');
  if (role === 'auto') {
    if (it.container) return ign('contour englobant ' + it.nChildren + ' polygone(s)');
    if (isCartouche(it)) return ign('cartouche');
  }
  const m = it.label.match(RX_LOT);
  const lotOk = m && lots.some(l => l.id === m[1]);
  const looksPc = RX_PCS.test(it.label) || RX_PCG.test(it.label) || (!m && RX_PC_WORDS.test(it.label));
  if (role === 'pc' || (role === 'auto' && looksPc && !lotOk)) {
    const nature = RX_PCS.test(txt) ? 'pcs' : 'pcg';
    const nom = pcName(it.label === it.layer ? '' : it.label, nature);
    const hit = (communs || []).find(c => norm(c.nom) === norm(nom));
    return { dest: 'pc', lot: '', field: 'surface', pc: hit ? hit.id : 'new', nom, nature: hit ? (hit.nature || nature) : nature, why: role === 'pc' ? 'calque parties communes' : 'libellé' };
  }
  if (lotOk) return { dest: 'lot', lot: m[1], field: RX_ANNEX.test(txt) ? 'sa' : 'surface', pc: 'new', nom: '', nature: 'pcg', why: 'libellé « LOT ' + m[1] + ' »' };
  if (role === 'lot') return { dest: 'lot', lot: '', field: RX_ANNEX.test(txt) ? 'sa' : 'surface', pc: 'new', nom: '', nature: 'pcg', why: 'calque lots — lot à préciser' };
  if (m && !lotOk) return ign('lot ' + m[1] + ' absent du dossier');
  return ign(it.hasText ? 'libellé non reconnu' : 'sans libellé');
}

// Rôle d'un polygone : la règle de teinte (hachures) prime sur la règle de calque.
export function roleOfItem(it, rules) {
  const R = rules || {};
  const lr = R[it.layer] || guessLayerRole(it.layer);
  if (lr === 'deduct') return 'deduct';
  const cr = it.color ? R['color:' + it.color] : null;
  return cr && cr !== 'auto' ? cr : lr;
}
// Nom d'une pièce d'après son libellé (sans la surface écrite).
export const pieceName = label => String(label || '').split(' · ')
  .map(t => t.replace(/(\d+(?:[.,]\d{1,2})?)\s*m\s*[²2]/gi, '').replace(/^[\s\-–:/.]+|[\s\-–:/.]+$/g, '').trim())
  .filter(Boolean).join(' – ') || 'Pièce';

export function classifyAll(items, rules, lots, communs) {
  const res = items.map(it => classify(it, roleOfItem(it, rules), lots, communs));
  const labLot = it => { const m = (it.label || '').match(RX_LOT); return m && lots.some(l => l.id === m[1]) ? m[1] : null; };
  const usable = (it, k) => { const r = roleOfItem(it, rules); return r !== 'ignore' && r !== 'deduct' && r !== 'pc' && !isCartouche(it) && res[k].dest !== 'pc'; };
  const parentOf = i => { const [x, y] = centroid(items[i].pts); let best = -1; items.forEach((p, j) => { if (j !== i && p.area > items[i].area * 1.02 && inside(x, y, p.pts) && (best < 0 || p.area < items[best].area)) best = j; }); return best; };
  const within = (j, pred) => items.some((q, k) => k !== j && q.area < items[j].area && inside(...centroid(q.pts), items[j].pts) && pred(q, k));
  // « LOT n » écrit dans une pièce : le contour qui l'entoure devient le lot, la pièce reste une pièce.
  const eff = items.map(labLot);
  items.forEach((it, i) => {
    const n = labLot(it);
    if (!n || it.container) return;
    const q = parentOf(i);
    if (q < 0 || labLot(items[q]) || !usable(items[q], q)) return;
    if (within(q, (x, k) => k !== i && labLot(x) && labLot(x) !== n)) return;
    if (within(q, (x, k) => res[k].dest === 'pc')) return;
    eff[q] = n; eff[i] = null;
    res[i] = { dest: 'ignore', lot: '', field: 'surface', pc: 'new', nom: '', nature: 'pcg', why: '' };
    res[q] = { dest: 'ignore', lot: '', field: 'surface', pc: 'new', nom: '', nature: 'pcg', why: 'contour du lot ' + n };
  });
  // Pièces : un polygone sans numéro de lot, situé à l'intérieur du contour d'un lot, est une pièce de ce lot.
  const lotOf = it => eff[items.indexOf(it)];
  items.forEach((it, i) => {
    const a = res[i];
    if (a.dest === 'pc' || (a.dest === 'lot' && a.lot)) return;
    const role = roleOfItem(it, rules);
    if (role === 'ignore' || role === 'deduct' || role === 'pc' || isCartouche(it)) return;
    if (lotOf(it)) return;
    const [x, y] = centroid(it.pts);
    let best = -1;
    items.forEach((p, j) => { if (j === i || !lotOf(p)) return; if (p.area > it.area && inside(x, y, p.pts) && (best < 0 || p.area < items[best].area)) best = j; });
    if (best < 0) return;
    const lot = lotOf(items[best]);
    const ann = RX_ANNEX.test(it.layer + ' ' + it.label);
    const lib = pieceName(it.hasText ? it.label.replace(RX_LOT, '') : '');
    res[i] = { dest: 'lot', lot, field: ann ? 'sa' : 'piece', pc: 'new', nom: '', nature: 'pcg', lib, why: (ann ? 'annexe' : 'pièce') + ' située dans le lot ' + lot };
    // Le contour du lot ne compte plus : sa surface est remplacée par la somme des pièces (évite le double comptage).
    if (res[best].dest === 'ignore' || (res[best].dest === 'lot' && res[best].field === 'surface')) res[best] = { ...res[best], dest: 'ignore', why: 'contour du lot ' + lot + ' — surface prise pièce par pièce' };
  });
  return res;
}

// Résumé par calque pour le panneau « Rôle des calques ».
export function layerSummary(items) {
  const m = {};
  items.forEach(it => { const k = it.layer || '(sans calque)'; m[k] = m[k] || { layer: it.layer, n: 0, area: 0 }; m[k].n++; m[k].area += it.area; });
  return Object.values(m).sort((a, b) => b.n - a.n);
}
