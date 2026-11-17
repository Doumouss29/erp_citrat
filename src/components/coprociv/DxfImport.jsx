import React, { useState, useRef, useMemo } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { BATL, LVL, fm } from '@/lib/engine';
import { checkCharte, niveauCode } from '@/lib/dxfCharte';
import { centroid } from '@/lib/dxfParse';
import { Btn, Pill, Mono, C } from '@/components/coprociv/ui';

// Import des plans DXF : seuls les plans conformes à la charte COPROCIV sont acceptés.
// Un plan hors charte est refusé avec la liste des corrections à faire dans le logiciel de dessin.
const KIND = {
  parcelle: { fill: 'oklch(0.96 0.04 95)', stroke: 'oklch(0.55 0.10 95)', l: 'Parcelle (CP_PARCELLE)' },
  lot: { fill: 'oklch(0.88 0.06 245)', stroke: 'oklch(0.50 0.12 245)', l: 'Lot (CP_LOT)' },
  piece: { fill: 'oklch(0.95 0.03 245)', stroke: 'oklch(0.62 0.07 245)', l: 'Pièce (CP_PIECE)' },
  annexe: { fill: 'oklch(0.90 0.07 150)', stroke: 'oklch(0.50 0.11 150)', l: 'Annexe (CP_ANNEXE)' },
  pcg: { fill: 'oklch(0.89 0.06 300)', stroke: 'oklch(0.50 0.12 300)', l: 'Partie commune générale (CP_PCG)' },
  pcs: { fill: 'oklch(0.89 0.07 350)', stroke: 'oklch(0.52 0.14 350)', l: 'Partie commune spéciale (CP_PCS)' },
  deduire: { fill: 'oklch(0.80 0.01 85)', stroke: 'oklch(0.45 0.01 85)', l: 'À déduire (CP_DEDUIRE)' }
};
const ERR = 'oklch(0.55 0.20 28)';
const r2 = x => Math.round(x * 100) / 100;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const lvlDefaults = (s, n) => {
  const out = {};
  if (s.coefEtageAsc[n] == null) out.coefEtageAsc = { ...s.coefEtageAsc, [n]: n <= 1 ? 1 : +(1 + 0.01 * (n - 1)).toFixed(2) };
  if (s.coefEtageSans[n] == null) out.coefEtageSans = { ...s.coefEtageSans, [n]: n <= 1 ? 1 : +Math.max(0.7, n === 2 ? 0.98 : n === 3 ? 0.95 : 0.95 - 0.03 * (n - 3)).toFixed(2) };
  return out;
};
const LINK = { border: 0, background: 'transparent', padding: 0, color: 'var(--b0)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', fontSize: 'inherit' };
const TH = { textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em', padding: '6px 8px', background: C.head, borderBottom: '1px solid ' + C.soft };
const TD = { padding: '6px 8px', fontSize: 14, borderBottom: '1px solid ' + C.soft, verticalAlign: 'top' };

export default function DxfImport() {
  const { state, ed, showToast, setScreen } = useCopro();
  const canEdit = state.role === 'geometre';
  const fileRef = useRef(null);
  const [res, setRes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [undo, setUndo] = useState(null);
  const [hot, setHot] = useState([]);
  const tol = state.dxfRules && state.dxfRules.__tol != null && state.dxfRules.__tol !== '' ? +state.dxfRules.__tol : 0.05;


  const load = (txt, name) => { setRes(checkCharte(txt, state, tol)); setFileName(name); setHot([]); };
  const onFile = file => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => load(String(r.result || ''), file.name);
    r.readAsText(file);
  };
  const close = () => { setRes(null); setFileName(''); setHot([]); };

  const apply = () => {
    if (!res || !res.ok || !canEdit) return;
    const lvl = res.niveau, bat = res.bat;
    setUndo({ lots: state.lots, communs: state.communs || [], coefEtageAsc: state.coefEtageAsc, coefEtageSans: state.coefEtageSans, plans: state.plans || {}, label: (bat === 'SS' ? 'Sous-sol' : BATL(bat) + ' · ' + LVL(lvl)), nL: res.lots.length, nP: res.pcs.length });
    ed(s => {
      const byId = Object.fromEntries(res.lots.map(L => [L.id, L]));
      // Tout ce qui vient du plan est marqué « plan » : c'est la condition du contrôle des surfaces en mode Import des plans.
      const lots = s.lots.map(l => {
        const P = byId[l.id];
        if (!P) return l;
        const hasS = P.contour != null, hasA = P.sa > 0;
        const patch = p => ({ ...(hasS ? { surface: r2(P.surface) } : {}), ...(hasA ? { sa: r2(P.sa), annexe: p.annexe && p.annexe !== 'aucune' ? p.annexe : P.ann } : {}) });
        let L = l, pid = 'main';
        if (lvl === +l.niveau) L = { ...l, ...patch(l), ...(hasS ? { prov: false, srcSurf: 'plan' } : {}) };
        else {
          const ex = l.extra || [];
          const hit = ex.find(p => +p.niveau === lvl);
          if (hit) { pid = hit.id; L = { ...l, extra: ex.map(p => p === hit ? { ...p, ...patch(p), ...(hasS ? { src: 'plan' } : {}) } : p) }; }
          else { pid = 'p' + Date.now().toString(36) + l.id; L = { ...l, extra: [...ex, { id: pid, niveau: lvl, lib: '', surface: '', annexe: 'aucune', sa: 0, coef: 1, ...patch({}), ...(hasS ? { src: 'plan' } : {}) }] }; }
        }
        if (P.parcelle != null) L = { ...L, parcelle: r2(P.parcelle), srcParcelle: 'plan', ...(l.type === 'terrain' ? { prov: false } : {}) };
        if (hasS) {
          // Les pièces de ce niveau sont remplacées par celles du plan ; les réglages HSP / coef. sont conservés par nom.
          const old = (l.pieces || []).filter(x => (x.part || 'main') === pid);
          const keep = n => old.find(x => (x.lib || '').toLowerCase() === n.toLowerCase()) || {};
          L = { ...L, pieces: [...(l.pieces || []).filter(x => (x.part || 'main') !== pid), ...P.pieces.map((x, n) => { const o = keep(x.lib); return { id: 'pi' + Date.now().toString(36) + l.id + '_' + n, part: pid, lib: x.lib, surface: r2(x.surface), hsp: x.hsp !== '' && x.hsp != null ? x.hsp : (o.hsp ?? ''), coef: o.coef ?? 1, exclu: !!o.exclu, src: 'plan' }; })] };
        }
        return L;
      });
      const communs = [...(s.communs || [])];
      let n = 0;
      res.pcs.forEach(p => {
        const i = communs.findIndex(c => norm(c.nom) === norm(p.nom) && c.bat === bat && (c.niveau === '' || c.niveau == null || +c.niveau === lvl));
        if (i >= 0) communs[i] = { ...communs[i], surface: r2(p.surface), nature: p.nature, niveau: lvl, src: 'plan' };
        else communs.push({ id: 'pc' + Date.now().toString(36) + (n++), nom: p.nom, bat, niveau: lvl, loc: '', surface: r2(p.surface), nature: p.nature, cle: 'gen', src: 'plan' });
      });
      const plans = { ...(s.plans || {}), [bat + '|' + lvl]: { fichier: fileName, le: Date.now(), lots: res.lots.length, pcs: res.pcs.length } };
      return { lots, communs, plans, ...lvlDefaults(s, lvl) };
    });
    showToast(`Plan importé : ${res.lots.length} lot(s), ${res.pcs.length} partie(s) commune(s) — ${bat === 'SS' ? 'sous-sol' : BATL(bat) + ' · ' + LVL(lvl)}`);
    close();
  };
  const cancelImport = () => {
    if (!undo) return;
    const u = undo;
    ed(() => ({ lots: u.lots, communs: u.communs, coefEtageAsc: u.coefEtageAsc, coefEtageSans: u.coefEtageSans, plans: u.plans }));
    setUndo(null);
    showToast('Import annulé — lots et parties communes remis comme avant');
  };

  // ---------- Aperçu ----------
  const box = useMemo(() => {
    if (!res || !res.polys.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    res.polys.forEach(p => p.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
    const w = Math.max(1e-6, x1 - x0), h = Math.max(1e-6, y1 - y0);
    return { x0, y0, x1, y1, w, h, pad: Math.max(w, h) * 0.03 };
  }, [res]);
  const plansDone = Object.entries(state.plans || {}).filter(([k]) => k.includes('|')).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: 16, borderRadius: 12, border: '1px solid ' + C.soft, background: 'white' }}>
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
            Un fichier <b style={{ color: 'var(--b0)' }}>.dxf par niveau</b>, dessiné selon la charte DXF COPROCIV ; le bâtiment et le niveau sont lus dans son cartouche. Un plan hors charte est refusé ; rien n’est modifié avant votre confirmation.
            {' '}Charte, gabarits et exemple : <button onClick={() => setScreen('docs')} style={LINK}>page Documents</button>.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: C.muted }}>
            <span style={{ fontWeight: 700, color: 'var(--b0)' }}>Plans importés :</span>
            {plansDone.length === 0 ? 'aucun pour l’instant.' : plansDone.map(([k, v]) => { const [b, n] = k.split('|'); return <span key={k} title={(v.fichier || '') + (v.le ? ' · ' + new Date(v.le).toLocaleDateString('fr-FR') : '')}><Pill tone="ok">{b === 'SS' ? 'SS' : b + ' · ' + niveauCode(+n)}</Pill></span>; })}
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".dxf" onChange={e => { onFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
        {canEdit && <Btn onClick={() => fileRef.current && fileRef.current.click()}>{res ? 'Choisir un autre fichier .dxf' : 'Choisir un fichier .dxf'}</Btn>}
      </div>

      {undo && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10, background: 'oklch(0.95 0.04 155)', fontSize: 14 }}>
          <span style={{ flex: 1, minWidth: 200 }}>Plan importé ({undo.label}) : {undo.nL} lot(s), {undo.nP} partie(s) commune(s) mis à jour.</span>
          {canEdit && <Btn variant="ghost" onClick={cancelImport}>↶ Annuler l’import</Btn>}
          <button onClick={() => setUndo(null)} title="Masquer" aria-label="Masquer" style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {res && (
        <section style={{ border: '1.5px solid ' + (res.ok ? 'oklch(0.75 0.09 155)' : 'oklch(0.78 0.10 28)'), borderRadius: 12, overflow: 'hidden', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', background: res.ok ? 'oklch(0.96 0.03 155)' : 'oklch(0.96 0.025 28)' }}>
            <Pill tone={res.ok ? 'ok' : 'bad'}>{res.ok ? 'Plan conforme' : 'Plan refusé — hors charte'}</Pill>
            <b style={{ fontSize: 14 }}>{fileName}</b>
            {res.bat && res.niveau != null && <span style={{ fontSize: 14, color: C.muted }}>Cartouche : {res.bat === 'SS' ? 'sous-sol' : BATL(res.bat) + ' · ' + LVL(res.niveau)}</span>}
            <span style={{ flex: 1 }} />
            <button onClick={close} style={{ border: '1px solid ' + C.line, background: 'white', borderRadius: 6, height: 28, padding: '0 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✕ Fermer</button>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!res.ok && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: ERR, marginBottom: 6 }}>{res.errors.length} correction(s) à faire dans le dessin, puis réimportez le plan :<button onClick={() => setScreen('docs')} style={{ ...LINK, marginLeft: 8, fontSize: 13 }}>voir la charte</button></div>
                <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14, lineHeight: 1.6, listStyle: 'decimal' }}>
                  {res.errors.map((e, i) => (
                    <li key={i} onMouseEnter={() => setHot(e.ids)} onMouseLeave={() => setHot([])} style={{ cursor: e.ids.length ? 'help' : 'default' }}>{e.msg}</li>
                  ))}
                </ol>
              </div>
            )}
            {res.warns.length > 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'oklch(0.96 0.04 80)', fontSize: 13, lineHeight: 1.55 }}>
                <b style={{ color: 'oklch(0.45 0.11 60)' }}>À vérifier (n’empêche pas l’import)</b>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, listStyle: 'disc' }}>{res.warns.map((w, i) => <li key={i} onMouseEnter={() => setHot(w.ids)} onMouseLeave={() => setHot([])}>{w.msg}</li>)}</ul>
              </div>
            )}

            <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: res.ok ? 'minmax(0, 1.1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
              {box && (
                <div style={{ border: '1px solid ' + C.soft, borderRadius: 10, padding: 6 }}>
                  <svg viewBox={`${box.x0 - box.pad} ${-box.y1 - box.pad} ${box.w + 2 * box.pad} ${box.h + 2 * box.pad}`} style={{ width: '100%', maxHeight: 380, display: 'block' }} role="img" aria-label="Aperçu du plan">
                    {[...res.polys].sort((a, b) => b.area - a.area).map(p => {
                      const k = KIND[p.kind], on = hot.includes(p.n), bad = p.err;
                      const [cx, cy] = centroid(p.pts);
                      const fs = Math.max(box.w, box.h) / (p.kind === 'piece' || p.kind === 'deduire' ? 70 : 50);
                      return (
                        <g key={p.n}>
                          <polygon points={p.pts.map(([x, y]) => x + ',' + (-y)).join(' ')} fill={bad ? 'oklch(0.93 0.05 28)' : k.fill} fillOpacity={0.9}
                            stroke={bad ? ERR : k.stroke} strokeWidth={on ? 3 : bad ? 2 : 1} vectorEffect="non-scaling-stroke" />
                          <text x={cx} y={-cy} fontSize={fs} textAnchor="middle" dominantBaseline="middle" fill={bad ? ERR : 'oklch(0.28 0.03 260)'} style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>{p.n}</text>
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '6px 4px 2px', fontSize: 12 }}>
                    {Object.entries(KIND).map(([k, v]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 2, background: v.fill, border: '1px solid ' + v.stroke }} />{v.l}</span>)}
                    {!res.ok && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: ERR, fontWeight: 600 }}><span style={{ width: 11, height: 11, borderRadius: 2, border: '2px solid ' + ERR }} />En erreur</span>}
                  </div>
                </div>
              )}

              {res.ok && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={TH}>Lot</th><th style={{ ...TH, textAlign: 'right' }}>Surface</th><th style={TH}>Pièces</th><th style={{ ...TH, textAlign: 'right' }}>Annexe</th></tr></thead>
                    <tbody>
                      {res.lots.map(L => (
                        <tr key={L.id}>
                          <td style={{ ...TD, fontWeight: 700 }}>LOT {L.id}</td>
                          <td style={{ ...TD, textAlign: 'right' }}>{L.contour != null ? <Mono>{fm(L.surface)} m²</Mono> : '—'}{L.parcelle != null && <div style={{ fontSize: 12, color: 'oklch(0.42 0.09 145)', fontWeight: 600 }}>parcelle {fm(L.parcelle)} m²</div>}</td>
                          <td style={{ ...TD, fontSize: 13, color: C.muted }}>{L.pieces.length ? L.pieces.map(x => x.lib).join(', ') : '—'}</td>
                          <td style={{ ...TD, textAlign: 'right' }}>{L.sa > 0 ? <Mono>{fm(L.sa)} m² · {L.ann}</Mono> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {res.pcs.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr><th style={TH}>Partie commune</th><th style={TH}>Nature</th><th style={{ ...TH, textAlign: 'right' }}>Surface</th></tr></thead>
                      <tbody>{res.pcs.map(p => <tr key={p.nature + p.nom}><td style={TD}>{p.nom}</td><td style={TD}>{p.nature === 'pcs' ? 'Spéciale' : 'Générale'}</td><td style={{ ...TD, textAlign: 'right' }}><Mono>{fm(p.surface)} m²</Mono></td></tr>)}</tbody>
                    </table>
                  )}
                  {canEdit && <Btn onClick={apply} style={{ alignSelf: 'flex-start' }}>Importer ce plan : {res.lots.length} lot(s), {res.pcs.length} partie(s) commune(s)</Btn>}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>Lecture dans votre navigateur — le fichier n’est envoyé nulle part. Survolez une ligne pour repérer le contour concerné sur l’aperçu.</div>
          </div>
        </section>
      )}
    </div>
  );
}
