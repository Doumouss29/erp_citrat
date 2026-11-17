import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { CLAUSES } from '@/lib/engine';
import { fillText, eddTable, gridsHtml } from '@/lib/docs';
import { Card, Field, Btn, Pill } from '@/components/coprociv/ui';

export default function Reglement() {
  const { state, setArt, addArt, delArt, moveArt, setArtSel, setScreen } = useCopro();
  const role = state.role;
  const canEdit = role === 'geometre' || role === 'notaire';
  const [preview, setPreview] = useState(false);
  const arts = state.articles || [];
  const a = arts.find(x => x.id === state.artSel) || arts[0] || null;
  const idx = a ? arts.indexOf(a) : -1;


  return (
    <div className="cp-2col cp-master" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 20, alignItems: 'start' }}>
      <Card title={`Articles (${arts.length})`} right={<Btn variant="ghost" onClick={() => setScreen('docs')}>Documents →</Btn>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {arts.map((x, i) => (
            <button key={x.id} onClick={() => { setArtSel(x.id); setPreview(false); }} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1.5px solid ' + (a && a.id === x.id ? 'var(--b0)' : 'transparent'), background: a && a.id === x.id ? 'oklch(0.97 0.014 85)' : 'transparent', fontSize: 14 }}>
              <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: 12, opacity: .6, width: 22 }}>{i + 1}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontWeight: 600, color: 'var(--b0)' }}>{x.t}</span>
                {x.ref && <span style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>CCH {x.ref}</span>}
              </span>
              {x.k !== 'text' && <Pill tone="navy">{x.k === 'edd' ? 'tableau' : 'grilles'}</Pill>}
            </button>
          ))}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid oklch(0.92 0.012 85)', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'oklch(0.5 0.020 var(--h))' }}>Ajouter une clause type</span>
            {CLAUSES.map((cl, i) => <Btn key={i} variant="ghost" onClick={() => addArt(i)} style={{ textAlign: 'left' }}>+ {cl.t}</Btn>)}
            <Btn variant="ghost" onClick={() => addArt(-1)}>+ Article libre</Btn>
          </div>
        )}
      </Card>

      {a ? (
        <Card title={`Article ${idx + 1} — ${a.t}${a.ref ? ' · CCH ' + a.ref : ''}`} right={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={() => setPreview(p => !p)}>{preview ? 'Modifier' : 'Aperçu'}</Btn>
            {canEdit && <Btn variant="ghost" disabled={idx <= 0} onClick={() => moveArt(a.id, -1)}>↑</Btn>}
            {canEdit && <Btn variant="ghost" disabled={idx >= arts.length - 1} onClick={() => moveArt(a.id, 1)}>↓</Btn>}
            {canEdit && a.k === 'text' && <Btn variant="danger" onClick={() => delArt(a.id)}>Retirer</Btn>}
          </div>
        }>
          {a.n && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'oklch(0.96 0.04 85)', border: '1px solid oklch(0.88 0.06 85)', fontSize: 14, lineHeight: 1.5, color: 'oklch(0.38 0.06 70)' }}>
              <b>Note à l’auteur (non imprimée) :</b> {a.n}
            </div>
          )}
          {canEdit && !preview ? (
            <>
              <Field label="Titre" value={a.t} onChange={e => setArt(a.id, { t: e.target.value })} />
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Texte</span>
                <textarea value={a.x || ''} onChange={e => setArt(a.id, { x: e.target.value })} rows={10} style={{ padding: 10, borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', fontSize: 14, lineHeight: 1.5, fontFamily: 'Georgia, serif', resize: 'vertical' }} />
              </label>
              <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>
                Champs automatiques : [[ADRESSE]], [[TF]], [[ACD]], [[CONTENANCE]], [[CADASTRE]], [[BATIMENTS]], [[NB_LOTS]], [[BASE]], [[TOTAL]] — remplacés par les données du dossier.
                {a.k === 'edd' && ' Le tableau de l’état descriptif est inséré automatiquement après ce texte.'}
                {a.k === 'grilles' && ' Le détail des charges spéciales est inséré automatiquement après ce texte.'}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.6, color: 'oklch(0.25 0.02 var(--h))' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{fillText(a.x, state)}</p>
              {(a.k === 'edd' || a.k === 'grilles') && (
                <div className="cp-doc" style={{ overflowX: 'auto', marginTop: 10, fontSize: 12 }}
                  dangerouslySetInnerHTML={{ __html: a.k === 'edd' ? eddTable(state) : gridsHtml(state) }} />
              )}
            </div>
          )}
        </Card>
      ) : <Card><div style={{ fontSize: 14 }}>Aucun article.</div></Card>}
    </div>
  );
}
