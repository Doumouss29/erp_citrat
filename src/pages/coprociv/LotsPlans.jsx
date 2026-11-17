import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect } from 'react';
import DxfImport from '@/components/coprociv/DxfImport';
import LotDetail from '@/components/coprociv/LotDetail';
import SaisieChoix from '@/components/coprociv/SaisieChoix';
import { useCopro } from '@/lib/coprocivStore';
import { compute, TYPES, BATL, LVL, ANNEX, f, fm, piecesOf, SAISIE, surfaceOk, levelsLabel, hasParcelle, typesFor } from '@/lib/engine';
import { Card, Btn, Mono, Pill, C, CTRL_H } from '@/components/coprociv/ui';

const ANNEX_OPTS = [['aucune', 'Aucune'], ...Object.entries(ANNEX).map(([k, v]) => [k, v.l])];
const BAT_OPTS = (bats, hasSS) => [...bats.map(b => [b.id, BATL(b.id)]), ...(hasSS ? [['SS', 'Sous-sol']] : [])];
const CTRL = { height: CTRL_H, padding: '0 10px', borderRadius: 8, border: '1px solid ' + C.line, background: 'white', fontSize: 14, width: '100%', boxSizing: 'border-box', color: 'inherit' };
const NUMC = { ...CTRL, fontVariantNumeric: 'tabular-nums', textAlign: 'right' };
const TH = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: C.muted, background: C.head, borderBottom: '1px solid ' + C.soft, whiteSpace: 'nowrap', position: 'sticky', top: 0 };
const TD = { padding: '10px 12px', borderBottom: '1px solid ' + C.soft, verticalAlign: 'middle' };
const SUB = { fontSize: 12, color: C.muted, marginTop: 2 };

const Champ = ({ label, children, help }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{label}</span>
    {children}
    {help && <span style={{ fontSize: 12, color: C.muted }}>{help}</span>}
  </label>
);
const Bloc = ({ titre, children }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid ' + C.soft }}>
    <h4 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted }}>{titre}</h4>
    {children}
  </section>
);

export default function LotsPlans() {
  const { state, setLot, split, del, addLot, addPart, setPart, delPart, setSel, setSaisie } = useCopro();
  const mode = SAISIE[state.saisie] ? state.saisie : null;
  const plans = mode === 'plans';
  const role = state.role || 'geometre';
  const canEdit = role === 'geometre';
  const editSurf = canEdit && mode === 'manuelle';
  const c = compute(state);
  const rowsById = Object.fromEntries(c.rows.map(r => [r.id, r]));
  const [confirmMode, setConfirmMode] = useState(null);
  const [batFilter, setBatFilter] = useState('all');
  const [tab, setTab] = useState('lots');
  const [edit, setEdit] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const batOpts = BAT_OPTS(state.bats, state.hasSS);
  const owners = state.owners || [];
  const ownerName = id => (owners.find(o => o.id === id) || {}).nom || '—';
  const shown = state.lots.filter(l => batFilter === 'all' || l.bat === batFilter);
  const okLots = state.lots.filter(l => surfaceOk(state, l));
  const koLots = state.lots.filter(l => !surfaceOk(state, l));
  const lot = edit ? state.lots.find(l => l.id === edit) : null;
  const r = lot ? rowsById[lot.id] || {} : null;

  useEffect(() => {
    if (!edit) return;
    const k = e => { if (e.key === 'Escape') setEdit(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [edit]);
  useEffect(() => { if (edit && !lot) setEdit(null); }, [edit, lot]);

  // Surface affichée dans le tableau, avec son origine.
  const surfCell = l => {
    const rr = rowsById[l.id] || {};
    const nP = (l.pieces || []).length;
    const origin = nP ? 'Σ ' + nP + ' pièce' + (nP > 1 ? 's' : '') : plans ? (l.srcSurf === 'plan' && !l.prov ? 'issue du plan' : 'à importer') : (l.prov || !(+l.surface > 0) ? 'à saisir' : 'saisie');
    const warn = origin === 'à importer' || origin === 'à saisir';
    return <><Mono style={{ fontWeight: 600 }}>{l.type === 'terrain' ? '—' : fm(rr.surfTot ?? l.surface) + ' m²'}</Mono>{hasParcelle(l) && <div style={{ ...SUB, color: 'oklch(0.42 0.09 145)', fontWeight: 600 }}>parcelle {fm(l.parcelle)} m²</div>}<div style={{ ...SUB, color: warn ? 'oklch(0.52 0.14 55)' : C.muted }}>{origin}</div></>;
  };
  const openLot = id => { setSel(id); setEdit(id); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!mode ? (
        <Card title="Choisissez le mode de saisie des surfaces" right={<Pill tone="warn">à choisir</Pill>}>
          <SaisieChoix value={null} onChoose={k => canEdit && setConfirmMode(k)} disabled={!canEdit} />
          <div style={{ fontSize: 13, color: C.muted }}>Choix définitif pour ce dossier.</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 12, background: 'white', border: '1px solid ' + C.soft }}>
          <span style={{ fontWeight: 700, color: 'var(--b0)' }}>{SAISIE[mode]}</span>
          <Pill tone="neutral">choix définitif</Pill>
          <Pill tone={koLots.length ? 'warn' : 'ok'}>{okLots.length} / {state.lots.length} lots {plans ? 'couverts par les plans' : 'avec surface'}</Pill>
          {koLots.length > 0 && <span style={{ fontSize: 13, color: 'oklch(0.48 0.13 55)' }}>Manquent : lots {koLots.slice(0, 10).map(l => l.id).join(', ')}{koLots.length > 10 ? '…' : ''}</span>}
          <span style={{ flex: 1 }} />
          {plans && canEdit && <Btn variant={showImport ? 'ghost' : 'primary'} onClick={() => setShowImport(v => !v)}>{showImport ? 'Fermer l\'import' : 'Importer un plan DXF'}</Btn>}
        </div>
      )}

      {plans && showImport && <Card title="Importer un plan (DXF)"><DxfImport /></Card>}

      {confirmMode && (
        <div onClick={() => setConfirmMode(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,61,.45)', display: 'grid', placeItems: 'center', zIndex: 40 }}>
          <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ background: '#FFFDF8', borderRadius: 14, padding: 24, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)' }}>Retenir « {SAISIE[confirmMode]} » ?</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              {confirmMode === 'plans'
                ? 'Chaque lot recevra sa surface des plans DXF importés ; les surfaces ne seront pas modifiables à la main.'
                : 'Les surfaces seront saisies dans les tableaux (lots, pièces, parties communes) ; l’import de plans ne sera pas disponible.'}
              {' '}<b>Ce choix est définitif pour ce dossier.</b>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setConfirmMode(null)}>Annuler</Btn>
              <Btn onClick={() => { setSaisie(confirmMode); setConfirmMode(null); }}>Confirmer définitivement</Btn>
            </div>
          </div>
        </div>
      )}

      <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'oklch(0.95 0.012 85)', alignSelf: 'flex-start' }}>
        {[['lots', `Lots (${state.lots.length})`], ['detail', 'Pièces & descriptifs']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 36, padding: '0 18px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: tab === k ? 'var(--b0)' : 'transparent', color: tab === k ? 'white' : C.muted }}>{l}</button>
        ))}
      </div>

      {tab === 'detail' ? <LotDetail /> : (
        <Card title="Lots privatifs" right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <FormSelect aria-label="Filtrer par bâtiment" value={batFilter} onChange={e => setBatFilter(e.target.value)} style={{ ...CTRL, width: 'auto' }}>
              {[['all', 'Tous les bâtiments'], ...batOpts].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </FormSelect>
            {canEdit && <Btn onClick={() => { addLot(); setTimeout(() => setEdit(String(Math.max(0, ...state.lots.map(x => parseInt(x.id) || 0)) + 1)), 0); }}>+ Lot</Btn>}
          </div>
        }>
          <div style={{ overflowX: 'auto', border: '1px solid ' + C.soft, borderRadius: 10 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
              <thead><tr>
                <th style={{ ...TH, width: 56 }}>Lot</th>
                <th style={TH}>Désignation</th>
                <th style={TH}>Localisation</th>
                <th style={{ ...TH, textAlign: 'right' }}>Surface</th>
                <th style={TH}>Annexe</th>
                <th style={TH}>Propriétaire</th>
                <th style={{ ...TH, textAlign: 'right' }}>Tantièmes</th>
              </tr></thead>
              <tbody>
                {shown.map(l => {
                  const rr = rowsById[l.id] || {};
                  const t = TYPES[l.type] || {};
                  const on = edit === l.id;
                  return (
                    <tr key={l.id} onClick={() => openLot(l.id)} style={{ cursor: 'pointer', background: on ? 'oklch(0.96 0.03 85)' : 'white' }}>
                      <td style={TD}><button onClick={e => { e.stopPropagation(); openLot(l.id); }} aria-label={'Modifier le lot ' + l.id} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontWeight: 800, color: 'var(--b0)', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{l.id}</button></td>
                      <td style={{ ...TD, minWidth: 220 }}>
                        <div style={{ fontWeight: 600, color: 'var(--b0)' }}>{l.des || <span style={{ color: C.muted }}>Sans désignation</span>}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: t.tint, color: t.ink }}>{t.l}</span>
                          {l.desProv && <span style={{ fontSize: 12, color: 'oklch(0.52 0.14 55)' }}>désignation à compléter</span>}
                        </div>
                      </td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{BATL(l.bat)}<div style={SUB}>{levelsLabel(rr.parts ? rr : l)}</div></td>
                      <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>{surfCell(l)}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{l.annexe && l.annexe !== 'aucune' ? <>{ANNEX[l.annexe].l}<div style={SUB}>{fm(l.sa)} m²</div></> : <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={TD}>{ownerName(l.owner)}</td>
                      <td style={{ ...TD, textAlign: 'right' }}><Mono style={{ fontWeight: 800, color: 'var(--b0)' }}>{rr.tg ?? '—'}</Mono><div style={SUB}>Sp {f(rr.sp)}</div></td>
                    </tr>
                  );
                })}
                {shown.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: C.muted }}>Aucun lot. {canEdit && (plans ? 'Importez un plan DXF ou ajoutez un lot.' : 'Ajoutez un lot.')}</td></tr>}
              </tbody>
              <tfoot><tr style={{ background: C.head }}>
                <td colSpan={3} style={{ ...TD, fontWeight: 700, color: 'var(--b0)' }}>Total · {shown.length} lot{shown.length > 1 ? 's' : ''}</td>
                <td style={{ ...TD, textAlign: 'right' }}><Mono style={{ fontWeight: 700 }}>{fm(c.totalSu)} m²</Mono></td>
                <td colSpan={2} style={TD} />
                <td style={{ ...TD, textAlign: 'right' }}><Mono style={{ fontWeight: 800, color: 'var(--b0)' }}>{c.sumTg} / {state.baseGen}</Mono></td>
              </tr></tfoot>
            </table>
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>Cliquez sur un lot pour le modifier. La surface pondérée (Sp) applique les coefficients réglés dans Tantièmes.</div>
        </Card>
      )}

      {lot && r && (
        <div onClick={() => setEdit(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,61,.25)', zIndex: 30 }}>
          <aside role="dialog" aria-modal="true" aria-label={'Lot ' + lot.id} onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(460px, 100vw)', background: '#FFFDF8', boxShadow: '-12px 0 32px rgba(15,29,61,.18)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid ' + C.soft, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Lot {lot.id}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--b0)' }}>{lot.des || 'Sans désignation'}</div>
              </div>
              <Btn variant="ghost" onClick={() => setEdit(null)} aria-label="Fermer">Fermer</Btn>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Bloc titre="Identification">
                <Champ label="Désignation"><input value={lot.des || ''} disabled={!canEdit} onChange={e => setLot(lot.id, 'des', e.target.value)} placeholder="Appartement T3, porte gauche…" style={CTRL} /></Champ>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <Champ label="Nature"><FormSelect value={lot.type} disabled={!canEdit} onChange={e => setLot(lot.id, 'type', e.target.value)} style={CTRL}>{typesFor(state).map(k => <option key={k} value={k}>{TYPES[k].l}</option>)}</FormSelect></Champ>
                  <Champ label="Bâtiment"><FormSelect value={lot.bat} disabled={!canEdit} onChange={e => setLot(lot.id, 'bat', e.target.value)} style={CTRL}>{batOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect></Champ>
                  <Champ label="Niveau" help={LVL(+lot.niveau)}><input type="number" value={lot.niveau} disabled={!canEdit} onChange={e => setLot(lot.id, 'niveau', parseInt(e.target.value) || 0)} style={NUMC} /></Champ>
                </div>
                <Champ label="Propriétaire"><FormSelect value={lot.owner || ''} disabled={!canEdit} onChange={e => setLot(lot.id, 'owner', e.target.value)} style={CTRL}><option value="">— Non attribué —</option>{owners.map(o => <option key={o.id} value={o.id}>{o.nom || o.id}</option>)}</FormSelect></Champ>
              </Bloc>

              <Bloc titre="Surfaces">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <Champ label="Surface (m²)" help={piecesOf(lot, 'main').length ? 'somme des pièces' : plans ? (lot.srcSurf === 'plan' && !lot.prov ? 'issue du plan' : 'à importer') : 'saisie manuelle'}>
                    {editSurf && !piecesOf(lot, 'main').length
                      ? <input type="number" step="0.01" value={lot.surface || ''} onChange={e => setLot(lot.id, 'surface', e.target.value)} placeholder="0" style={NUMC} />
                      : <div style={{ ...NUMC, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'oklch(0.97 0.008 85)' }}>{fm((r.parts || [])[0] ? r.parts[0].surface : lot.surface)}</div>}
                  </Champ>
                  <Champ label="Annexe"><FormSelect value={lot.annexe || 'aucune'} disabled={!canEdit} onChange={e => setLot(lot.id, 'annexe', e.target.value)} style={CTRL}>{ANNEX_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect></Champ>
                  <Champ label="S. annexe (m²)">
                    {lot.annexe && lot.annexe !== 'aucune'
                      ? (editSurf ? <input type="number" step="0.01" value={lot.sa || ''} onChange={e => setLot(lot.id, 'sa', e.target.value)} style={NUMC} /> : <div style={{ ...NUMC, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'oklch(0.97 0.008 85)' }}>{fm(lot.sa)}</div>)
                      : <div style={{ ...NUMC, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'oklch(0.97 0.008 85)', color: C.muted }}>—</div>}
                  </Champ>
                </div>
                {hasParcelle(lot) && (
                  <Champ label="Parcelle privative (m²)" help={plans ? (lot.srcParcelle === 'plan' ? 'issue du plan de masse' : 'à importer (calque CP_PARCELLE)') : 'surface du terrain privatif du lot'}>
                    {editSurf
                      ? <input type="number" step="0.01" value={lot.parcelle || ''} onChange={e => setLot(lot.id, 'parcelle', e.target.value)} placeholder="0" style={NUMC} />
                      : <div style={{ ...NUMC, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'oklch(0.97 0.008 85)' }}>{fm(lot.parcelle)}</div>}
                  </Champ>
                )}
                <Btn variant="ghost" onClick={() => { setSel(lot.id); setTab('detail'); setEdit(null); }}>Pièces et descriptif du lot →</Btn>
              </Bloc>

              <Bloc titre={`Autres niveaux (${(lot.extra || []).length})`}>
                {(lot.extra || []).length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Lot sur un seul niveau. Ajoutez un niveau pour un duplex, des combles ou une mezzanine.</div>}
                {(lot.extra || []).map(p => {
                  const hasAnn = p.annexe && p.annexe !== 'aucune';
                  return (
                    <div key={p.id} style={{ border: '1px solid ' + C.soft, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 10, alignItems: 'end' }}>
                        <Champ label="Niveau"><input type="number" value={p.niveau} disabled={!canEdit} onChange={e => setPart(lot.id, p.id, { niveau: parseInt(e.target.value) || 0 })} style={NUMC} /></Champ>
                        <Champ label="Libellé"><input value={p.lib || ''} disabled={!canEdit} onChange={e => setPart(lot.id, p.id, { lib: e.target.value })} placeholder={LVL(+p.niveau)} style={CTRL} /></Champ>
                        {canEdit && <Btn variant="danger" onClick={() => delPart(lot.id, p.id)} aria-label="Retirer ce niveau">Retirer</Btn>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                        <Champ label="Surface">{editSurf && !piecesOf(lot, p.id).length ? <input type="number" step="0.01" value={p.surface ?? ''} onChange={e => setPart(lot.id, p.id, { surface: e.target.value })} style={NUMC} /> : <div style={{ ...NUMC, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'oklch(0.97 0.008 85)' }}>{fm(p.surface)}</div>}</Champ>
                        <Champ label="Annexe"><FormSelect value={p.annexe || 'aucune'} disabled={!canEdit} onChange={e => setPart(lot.id, p.id, { annexe: e.target.value })} style={CTRL}>{ANNEX_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect></Champ>
                        <Champ label="S. annexe">{hasAnn && editSurf ? <input type="number" step="0.01" value={p.sa || ''} onChange={e => setPart(lot.id, p.id, { sa: e.target.value })} style={NUMC} /> : <div style={{ ...NUMC, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'oklch(0.97 0.008 85)' }}>{hasAnn ? fm(p.sa) : '—'}</div>}</Champ>
                        <Champ label="Coef."><input type="number" step="0.01" value={p.coef ?? 1} disabled={!canEdit} onChange={e => setPart(lot.id, p.id, { coef: e.target.value })} style={NUMC} /></Champ>
                      </div>
                    </div>
                  );
                })}
                {canEdit && <Btn variant="ghost" onClick={() => addPart(lot.id)}>+ Ajouter un niveau</Btn>}
              </Bloc>

              <Bloc titre="Pondération">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
                  <Champ label="Coef. de situation"><input type="number" step="0.01" value={lot.situation ?? ''} disabled={!canEdit} onChange={e => setLot(lot.id, 'situation', e.target.value)} style={NUMC} /></Champ>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Surface pondérée</div><Mono style={{ fontSize: 18, fontWeight: 700 }}>{f(r.sp)}</Mono></div>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Tantièmes</div><Mono style={{ fontSize: 18, fontWeight: 800, color: 'var(--b0)' }}>{r.tg} / {state.baseGen}</Mono></div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{r.calc}</div>
              </Bloc>
            </div>
            {canEdit && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid ' + C.soft, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <Btn variant="ghost" onClick={() => { split(lot.id); setEdit(null); }}>Diviser le lot</Btn>
                <Btn variant="danger" onClick={() => { del(lot.id); setEdit(null); }}>Supprimer le lot</Btn>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
