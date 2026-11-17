import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, METHODS, BATL, levelsShort, TYPES, f, fm, fcfa } from '@/lib/engine';
import { Card, Field, SelectField, Btn, Pill, Mono, Stat } from '@/components/coprociv/ui';

export default function ChargesSpeciales() {
  const { state, addGrid, setGrid, delGrid, toggleMember, setMembers, setGridSel } = useCopro();
  const role = state.role;
  const canStruct = role === 'geometre';           // structure des grilles
  const canBudget = role === 'geometre' || role === 'syndic'; // budgets
  const c = compute(state);
  const g = state.grids.find(x => x.id === state.gridSel) || state.grids[0] || null;
  const G = g ? (c.g[g.id] || { shares: {}, weights: {}, sum: 0, n: 0, balanced: false }) : null;
  const ownerName = id => ((state.owners || []).find(o => o.id === id) || {}).nom || '—';
  const totalBudget = state.grids.reduce((a, x) => a + (+x.budget || 0), 0);

  const selectBat = (bat, minLvl) => setMembers(g.id, c.rows.filter(r => (bat === 'all' || r.bat === bat) && r.niveau >= minLvl).map(r => r.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="cp-2col cp-master" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 20, alignItems: 'start' }}>
        <Card title={`Grilles (${state.grids.length})`} right={canStruct && <Btn onClick={addGrid}>+ Grille</Btn>}>
          {state.grids.length === 0 && <div style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>Aucune partie commune spéciale (ascenseur, escalier, parking…).</div>}
          {state.grids.map(x => {
            const X = c.g[x.id] || {};
            const active = g && g.id === x.id;
            return (
              <button key={x.id} onClick={() => setGridSel(x.id)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: '1.5px solid ' + (active ? 'var(--b0)' : 'oklch(0.91 0.012 85)'), background: active ? 'oklch(0.97 0.014 85)' : 'white' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 700, color: 'var(--b0)', fontSize: 14 }}>{x.name}</span>
                  <span style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>{x.scope} · {X.n || 0} lot(s){x.budget ? ' · ' + fcfa(x.budget) : ''}</span>
                </span>
                <Pill tone={X.balanced ? 'ok' : 'warn'}>{X.balanced ? 'OK' : 'À revoir'}</Pill>
              </button>
            );
          })}
          <Stat label="Budget annuel total" value={fcfa(totalBudget)} />
        </Card>

        {g ? (
          <Card title={g.name} right={<div style={{ display: 'flex', gap: 8 }}><Pill tone={G.balanced ? 'ok' : 'warn'}>{G.sum} / {G.base ?? g.base}</Pill>{canStruct && <Btn variant="danger" onClick={() => delGrid(g.id)}>Supprimer</Btn>}</div>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {canStruct ? <>
                <Field label="Nom" value={g.name} onChange={e => setGrid(g.id, { name: e.target.value })} />
                <Field label="Périmètre" value={g.scope} onChange={e => setGrid(g.id, { scope: e.target.value })} placeholder="Bât. A" />
                <SelectField label="Clé de répartition" value={g.method} onChange={e => setGrid(g.id, { method: e.target.value })} options={METHODS} />
                {g.method === 'lot'
                  ? <Field label="Base (= nombre de lots)" value={G.base} disabled mono />
                  : <Field label="Base" type="number" value={g.base} onChange={e => { const n = parseInt(e.target.value); if (n > 0) setGrid(g.id, { base: n }); }} mono />}
                {g.method !== 'lot' && <Field label="Majoration / étage (%)" type="number" value={g.prog} onChange={e => setGrid(g.id, { prog: e.target.value === '' ? 0 : +e.target.value })} mono />}
              </> : <>
                {[['Périmètre', g.scope], ['Clé', (METHODS.find(m => m[0] === g.method) || [])[1]], ['Base', g.base], ['Majoration / étage', (g.prog || 0) + ' %']].map(([l, v]) => (
                  <div key={l} style={{ fontSize: 14 }}><div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>{l}</div>{v}</div>
                ))}
              </>}
              {canBudget
                ? <Field label="Budget annuel (FCFA)" type="number" value={g.budget || ''} onChange={e => setGrid(g.id, { budget: e.target.value === '' ? 0 : Math.max(0, +e.target.value) })} mono />
                : <div style={{ fontSize: 14 }}><div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Budget</div>{fcfa(g.budget)}</div>}
            </div>

            {canStruct && (g.method === 'sp' || g.method === 'su') && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, alignItems: 'center' }}>
                <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Parties exclues du calcul :</span>
                {g.method === 'sp' && <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!(g.excl || {}).annexes} onChange={e => setGrid(g.id, { excl: { ...(g.excl || {}), annexes: e.target.checked } })} />annexes (balcons, terrasses, jardins)</label>}
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!(g.excl || {}).niveauxSup} onChange={e => setGrid(g.id, { excl: { ...(g.excl || {}), niveauxSup: e.target.checked } })} />niveaux supplémentaires des duplex</label>
              </div>
            )}
            {g.method === 'occ' && <div style={{ fontSize: 14, color: 'oklch(0.45 0.03 var(--h))' }}>Capacité d’occupation : saisissez pour chaque lot le nombre de personnes (ou de pièces principales) dans la colonne « Capacité ». Par défaut : 1.</div>}
            {g.method === 'lot' && <div style={{ fontSize: 14, color: 'oklch(0.45 0.03 var(--h))' }}>Chaque lot inclus porte 1 tantième ; la base est égale au nombre de lots (antenne, boîtes aux lettres, interphone…).</div>}

            {(() => {
              const pcs = (state.communs || []).filter(x => x.cle === g.id);
              return (
                <div style={{ fontSize: 14, color: 'oklch(0.45 0.03 var(--h))' }}>
                  <b>Parties communes spéciales rattachées :</b>{' '}
                  {pcs.length ? pcs.map(x => (x.nom || 'sans nom') + (x.surface ? ' (' + fm(x.surface) + ' m²)' : '')).join(', ') : <span style={{ color: 'oklch(0.5 0.02 var(--h))' }}>aucune — à rattacher dans Parties communes</span>}
                </div>
              );
            })()}
            {canStruct && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 14 }}>
                <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Sélection rapide :</span>
                {state.bats.map(b => <Btn key={b.id} variant="ghost" onClick={() => selectBat(b.id, 1)}>{BATL(b.id)} (étages)</Btn>)}
                {state.bats.map(b => <Btn key={'t' + b.id} variant="ghost" onClick={() => selectBat(b.id, -9)}>{BATL(b.id)} (tout)</Btn>)}
                {state.hasSS && <Btn variant="ghost" onClick={() => selectBat('SS', -9)}>Sous-sol</Btn>}
                <Btn variant="ghost" onClick={() => setMembers(g.id, [])}>Aucun</Btn>
              </div>
            )}

            <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead><tr style={{ background: 'oklch(0.97 0.014 85)' }}>
                  {[canStruct ? 'Inclus' : '', 'Lot', 'Désignation', 'Niv.', 'Propriétaire', ...(g.method === 'occ' ? ['Capacité'] : []), 'Poids', 'Quote-part', g.budget ? 'Montant' : ''].filter((h, i) => h || i === 0 && canStruct).map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'oklch(0.5 0.020 var(--h))' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {c.rows.filter(r => canStruct || g.members.includes(r.id)).map(r => {
                    const inG = g.members.includes(r.id);
                    const sh = G.shares[r.id];
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid oklch(0.94 0.012 85)', background: inG ? 'white' : 'oklch(0.985 0.005 85)', color: inG ? 'inherit' : 'oklch(0.6 0.02 var(--h))' }}>
                        {canStruct && <td style={{ padding: '5px 8px' }}><input type="checkbox" checked={inG} onChange={() => toggleMember(g.id, r.id)} /></td>}
                        <td style={{ padding: '5px 8px' }}><Mono style={{ fontWeight: 700 }}>{r.id}</Mono></td>
                        <td style={{ padding: '5px 8px' }}>{r.des} <span style={{ color: 'oklch(0.55 0.02 var(--h))' }}>· {(TYPES[r.type] || {}).l}</span></td>
                        <td style={{ padding: '5px 8px' }}><Mono>{levelsShort(r)}</Mono></td>
                        <td style={{ padding: '5px 8px' }}>{ownerName(r.owner)}</td>
                        {g.method === 'occ' && <td style={{ padding: '5px 8px' }}>{canStruct && inG
                          ? <input type="number" min="0" step="1" value={(g.capa || {})[r.id] ?? ''} placeholder="1" onChange={e => setGrid(g.id, { capa: { ...(g.capa || {}), [r.id]: e.target.value } })} style={{ width: 56, height: 26, padding: '0 4px', borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 12, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
                          : <Mono>{inG ? ((g.capa || {})[r.id] || 1) : '—'}</Mono>}</td>}
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono>{inG ? f(G.weights[r.id] || 0) : '—'}</Mono></td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono style={{ fontWeight: 700, color: 'var(--b0)' }}>{sh != null ? sh : '—'}</Mono></td>
                        {g.budget ? <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono>{sh != null && G.base ? fcfa(g.budget * sh / G.base) : '—'}</Mono></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>
              Poids = base de la clé × (1 + majoration × (étage − 1)), l’étage étant le niveau d’accès du lot (porte palière) pour les duplex. Répartition au plus fort reste : le total est toujours égal à la base.
            </div>
          </Card>
        ) : (
          <Card><div style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>{canStruct ? 'Créez une grille pour répartir des charges spéciales.' : 'Aucune grille définie par le géomètre.'}</div></Card>
        )}
      </div>
    </div>
  );
}
