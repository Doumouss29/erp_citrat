// COPROCIV — lecture DXF (v3).
// Prend en charge : LWPOLYLINE / POLYLINE (avec arcs « bulge »), TEXT / MTEXT,
// blocs (INSERT de BLOCK, avec échelle, rotation et ATTRIB visibles), HATCH (contours polylignes,
// lignes, arcs, ellipses) avec leur teinte (couleur de l'entité ou du calque).
// Résultat : { items, unitL, colors, ins, texts, opens, inserts }
//  - items   : polygones fermés [{ i, layer, color, src, label, hasText, area, declared, container, nChildren, pts }]
//  - ins     : code d'unité déclaré ($INSUNITS, 6 = mètre ; 0 = non déclaré)
//  - texts   : textes [{ txt, x, y }] dans le même repère que items[].pts
//  - opens   : polylignes ouvertes [{ layer }] (refusées par la charte sur les calques CP_)
//  - inserts : blocs insérés [{ name, layer, atts: { TAG: valeur } }] (cartouche)

const ACI = { 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff', 6: '#ff00ff', 7: '#000000', 8: '#808080', 9: '#c0c0c0', 30: '#ff7f00', 40: '#ffbf00', 50: '#ffff00', 90: '#7fff00', 130: '#00ff7f', 150: '#00bfff', 170: '#007fff', 210: '#bf00ff', 230: '#ff00bf', 250: '#333333', 251: '#505050', 252: '#696969', 253: '#828282', 254: '#bebebe', 255: '#ffffff' };
export const colorHex = key => {
  if (!key) return null;
  if (key.startsWith('rgb:')) return '#' + key.slice(4);
  const n = parseInt(key.slice(4));
  return ACI[n] || null;
};
export const colorLabel = key => !key ? '—' : key.startsWith('rgb:') ? '#' + key.slice(4).toUpperCase() : 'Couleur ' + key.slice(4);

const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
export const inside = (x, y, pts) => { let o = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) o = !o; } return o; };
export const centroid = pts => [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length];

// Points intermédiaires d'un arc défini par un « bulge » entre p1 et p2 (p2 exclu).
function bulgePts(p1, p2, b) {
  if (!b) return [];
  const [x1, y1] = p1, [x2, y2] = p2;
  const dx = x2 - x1, dy = y2 - y1, c = Math.hypot(dx, dy);
  if (!c) return [];
  const theta = 4 * Math.atan(b);
  const h = b * c / 2;
  const r = (c * c / 4 + h * h) / (2 * h);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const nx = -dy / c, ny = dx / c;
  const cx = mx + nx * (r - h), cy = my + ny * (r - h);
  const a1 = Math.atan2(y1 - cy, x1 - cx);
  const R = Math.abs(r);
  const n = Math.max(4, Math.ceil(Math.abs(theta) / (Math.PI / 180)));
  const out = [];
  for (let k = 1; k < n; k++) { const a = a1 + theta * k / n; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return out;
}
const withBulges = (verts, closed) => {
  const out = [];
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    out.push([v.x, v.y]);
    const nxt = verts[i + 1] || (closed ? verts[0] : null);
    if (nxt && v.b) out.push(...bulgePts([v.x, v.y], [nxt.x, nxt.y], v.b));
  }
  return out;
};
function arcEdge(cx, cy, r, a0, a1, ccw) {
  let s = a0 * Math.PI / 180, e = a1 * Math.PI / 180;
  if (!ccw) { s = -s; e = -e; }
  while (e <= s) e += 2 * Math.PI;
  const n = Math.max(4, Math.ceil((e - s) / (Math.PI / 180)));
  const pts = [];
  for (let k = 0; k <= n; k++) { const a = s + (e - s) * k / n; pts.push([cx + r * Math.cos(ccw ? a : -a), cy + r * Math.sin(ccw ? a : -a)]); }
  return pts;
}

// ---------- Lecture brute en enregistrements ----------
function records(txt) {
  const L = txt.split(/\r?\n/);
  const P = [];
  for (let i = 0; i + 1 < L.length; i += 2) P.push([parseInt(L[i]), L[i + 1].trim()]);
  const recs = [];
  let cur = null, section = '';
  for (let i = 0; i < P.length; i++) {
    const [c, v] = P[i];
    if (c === 0) {
      if (cur) recs.push(cur);
      cur = { type: v, section, codes: [] };
      if (v === 'SECTION') { const nx = P[i + 1]; if (nx && nx[0] === 2) section = nx[1]; }
      if (v === 'ENDSEC') section = '';
      continue;
    }
    if (cur) cur.codes.push([c, v]);
  }
  if (cur) recs.push(cur);
  return { recs, P };
}
const get = (r, code, def) => { const x = r.codes.find(([c]) => c === code); return x ? x[1] : def; };
const num = (r, code, def = 0) => { const v = get(r, code, null); return v == null ? def : parseFloat(v); };

const cleanText = t => t.replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').replace(/%%c/gi, 'Ø').replace(/%%d/gi, '°').trim();

function hatchLoops(r) {
  const cs = r.codes;
  const loops = [];
  let i = cs.findIndex(([c]) => c === 91);
  if (i < 0) return loops;
  const nLoops = parseInt(cs[i][1]) || 0;
  i++;
  const next = (code) => { while (i < cs.length && cs[i][0] !== code) i++; return i < cs.length ? cs[i++][1] : null; };
  for (let L = 0; L < nLoops && i < cs.length; L++) {
    const flags = parseInt(next(92)) || 0;
    if (flags & 2) {
      const hasB = parseInt(next(72)) || 0;
      const closed = parseInt(next(73));
      const nv = parseInt(next(93)) || 0;
      const verts = [];
      for (let k = 0; k < nv; k++) {
        const x = parseFloat(next(10)), y = parseFloat(next(20));
        let b = 0;
        if (hasB && cs[i] && cs[i][0] === 42) b = parseFloat(cs[i++][1]) || 0;
        verts.push({ x, y, b });
      }
      loops.push(withBulges(verts, closed !== 0));
    } else {
      const ne = parseInt(next(93)) || 0;
      const pts = [];
      for (let k = 0; k < ne; k++) {
        const t = parseInt(next(72));
        if (t === 1) { const a = [parseFloat(next(10)), parseFloat(next(20))]; const b = [parseFloat(next(11)), parseFloat(next(21))]; pts.push(a, b); }
        else if (t === 2) { const cx = parseFloat(next(10)), cy = parseFloat(next(20)), rr = parseFloat(next(40)), a0 = parseFloat(next(50)), a1 = parseFloat(next(51)), ccw = parseInt(next(73)); pts.push(...arcEdge(cx, cy, rr, a0, a1, ccw !== 0)); }
        else if (t === 3) {
          const cx = parseFloat(next(10)), cy = parseFloat(next(20)), mx = parseFloat(next(11)), my = parseFloat(next(21)), ratio = parseFloat(next(40)), a0 = parseFloat(next(50)), a1 = parseFloat(next(51)), ccw = parseInt(next(73));
          const R = Math.hypot(mx, my), rot = Math.atan2(my, mx);
          arcEdge(0, 0, 1, a0, a1, ccw !== 0).forEach(([u, v]) => { const x = u * R, y = v * R * ratio; pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); });
        } else if (t === 4) {
          // Spline : on retient les points de contrôle (approximation suffisante pour une surface de local).
          next(94); next(73); next(74); const nk = parseInt(next(95)) || 0, nc = parseInt(next(96)) || 0;
          for (let q = 0; q < nk; q++) next(40);
          for (let q = 0; q < nc; q++) pts.push([parseFloat(next(10)), parseFloat(next(20))]);
        }
      }
      const dedup = pts.filter((p, k) => k === 0 || Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) > 1e-9);
      if (dedup.length > 2) loops.push(dedup);
    }
    const nSrc = parseInt(next(97)) || 0;
    for (let q = 0; q < nSrc; q++) next(330);
  }
  return loops;
}

export function parseDXF(txt, opts = {}) {
  const { recs, P } = records(txt);
  let ins = 0;
  for (let i = 0; i < P.length; i++) if (P[i][0] === 9 && P[i][1] === '$INSUNITS' && P[i + 1]) ins = parseInt(P[i + 1][1]) || 0;

  // Couleurs des calques (TABLES > LAYER)
  const layerColor = {};
  recs.filter(r => r.section === 'TABLES' && r.type === 'LAYER').forEach(r => { const n = get(r, 2, ''); const c = Math.abs(parseInt(get(r, 62, '7'))); const tc = get(r, 420, null); layerColor[n] = tc ? 'rgb:' + (parseInt(tc) >>> 0).toString(16).padStart(6, '0') : 'aci:' + c; });
  const colorOf = (r, layer) => { const tc = get(r, 420, null); if (tc) return 'rgb:' + (parseInt(tc) >>> 0).toString(16).padStart(6, '0'); const c = get(r, 62, null); if (c != null && +c !== 256 && +c !== 0) return 'aci:' + Math.abs(parseInt(c)); return layerColor[layer] || null; };

  // Découpage : blocs et entités
  const blocks = {};
  const top = [];
  let blk = null;
  recs.forEach(r => {
    if (r.section === 'BLOCKS') {
      if (r.type === 'BLOCK') { blk = { name: get(r, 2, ''), bx: num(r, 10), by: num(r, 20), ents: [] }; blocks[blk.name] = blk; return; }
      if (r.type === 'ENDBLK') { blk = null; return; }
      if (blk) blk.ents.push(r);
      return;
    }
    if (r.section === 'ENTITIES') top.push(r);
  });

  const polys = [], texts = [], hatches = [], opens = [], inserts = [];
  const ident = p => p;
  // Parcours d'une liste d'entités avec une transformation (pour les blocs).
  const walk = (ents, T, parentLayer, depth) => {
    for (let k = 0; k < ents.length; k++) {
      const r = ents[k];
      let layer = get(r, 8, '');
      if (parentLayer && (layer === '0' || layer === '')) layer = parentLayer;
      const tr = pts => pts.map(T);
      if (r.type === 'LWPOLYLINE') {
        const flags = parseInt(get(r, 70, '0')) || 0;
        const verts = []; let v = null;
        r.codes.forEach(([c, val]) => { if (c === 10) { v = { x: parseFloat(val), y: 0, b: 0 }; verts.push(v); } else if (c === 20 && v) v.y = parseFloat(val); else if (c === 42 && v) v.b = parseFloat(val) || 0; });
        const closed = (flags & 1) || (verts.length > 2 && Math.hypot(verts[0].x - verts[verts.length - 1].x, verts[0].y - verts[verts.length - 1].y) < 1e-6);
        if (closed && verts.length >= 3) polys.push({ layer, color: colorOf(r, layer), src: depth ? 'bloc' : 'polyligne', pts: tr(withBulges(verts, true)) });
        else if (verts.length >= 2) opens.push({ layer });
      } else if (r.type === 'POLYLINE') {
        const flags = parseInt(get(r, 70, '0')) || 0;
        const verts = [];
        let j = k + 1;
        for (; j < ents.length && ents[j].type === 'VERTEX'; j++) verts.push({ x: num(ents[j], 10), y: num(ents[j], 20), b: num(ents[j], 42, 0) });
        if (ents[j] && ents[j].type === 'SEQEND') k = j; else k = j - 1;
        const closed = (flags & 1) || (verts.length > 2 && Math.hypot(verts[0].x - verts[verts.length - 1].x, verts[0].y - verts[verts.length - 1].y) < 1e-6);
        if (closed && verts.length >= 3) polys.push({ layer, color: colorOf(r, layer), src: depth ? 'bloc' : 'polyligne', pts: tr(withBulges(verts, true)) });
        else if (verts.length >= 2) opens.push({ layer });
      } else if (r.type === 'TEXT' || r.type === 'MTEXT' || r.type === 'ATTRIB') {
        if (r.type === 'ATTRIB' && (parseInt(get(r, 70, '0')) & 1)) continue;
        const t = r.codes.filter(([c]) => c === 3 || c === 1).map(([, v]) => v).join('');
        if (!t) continue;
        // TEXT justifié : point d'alignement (11/21) s'il est fourni
        const hasAl = r.type !== 'MTEXT' && (parseInt(get(r, 72, '0')) || parseInt(get(r, 73, '0'))) && get(r, 11, null) != null;
        const x = hasAl ? num(r, 11) : num(r, 10), y = hasAl ? num(r, 21) : num(r, 20);
        const [X, Y] = T([x, y]);
        texts.push({ txt: cleanText(t), x: X, y: Y, layer, attr: r.type === 'ATTRIB' });
      } else if (r.type === 'HATCH') {
        hatchLoops(r).forEach(l => { if (l.length >= 3) hatches.push({ layer, color: colorOf(r, layer), src: 'hachure', pts: tr(l) }); });
      } else if (r.type === 'INSERT') {
        const bname = get(r, 2, '');
        const b = blocks[bname];
        const ix = num(r, 10), iy = num(r, 20), sx = num(r, 41, 1) || 1, sy = num(r, 42, 1) || 1, rot = num(r, 50, 0) * Math.PI / 180;
        if (b && depth < 3) {
          const cs = Math.cos(rot), sn = Math.sin(rot);
          const T2 = ([x, y]) => { const u = (x - b.bx) * sx, v = (y - b.by) * sy; return T([ix + u * cs - v * sn, iy + u * sn + v * cs]); };
          walk(b.ents.filter(e => e.type !== 'ATTDEF'), T2, layer, depth + 1);
        }
        // ATTRIB qui suivent l'INSERT (coordonnées déjà absolues)
        let j = k + 1;
        const atts = [];
        for (; j < ents.length && ents[j].type === 'ATTRIB'; j++) atts.push(ents[j]);
        const av = {};
        atts.forEach(a => { const tag = String(get(a, 2, '')).trim().toUpperCase(); if (tag) av[tag] = cleanText(String(get(a, 1, ''))); });
        inserts.push({ name: bname, layer, atts: av });
        if (atts.length) { walk(atts, T, layer, depth); k = (ents[j] && ents[j].type === 'SEQEND') ? j : j - 1; }
      }
    }
  };
  walk(top, ident, null, 0);

  // Unités
  const raw0 = [...polys, ...hatches].map(p => ({ ...p, a: area(p.pts) }));
  let k = { 1: 0.00064516, 2: 0.09290304, 4: 1e-6, 5: 1e-4, 6: 1 }[ins], unitL = { 1: 'pouces', 2: 'pieds', 4: 'mm', 5: 'cm', 6: 'm' }[ins] || '';
  if (!k) { const mx = Math.max(0, ...raw0.map(p => p.a)); k = mx > 1e6 ? 1e-6 : mx > 1e4 ? 1e-4 : 1; unitL = (k === 1e-6 ? 'mm' : k === 1e-4 ? 'cm' : 'm') + ' (déduites)'; }
  // Charte : la géométrie est toujours lue en mètres (une unité déclarée différente est signalée à part).
  if (opts.meters) k = 1;

  // Hachures en double d'une polyligne (même contour) : la polyligne prend la teinte, la hachure est retirée.
  const P0 = raw0.filter(p => p.src !== 'hachure'), H0 = raw0.filter(p => p.src === 'hachure');
  const keptH = [];
  H0.forEach(h => {
    const [hx, hy] = centroid(h.pts);
    const twin = P0.find(p => Math.abs(p.a - h.a) <= Math.max(1e-9, p.a * 0.01) && inside(hx, hy, p.pts));
    if (twin) { if (!twin.hatchColor) twin.hatchColor = h.color; }
    else keptH.push(h);
  });
  const raw = [...P0.map(p => ({ ...p, color: p.hatchColor || p.color })), ...keptH];

  const owner = texts.map(t => {
    let best = -1;
    raw.forEach((p, i) => { if (inside(t.x, t.y, p.pts) && (best < 0 || p.a < raw[best].a)) best = i; });
    return best;
  });
  const children = raw.map((p, i) => raw.filter((q, j) => j !== i && q.a < p.a * 0.98 && inside(...centroid(q.pts), p.pts)).length);
  const sc = Math.sqrt(k);
  const items = raw.map((p, i) => {
    const lab = texts.filter((t, ti) => owner[ti] === i).map(t => t.txt);
    const label = [...new Set(lab)].join(' · ');
    const m = label.match(/(\d+(?:[.,]\d{1,2})?)\s*m\s*[²2](?![\d])/i);
    return {
      i, layer: p.layer, color: p.color || null, src: p.src, label: label || p.layer || ('Polygone ' + (i + 1)), hasText: !!label,
      area: Math.round(p.a * k * 100) / 100,
      declared: m ? parseFloat(m[1].replace(',', '.')) : null,
      container: children[i] > 0, nChildren: children[i],
      pts: p.pts.map(([x, y]) => [x * sc, y * sc])
    };
  }).filter(x => x.area >= 0.01).map((x, n) => ({ ...x, i: n }));
  const colors = {};
  items.forEach(it => { if (it.color && it.src === 'hachure') { colors[it.color] = colors[it.color] || { key: it.color, n: 0, area: 0 }; colors[it.color].n++; colors[it.color].area += it.area; } });
  return {
    items, unitL, colors: Object.values(colors).sort((a, b) => b.n - a.n), ins,
    texts: texts.map(t => ({ ...t, x: t.x * sc, y: t.y * sc })), opens, inserts
  };
}

// Surfaces à déduire (poteaux, gaines…) : chaque polygone d'un calque « à déduire »
// est soustrait du plus petit local qui contient son centre.
export function applyDeductions(items, isDeduct) {
  const ded = items.map(() => 0);
  const target = items.map(() => -1);
  const kids = items.map(it => it.nChildren || 0);
  items.forEach((d, i) => {
    if (!isDeduct(d)) return;
    const [x, y] = centroid(d.pts);
    // Un poteau à l'intérieur d'un local ne fait pas de ce local un « contour englobant ».
    items.forEach((p, j) => { if (j !== i && p.area > d.area * 1.02 && inside(x, y, p.pts)) kids[j] = Math.max(0, kids[j] - 1); });
    let best = -1;
    items.forEach((p, j) => { if (j === i || isDeduct(p)) return; if (p.area > d.area && inside(x, y, p.pts) && (best < 0 || p.area < items[best].area)) best = j; });
    if (best >= 0) { ded[best] += d.area; target[i] = best; }
  });
  return items.map((it, i) => ({ ...it, nChildren: kids[i], container: kids[i] > 0, area: Math.round((it.area - ded[i]) * 100) / 100, deducted: ded[i] ? Math.round(ded[i] * 100) / 100 : 0, grossArea: it.area, deductInto: target[i] }));
}
