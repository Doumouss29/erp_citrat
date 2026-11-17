import { FormSelect } from "@/components/ui/form-select";
import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { BATL, LVL, fm, n0, natureOf, partsOf } from '@/lib/engine';
import { Btn, Mono, Pill } from '@/components/coprociv/ui';

const INP = { height: 32, padding: '0 6px', borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 12, background: 'white', maxWidth: '100%' };

export default function PartiesCommunes() {
  const { state, addCommun, setCommun, delCommun } = useCopro();
  const canEdit = state.role === 'geometre';
  // Surfaces des parties communes : saisies à la main en mode manuel, issues des plans en mode Import des plans.
  const editSurf = canEdit && state.saisie === 'manuelle';
  const communs = state.communs || [];
  const batOpts = [...state.bats.map(b => [b.id, BATL(b.id)]), ...(state.hasSS ? [['SS', 'Sous-sol']] : []), ['ENS', 'Ensemble']];
  const maxLvl = Math.max(1, ...state.bats.map(b => +b.etages || 0), ...state.lots.flatMap(l => partsOf(l).map(p => +p.niveau))) + 1;
  const lvlOpts = [['', 'Autre (préciser)']];
  for (let n = state.hasSS ? -1 : 0; n <= maxLvl; n++) lvlOpts.push([String(n), LVL(n)]);
  const hasLvl = c => c.niveau !== '' && c.niveau != null && !isNaN(+c.niveau);

  const tot = { pcg: 0, pcs: 0 };
  communs.forEach(c => { tot[natureOf(c)] += n0(c.surface); });
  const sorted = [...communs].sort((a, b) => (natureOf(a) > natureOf(b) ? 1 : natureOf(a) < natureOf(b) ? -1 : 0) || String(a.bat).localeCompare(String(b.bat)) || (hasLvl(a) ? +a.niveau : 99) - (hasLvl(b) ? +b.niveau : 99));

  // Contrôle par niveau : privatif + communs (à comparer à la surface du niveau sur le plan).
  const lv = {};
  const key = (bat, n) => bat + '|' + n;
  state.lots.forEach(l => partsOf(l).forEach(p => {
    const k = key(l.bat, +p.niveau);
    lv[k] = lv[k] || { bat: l.bat, n: +p.niveau, priv: 0, com: 0, nLots: 0, nCom: 0 };
    lv[k].priv += n0(p.surface); lv[k].nLots++;
  }));
  const hors = [];
  communs.forEach(c => {
    if (!hasLvl(c) || c.bat === 'ENS') { hors.push(c); return; }
    const k = key(c.bat, +c.niveau);
    lv[k] = lv[k] || { bat: c.bat, n: +c.niveau, priv: 0, com: 0, nLots: 0, nCom: 0 };
    lv[k].com += n0(c.surface); lv[k].nCom++;
  });
  const lvRows = Object.values(lv).sort((a, b) => String(a.bat).localeCompare(String(b.bat)) || a.n - b.n);

  const cell = w => ({ padding: '6px 8px', fontSize: 14, borderBottom: '1px solid oklch(0.93 0.012 85)', minWidth: w, verticalAlign: 'middle' });
  const th = w => ({ ...cell(w), textAlign: 'left', fontWeight: 700, color: 'oklch(0.5 0.020 var(--h))', textTransform: 'uppercase', fontSize: 12, background: 'oklch(0.97 0.014 85)' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="navy">Générales (P.C.G.) : {fm(tot.pcg)} m²</Pill>
          <Pill tone="neutral">Spéciales (P.C.S.) : {fm(tot.pcs)} m²</Pill>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={() => addCommun({ nature: 'pcg' })}>+ Partie commune générale</Btn>
            <Btn variant="ghost" onClick={() => addCommun({ nature: 'pcs', cle: '' })}>+ Partie commune spéciale</Btn>
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr>
            <th style={th(180)}>Désignation</th><th style={th(110)}>Bâtiment</th><th style={th(150)}>Niveau</th>
            <th style={th(150)}>Nature</th><th style={th(170)}>Rattachée à la grille</th><th style={th(150)} title="Partie commune dont un seul lot a l'usage exclusif (terrasse, jardin…)">Jouissance privative</th><th style={th(90)}>Surface m²</th>{canEdit && <th style={th(40)} />}
          </tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Aucune partie commune. Ajoutez-en ou importez un plan DXF.</td></tr>}
            {sorted.map(c => {
              const nat = natureOf(c);
              return (
                <tr key={c.id} style={{ background: nat === 'pcs' ? 'oklch(0.985 0.012 350)' : 'white' }}>
                  <td style={cell(180)}>{canEdit ? <input value={c.nom || ''} onChange={e => setCommun(c.id, { nom: e.target.value })} placeholder="SAS 01, palier, local vélos…" style={{ ...INP, width: '100%' }} /> : (c.nom || '—')}</td>
                  <td style={cell(110)}>{canEdit ? (
                    <FormSelect value={c.bat || 'ENS'} onChange={e => setCommun(c.id, { bat: e.target.value })} style={INP}>{batOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect>
                  ) : BATL(c.bat)}</td>
                  <td style={cell(150)}>{canEdit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <FormSelect value={hasLvl(c) ? String(c.niveau) : ''} onChange={e => setCommun(c.id, { niveau: e.target.value === '' ? '' : +e.target.value })} style={INP}>{lvlOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect>
                      {!hasLvl(c) && <input value={c.loc || ''} onChange={e => setCommun(c.id, { loc: e.target.value })} placeholder="RDC → R+3, toiture…" style={INP} />}
                    </div>
                  ) : (hasLvl(c) ? LVL(+c.niveau) : (c.loc || '—'))}</td>
                  <td style={cell(150)}>{canEdit ? (
                    <FormSelect value={nat} onChange={e => setCommun(c.id, { nature: e.target.value, ...(e.target.value === 'pcs' ? { cle: '' } : {}) })} style={INP}>
                      <option value="pcg">Générale (P.C.G.)</option><option value="pcs">Spéciale (P.C.S.)</option>
                    </FormSelect>
                  ) : nat === 'pcs' ? 'Spéciale' : 'Générale'}</td>
                  <td style={cell(170)}>{nat === 'pcs' ? (canEdit ? (
                    <FormSelect value={c.cle && c.cle !== 'gen' ? c.cle : ''} onChange={e => setCommun(c.id, { cle: e.target.value })} style={{ ...INP, background: c.cle && c.cle !== 'gen' ? 'white' : 'oklch(0.96 0.04 75)' }}>
                      <option value="">— À rattacher —</option>
                      {state.grids.map(g => <option key={g.id} value={g.id}>{g.name} · {g.scope}</option>)}
                    </FormSelect>
                  ) : ((state.grids.find(g => g.id === c.cle) || {}).name || '—')) : <span style={{ fontSize: 12, color: 'oklch(0.55 0.02 var(--h))' }}>Tous les copropriétaires</span>}</td>
                  <td style={cell(150)}>{canEdit ? (
                    <FormSelect value={c.jp || ''} onChange={e => setCommun(c.id, { jp: e.target.value })} style={{ ...INP, background: c.jp ? 'oklch(0.96 0.03 245)' : 'white' }}>
                      <option value="">— Aucune —</option>
                      {state.lots.map(l => <option key={l.id} value={l.id}>Lot {l.id} · {(l.des || '').slice(0, 22)}</option>)}
                    </FormSelect>
                  ) : (c.jp ? 'Lot ' + c.jp : '—')}</td>
                  <td style={cell(90)}>{editSurf ? <input type="number" step="0.01" value={c.surface ?? ''} onChange={e => setCommun(c.id, { surface: e.target.value })} placeholder="0" style={{ ...INP, width: 76, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} /> : <Mono>{fm(c.surface)}</Mono>}</td>
                  {canEdit && <td style={cell(40)}><button title="Supprimer" onClick={() => delCommun(c.id)} style={{ height: 26, padding: '0 8px', borderRadius: 6, border: '1px solid oklch(0.85 0.04 25)', background: 'white', color: 'oklch(0.45 0.13 25)', fontSize: 12, cursor: 'pointer' }}>×</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--b0)' }}>Contrôle des surfaces par niveau</div>
      <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))', marginTop: -10 }}>Comparez le total de chaque niveau à la surface utile du niveau sur votre plan : un écart signale un local oublié ou compté deux fois.</div>
      <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={th(110)}>Bâtiment</th><th style={th(110)}>Niveau</th><th style={th(150)}>Privatif (lots)</th><th style={th(170)}>Parties communes</th><th style={th(110)}>Total</th></tr></thead>
          <tbody>
            {lvRows.map(r => (
              <tr key={r.bat + r.n}>
                <td style={cell(110)}>{BATL(r.bat)}</td>
                <td style={cell(110)}>{LVL(r.n)}</td>
                <td style={cell(150)}><Mono>{fm(r.priv)} m²</Mono> <span style={{ fontSize: 12, color: 'oklch(0.55 0.02 var(--h))' }}>({r.nLots})</span></td>
                <td style={cell(170)}><Mono>{fm(r.com)} m²</Mono> <span style={{ fontSize: 12, color: 'oklch(0.55 0.02 var(--h))' }}>({r.nCom})</span>{r.nLots > 0 && r.nCom === 0 && <span style={{ fontSize: 12, color: 'oklch(0.5 0.14 60)' }}> · aucune saisie</span>}</td>
                <td style={cell(110)}><Mono style={{ fontWeight: 700, color: 'var(--b0)' }}>{fm(r.priv + r.com)} m²</Mono></td>
              </tr>
            ))}
            {hors.length > 0 && (
              <tr><td style={cell(110)} colSpan={3}>Hors niveau (toiture, extérieurs, ensemble…)</td><td style={cell(170)}><Mono>{fm(hors.reduce((a, c) => a + n0(c.surface), 0))} m²</Mono> <span style={{ fontSize: 12, color: 'oklch(0.55 0.02 var(--h))' }}>({hors.length})</span></td><td style={cell(110)} /></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
