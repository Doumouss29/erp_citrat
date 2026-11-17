// COPROCIV — import d'un EDD existant (Excel) pour établir un modificatif.
// Colonnes reconnues (en-tête dans les 15 premières lignes, ordre libre) :
//   numéro / lot · désignation · bâtiment · escalier · étage / niveau · tantièmes / millièmes généraux.
// Format compatible avec la fiche d'immeuble exportée par COPROCIV (et avec le format « Génapi » des notaires).
import { L } from '@/lib/engine';

const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cellText = v => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(x => x.text).join('');
    if (v.result != null) return String(v.result);
    if (v.text != null) return String(v.text);
  }
  return String(v);
};
const COLS = {
  id: s => /^(n|no|n°|num|numero|numero de lot|lot|n° de lot|lot n°)\b/.test(s) || s === 'numero' || s === 'lot',
  des: s => /designation|description|nature du lot|libelle/.test(s),
  bat: s => /^bat|batiment|immeuble/.test(s),
  esc: s => /escalier/.test(s),
  etage: s => /etage|niveau/.test(s),
  tg: s => /(millieme|tantieme|quote).*(gener|pcg)|^milliemes?$|^tantiemes?$|milliemes-generaux|quote-?part/.test(s)
};

// « 235/1000 » → { t: 235, b: 1000 } ; « 235 » → { t: 235, b: null }
const parseQp = v => {
  const s = cellText(v).replace(/\s/g, '').replace(',', '.');
  const m = s.match(/^(\d+(?:\.\d+)?)\/(\d+)$/);
  if (m) return { t: Math.round(+m[1]), b: +m[2] };
  const n = parseFloat(s);
  return isNaN(n) ? null : { t: Math.round(n), b: null };
};
export const parseNiveau = v => {
  const s = norm(cellText(v));
  if (!s) return 0;
  if (/sous.?sol|^ss|^-/.test(s)) { const n = parseInt(s.replace(/[^\d]/g, '')); return n ? -n : -1; }
  if (/rdc|rez/.test(s)) return 0;
  const n = parseInt(s.replace(/[^\d-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const guessType = des => { const d = norm(des); return /cave|cellier/.test(d) ? 'cave' : /\bbox\b|garage ferme/.test(d) ? 'box' : /parking|stationnement|garage/.test(d) ? 'parking' : /deux.?roues|velo|rangement|local technique|local annexe/.test(d) ? 'local' : /commerce|boutique|magasin/.test(d) ? 'commerce' : /bureau|atelier|local professionnel/.test(d) ? 'bureau' : 'appartement'; };

export async function readEddExcel(file) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  for (const ws of wb.worksheets) {
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => { const v = []; row.eachCell({ includeEmpty: true }, (c, k) => { v[k - 1] = c.value; }); rows.push(v); });
    for (let h = 0; h < Math.min(15, rows.length); h++) {
      const head = (rows[h] || []).map(x => norm(cellText(x)));
      const idx = {};
      Object.entries(COLS).forEach(([k, t]) => { const j = head.findIndex((s, i) => s && t(s) && !Object.values(idx).includes(i)); if (j >= 0) idx[k] = j; });
      if (idx.id == null || idx.tg == null) continue;
      const lots = [];
      let base = null;
      for (let r = h + 1; r < rows.length; r++) {
        const v = rows[r] || [];
        const id = cellText(v[idx.id]).trim();
        if (!id || /^total/i.test(id)) continue;
        const qp = parseQp(v[idx.tg]);
        if (!qp) continue;
        if (qp.b) base = base || qp.b;
        lots.push({ id, des: idx.des != null ? cellText(v[idx.des]).trim() : '', bat: idx.bat != null ? cellText(v[idx.bat]).trim() : '', escalier: idx.esc != null ? cellText(v[idx.esc]).trim() : '', etage: idx.etage != null ? cellText(v[idx.etage]).trim() : '', tg: qp.t });
      }
      if (!lots.length) continue;
      if (!base) base = lots.reduce((a, l) => a + l.tg, 0);
      return { sheet: ws.name, base, lots, cols: Object.keys(idx) };
    }
  }
  throw new Error('Aucun tableau reconnu : il faut au moins une colonne « numéro » (ou « lot ») et une colonne « tantièmes » ou « millièmes ».');
}

// Lots COPROCIV créés à partir de l'EDD importé (surfaces à compléter).
export function lotsFromImport(imp, bats) {
  const ids = (bats || []).map(b => b.id);
  return imp.lots.map(x => {
    const niveau = parseNiveau(x.etage);
    const b = String(x.bat || '').trim().toUpperCase();
    const bat = niveau < 0 || /SOUS/.test(b) ? 'SS' : ids.includes(b) ? b : ids.includes(b.replace(/^BAT\.?\s*/, '')) ? b.replace(/^BAT\.?\s*/, '') : (ids[0] || 'A');
    const l = L(String(x.id), bat, niveau, guessType(x.des), x.des || 'Lot ' + x.id, '', 1, '');
    return { ...l, prov: true, escalier: x.escalier || '' };
  });
}
