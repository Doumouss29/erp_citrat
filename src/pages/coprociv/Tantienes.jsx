import React, { useState, useEffect } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, TYPES, ANNEX, BATL, LVL, levelsShort, f, WARN, hspOf, typesFor, coefParcelle, COEF_DEF, coefNat } from '@/lib/engine';
import { Card, Field, Pill, Mono, Stat, Btn } from '@/components/coprociv/ui';

const numInput = (value, onChange, w = 70) => ({
  type: 'number', step: '0.01', value: value ?? '', onChange,
  style: { width: w, height: 28, padding: '0 6px', borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 14, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', background: 'white' }
});

// Saisie libre (le champ peut être vidé pendant la frappe) ; seule une valeur > 0 est retenue.
function BaseInput({ value, onCommit, disabled }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]);
  const n = parseInt(txt);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
      <Field label="Base (total des tantièmes)" type="number" value={txt} disabled={disabled} mono
        onChange={e => { setTxt(e.target.value); const v = parseInt(e.target.value); if (v > 0) onCommit(v); }}
        onBlur={() => { if (!(n > 0)) setTxt(String(value)); }} />
      {!(n > 0) && <span style={{ fontSize: 12, color: 'oklch(0.5 0.15 25)' }}>Saisissez un nombre supérieur à 0</span>}
    </div>
  );
}

export default function Tantienes() {
  const [coefOpen, setCoefOpen] = useState(false);
  const { state, setCoef, setBaseGen, setHsp, setAjust, clearAjust } = useCopro();
  const H = hspOf(state);
  const role = state.role || 'geometre';
  const canEdit = role === 'geometre';
  const c = compute(state);
  const balanced = c.sumTg === state.baseGen;

  // Niveaux présents dans les lots (triés), pour les coef. d'étage.
  const niveaux = [...new Set(state.lots.flatMap(l => [+l.niveau, ...(l.extra || []).map(p => +p.niveau)]))].sort((a, b) => a - b);

  const cell = (width) => ({ padding: '6px 8px', fontSize: 14, borderBottom: '1px solid oklch(0.93 0.012 85)', minWidth: width, maxWidth: width });
  const th = (width) => ({ ...cell(width), textAlign: 'left', fontWeight: 700, color: 'oklch(0.5 0.020 var(--h))', textTransform: 'uppercase', fontSize: 12, letterSpacing: '.04em', background: 'oklch(0.97 0.014 85)', position: 'sticky', top: 0 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Card title="Base des tantièmes généraux" right={<Pill tone={balanced ? 'ok' : 'warn'}>{balanced ? 'Équilibré' : 'Déséquilibré'}</Pill>}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <BaseInput value={state.baseGen} onCommit={setBaseGen} disabled={!canEdit} />
            <div style={{ display: 'flex', gap: 18 }}>
              <Stat label="Σ tantièmes calculés" value={c.sumTg} tone={balanced ? 'var(--b0)' : WARN} />
              <Stat label="Σ surface pondérée" value={f(c.totalSp, 0)} />
            </div>
          </div>
          <div style={{ fontSize: 14, color: balanced ? 'oklch(0.4 0.11 155)' : 'oklch(0.45 0.13 55)', fontWeight: 600 }}>
            {balanced ? 'La répartition au plus fort reste donne un total exact (' + c.sumTg + ' = ' + state.baseGen + ').' : c.adjSum ? 'Les ajustements manuels ne s’équilibrent pas (somme ' + (c.adjSum > 0 ? '+' : '') + c.adjSum + ') : chaque tantième ajouté à un lot doit être retiré à un autre.' : 'Écart de ' + (c.sumTg - state.baseGen) + ' — vérifiez la base.'}
          </div>
          {Object.keys(state.ajust || {}).length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <Pill tone="warn">{Object.keys(state.ajust).length} ajustement(s) manuel(s)</Pill>
              {canEdit && <Btn variant="ghost" onClick={clearAjust}>Revenir au calcul automatique</Btn>}
            </div>
          )}
        </Card>

      </div>

      <Card title="Quote-parts des parties communes générales" right={<Pill tone="navy">{state.baseGen} tantièmes</Pill>}>
        <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th(56)}>Lot</th>
                <th style={th(90)}>Bât.</th>
                <th style={th(80)}>Niv.</th>
                <th style={th('auto')}>Calcul de la surface pondérée</th>
                <th style={{ ...th(90), textAlign: 'right' }}>Sp</th>
                <th style={{ ...th(90), textAlign: 'right' }}>Brut</th>
                <th style={{ ...th(70), textAlign: 'right' }}>Reste</th>
                <th style={{ ...th(80), textAlign: 'right' }} title="Ajustement manuel de la compensation (± tantièmes), tracé au journal">Ajust.</th>
                <th style={{ ...th(90), textAlign: 'right' }}>Tg</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map(r => (
                <tr key={r.id}>
                  <td style={cell(56)}><Mono style={{ fontWeight: 700, color: 'var(--b0)' }}>{r.id}</Mono></td>
                  <td style={cell(90)}>{BATL(r.bat)}</td>
                  <td style={cell(80)}><Mono>{levelsShort(r)}</Mono></td>
                  <td style={{ ...cell('auto'), fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'oklch(0.45 0.03 var(--h))' }}>{r.calc}</td>
                  <td style={{ ...cell(90), textAlign: 'right' }}><Mono>{f(r.sp)}</Mono></td>
                  <td style={{ ...cell(90), textAlign: 'right' }}><Mono>{f(r.raw, 3)}</Mono></td>
                  <td style={{ ...cell(70), textAlign: 'right' }}><Mono style={{ color: r.bonus > 0 ? 'oklch(0.45 0.11 155)' : 'oklch(0.5 0.020 var(--h))' }}>{r.bonus > 0 ? '+' + r.bonus : ''}</Mono></td>
                  <td style={{ ...cell(80), textAlign: 'right' }}>{canEdit
                    ? <input type="number" step="1" value={r.adj || ''} placeholder="0" onChange={e => setAjust(r.id, e.target.value)} style={{ width: 56, height: 26, padding: '0 4px', borderRadius: 6, border: '1px solid ' + (r.adj ? 'oklch(0.7 0.13 55)' : 'oklch(0.88 0.012 85)'), fontSize: 12, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }} />
                    : <Mono>{r.adj ? (r.adj > 0 ? '+' : '') + r.adj : ''}</Mono>}</td>
                  <td style={{ ...cell(90), textAlign: 'right' }}><Mono style={{ fontWeight: 700, color: 'var(--b0)', fontSize: 14 }}>{r.tg}</Mono></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'oklch(0.97 0.014 85)' }}>
                <td colSpan={4} style={{ ...cell('auto'), fontWeight: 700, color: 'var(--b0)' }}>Total</td>
                <td style={{ ...cell(90), textAlign: 'right' }}><Mono style={{ fontWeight: 700 }}>{f(c.totalSp)}</Mono></td>
                <td colSpan={2} />
                <td style={{ ...cell(80), textAlign: 'right' }}><Mono style={{ color: c.adjSum ? WARN : 'inherit' }}>{c.adjSum ? (c.adjSum > 0 ? '+' : '') + c.adjSum : ''}</Mono></td>
                <td style={{ ...cell(90), textAlign: 'right' }}><Mono style={{ fontWeight: 700, color: balanced ? 'var(--b0)' : WARN, fontSize: 14 }}>{c.sumTg}</Mono></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <details open={coefOpen} onToggle={e => setCoefOpen(e.currentTarget.open)} style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: '16px 20px' }}>
        <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--b0)' }}>Coefficients de pondération <span style={{ fontWeight: 400, fontSize: 14, color: 'oklch(0.48 0.020 var(--h))' }}>· nature, annexes, hauteur sous plafond, étages ({state.bats.filter(b => !b.villas).map(b => b.name + (b.lift ? ' avec' : ' sans') + ' ascenseur').join(', ') || 'villas sans coefficient d’étage'})</span></summary>
        <div style={{ height: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <Card title="Coefficients de nature">
          {typesFor(state).map(k => [k, TYPES[k]]).map(([k, t]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: t.tint, border: '1px solid ' + t.ink }} />
              <span style={{ flex: 1, fontSize: 14 }}>{t.l}</span>
              {canEdit
                ? <input {...numInput(state.coefType[k] ?? COEF_DEF[k], e => setCoef('coefType', k, e.target.value))} />
                : <Mono>{f(coefNat(state, k))}</Mono>}
            </div>
          ))}
        </Card>

        <Card title="Coefficients d'annexe">
          {Object.entries(ANNEX).map(([k, a]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 14 }}>{a.l} <span style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>({f(a.r[0])}–{f(a.r[1])})</span></span>
              {canEdit
                ? <input {...numInput(state.coefAnnexe[k], e => setCoef('coefAnnexe', k, e.target.value))} />
                : <Mono>{f(state.coefAnnexe[k])}</Mono>}
            </div>
          ))}
        </Card>

        {state.bats.some(b => b.villas) && (
          <Card title="Parcelle privative (villas, terrains)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 14 }}>Coefficient de la parcelle <span style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>(0,05–0,25)</span></span>
              {canEdit
                ? <input {...numInput(state.coefAnnexe.parcelle ?? 0.1, e => setCoef('coefAnnexe', 'parcelle', e.target.value))} />
                : <Mono>{f(coefParcelle(state))}</Mono>}
            </div>
            <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))', lineHeight: 1.5 }}>Surface pondérée d’une villa = (surface habitable × coef. de nature + parcelle × coef. de parcelle) × coef. de situation. Un lot de terrain nu n’est pondéré que par sa parcelle. Aucun coefficient d’étage pour les villas.</div>
          </Card>
        )}

        <Card title="Hauteur sous plafond (pièces)">
          {[['seuil', 'Seuil de hauteur (m)', 'au-dessus : surface comptée entièrement'], ['min', 'Hauteur minimale (m)', 'en dessous : surface non retenue'], ['coefBas', 'Coef. entre les deux', 'pondération des parties basses']].map(([k, l, d]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 14 }}>{l}<div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>{d}</div></span>
              {canEdit ? <input {...numInput(H[k], e => setHsp({ [k]: e.target.value }))} /> : <Mono>{f(H[k])}</Mono>}
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>S’applique aux lots saisis pièce par pièce (Lots &amp; surfaces › Pièces). Aucun seuil légal n’est fixé par le Code (art. 249) : valeurs à déclarer dans l’attestation.</div>
        </Card>

        {state.bats.some(b => !b.villas) && <>
        <Card title="Coefficients d'étage — avec ascenseur">
          {niveaux.map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 14 }}>{LVL(n)}</span>
              {canEdit
                ? <input {...numInput(state.coefEtageAsc[n], e => setCoef('coefEtageAsc', n, e.target.value))} />
                : <Mono>{f(state.coefEtageAsc[n])}</Mono>}
            </div>
          ))}
        </Card>

        <Card title="Coefficients d'étage — sans ascenseur">
          {niveaux.map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 14 }}>{LVL(n)}</span>
              {canEdit
                ? <input {...numInput(state.coefEtageSans[n], e => setCoef('coefEtageSans', n, e.target.value))} />
                : <Mono>{f(state.coefEtageSans[n])}</Mono>}
            </div>
          ))}
        </Card>
        </>}
      </div>

      </details>
    </div>
  );
}