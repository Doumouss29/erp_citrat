import { FormSelect } from "@/components/ui/form-select";
import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, LVL, LVS, BATL, TYPES, f, fm, n0, hspOf, kHsp, kPiece, descAuto, descOf, descHash, descValide, OK, WARN } from '@/lib/engine';
import { attestationHtml, openDoc } from '@/lib/docs';
import { Card, Btn, Pill, Mono } from '@/components/coprociv/ui';

const INP = { height: 32, padding: '0 6px', borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 12, background: 'white' };
const TYPES_PIECES = ['Séjour', 'Salon', 'Chambre', 'Cuisine', 'Salle d’eau', 'Salle de bains', 'WC', 'Dégagement', 'Entrée', 'Placard', 'Buanderie', 'Bureau', 'Magasin', 'Réserve'];
const pid = () => 'pi' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export default function LotDetail() {
  const { state, setSel, setPieces, setLotDesc, showToast } = useCopro();
  const canEdit = state.role === 'geometre';
  // Saisie manuelle : on crée les pièces et on tape leurs surfaces. Import des plans : pièces et surfaces viennent du plan,
  // seuls la hauteur sous plafond, le coefficient et l'exclusion de l'attestation restent réglables.
  const editP = canEdit && state.saisie === 'manuelle';
  const c = compute(state);
  const H = hspOf(state);
  const r = c.rows.find(x => x.id === state.sel) || c.rows[0] || null;
  const [q, setQ] = useState('');

  if (!r) return <Card><div style={{ fontSize: 14 }}>Aucun lot.</div></Card>;
  const lot = state.lots.find(l => l.id === r.id);
  const pieces = lot.pieces || [];
  const partOpts = r.parts.map(p => [p.pid, p.main ? 'Partie principale · ' + LVS(+p.niveau) : ((p.lib || '').trim() || LVL(+p.niveau))]);
  const upd = (id, patch) => setPieces(r.id, pieces.map(x => x.id === id ? { ...x, ...patch } : x));
  const add = (lib = '') => setPieces(r.id, [...pieces, { id: pid(), part: 'main', lib, surface: '', hsp: '', coef: 1, exclu: false }]);
  const del = id => setPieces(r.id, pieces.filter(x => x.id !== id));
  const move = (id, d) => { const a = [...pieces]; const i = a.findIndex(x => x.id === id), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setPieces(r.id, a); };

  const surfReelle = pieces.reduce((a, x) => a + n0(x.surface), 0);
  const surfRetenue = r.parts.reduce((a, p) => a + p.seff, 0);
  const desc = descOf(state, r, c);
  const valide = descValide(state, r, c);
  const nValid = c.rows.filter(x => descValide(state, x, c)).length;
  const exp = html => { if (!openDoc(html)) showToast('Autorisez les fenêtres pop-up pour exporter le document'); };
  const shown = c.rows.filter(x => !q || (x.id + ' ' + (x.des || '')).toLowerCase().includes(q.toLowerCase()));

  const cell = w => ({ padding: '5px 6px', fontSize: 14, borderBottom: '1px solid oklch(0.93 0.012 85)', minWidth: w, verticalAlign: 'middle' });
  const th = w => ({ ...cell(w), textAlign: 'left', fontWeight: 700, color: 'oklch(0.5 0.020 var(--h))', textTransform: 'uppercase', fontSize: 12, background: 'oklch(0.97 0.014 85)' });

  return (
    <div className="cp-2col cp-master" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 2.4fr)', gap: 20, alignItems: 'start' }}>
      <Card title="Lots" right={<Pill tone={nValid === c.rows.length ? 'ok' : 'warn'}>{nValid}/{c.rows.length} validés</Pill>}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" style={{ ...INP, height: 32 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 640, overflow: 'auto' }}>
          {shown.map(x => {
            const on = x.id === r.id, ok = descValide(state, x, c), n = (x.pieces || []).length;
            return (
              <button key={x.id} onClick={() => setSel(x.id)} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1.5px solid ' + (on ? 'var(--b0)' : 'transparent'), background: on ? 'oklch(0.97 0.014 85)' : 'transparent' }}>
                <Mono style={{ fontWeight: 700, color: 'var(--b0)', width: 26 }}>{x.id}</Mono>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.des}</span>
                {n > 0 && <span style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>{n} p.</span>}
                <span title={ok ? 'Descriptif validé' : 'Descriptif à valider'} style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? OK : WARN, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title={`Lot ${r.id} — pièces`} right={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill tone="neutral">{BATL(r.bat)} · {(TYPES[r.type] || {}).l}</Pill>
          <Btn variant="ghost" onClick={() => exp(attestationHtml(state, [r.id]))}>Attestation de superficie</Btn>
        </div>}>
          {!editP && canEdit && <div style={{ padding: '8px 12px', borderRadius: 8, background: 'oklch(0.96 0.03 245)', fontSize: 14 }}>{state.saisie === 'plans' ? 'Mode Import des plans : les pièces et leurs surfaces proviennent du plan DXF (choisir « Pièce du lot » lors de l’import). Hauteur sous plafond, coefficient et exclusion restent réglables ici.' : 'Choisissez d’abord le mode de saisie des surfaces (en haut de Lots & surfaces).'}</div>}
          <div style={{ fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>
            Dès qu’une partie du lot a des pièces, sa surface devient la somme des pièces. Chaque pièce est pondérée par la hauteur sous plafond (≥ {f(H.seuil)} m : 1 ; de {f(H.min)} à {f(H.seuil)} m : {f(H.coefBas)} ; sous {f(H.min)} m : 0) et par son propre coefficient. Seuils réglables dans Tantièmes.
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr>
                <th style={th(150)}>Pièce</th>{r.parts.length > 1 && <th style={th(130)}>Partie</th>}<th style={th(80)}>Surface m²</th><th style={th(70)}>HSP m</th>
                <th style={th(60)}>k HSP</th><th style={th(70)}>Coef.</th><th style={th(80)}>Retenue</th><th style={th(80)} title="Exclue de la superficie attestée (loggia fermée, cellier…)">Hors attest.</th>{canEdit && <th style={th(80)} />}
              </tr></thead>
              <tbody>
                {pieces.length === 0 && <tr><td colSpan={9} style={{ padding: 14, fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Aucune pièce : la surface saisie dans le tableau des lots est utilisée telle quelle.</td></tr>}
                {pieces.map(x => {
                  const kh = kHsp(x.hsp, H);
                  return (
                    <tr key={x.id} style={{ background: kh < 1 ? 'oklch(0.98 0.02 70)' : 'white' }}>
                      <td style={cell(150)}>{editP ? <input value={x.lib || ''} onChange={e => upd(x.id, { lib: e.target.value })} list="cp-pieces" placeholder="Séjour…" style={{ ...INP, width: '100%' }} /> : x.lib}</td>
                      {r.parts.length > 1 && <td style={cell(130)}>{editP ? <FormSelect value={x.part || 'main'} onChange={e => upd(x.id, { part: e.target.value })} style={INP}>{partOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect> : (partOpts.find(p => p[0] === (x.part || 'main')) || [])[1]}</td>}
                      <td style={cell(80)}>{editP ? <input type="number" step="0.01" value={x.surface ?? ''} onChange={e => upd(x.id, { surface: e.target.value })} style={{ ...INP, width: 72, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} /> : <Mono>{fm(x.surface)}</Mono>}</td>
                      <td style={cell(70)}>{canEdit ? <input type="number" step="0.01" value={x.hsp ?? ''} onChange={e => upd(x.id, { hsp: e.target.value })} placeholder="—" style={{ ...INP, width: 60, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} /> : <Mono>{x.hsp ? f(x.hsp) : '—'}</Mono>}</td>
                      <td style={cell(60)}><Mono style={{ color: kh < 1 ? 'oklch(0.5 0.14 55)' : 'inherit' }}>{f(kh)}</Mono></td>
                      <td style={cell(70)}>{canEdit ? <input type="number" step="0.01" value={x.coef ?? 1} onChange={e => upd(x.id, { coef: e.target.value })} style={{ ...INP, width: 56, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} /> : <Mono>{f(kPiece(x))}</Mono>}</td>
                      <td style={cell(80)}><Mono>{fm(Math.round(n0(x.surface) * kh * kPiece(x) * 100) / 100)}</Mono></td>
                      <td style={{ ...cell(80), textAlign: 'center' }}><input type="checkbox" disabled={!canEdit} checked={!!x.exclu} onChange={e => upd(x.id, { exclu: e.target.checked })} /></td>
                      {canEdit && <td style={cell(80)}><div style={{ display: 'flex', gap: 3 }}>
                        <button onClick={() => move(x.id, -1)} title="Monter" style={{ ...INP, cursor: 'pointer', padding: '0 5px' }}>↑</button>
                        <button onClick={() => move(x.id, 1)} title="Descendre" style={{ ...INP, cursor: 'pointer', padding: '0 5px' }}>↓</button>
                        {editP && <button onClick={() => del(x.id)} title="Supprimer" style={{ ...INP, cursor: 'pointer', padding: '0 6px', color: 'oklch(0.45 0.13 25)' }}>×</button>}
                      </div></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="cp-pieces">{TYPES_PIECES.map(t => <option key={t} value={t} />)}</datalist>
          </div>
          {editP && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Btn onClick={() => add()}>+ Pièce</Btn>
              <span style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>Ajout rapide :</span>
              {['Séjour', 'Chambre', 'Cuisine', 'Salle d’eau', 'WC', 'Dégagement'].map(t => <Btn key={t} variant="ghost" onClick={() => add(t)} style={{ height: 28, padding: '0 9px', fontSize: 12 }}>{t}</Btn>)}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, fontSize: 14 }}>
            <div><div style={{ color: 'oklch(0.5 0.02 var(--h))' }}>Surface réelle des pièces</div><Mono style={{ fontWeight: 700, fontSize: 16 }}>{fm(surfReelle)} m²</Mono></div>
            <div><div style={{ color: 'oklch(0.5 0.02 var(--h))' }}>Surface retenue (pondération)</div><Mono style={{ fontWeight: 700, fontSize: 16 }}>{fm(Math.round(surfRetenue * 100) / 100)} m²</Mono></div>
            <div><div style={{ color: 'oklch(0.5 0.02 var(--h))' }}>Superficie attestée</div><Mono style={{ fontWeight: 700, fontSize: 16, color: 'var(--b0)' }}>{r.superficie != null ? fm(Math.round(r.superficie * 100) / 100) + ' m²' : '—'}</Mono></div>
            <div><div style={{ color: 'oklch(0.5 0.02 var(--h))' }}>Tantièmes généraux</div><Mono style={{ fontWeight: 700, fontSize: 16 }}>{r.tg} / {state.baseGen}</Mono></div>
          </div>
        </Card>

        <Card title={`Lot ${r.id} — descriptif`} right={<Pill tone={valide ? 'ok' : 'warn'}>{valide ? 'Validé' : r.descOk ? 'Modifié depuis la validation' : 'À valider'}</Pill>}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.6, padding: '10px 12px', borderRadius: 10, background: 'oklch(0.985 0.008 85)', border: '1px solid oklch(0.93 0.012 85)' }}>{desc}</div>
          {canEdit && <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Texte personnalisé (laisser vide pour la rédaction automatique)</span>
              <textarea value={lot.descTxt || ''} onChange={e => setLotDesc(r.id, { descTxt: e.target.value })} rows={3} placeholder={descAuto(state, r, c)} style={{ padding: 8, borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', fontSize: 14, fontFamily: 'Georgia, serif', resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {valide
                ? <Btn variant="ghost" onClick={() => setLotDesc(r.id, { descOk: null })}>Retirer la validation</Btn>
                : <Btn onClick={() => setLotDesc(r.id, { descOk: descHash(desc) })}>Valider ce descriptif</Btn>}
              {lot.descTxt && <Btn variant="ghost" onClick={() => setLotDesc(r.id, { descTxt: '' })}>Revenir au texte automatique</Btn>}
            </div>
          </>}
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>Le descriptif est repris dans l’EDD. Toute modification du lot qui change son texte (pièces, tantièmes, jouissances…) retire la validation.</div>
        </Card>

      </div>
    </div>
  );
}
