import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, KIND_OPTS, BATL, levelsShort, TYPES, fm } from '@/lib/engine';
import { Card, Field, SelectField, Btn, Pill, Mono } from '@/components/coprociv/ui';

export default function Coproprietaires() {
  const { state, addOwner, setOwner, delOwner, setLot, setOwnSel } = useCopro();
  const role = state.role;
  const canEdit = role === 'geometre' || role === 'syndic';
  const c = compute(state);
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);

  const owners = state.owners || [];
  const stats = id => {
    const rows = c.rows.filter(r => r.owner === id);
    return { rows, tg: rows.reduce((a, r) => a + r.tg, 0) };
  };
  const shown = owners.filter(o => !q || (o.nom || '').toLowerCase().includes(q.toLowerCase()));
  // Sans sélection, on ouvre la fiche du premier copropriétaire plutôt qu'un panneau vide.
  const sel = owners.find(o => o.id === state.ownSel) || owners[0] || null;
  const selStats = sel ? stats(sel.id) : null;
  const sansProprio = c.rows.filter(r => !r.owner || !owners.some(o => o.id === r.owner));

  return (
    <div className="cp-2col cp-master" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 20, alignItems: 'start' }}>
      <Card title={`Copropriétaires (${owners.length})`} right={canEdit && <Btn onClick={addOwner}>+ Copropriétaire</Btn>}>
        <Field value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un nom…" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shown.length === 0 && <div style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>{owners.length ? 'Aucun résultat.' : 'Aucun copropriétaire. ' + (canEdit ? 'Cliquez sur « + Copropriétaire ».' : '')}</div>}
          {shown.map(o => {
            const st = stats(o.id);
            const active = sel && sel.id === o.id;
            return (
              <button key={o.id} onClick={() => setOwnSel(o.id)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: '1.5px solid ' + (active ? 'var(--b0)' : 'oklch(0.91 0.012 85)'), background: active ? 'oklch(0.97 0.014 85)' : 'white'
              }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--b0)', fontSize: 14 }}>{o.nom || <i style={{ color: 'oklch(0.6 0.13 55)' }}>Nom à saisir</i>}</span>
                  <span style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>{o.kind} · {st.rows.length} lot{st.rows.length > 1 ? 's' : ''}</span>
                </span>
                <Mono style={{ fontSize: 14, fontWeight: 700, color: 'var(--b0)' }}>{st.tg}/{state.baseGen}</Mono>
              </button>
            );
          })}
        </div>
        {sansProprio.length > 0 && <Pill tone="warn">{sansProprio.length} lot(s) sans propriétaire</Pill>}
      </Card>

      {sel ? (
        <Card title={sel.nom || 'Nouveau copropriétaire'} right={canEdit && <Btn variant="danger" onClick={() => setConfirm(sel.id)}>Supprimer</Btn>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {canEdit ? <>
              <Field label="Nom / raison sociale" value={sel.nom} onChange={e => setOwner(sel.id, { nom: e.target.value })} placeholder="M. et Mme …" />
              <SelectField label="Qualité" value={sel.kind} onChange={e => setOwner(sel.id, { kind: e.target.value })} options={KIND_OPTS} />
              <Field label="Adresse" value={sel.adresse} onChange={e => setOwner(sel.id, { adresse: e.target.value })} />
              <Field label="Téléphone" value={sel.tel} onChange={e => setOwner(sel.id, { tel: e.target.value })} placeholder="+225 …" />
              <Field label="E-mail" type="email" value={sel.email} onChange={e => setOwner(sel.id, { email: e.target.value })} />
            </> : <>
              {[['Qualité', sel.kind], ['Adresse', sel.adresse], ['Téléphone', sel.tel], ['E-mail', sel.email]].map(([l, v]) => (
                <div key={l} style={{ fontSize: 14 }}><div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>{l}</div>{v || '—'}</div>
              ))}
            </>}
          </div>
          <div style={{ fontSize: 14, color: 'oklch(0.45 0.03 var(--h))' }}>
            Quote-part totale : <Mono style={{ fontWeight: 700, color: 'var(--b0)' }}>{selStats.tg} / {state.baseGen}</Mono>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--b0)' }}>Lots {canEdit ? '(cochez les lots détenus)' : 'détenus'}</div>
          <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
            {c.rows.filter(r => canEdit || r.owner === sel.id).map(r => {
              const mine = r.owner === sel.id;
              const other = !mine && r.owner && owners.find(o => o.id === r.owner);
              return (
                <label key={r.id} style={{ display: 'grid', gridTemplateColumns: '24px 44px 1fr auto', gap: 8, alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid oklch(0.94 0.012 85)', fontSize: 14, background: mine ? 'oklch(0.97 0.03 155)' : 'white', cursor: canEdit ? 'pointer' : 'default' }}>
                  {canEdit ? <input type="checkbox" checked={mine} onChange={() => setLot(r.id, 'owner', mine ? '' : sel.id)} /> : <span />}
                  <Mono style={{ fontWeight: 700 }}>{r.id}</Mono>
                  <span>{r.des} <span style={{ color: 'oklch(0.55 0.020 var(--h))' }}>· {BATL(r.bat)} {levelsShort(r)} · {(TYPES[r.type] || {}).l} · {fm(r.surfTot)} m²</span>{other && <span style={{ color: 'oklch(0.55 0.13 55)' }}> — actuellement : {other.nom || 'autre'}</span>}</span>
                  <Mono>{r.tg}</Mono>
                </label>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card><div style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>Sélectionnez un copropriétaire pour voir ou modifier sa fiche et ses lots.</div></Card>
      )}

      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,61,.45)', display: 'grid', placeItems: 'center', zIndex: 40, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFFDF8', borderRadius: 14, padding: 24, maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)' }}>Supprimer ce copropriétaire ?</div>
            <div style={{ fontSize: 14, color: 'oklch(0.45 0.03 var(--h))' }}>Ses lots resteront dans le dossier, sans propriétaire.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setConfirm(null)}>Annuler</Btn>
              <Btn onClick={() => { delOwner(confirm); setConfirm(null); }}>Supprimer</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
