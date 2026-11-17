// COPROCIV — moteur de calcul et constantes.
// Porté à l'identique depuis handoff/logique-source.js (sans modification de la logique).

export const TYPES = {
  appartement: { l: 'Appartement', tint: 'oklch(0.93 0.03 var(--h))', ink: 'oklch(0.32 0.08 var(--h))', bar: 'var(--b6)' },
  commerce:   { l: 'Commerce', tint: 'oklch(0.94 0.045 70)', ink: 'oklch(0.44 0.11 60)', bar: 'oklch(0.70 0.14 65)' },
  bureau:     { l: 'Bureau / activité', tint: 'oklch(0.94 0.035 175)', ink: 'oklch(0.40 0.09 175)', bar: 'oklch(0.62 0.11 175)' },
  cave:       { l: 'Cave / cellier', tint: 'oklch(0.955 0.009 85)', ink: 'oklch(0.42 0.020 var(--h))', bar: 'oklch(0.72 0.020 var(--h))' },
  box:        { l: 'Box / garage fermé', tint: 'oklch(0.93 0.012 85)', ink: 'oklch(0.38 0.020 var(--h))', bar: 'oklch(0.60 0.020 var(--h))' },
  local:      { l: 'Local annexe privatif', tint: 'oklch(0.95 0.025 60)', ink: 'oklch(0.42 0.06 60)', bar: 'oklch(0.68 0.08 60)' },
  parking:    { l: 'Parking', tint: 'oklch(0.9 0.014 85)', ink: 'oklch(0.36 0.020 var(--h))', bar: 'oklch(0.52 0.020 var(--h))' },
  villa:      { l: 'Villa', tint: 'oklch(0.94 0.045 145)', ink: 'oklch(0.40 0.10 145)', bar: 'oklch(0.62 0.12 145)' },
  terrain:    { l: 'Lot de terrain', tint: 'oklch(0.95 0.045 95)', ink: 'oklch(0.45 0.09 95)', bar: 'oklch(0.70 0.11 95)' }
};
// Type de copropriété : verticale (immeubles par niveaux), horizontale (villas et lots de terrain sur parcelles privatives) ou mixte.
export const TYPE_COPRO = { verticale: 'Copropriété verticale', horizontale: 'Copropriété horizontale', mixte: 'Copropriété mixte' };
export const typeCoproOf = s => (s && TYPE_COPRO[s.typeCopro]) ? s.typeCopro : 'verticale';
export const VILLAS = 'V';
export const hasParcelle = l => !!l && (l.type === 'villa' || l.type === 'terrain');
export const coefParcelle = s => { const v = ((s && s.coefAnnexe) || {}).parcelle; return v === '' || v == null ? 0.10 : (+v || 0); };
const T_VERT = ['appartement', 'commerce', 'bureau', 'cave', 'box', 'local', 'parking'], T_HORIZ = ['villa', 'terrain'];
// Natures proposées selon le type de copropriété (plus celles déjà employées dans le dossier).
export const typesFor = s => {
  const t = typeCoproOf(s);
  const base = t === 'horizontale' ? T_HORIZ : t === 'mixte' ? [...T_VERT, ...T_HORIZ] : T_VERT;
  const used = ((s && s.lots) || []).map(l => l.type);
  return Object.keys(TYPES).filter(k => base.includes(k) || used.includes(k));
};

export const LVL = n => n < 0 ? 'Sous-sol' : n === 0 ? 'RDC' : n === 1 ? '1er étage' : n + 'e étage';
export const LVS = n => n < 0 ? 'SS' : n === 0 ? 'RDC' : n === 1 ? '1er' : n + 'e';
export const BAT = { A: 'Bât. A', B: 'Bât. B', SS: 'Sous-sol' };
export const BATL = b => b === 'SS' ? 'Sous-sol' : b === 'ENS' ? 'Ensemble' : b === 'V' ? 'Villas' : 'Bât. ' + b;

export const ACC = 'var(--b0)';
export const OK = 'oklch(0.64 0.14 155)';
export const WARN = 'oklch(0.70 0.15 55)';
export const MUTED = 'oklch(0.5 0.020 var(--h))';
export const INK = 'oklch(0.24 0.020 var(--h))';

export const n0 = x => +x || 0;
export const f = (x, d = 2) => n0(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fm = x => n0(x).toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n0(x)) ? 0 : 2, maximumFractionDigits: 2 });

// Répartition au plus fort reste : la somme est exactement égale à la base.
export function alloc(w, base) {
  const t = w.reduce((a, b) => a + b, 0);
  if (!t) return w.map(() => 0);
  const raw = w.map(x => x / t * base);
  const fl = raw.map(Math.floor);
  const rem = base - fl.reduce((a, b) => a + b, 0);
  const ord = raw.map((x, i) => [x - fl[i], i]).filter(p => w[p[1]] > 0).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem && ord.length; k++) fl[ord[k % ord.length][1]]++;
  return fl;
}

export const L = (id, bat, niveau, type, des, surface, situation, owner, annexe = 'aucune', sa = 0) =>
  ({ id, bat, niveau, type, des, surface, situation, owner, annexe, sa });

export const ANNEX = {
  balcon:   { l: 'Balcon / loggia', r: [0.10, 0.30] },
  terrasse: { l: 'Terrasse', r: [0.15, 0.35] },
  jardin:   { l: 'Jardin privatif', r: [0.05, 0.20] }
};
export const NAT_R = { appartement: [1, 1], commerce: [1, 1], bureau: [1, 1], cave: [0.10, 0.25], box: [0.25, 0.50], local: [0.10, 0.40], parking: [0.15, 0.35], villa: [0.8, 1.2], terrain: [0, 1] };
// Coefficients de nature par défaut (utilisés tant que le dossier n'en fixe pas d'autre).
export const COEF_DEF = { appartement: 1, commerce: 1, bureau: 1, cave: 0.2, box: 0.35, local: 0.2, parking: 0.25, villa: 1, terrain: 1 };
export const coefNat = (s, t) => { const v = ((s && s.coefType) || {})[t]; return v === '' || v == null ? (COEF_DEF[t] ?? 1) : n0(v); };
export const inR = (v, [a, b]) => n0(v) >= a - 1e-9 && n0(v) <= b + 1e-9;

// Cas de référence : 3 lots → 289 / 367 / 344 sur 1000.
export const REF = [
  ['Magasin', 60, 1, 0, 0, 1, 1.05, 289],
  ['Appartement avec terrasse', 75, 1, 20, 0.25, 1, 1, 367],
  ['Appartement sans annexe', 75, 1, 0, 0, 1, 1, 344]
];

export const INIT_LOTS = [
  L('1', 'A', 0, 'commerce', 'Local commercial sur rue avec réserve', 118.4, 1.05, 'o1'),
  L('2', 'A', 0, 'commerce', 'Local commercial angle cour', 64.2, 1, 'o1'),
  L('3', 'A', 1, 'appartement', 'Appartement T3, porte gauche', 68.5, 1, 'o2'),
  L('4', 'A', 1, 'appartement', 'Appartement T2, porte droite', 47.3, 0.97, 'o3'),
  L('5', 'A', 2, 'appartement', 'Appartement T4, porte gauche', 86.1, 1, 'o4', 'balcon', 5.5),
  L('6', 'A', 2, 'appartement', 'Appartement T2, porte droite', 45.8, 0.97, 'o5'),
  L('7', 'A', 3, 'appartement', 'Appartement T4, porte gauche', 86.4, 1, 'o6', 'balcon', 5.5),
  L('8', 'A', 3, 'appartement', 'Appartement T2, porte droite', 46.0, 0.97, 'o7'),
  L('9', 'A', 4, 'appartement', 'Appartement T5 avec terrasse', 104.7, 1.05, 'o8', 'terrasse', 22),
  L('10', 'B', 0, 'bureau', 'Atelier / bureau sur cour', 52.0, 0.95, 'o9'),
  L('11', 'B', 1, 'appartement', 'Appartement T3 sur cour', 61.2, 0.95, 'o10', 'balcon', 4),
  L('12', 'B', 2, 'appartement', 'Appartement T3 sur cour', 60.8, 0.95, 'o11'),
  L('13', 'SS', -1, 'cave', 'Cave n° 1', 6.2, 1, 'o2'),
  L('14', 'SS', -1, 'cave', 'Cave n° 2', 5.8, 1, 'o4'),
  L('15', 'SS', -1, 'cave', 'Cave n° 3', 7.1, 1, 'o6'),
  L('16', 'SS', -1, 'cave', 'Cave n° 4', 6.5, 1, 'o8'),
  L('17', 'SS', -1, 'parking', 'Stationnement P1', 12.5, 1, 'o1'),
  L('18', 'SS', -1, 'parking', 'Stationnement P2', 12.5, 1, 'o4'),
  L('19', 'SS', -1, 'parking', 'Stationnement P3', 12.5, 1, 'o8')
];

export const INIT_OWNERS = [
  ['o1', "SCI Akwaba Immo", 'Personne morale'],
  ['o2', "M. et Mme Kouassi", 'Personnes physiques'],
  ['o3', "Mme Aminata Koné", 'Personne physique'],
  ['o4', "M. Yao N'Guessan", 'Personne physique'],
  ['o5', "Indivision Bamba", 'Indivision'],
  ['o6', "Mme Adjoua Kouadio", 'Personne physique'],
  ['o7', "M. Serge Ouattara", 'Personne physique'],
  ['o8', "M. et Mme Traoré", 'Personnes physiques'],
  ['o9', "Atelier Lagune SARL", 'Personne morale'],
  ['o10', "Mme Mariam Diabaté", 'Personne physique'],
  ['o11', "M. Didier Yapi", 'Personne physique']
].map(([id, nom, kind]) => ({ id, nom, kind }));

export const INIT_GRIDS = [
  { id: 'asc', name: 'Ascenseur', scope: 'Bât. A', base: 1000, method: 'sp', prog: 20, members: ['3', '4', '5', '6', '7', '8', '9'], budget: 4500000 },
  { id: 'chauf', name: 'Groupe électrogène', scope: 'Bât. A', base: 1000, method: 'su', prog: 0, members: ['2', '3', '4', '5', '6', '7', '8', '9'], budget: 3200000 },
  { id: 'escB', name: 'Escalier', scope: 'Bât. B', base: 100, method: 'su', prog: 30, members: ['11', '12'], budget: 600000 },
  { id: 'ss', name: 'Sous-sol & parkings', scope: 'Commun', base: 100, method: 'egal', prog: 0, members: ['13', '14', '15', '16', '17', '18', '19'], budget: 1400000 }
];

export { INIT_ART, CLAUSES } from '@/lib/reglementType';

export const addrOf = i => [i.adresse, i.commune, i.ville].filter(Boolean).join(', ');
export const slug = x => String(x || 'dossier').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
export const USAGE = { habitation: "Copropriété d'habitation", mixte: 'Copropriété mixte habitation / commerces', tertiaire: 'Copropriété tertiaire' };
export const DEST = {
  habitation: "L'immeuble est destiné exclusivement à l'habitation. L'exercice d'une profession libérale est toléré sous réserve de ne pas troubler la tranquillité des occupants.",
  mixte: "L'immeuble est à usage mixte d'habitation et commercial. Les lots du rez-de-chaussée peuvent être affectés à toute activité commerciale, à l'exclusion des activités bruyantes, malodorantes ou dangereuses.",
  tertiaire: "L'immeuble est à usage de bureaux et d'activités tertiaires. Toute activité recevant du public est soumise à l'accord préalable du syndic et aux autorisations administratives requises."
};

export const DKEYS = ['info', 'typeCopro', 'bats', 'hasSS', 'lots', 'communs', 'dxfRules', 'coefType', 'coefAnnexe', 'coefEtageAsc', 'coefEtageSans', 'baseGen', 'grids', 'owners', 'articles', 'diffusion', 'plans', 'sel', 'gridSel', 'artSel', 'ownSel', 'hsp', 'ajust', 'avant', 'mesure', 'notes', 'saisie'];

// Mode de saisie des surfaces : l'un OU l'autre, jamais les deux à la fois.
//  - 'manuelle' : surfaces tapées lot par lot (ou pièce par pièce) ;
//  - 'plans'    : surfaces issues exclusivement de l'import des plans DXF (modifiées par réimport).
export const SAISIE = { manuelle: 'Saisie manuelle', plans: 'Import des plans (DXF)' };

// Hauteur sous plafond : en dessous de `min` la surface n'est pas retenue ; entre `min` et `seuil` elle est pondérée par `coefBas`.
export const HSP_DEF = { seuil: 1.80, min: 1.30, coefBas: 0.5 };
export const hspOf = s => ({ ...HSP_DEF, ...((s && s.hsp) || {}) });
export const MESURE_DEF = "Superficie des planchers des locaux clos et couverts, mesurée au nu intérieur des murs, après déduction des surfaces occupées par les murs, cloisons, marches et cages d'escalier, gaines, embrasures de portes et de fenêtres. Ne sont pas retenus les balcons, loggias, terrasses, caves, garages et emplacements de stationnement, ni les parties d'une hauteur sous plafond inférieure au seuil indiqué.";

// Contenu certifiable : ce que le géomètre certifie et le notaire valide.
// Toute modification de ces données change l'empreinte et fait tomber certification et validation.
export const CONTENT_KEYS = ['info', 'typeCopro', 'bats', 'hasSS', 'lots', 'communs', 'coefType', 'coefAnnexe', 'coefEtageAsc', 'coefEtageSans', 'baseGen', 'grids', 'articles', 'hsp', 'ajust', 'avant', 'mesure'];
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
    : JSON.stringify(v === undefined ? null : v);
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
};
export const contentHash = s => { const c = canon(Object.fromEntries(CONTENT_KEYS.map(k => [k, s ? s[k] : null]))); return cyrb53(c, 1) + cyrb53(c, 2); };
// Statut d'un dossier à partir de ses métadonnées (certif / valid stockés hors du contenu).
export const statusOf = (data, meta) => {
  const h = contentHash(data || {});
  const m = meta || {};
  const certified = !!(m.certif && m.certif.empreinte === h);
  const validated = certified && !!(m.valid && m.valid.empreinte === h);
  return { h, certified, validated, staleCertif: !!m.certif && !certified, staleValid: !!m.valid && !validated };
};

export const PC_NAT = ['Hall d\u2019entrée', 'Cage d\u2019escalier', 'Ascenseur', 'Couloir / palier', 'Local technique', 'Local poubelles', 'Local deux-roues / vélos', 'Toiture / terrasse', 'Façades et gros œuvre', 'Espaces verts', 'Voirie et accès', 'Parking extérieur commun', 'Loge gardien', 'Autre'];
export const XPLANS = [
  ['masse', 'Plan de masse / situation', 'Parcelle, accès, espaces extérieurs, flèche du Nord'],
  ['toiture', 'Toiture / terrasse', 'Toiture, édicules, terrasses communes'],
  ['facades', 'Façades et coupes', 'Élévations, hauteurs, matériaux de façade'],
  ['exterieurs', 'Espaces extérieurs', 'Espaces verts, voirie, parkings extérieurs']
];

let _pc = 0;
export const pcId = () => 'pc' + Date.now().toString(36) + (_pc++);

// Partie commune : { id, nom, bat, niveau (nombre ou ''), loc (texte libre), surface, nature: 'pcg' | 'pcs', cle: 'gen' | id de grille }
export const natureOf = c => c.nature || (c.cle && c.cle !== 'gen' ? 'pcs' : 'pcg');
export const NATURES = [['pcg', 'Générale (P.C.G.)'], ['pcs', 'Spéciale (P.C.S.)']];
export const pcLoc = c => (c.niveau !== '' && c.niveau != null && !isNaN(+c.niveau)) ? LVL(+c.niveau) : (c.loc || '—');
export const defCommuns = (bats, hasSS) => {
  const L = [];
  const imm = bats.filter(b => !b.villas), vil = bats.some(b => b.villas);
  imm.forEach(b => {
    L.push({ id: pcId(), nom: 'Hall d\u2019entrée', bat: b.id, loc: 'RDC', surface: '', cle: 'gen' });
    L.push({ id: pcId(), nom: 'Cage d\u2019escalier', bat: b.id, loc: 'RDC → R+' + b.etages, surface: '', cle: 'gen' });
  });
  if (hasSS) L.push({ id: pcId(), nom: 'Rampe et circulations', bat: 'SS', loc: 'Sous-sol', surface: '', cle: 'gen' });
  if (imm.length) L.push({ id: pcId(), nom: 'Toiture / terrasse', bat: 'ENS', loc: 'Toiture', surface: '', cle: 'gen' });
  L.push({ id: pcId(), nom: 'Espaces verts', bat: 'ENS', loc: 'Extérieur', surface: '', cle: 'gen' });
  L.push({ id: pcId(), nom: 'Voirie et accès', bat: 'ENS', loc: 'Extérieur', surface: '', cle: 'gen' });
  // Copropriété horizontale : équipements de la résidence de villas.
  if (vil) {
    L.push({ id: pcId(), nom: 'Réseaux (eau, électricité, assainissement)', bat: 'ENS', loc: 'Ensemble de la résidence', surface: '', cle: 'gen' });
    L.push({ id: pcId(), nom: 'Éclairage extérieur', bat: 'ENS', loc: 'Voies et espaces communs', surface: '', cle: 'gen' });
    L.push({ id: pcId(), nom: 'Clôture et portail', bat: 'ENS', loc: 'Périmètre', surface: '', cle: 'gen' });
    L.push({ id: pcId(), nom: 'Poste de garde', bat: 'ENS', loc: 'Entrée', surface: '', cle: 'gen' });
  }
  return L;
};

export const DEMO_INFO = { nom: 'Résidence Les Flamboyants', adresse: 'Boulevard Latrille', commune: 'Cocody', ville: 'Abidjan', tf: 'TF n° 214 587', section: 'CK', parcelle: '112', ilot: 'Îlot 45 · lot 312', usage: 'mixte', geometre: 'Cabinet Koné & Associés', notaire: 'Me A. Diallo', ref: '2026-118' };
export const DEMO_BATS = [
  { id: 'A', name: 'Bâtiment A — sur rue', etages: 4, lift: true, equip: 'groupe électrogène' },
  { id: 'B', name: 'Bâtiment B — sur cour', etages: 2, lift: false, equip: 'escalier B' }
];

export const WTYPES = [['appartement', 'Appt.'], ['commerce', 'Comm.'], ['bureau', 'Bureau']];
export const wDefType = (W, n) => W.usage === 'tertiaire' ? 'bureau' : (n === 0 && W.usage === 'mixte') ? 'commerce' : 'appartement';
export const wCnt = (W, i, n, t) => {
  const v = (W.cnt || {})[i + ':' + n + ':' + t];
  if (v != null && v !== '') return Math.min(50, Math.max(0, parseInt(v) || 0));
  return t === wDefType(W, n) ? Math.min(50, Math.max(0, parseInt(W.parNiv) || 0)) : 0;
};
export const newWiz = () => ({
  saisie: '', nom: '', adresse: '', commune: '', ville: 'Abidjan', tf: '', acd: '', contenance: '', section: '', parcelle: '', ilot: '',
  geometre: '', notaire: '', usage: 'habitation', bats: [{ name: 'Bâtiment A', etages: 3, lift: false }],
  ss: false, caves: 0, boxes: 0, locs: 0, parks: 0, mode: 'types', parNiv: 2, surf: 70, cnt: {},
  type: 'verticale', nVillas: 6, vSurf: 120, vParc: 400, vNiv: 0, nTerr: 0, tParc: 500
});
export const LET = 'ABCDEFGHIJ';

// Extraction DXF : voir dxfParse.js (arcs, blocs, hachures, teintes).
export { parseDXF, applyDeductions, colorHex, colorLabel } from '@/lib/dxfParse';

export function sampleDXF() {
  const rect = (layer, x1, y1, x2, y2) => ['0', 'LWPOLYLINE', '8', layer, '90', '4', '70', '1', '10', x1, '20', y1, '10', x2, '20', y1, '10', x2, '20', y2, '10', x1, '20', y2];
  const text = (layer, x, y, t) => ['0', 'TEXT', '8', layer, '10', x, '20', y, '40', '250', '1', t];
  const out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES',
    ...rect('LOTS', 0, 0, 8610, 10000), ...text('LOTS', 3500, 5000, 'LOT 5'),
    ...rect('COMMUN', 8610, 0, 9000, 10000), ...text('COMMUN', 8650, 5000, 'PALIER'),
    ...rect('LOTS', 9000, 0, 13580, 10000), ...text('LOTS', 10800, 5000, 'LOT 6'),
    ...rect('ANNEXES', 0, -1000, 5500, 0), ...text('ANNEXES', 2000, -500, 'BALCON LOT 5'),
    '0', 'ENDSEC', '0', 'EOF'];
  return out.join('\n');
}

export const NAVY = { b0: '#0F1D3D', bm: '#0A1530', b1: '#18284D', b2: '#20325C', b3: '#26385F', b4: '#2E4170', b5: '#46598A', b6: '#3A4F86', t1: '#A9B3CC', t2: '#C3CADB', t3: '#D7DCE8', t4: '#DCE0EA', t5: '#C9CFDE', t6: '#8893B2', h: '265', rgb: '15,29,61' };
// Anthracite (gris graphite) : neutre, met en valeur l'or et les couleurs du logo.
export const TEAL = { b0: '#1F2328', bm: '#16191D', b1: '#2A2F35', b2: '#333940', b3: '#3B424A', b4: '#444C54', b5: '#5A636D', b6: '#4E5760', t1: '#AEB5BD', t2: '#C9CED4', t3: '#DCE0E4', t4: '#E1E4E8', t5: '#CDD2D8', t6: '#8D959E', h: '250', rgb: '31,35,40' };
const SBD = V => ({ sb0: V.b0, sb1: V.b1, sb2: V.b2, sb3: V.b3, sb5: V.b5, sbt: '#F6F3EC', sbm: V.t1, sbm2: V.t2, sbl: 'transparent' });

// Couleurs des documents imprimés : celles du thème choisi dans l'application.
export const docTheme = s => { const t = THEMES[(s && s.theme) || 'marine'] || THEMES.marine; return { p: t.v.b0, pt: t.v.t1, g: '#A87B2A', gl: '#D9A54A' }; };
export const THEMES = {
  // Logo à fond transparent : il se fond dans la couleur du menu, quel que soit le thème.
  marine: { label: 'Bleu', sw: '#0F1D3D', logo: '/coprociv/logo-transparent.png', icon: '/coprociv/icon-marine.png', v: { ...NAVY, ...SBD(NAVY), sb0: '#0E1E3E' } },
  petrole: { label: 'Anthracite', sw: '#1F2328', logo: '/coprociv/logo-transparent.png', icon: '/coprociv/icon-anthracite.png', v: { ...TEAL, ...SBD(TEAL), sb0: '#1F2328' } }
};

export function applyTheme(k) {
  const T = THEMES[k] || THEMES.marine;
  if (typeof document === 'undefined') return;
  // Dans le portail, le thème ne s'applique qu'au conteneur du module COPROCIV.
  const el = document.querySelector('.cp-root') || document.body;
  el.dataset.cpTheme = k;
  Object.entries(T.v).forEach(([a, b]) => el.style.setProperty('--' + a, b));
  const ic = document.querySelector('link[rel="icon"]');
  if (ic) ic.href = T.icon;
}

// Menu par étapes : Tableau de bord, puis Préparer › Calculer › Rédiger › Finaliser.
export const PHASES = [
  ['preparer', 'Préparer', ['immeuble', 'lots', 'pc', 'owners']],
  ['calculer', 'Calculer', ['tant', 'charges']],
  ['rediger', 'Rédiger', ['regl', 'edd']],
  ['finaliser', 'Finaliser', ['controle', 'docs']]
];
// Contrôles de l'EDD rattachés à chaque phase, et la page où les corriger.
export const CHECK_SCREEN = { mode: 'lots', lots: 'lots', surf: 'lots', des: 'lots', tf: 'immeuble', cad: 'immeuble', tg: 'tant', adj: 'tant', grids: 'charges', pcs: 'pc', desc: 'lots', art: 'regl' };
// La phase d'un contrôle est celle de la page où on le corrige : menu, bandeau d'étapes et tableau de bord affichent les mêmes chiffres.
export const CHECK_PHASE = Object.fromEntries(Object.entries(CHECK_SCREEN).map(([id, scr]) => [id, (PHASES.find(p => p[2].includes(scr)) || [''])[0]]));
// État d'avancement par phase, à partir de la liste de contrôles (controlesEDD) et des cachets.
export function phasesEtat(s, checks) {
  return PHASES.map(([k, l, screens]) => {
    const ks = checks.filter(x => CHECK_PHASE[x.id] === k);
    const ko = ks.filter(x => !x.ok).length;
    if (k === 'finaliser') return { k, l, screens, ko: s.validated ? 0 : 1, done: !!s.validated, partial: !!s.certified && !s.validated, label: s.validated ? 'Validé' : s.certified ? 'Certifié' : 'À certifier' };
    return { k, l, screens, ko, done: !ko, partial: false, label: ko ? ko + ' à corriger' : 'Complet' };
  });
}
export const ROLE_NAV = { geometre: ['overview', 'immeuble', 'lots', 'pc', 'owners', 'tant', 'charges', 'regl', 'edd', 'controle', 'docs'], notaire: ['overview', 'edd', 'regl', 'controle', 'docs'], syndic: ['overview', 'syndic', 'charges', 'owners', 'regl'], coproprietaire: ['portail'], lecture: ['overview', 'edd'] };
export const KIND_OPTS = [['Personne physique', 'Personne physique'], ['Personnes physiques', 'Personnes physiques'], ['Personne morale', 'Personne morale'], ['Indivision', 'Indivision']];
export const METHODS = [['sp', 'Surface pondérée'], ['su', 'Surface utile'], ['egal', 'Parts égales'], ['occ', 'Capacité d’occupation'], ['lot', '1 tantième par lot']];
export const fcfa = x => Math.round(n0(x)).toLocaleString('fr-FR') + ' FCFA';
export const NAV = [['overview', 'Tableau de bord'], ['immeuble', 'Immeuble'], ['lots', 'Lots & surfaces'], ['pc', 'Parties communes'], ['owners', 'Copropriétaires'], ['tant', 'Tantièmes'], ['charges', 'Charges spéciales'], ['regl', 'Règlement'], ['edd', 'EDD & modificatif'], ['controle', 'Contrôle & certification'], ['docs', 'Documents'], ['syndic', 'Gestion du syndicat'], ['portail', 'Mon espace']];
export const ROLES_ALL = [['geometre', 'Géomètre-expert', 'Lots, surfaces, pondérations'], ['notaire', 'Notaire', 'Règlement, validation EDD'], ['syndic', 'Syndic', 'AG, cotisations, comptes'], ['coproprietaire', 'Copropriétaire', 'Mon espace, comptes (lecture)']];
// Profils ouverts dans cette version. Le module syndic et l'espace copropriétaire restent dans le code pour une évolution ultérieure :
// il suffira d'ajouter 'syndic' / 'coproprietaire' ici (et 'syndic' au menu du notaire dans ROLE_NAV).
export const ACTIVE_ROLES = ['geometre', 'notaire'];
export const ROLES = ROLES_ALL.filter(r => ACTIVE_ROLES.includes(r[0]));

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const STORE_KEY = 'coprociv.v2';

export const FLD = { surface: 'surface', sa: 'surface annexe', type: 'nature', des: 'désignation', niveau: 'niveau', bat: 'bâtiment', situation: 'coef. de situation', annexe: 'annexe', owner: 'propriétaire' };
export const CLBL = { coefType: 'Coef. de nature', coefAnnexe: 'Coef. annexe', coefEtageAsc: 'Coef. étage (avec asc.)', coefEtageSans: 'Coef. étage (sans asc.)' };

export const jv = v => v == null || v === '' ? '—' : Array.isArray(v) ? v.length + ' lot' + (v.length > 1 ? 's' : '') : typeof v === 'object' ? Object.keys(v).length + ' valeur(s)' : String(v).length > 40 ? String(v).slice(0, 40) + '…' : String(v);

export function diffState(s, n) {
  const out = [];
  if (n.lots) {
    const old = Object.fromEntries(s.lots.map(l => [l.id, l]));
    const nw = new Set(n.lots.map(l => l.id));
    n.lots.forEach(l => { const o = old[l.id]; if (!o) { out.push(['lot+' + l.id, 'Lot ' + l.id + ' créé', '—', l.des]); return; } Object.keys(FLD).forEach(k => { if (String(o[k] ?? '') !== String(l[k] ?? '')) out.push(['lot:' + l.id + ':' + k, 'Lot ' + l.id + ' · ' + FLD[k], o[k], l[k]]); }); });
    n.lots.forEach(l => { const o = old[l.id]; if (!o) return; const A = o.extra || [], B = l.extra || []; if (JSON.stringify(A) !== JSON.stringify(B)) { const d = x => x.length ? x.map(p => (p.lib || LVS(+p.niveau)) + ' ' + fm(p.surface) + ' m²').join(', ') : 'aucune'; out.push(['lot:' + l.id + ':extra', 'Lot ' + l.id + ' · autres niveaux', d(A), d(B)]); } });
    n.lots.forEach(l => {
      const o = old[l.id]; if (!o) return;
      if (JSON.stringify(o.pieces || []) !== JSON.stringify(l.pieces || [])) { const d = x => (x || []).length ? x.length + ' pièce(s) · ' + fm(x.reduce((a, p) => a + n0(p.surface), 0)) + ' m²' : 'aucune'; out.push(['lot:' + l.id + ':pieces', 'Lot ' + l.id + ' · pièces', d(o.pieces), d(l.pieces)]); }
      if ((o.descTxt || '') !== (l.descTxt || '')) out.push(['lot:' + l.id + ':desc', 'Lot ' + l.id + ' · descriptif', o.descTxt || 'automatique', l.descTxt || 'automatique']);
      if (!!o.descOk !== !!l.descOk) out.push(['lot:' + l.id + ':descok', 'Lot ' + l.id + ' · descriptif ' + (l.descOk ? 'validé' : 'dévalidé'), '', '']);
    });
    s.lots.forEach(l => { if (!nw.has(l.id)) out.push(['lot-' + l.id, 'Lot ' + l.id + ' supprimé', l.des, '—']); });
  }
  if (n.ajust) new Set([...Object.keys(n.ajust), ...Object.keys(s.ajust || {})]).forEach(k => { const a = parseInt((s.ajust || {})[k]) || 0, b = parseInt(n.ajust[k]) || 0; if (a !== b) out.push(['ajust:' + k, 'Ajustement manuel · lot ' + k, (a > 0 ? '+' : '') + a, (b > 0 ? '+' : '') + b]); });
  if (n.hsp) Object.keys(n.hsp).forEach(k => { if (String(n.hsp[k]) !== String((s.hsp || {})[k] ?? HSP_DEF[k])) out.push(['hsp:' + k, 'HSP · ' + ({ seuil: 'seuil', min: 'minimum', coefBas: 'coef. sous le seuil' }[k] || k), (s.hsp || {})[k] ?? HSP_DEF[k], n.hsp[k]]); });
  if ('avant' in n && JSON.stringify(n.avant || null) !== JSON.stringify(s.avant || null)) out.push(['avant', 'État d’origine (modificatif)', s.avant ? s.avant.lots.length + ' lots' : 'aucun', n.avant ? n.avant.lots.length + ' lots · ' + (n.avant.source || '') : 'aucun']);
  if ('mesure' in n && n.mesure !== s.mesure) out.push(['mesure', 'Méthode de mesurage', s.mesure ? 'personnalisée' : 'standard', n.mesure ? 'personnalisée' : 'standard']);
  Object.keys(CLBL).forEach(k => { if (!n[k]) return; new Set([...Object.keys(n[k]), ...Object.keys(s[k] || {})]).forEach(kk => { if (String(n[k][kk] ?? '') !== String((s[k] || {})[kk] ?? '')) out.push([k + ':' + kk, CLBL[k] + ' · ' + kk, (s[k] || {})[kk], n[k][kk]]); }); });
  if (n.baseGen != null && n.baseGen !== s.baseGen) out.push(['baseGen', 'Base des tantièmes généraux', s.baseGen, n.baseGen]);
  if (n.grids) {
    const old = Object.fromEntries(s.grids.map(g => [g.id, g]));
    n.grids.forEach(g => { const o = old[g.id]; if (!o) { out.push(['g+' + g.id, 'Grille « ' + g.name + ' » créée', '—', g.scope || '']); return; } ['name', 'scope', 'method', 'base', 'prog', 'members', 'levelCoefs', 'budget', 'capa', 'excl'].forEach(k => { if (JSON.stringify(o[k]) !== JSON.stringify(g[k])) out.push(['g:' + g.id + ':' + k, 'Grille ' + o.name + ' · ' + ({ method: 'méthode', base: 'base', prog: 'majoration/étage', members: 'lots concernés', levelCoefs: 'coef. par niveau', budget: 'budget', capa: 'capacités', excl: 'exclusions' }[k] || k), o[k], g[k]]); }); });
    s.grids.forEach(g => { if (!n.grids.some(x => x.id === g.id)) out.push(['g-' + g.id, 'Grille « ' + g.name + ' » supprimée', g.scope || '', '—']); });
  }
  if (n.communs) {
    const old = Object.fromEntries((s.communs || []).map(c => [c.id, c]));
    const lab = c => (c.nom || 'Partie commune');
    n.communs.forEach(c => {
      const o = old[c.id];
      if (!o) { out.push(['pc+' + c.id, 'Partie commune « ' + lab(c) + ' » ajoutée', '—', (c.surface ? fm(c.surface) + ' m²' : '')]); return; }
      [['nom', 'nom'], ['bat', 'bâtiment'], ['niveau', 'niveau'], ['loc', 'emplacement'], ['surface', 'surface'], ['nature', 'nature'], ['cle', 'grille'], ['jp', 'jouissance privative']].forEach(([k, l]) => {
        if (String(o[k] ?? '') !== String(c[k] ?? '')) out.push(['pc:' + c.id + ':' + k, 'Partie commune « ' + lab(o) + ' » · ' + l, o[k], c[k]]);
      });
    });
    (s.communs || []).forEach(c => { if (!n.communs.some(x => x.id === c.id)) out.push(['pc-' + c.id, 'Partie commune « ' + lab(c) + ' » supprimée', c.surface ? fm(c.surface) + ' m²' : '', '—']); });
  }
  if (n.articles) {
    const old = Object.fromEntries(s.articles.map(a => [a.id, a]));
    n.articles.forEach(a => { const o = old[a.id]; if (!o) out.push(['a+' + a.id, 'Article « ' + a.t + ' » ajouté', '—', 'inséré']); else if (o.x !== a.x || o.t !== a.t) out.push(['a:' + a.id, 'Article « ' + a.t + ' » modifié', o.x, a.x]); });
    s.articles.forEach(a => { if (!n.articles.some(x => x.id === a.id)) out.push(['a-' + a.id, 'Article « ' + a.t + ' » retiré', 'présent', '—']); });
  }
  return out;
}

export const DOC_CSS = `:root{--p:#0F1D3D;--pt:#A9B3CC;--g:#A87B2A;--gl:#D9A54A}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:20mm 18mm 18mm}body{font-family:'Manrope',Arial,sans-serif;font-size:10.5pt;line-height:1.55;color:#1b1f27;margin:0}p{margin:0 0 6pt}.cover{page-break-after:always;min-height:252mm;display:flex;flex-direction:column;justify-content:space-between;gap:14pt}.cover .mid{text-align:center;padding:10mm 0 4mm}.cover .kind{font:bold 9pt 'Manrope',Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--g)}.cover h1{font-size:27pt;line-height:1.15;color:var(--p);margin:8pt 0 8pt;font-weight:bold}.cover .law{font-style:italic;color:#4a4f5a;font-size:9.5pt;max-width:135mm;margin:0 auto}.cover .rule{width:60pt;height:2px;background:var(--g);margin:16pt auto}.cover .res{font-size:17pt;font-weight:bold;color:var(--p)}.cover .addr{color:#4a4f5a;font-size:10.5pt}.boxes{display:grid;grid-template-columns:1fr 1fr;gap:10pt}.box{border:1px solid #cfd4de;border-top:3px solid var(--p);padding:8pt 10pt;break-inside:avoid}.box.full{grid-column:1/-1}.box h4{margin:0 0 5pt;font:bold 8pt 'Manrope',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--p)}.kv{width:100%;border-collapse:collapse;font-size:9.5pt}.kv td{padding:1.5pt 0;border:0;vertical-align:top}.kv td:first-child{color:#5a606b;width:44%;padding-right:6pt}.kv tr td{background:none!important}.status{text-align:center;padding:7pt;border:1.5px solid var(--g);color:#7a5410;font:bold 9.5pt 'Manrope',Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase}.status.ok{border-color:#2f7d4f;color:#2f7d4f}.cover .foot{font:8pt 'Manrope',Arial,sans-serif;color:#666;display:flex;justify-content:space-between;border-top:1px solid #cfd4de;padding-top:5pt}.toc{page-break-after:always}.toc h2{font-size:15pt;color:var(--p);margin:0 0 12pt;border-bottom:1.5px solid var(--p);padding-bottom:4pt}.toc ol{list-style:none;margin:0;padding:0}.toc li{display:flex;gap:10pt;padding:6pt 0;border-bottom:1px dotted #b9bfcb}.toc li .n{min-width:24pt;font-weight:bold;color:var(--g)}.toc li .r{margin-left:auto;font:8.5pt 'Manrope',Arial,sans-serif;color:#777}h2.sec{font-size:14pt;color:var(--p);border-bottom:1.5px solid var(--p);padding-bottom:3pt;margin:20pt 0 8pt;break-after:avoid}h2.sec .num{color:var(--g);margin-right:8pt}h2.sec .ref{float:right;font:normal 8.5pt 'Manrope',Arial,sans-serif;color:#777;padding-top:5pt}h3{font-size:11.5pt;color:var(--p);margin:12pt 0 4pt;break-after:avoid}table{border-collapse:collapse;width:100%;font-family:'Manrope',Arial,sans-serif;font-size:8.6pt;margin:4pt 0 10pt}th,td{border:1px solid #cfd4de;padding:3.5pt 5pt;vertical-align:top;text-align:left}thead th{background:var(--p);color:#fff;border-color:var(--p);font-weight:bold}tbody tr:nth-child(even) td{background:#f5f6f9}tfoot th,tfoot td{background:#e9ecf2;color:var(--p);font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}td.n,th.n{text-align:right;white-space:nowrap}.meta td{border:0;padding:1pt 8pt 1pt 0;font-family:'Manrope',Arial,sans-serif;font-size:10pt;background:none!important}.lot{break-inside:avoid;border-left:3px solid var(--g);padding:3pt 0 3pt 10pt;margin:0 0 9pt}.lot .h{font-weight:bold;color:var(--p)}.lot .m{font:8.5pt 'Manrope',Arial,sans-serif;color:#5a606b;margin:1pt 0 3pt}.lot .q{font:8.5pt 'Manrope',Arial,sans-serif;color:var(--p);margin-top:3pt}.note{font-size:9pt;color:#4a4f5a}.draftmark{position:fixed;top:42%;left:-10%;right:-10%;text-align:center;font:bold 110pt 'Manrope',Arial,sans-serif;letter-spacing:.1em;color:rgba(168,123,42,.07);transform:rotate(-32deg);z-index:-1;pointer-events:none}.sig{margin-top:18pt;display:grid;grid-template-columns:1fr 1fr;gap:24pt;break-inside:avoid}.sig>div{border-top:1px solid #1b1f27;padding-top:6pt;min-height:80pt;font-size:10pt}.sig small{display:block;font:8.5pt 'Manrope',Arial,sans-serif;color:#555}.cert{page-break-after:always}.cert:last-child{page-break-after:auto}.cert .band{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid var(--p);padding-bottom:6pt;margin-bottom:12pt;font:9pt 'Manrope',Arial,sans-serif;color:#555}.cert .band b{color:var(--p)}.cert h1{font-size:20pt;color:var(--p);text-align:center;margin:6pt 0 2pt}.cert .sub{text-align:center;color:#4a4f5a;margin:0 0 12pt}.big{font-size:24pt;font-weight:bold;text-align:center;color:var(--p);margin:12pt 0;padding:8pt;border:1.5px solid var(--p)}h1.simple{font-size:18pt;color:var(--p);margin:0 0 2pt}.sub{color:#4a4f5a;margin:0 0 10pt}.brand{display:flex;align-items:center;justify-content:space-between;gap:12pt;background:var(--p);padding:12pt 16pt;border-radius:5pt;border-bottom:3px solid var(--gl)}.brand .wm{display:flex;align-items:center;gap:9pt;font:700 16pt 'Cinzel',Georgia,serif;letter-spacing:.14em;color:#fff}.brand .wm i{width:8pt;height:8pt;background:var(--gl);transform:rotate(45deg);display:inline-block}.brand .tag{font:600 7.5pt 'Manrope',Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--pt);text-align:right;line-height:1.6}.brand .tag b{color:#fff;letter-spacing:.06em}.brand.sm{padding:9pt 14pt;margin-bottom:14pt}.brand.sm .wm{font-size:12pt}.cover h1,.cert h1,h1.simple,.cover .res,.toc h2,h2.sec{font-family:'Cinzel',Georgia,serif;letter-spacing:.02em}.cover .law{font-style:normal}.cover .kind{color:var(--g)}.box{background:#FFFDF8;border:1px solid #E6E0D2;border-top:3px solid var(--p);border-radius:4pt}.status{border-radius:4pt;background:#FBF5E9}.status.ok{background:#EEF7F1}tbody tr:nth-child(even) td{background:#F8F6F0}@media screen{body{background:#e6e8ed;padding:16px 0}.doc{max-width:174mm;margin:0 auto;background:#fff;padding:18mm;box-shadow:0 2px 14px rgba(0,0,0,.15)}.cover{min-height:auto;border-bottom:1px dashed #bbb;padding-bottom:18pt;margin-bottom:18pt}.toc{border-bottom:1px dashed #bbb;padding-bottom:18pt;margin-bottom:18pt}}`;

// Lots sur plusieurs niveaux : le lot garde sa partie principale (niveau d'accès, surface, annexe)
// et peut recevoir des parties supplémentaires « extra » : [{ id, niveau, lib, surface, annexe, sa, coef }].
export const partsOf = l => [
  { id: 'main', niveau: l.niveau, lib: '', surface: l.surface, annexe: l.annexe, sa: l.sa, coef: 1, main: true },
  ...(Array.isArray(l.extra) ? l.extra : [])
];
const lvName = (n, lib) => (lib || '').trim() || LVL(n);
// « 1er et 2e étages », « RDC et 1er étage », « 3e étage et combles »
export const levelsLabel = l => {
  const ps = partsOf(l);
  if (ps.length === 1) return LVL(l.niveau);
  const uniq = [];
  ps.forEach(p => { const k = p.niveau + '|' + (p.lib || ''); if (!uniq.some(u => u.k === k)) uniq.push({ k, n: +p.niveau, lib: p.lib }); });
  uniq.sort((a, b) => a.n - b.n);
  const join = a => a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  if (uniq.every(u => u.n >= 1 && !(u.lib || '').trim())) return join(uniq.map(u => LVS(u.n))) + ' étages';
  return join(uniq.map(u => lvName(u.n, u.lib)));
};
export const levelsShort = l => partsOf(l).length === 1 ? LVS(l.niveau) : [...new Set(partsOf(l).map(p => (p.lib || '').trim() || LVS(+p.niveau)))].join('+');
export const surfTot = l => partsOf(l).reduce((a, p) => a + n0(p.surface), 0);

// Calcul central : surfaces pondérées, tantièmes généraux, grilles spéciales.
// Pièces d'une partie de lot (partie principale : 'main').
export const piecesOf = (l, partId) => (Array.isArray(l.pieces) ? l.pieces : []).filter(x => (x.part || 'main') === partId);
export const kHsp = (h, H) => (h === '' || h == null || isNaN(+h)) ? 1 : +h < H.min ? 0 : +h < H.seuil ? n0(H.coefBas) : 1;
export const kPiece = x => (x.coef === '' || x.coef == null) ? 1 : n0(x.coef);

export function compute(s) {
  const H = hspOf(s);
  const kNl = (bat, niv) => {
    const B = s.bats.find(b => b.id === bat) || {};
    if (B.villas) return 1; // villas : pas de coefficient d'étage
    const t = (bat === 'SS' || B.lift) ? s.coefEtageAsc : s.coefEtageSans;
    return t[niv] != null && t[niv] !== '' ? n0(t[niv]) : 1;
  };
  const rows = s.lots.map(l => {
    const ct = coefNat(s, l.type);
    const sit = n0(l.situation);
    let spBase = 0, saTot = 0, superficie = 0, hasPieces = false;
    const parts = partsOf(l).map(p => {
      const pid = p.main ? 'main' : p.id;
      const pcs = piecesOf(l, pid);
      const ca = p.annexe && p.annexe !== 'aucune' ? n0(s.coefAnnexe[p.annexe]) : 0;
      const saEff = ca ? n0(p.sa) : 0;
      const ce = kNl(l.bat, p.niveau);
      const cp = p.main || p.coef == null || p.coef === '' ? 1 : n0(p.coef);
      // Avec des pièces : surface réelle = Σ pièces ; surface retenue = Σ (S × coef. HSP × coef. pièce).
      const surf = pcs.length ? pcs.reduce((a, x) => a + n0(x.surface), 0) : n0(p.surface);
      const seff = pcs.length ? pcs.reduce((a, x) => a + n0(x.surface) * kHsp(x.hsp, H) * kPiece(x), 0) : surf;
      if (pcs.length) { hasPieces = true; superficie += pcs.filter(x => !x.exclu && kHsp(x.hsp, H) === 1).reduce((a, x) => a + n0(x.surface), 0); }
      const v = (seff * ct + saEff * ca) * ce * cp;
      const vNoAnn = seff * ct * ce * cp;
      spBase += v; saTot += saEff;
      const sTxt = pcs.length ? (Math.abs(seff - surf) > 1e-9 ? `Σpièces ${fm(Math.round(seff * 100) / 100)}` : `Σpièces ${fm(surf)}`) : fm(p.surface);
      const inner = `${sTxt} × ${f(ct)}` + (saEff ? ` + ${fm(saEff)} × ${f(ca)}` : '');
      const txt = (saEff ? '(' + inner + ')' : inner) + ` × ${f(ce)}` + (cp !== 1 ? ` × ${f(cp)}` : '');
      return { ...p, pid, surface: surf, seff, pieces: pcs, ca, saEff, ce, cp, v, vNoAnn, txt };
    });
    const multi = parts.length > 1;
    // Copropriété horizontale : la parcelle privative est pondérée par son propre coefficient.
    const parc = hasParcelle(l) ? n0(l.parcelle) : 0, cpar = coefParcelle(s);
    const spBati = spBase;
    if (parc) spBase += parc * cpar;
    const sp = spBase * sit;
    const pTxt = parc ? `parcelle ${fm(parc)} × ${f(cpar)}` : '';
    const bTxt = multi ? parts.map(p => '[' + ((p.lib || '').trim() || LVS(+p.niveau)) + ' : ' + p.txt + ']').join(' + ') : parts[0].txt;
    const calc = !pTxt ? bTxt + ` × ${f(sit)}`
      : !spBati ? pTxt + ` × ${f(sit)}`
        : '(' + bTxt + ' + ' + pTxt + `) × ${f(sit)}`;
    const main = parts[0];
    return { ...l, parcelle: parc, cpar, ct, sit, ca: main.ca, saEff: saTot, ce: main.ce, sp, calc, parts, multi, hasPieces, superficie: hasPieces ? superficie : null, surfTot: parts.reduce((a, p) => a + n0(p.surface), 0) };
  });
  const totSp = rows.reduce((a, r) => a + r.sp, 0);
  const tg0 = alloc(rows.map(r => r.sp), s.baseGen);
  // Ajustement manuel de la compensation (tracé au journal) : ± tantièmes par lot, à somme nulle.
  const aj = s.ajust || {};
  const tg = tg0.map((t, i) => t + (parseInt(aj[rows[i].id]) || 0));
  rows.forEach((r, i) => { r.tgAuto = tg0[i]; r.adj = tg[i] - tg0[i]; r.tg = tg[i]; r.raw = totSp ? r.sp / totSp * s.baseGen : 0; r.bonus = tg0[i] - Math.floor(r.raw); });
  const adjSum = rows.reduce((a, r) => a + r.adj, 0);
  const g = {};
  s.grids.forEach(gr => {
    const ex = gr.excl || {};
    const w = rows.map(r => {
      if (!gr.members.includes(r.id)) return 0;
      let b;
      if (gr.method === 'sp') {
        b = (ex.annexes || ex.niveauxSup)
          ? r.parts.filter(p => !(ex.niveauxSup && !p.main)).reduce((a, p) => a + (ex.annexes ? p.vNoAnn : p.v), 0) * r.sit
          : r.sp;
      } else if (gr.method === 'su') b = r.parts.filter(p => !(ex.niveauxSup && !p.main)).reduce((a, p) => a + n0(p.surface), 0);
      else if (gr.method === 'occ') { const v = (gr.capa || {})[r.id]; b = v === '' || v == null ? 1 : n0(v); }
      else b = 1;
      if (gr.method === 'lot') return b;
      // La majoration par étage se calcule sur le niveau d'accès du lot.
      const lc = gr.levelCoefs ? gr.levelCoefs[r.niveau] : null;
      const fac = (lc != null && lc !== '') ? n0(lc) : (r.niveau > 0 ? 1 + n0(gr.prog) / 100 * (r.niveau - 1) : 1);
      return b * fac;
    });
    const nPos = w.filter(x => x > 0).length;
    const base = gr.method === 'lot' ? nPos : n0(gr.base);
    const sh = alloc(w, base);
    const shares = {}, weights = {};
    rows.forEach((r, i) => { if (w[i] > 0) { shares[r.id] = sh[i]; weights[r.id] = w[i]; } });
    const sum = sh.reduce((a, b) => a + b, 0);
    g[gr.id] = { shares, weights, sum, base, n: Object.keys(shares).length, balanced: sum === base && Object.keys(shares).length > 0 };
  });
  return { rows, g, adjSum, totalSu: rows.reduce((a, r) => a + r.surfTot, 0), totalSa: rows.reduce((a, r) => a + r.saEff, 0), totalSp: totSp, sumTg: tg.reduce((a, b) => a + b, 0) };
}

// ---------- Descriptifs de lots ----------
const lc1 = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
export const jpOf = (s, lotId) => (s.communs || []).filter(x => x.jp && x.jp === lotId);
export function descAuto(s, r, c) {
  const nat = (TYPES[r.type] || {}).l || r.type;
  const lieu = r.bat === 'V' ? 'dans l’ensemble des villas' : r.bat === 'SS' ? 'au sous-sol' : (r.multi ? 'aux ' + levelsLabel(r) : r.niveau === 0 ? 'au rez-de-chaussée' : 'au ' + levelsLabel(r)) + (r.bat === 'SS' || r.bat === 'ENS' ? '' : ' du ' + BATL(r.bat).replace('Bât.', 'bâtiment'));
  const pcs = (r.parts || []).flatMap(p => p.pieces || []).map(x => (x.lib || '').trim()).filter(Boolean);
  const ann = (r.parts || []).filter(p => p.annexe && p.annexe !== 'aucune' && n0(p.sa) > 0).map(p => lc1((ANNEX[p.annexe] || {}).l || p.annexe));
  const jp = jpOf(s, r.id).map(x => lc1(x.nom || 'partie commune'));
  let t = `${lieu.charAt(0).toUpperCase() + lieu.slice(1)}, ${lc1(nat)}${r.des ? ' (' + r.des + ')' : ''}`;
  if (hasParcelle(r) && n0(r.parcelle)) t += (r.type === 'terrain' ? ', d’une superficie de ' : ', édifiée sur une parcelle privative de ') + fm(r.parcelle) + ' m²';
  if (pcs.length) t += ', comprenant : ' + pcs.join(', ');
  if (ann.length) t += (pcs.length ? ' ; ' : ', avec ') + (pcs.length ? 'avec ' : '') + ann.join(', ');
  if (jp.length) t += ', et la jouissance privative de : ' + jp.join(', ');
  t += `. Et les ${r.tg}/${s.baseGen} des parties communes générales`;
  const sp = (s.grids || []).map(g => { const G = (c && c.g[g.id]) || {}; const sh = (G.shares || {})[r.id]; return sh != null ? `${sh}/${G.base} des charges « ${g.name} »` : null; }).filter(Boolean);
  if (sp.length) t += ', ainsi que ' + sp.join(', ');
  return t + '.';
}
// ---------- Modificatif : comparaison avec l'état d'origine ----------
// s.avant = { le, source, base, lots: [{ id, des, bat, etage, tg }] }
export function snapshotAvant(s, source) {
  const c = compute(s);
  return { le: Date.now(), source: source || 'État figé dans COPROCIV', base: s.baseGen, lots: c.rows.map(r => ({ id: r.id, des: r.des || '', bat: r.bat === 'SS' ? 'Sous-sol' : r.bat, etage: levelsLabel(r), tg: r.tg })) };
}
export function compareAvant(s, c) {
  const A = s.avant;
  if (!A || !Array.isArray(A.lots)) return null;
  c = c || compute(s);
  const cur = Object.fromEntries(c.rows.map(r => [r.id, r]));
  const seen = new Set();
  const out = [];
  const frac = (t, b) => t == null || t === '' ? '—' : `${t}/${b}`;
  A.lots.forEach(a => {
    const r = cur[a.id];
    const fils = c.rows.filter(x => (x.origine || []).includes(a.id) && x.id !== a.id).map(x => x.id);
    if (!r) {
      out.push({ statut: fils.length ? 'Divisé / réuni' : 'Supprimé', avant: { ...a, qp: frac(a.tg, A.base) }, apres: null, note: fils.length ? 'devient lot(s) ' + fils.join(', ') : '' });
      return;
    }
    seen.add(r.id);
    const qpA = frac(a.tg, A.base), qpB = frac(r.tg, s.baseGen);
    const desChg = String(a.des || '').trim() !== String(r.des || '').trim();
    const tgChg = qpA !== qpB;
    out.push({ statut: desChg || tgChg ? 'Modifié' : 'Inchangé', avant: { ...a, qp: qpA }, apres: { id: r.id, des: r.des || '', bat: r.bat === 'SS' ? 'Sous-sol' : r.bat, etage: levelsLabel(r), qp: qpB }, note: [desChg && 'désignation', tgChg && 'quote-part'].filter(Boolean).join(', ') });
  });
  c.rows.forEach(r => {
    if (seen.has(r.id)) return;
    const o = (r.origine || []).filter(x => x !== r.id);
    out.push({ statut: 'Créé', avant: null, apres: { id: r.id, des: r.des || '', bat: r.bat === 'SS' ? 'Sous-sol' : r.bat, etage: levelsLabel(r), qp: frac(r.tg, s.baseGen) }, note: o.length ? 'issu du lot ' + o.join(', ') : '' });
  });
  const n = k => out.filter(x => x.statut === k).length;
  return { rows: out, stats: { inchange: n('Inchangé'), modifie: n('Modifié'), cree: n('Créé'), supprime: n('Supprimé') + n('Divisé / réuni') } };
}

// ---------- Contrôles avant certification : une seule liste, quel que soit le mode de saisie ----------
// Les deux modes produisent les mêmes données (lots, parties, pièces, surfaces) et passent donc les mêmes contrôles.
// En mode « Import des plans », chaque partie (et chaque pièce) doit provenir d'un plan.
export const surfaceOk = (s, l) => {
  if (l.prov) return false;
  const plans = s.saisie === 'plans';
  // Villa et lot de terrain : parcelle privative obligatoire (issue du plan de masse en mode Import des plans).
  if (hasParcelle(l) && (!(n0(l.parcelle) > 0) || (plans && l.srcParcelle !== 'plan'))) return false;
  if (l.type === 'terrain') return true;
  return partsOf(l).every(p => {
    const pcs = piecesOf(l, p.main ? 'main' : p.id);
    if (pcs.length) return pcs.every(x => n0(x.surface) > 0 && (!plans || x.src === 'plan'));
    const fromPlan = p.main ? l.srcSurf === 'plan' : p.src === 'plan';
    return n0(p.surface) > 0 && (!plans || fromPlan);
  });
};
export function controlesEDD(s, c) {
  c = c || compute(s);
  const i = s.info || {};
  const lots = s.lots || [];
  const noSurf = lots.filter(l => !surfaceOk(s, l));
  const badDes = lots.filter(l => l.desProv || (l.des || '').trim().length < 6);
  const nDesc = c.rows.filter(r => descValide(s, r, c)).length;
  const pcsOrph = (s.communs || []).filter(x => natureOf(x) === 'pcs' && !(s.grids || []).some(g => g.id === x.cle));
  const hasArt = k => (s.articles || []).some(a => a.k === k);
  return [
    { id: 'mode', ok: !!SAISIE[s.saisie], t: SAISIE[s.saisie] ? 'Mode de saisie : ' + SAISIE[s.saisie] : 'Mode de saisie des surfaces à choisir (Lots & surfaces)' },
    { id: 'lots', ok: lots.length > 0, t: lots.length ? lots.length + ' lot(s)' : 'Aucun lot' },
    { id: 'surf', ok: lots.length > 0 && !noSurf.length, t: noSurf.length ? noSurf.length + ' lot(s) sans surface ' + (s.saisie === 'plans' ? 'issue des plans' : 'saisie') + ' (' + noSurf.slice(0, 6).map(l => l.id).join(', ') + (noSurf.length > 6 ? '…' : '') + ')' : 'Toutes les surfaces renseignées' },
    { id: 'des', ok: !badDes.length, t: badDes.length ? badDes.length + ' désignation(s) incomplète(s)' : 'Désignations complètes' },
    { id: 'tg', ok: c.sumTg === s.baseGen, t: c.sumTg === s.baseGen ? 'Tantièmes généraux équilibrés (' + c.sumTg + ' / ' + s.baseGen + ')' : 'Tantièmes généraux déséquilibrés (' + c.sumTg + ' / ' + s.baseGen + ')' },
    { id: 'adj', ok: c.adjSum === 0, t: 'Ajustements manuels à somme nulle' },
    { id: 'grids', ok: (s.grids || []).every(g => c.g[g.id] && c.g[g.id].balanced), t: (s.grids || []).length ? 'Grilles spéciales équilibrées' : 'Aucune grille spéciale' },
    { id: 'pcs', ok: !pcsOrph.length, t: 'P.C.S. rattachées à une grille' },
    { id: 'desc', ok: lots.length > 0 && nDesc === c.rows.length, t: 'Descriptifs validés (' + nDesc + ' / ' + c.rows.length + ')' },
    { id: 'tf', ok: !!(i.tf || '').trim(), t: (i.tf || '').trim() ? 'Immeuble immatriculé (TF, art. 379)' : 'Titre foncier manquant (art. 379)' },
    { id: 'cad', ok: !!(i.section && i.parcelle), t: 'Section et parcelle cadastrales' },
    { id: 'art', ok: hasArt('edd') && (hasArt('grilles') || !(s.grids || []).length), t: 'Articles EDD et charges spéciales présents dans le règlement' }
  ];
}

export const descOf = (s, r, c) => ((r.descTxt || '').trim() || descAuto(s, r, c));
export const descHash = t => cyrb53(String(t || ''), 7);
export const descValide = (s, r, c) => !!r.descOk && r.descOk === descHash(descOf(s, r, c));

export const seg = (on) => ({ bg: on ? 'white' : 'transparent', shadow: on ? '0 1px 2px rgba(0,0,0,.12)' : 'none', fg: on ? 'var(--b0)' : 'var(--t2)', border: on ? 'var(--b0)' : 'transparent' });