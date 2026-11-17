import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, statusOf, controlesEDD, phasesEtat } from '@/lib/engine';
import { C, NUM, Pill } from '@/components/coprociv/ui';

// Résumé d'un dossier pour les listes (fiches et administration).
export function resumeDossier(state, id, d) {
  const m = (state.metas || {})[id] || {};
  const st = statusOf(d, m);
  const c = compute(d);
  const etats = phasesEtat({ ...d, certified: st.certified, validated: st.validated }, controlesEDD(d, c));
  const next = etats.find(e => !e.done);
  const statut = st.validated ? ['EDD validé', 'ok'] : st.certified ? ['Certifié', 'ok'] : ['En cours', 'warn'];
  const j = ((state.journals || {})[id] || [])[0];
  return { m, c, etats, next, statut, last: j ? j.t : (m.maj || null), plans: Object.keys(d.plans || {}).length, invites: (m.membres || []).length };
}
export const fmtDate = t => t ? new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const SEG = { done: 'oklch(0.62 0.13 155)', partial: 'var(--gold)', todo: 'oklch(0.90 0.012 85)' };

export default function MesDossiers() {
  const { state, openDossier, setScreen, canAdmin } = useCopro();
  const role = state.role || 'geometre';
  const isTrash = id => !!((state.metas || {})[id] || {}).supprime;
  const all = Object.entries(state.dossiers).filter(([id]) => !isTrash(id));
  const nTrash = Object.keys(state.dossiers).filter(isTrash).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: C.muted, flex: 1 }}>{all.length} dossier{all.length > 1 ? 's' : ''} accessible{all.length > 1 ? 's' : ''} avec votre profil.</span>
        {canAdmin && (
          <button onClick={() => setScreen('admin')} style={{ border: 0, background: 'transparent', color: 'var(--b0)', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Gérer les dossiers{nTrash ? ` (corbeille : ${nTrash})` : ''} →
          </button>
        )}
      </div>

      {all.length === 0 && role !== 'geometre' && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: C.card, border: '1px solid ' + C.soft, fontSize: 14, color: C.muted }}>
          Aucun dossier ne vous a encore été ouvert. Le géomètre-expert vous invite depuis la page Immeuble de son dossier.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, alignItems: 'stretch' }}>
        {role === 'geometre' && (
          <button onClick={() => setScreen('new')} style={{
            minHeight: 260, borderRadius: 14, border: '1.5px dashed oklch(0.75 0.033 var(--h))', background: 'oklch(0.97 0.014 85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: 'var(--b0)', padding: 24
          }}>
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--b0)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>+</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>Nouveau dossier</span>
            <span style={{ fontSize: 14, color: C.muted, maxWidth: 240, textAlign: 'center', lineHeight: 1.5 }}>Identification, bâtiments et pré-saisie des lots. Plans et surfaces se complètent ensuite.</span>
          </button>
        )}

        {all.map(([id, d0]) => {
          const d = id === state.did ? state : d0;
          const r = resumeDossier(state, id, d);
          const info = d.info || {};
          return (
            <article key={id} onClick={() => openDossier(id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openDossier(id); }} style={{
              background: C.card, border: '1px solid ' + C.soft, borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(15,29,61,.04)'
            }}>
              <div style={{ padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '4px solid var(--b0)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...NUM, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.muted }}>DOSSIER {info.ref}</span>
                  <Pill tone={r.statut[1]}>{r.statut[0]}</Pill>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--b0)', lineHeight: 1.25 }}>{info.nom || 'Copropriété sans nom'}</h3>
                <div style={{ fontSize: 14, color: C.muted, minHeight: 21 }}>{[info.adresse, info.commune, info.ville].filter(Boolean).join(', ') || '—'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid ' + C.soft, borderBottom: '1px solid ' + C.soft }}>
                {[['Lots', r.c.rows.length], ['Bâtiments', (d.bats || []).length], ['Invités', r.invites]].map(([l, v], i) => (
                  <div key={l} style={{ padding: '10px 20px', borderLeft: i ? '1px solid ' + C.soft : 0 }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{l}</div>
                    <div style={{ ...NUM, fontSize: 18, fontWeight: 800, color: 'var(--b0)' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: 'var(--b0)' }}>Avancement</span>
                  <span style={{ color: r.next ? 'oklch(0.48 0.12 55)' : 'oklch(0.40 0.11 155)', fontWeight: 600 }}>{r.next ? r.next.l + ' · ' + r.next.label.toLowerCase() : 'Terminé'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {r.etats.map(e => (
                    <div key={e.k} title={e.l + ' : ' + e.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ height: 6, borderRadius: 3, background: e.done ? SEG.done : e.partial ? SEG.partial : SEG.todo }} />
                      <span style={{ fontSize: 11, color: C.muted }}>{e.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', padding: '12px 20px', background: 'oklch(0.975 0.01 85)', borderTop: '1px solid ' + C.soft, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
                  {r.m.createdBy ? 'Créé par ' + r.m.createdBy : 'Dossier local'}<br />Modifié : {fmtDate(r.last)}
                </span>
                <span style={{ height: 34, padding: '0 16px', borderRadius: 8, background: 'var(--b0)', color: 'white', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center' }}>Ouvrir →</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
