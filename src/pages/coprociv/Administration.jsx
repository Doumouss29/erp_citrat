import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { effectiveAccess, fetchProfiles } from '@/lib/accessProfiles';
import { useCopro } from '@/lib/coprocivStore';
import { Card, Btn, Pill, Stat, C, NUM, Field } from '@/components/coprociv/ui';
import { resumeDossier, fmtDate } from '@/pages/coprociv/MesDossiers';
import ReferentielPlans from '@/components/coprociv/ReferentielPlans';

// Page réservée à l'administrateur : accès aux dossiers, dossiers et corbeille, référentiel des plans.
// Le profil métier n'est plus attribué ici : tout compte ayant accès à COPROCIV est géomètre-expert automatiquement.
// Les actions irréversibles (suppression définitive) ne figurent qu'ici.
const TABS = [['acces', 'Accès aux dossiers'], ['dossiers', 'Dossiers et corbeille'], ['ref', 'Référentiel des plans']];
const TH = { textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', padding: '10px 12px', background: C.head, borderBottom: '1px solid ' + C.soft, whiteSpace: 'nowrap' };
const TD = { padding: '12px', borderBottom: '1px solid ' + C.soft, fontSize: 14, verticalAlign: 'middle' };
const SUB = { fontSize: 12, color: C.muted };
const norm = e => String(e || '').trim().toLowerCase();

export default function Administration() {
  const { state, user, openDossier, duplicateDossier, trashDossier, deleteDossier, setMembres } = useCopro();
  const [tab, setTab] = useState('acces');
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const [bin, setBin] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [typed, setTyped] = useState('');
  const [mails, setMails] = useState({});

  useEffect(() => {
    if (!user) { setUsers([]); return; }
    // Seuls les comptes ayant accès à COPROCIV dans le portail (grade + accès supplémentaires) sont listés.
    Promise.all([base44.entities.User.list(), fetchProfiles({ force: true })])
      .then(([list, profiles]) => setUsers(list.filter(u => effectiveAccess(u, profiles).includes('coprociv'))))
      .catch(() => { setUsers([]); setErr('Impossible de charger la liste des comptes.'); });
  }, [user]);

  const metas = state.metas || {};
  const all = Object.entries(state.dossiers).map(([id, d]) => [id, id === state.did ? state : d]);
  const isTrash = id => !!(metas[id] || {}).supprime;
  const actifs = all.filter(([id]) => !isTrash(id));
  const corbeille = all.filter(([id]) => isTrash(id));
  const nInvites = actifs.reduce((n, [id]) => n + ((metas[id] || {}).membres || []).length, 0);

  const invite = id => {
    const m = norm(mails[id]);
    if (!/.+@.+\..+/.test(m)) return;
    setMembres([...((metas[id] || {}).membres || []), m], id);
    setMails(x => ({ ...x, [id]: '' }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Stat label="Comptes" value={users ? users.length : '…'} sub="ayant accès · géomètres-experts" />
        <Stat label="Dossiers actifs" value={actifs.length} />
        <Stat label="Invitations" value={nInvites} sub="accès accordés par e-mail" />
        <Stat label="Corbeille" value={corbeille.length} sub="restaurables" />
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'oklch(0.95 0.012 85)', width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: tab === k ? 'var(--b0)' : 'transparent', color: tab === k ? 'white' : C.muted }}>{l}</button>
        ))}
      </div>
      {err && <div style={{ fontSize: 14, color: 'oklch(0.5 0.15 25)' }}>{err}</div>}

      {tab === 'acces' && (
        <Card title="Qui voit quel dossier" right={<Pill tone="neutral">{actifs.length} dossiers</Pill>}>
          <div style={SUB}>Un dossier est visible par son créateur, par l’administrateur et par les adresses e-mail invitées. Retirer une invitation coupe l’accès immédiatement.</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {actifs.map(([id, d], i) => {
              const m = metas[id] || {};
              const membres = m.membres || [];
              return (
                <div key={id} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(0, 2fr)', gap: 16, padding: '16px 0', borderTop: i ? '1px solid ' + C.soft : 0, alignItems: 'start' }} className="cp-2col">
                  <div>
                    <div style={{ ...NUM, fontSize: 12, color: C.muted, fontWeight: 700 }}>DOSSIER {(d.info || {}).ref}</div>
                    <div style={{ fontWeight: 800, color: 'var(--b0)', fontSize: 15 }}>{(d.info || {}).nom || 'Sans nom'}</div>
                    <div style={SUB}>Créateur : {m.createdBy || 'dossier local'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 30, alignItems: 'center' }}>
                      {membres.length === 0 && <span style={{ fontSize: 14, color: C.muted }}>Aucune personne invitée.</span>}
                      {membres.map(e => (
                        <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 12px', borderRadius: 999, background: 'oklch(0.95 0.02 85)', fontSize: 14 }}>
                          {e}
                          <button onClick={() => setMembres(membres.filter(x => x !== e), id)} title="Retirer l'accès" aria-label={'Retirer ' + e} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'oklch(0.45 0.13 25)', fontSize: 16 }}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Field type="email" value={mails[id] || ''} onChange={e => setMails(x => ({ ...x, [id]: e.target.value }))} placeholder="adresse e-mail à inviter" style={{ flex: 1 }} />
                      <Btn variant="ghost" onClick={() => invite(id)} disabled={!/.+@.+\..+/.test(norm(mails[id]))}>Inviter</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'ref' && (
        <Card title="Référentiel des plans" right={<Pill tone="neutral">{state.did ? 'dossier ' + ((state.info || {}).ref || '') : 'aucun dossier ouvert'}</Pill>}>
          <ReferentielPlans />
        </Card>
      )}

      {tab === 'dossiers' && (
        <Card title={bin ? 'Corbeille' : 'Tous les dossiers'} right={
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 8, background: 'oklch(0.95 0.012 85)' }}>
            {[[false, `Actifs (${actifs.length})`], [true, `Corbeille (${corbeille.length})`]].map(([k, l]) => (
              <button key={String(k)} onClick={() => setBin(k)} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: bin === k ? 'white' : 'transparent', color: bin === k ? 'var(--b0)' : C.muted, boxShadow: bin === k ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>{l}</button>
            ))}
          </div>
        }>
          <div style={SUB}>{bin ? 'Les dossiers de la corbeille sont invisibles pour les intervenants. La suppression définitive efface tout le contenu et ne peut pas être annulée.' : 'La duplication crée une copie sans certification, validation ni invités. La mise à la corbeille est réversible.'}</div>
          {(bin ? corbeille : actifs).length === 0 ? <div style={{ fontSize: 14, color: C.muted }}>{bin ? 'La corbeille est vide.' : 'Aucun dossier.'}</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Dossier</th><th style={TH}>Statut</th><th style={TH}>Créateur</th><th style={{ ...TH, textAlign: 'right' }}>Lots</th>
                  <th style={TH}>{bin ? 'Mis en corbeille' : 'Modifié'}</th><th style={{ ...TH, textAlign: 'right' }}>Actions</th>
                </tr></thead>
                <tbody>
                  {(bin ? corbeille : actifs).map(([id, d]) => {
                    const r = resumeDossier(state, id, d);
                    return (
                      <tr key={id}>
                        <td style={TD}><div style={{ fontWeight: 700, color: 'var(--b0)' }}>{(d.info || {}).nom || 'Sans nom'}</div><div style={{ ...SUB, ...NUM }}>{(d.info || {}).ref}</div></td>
                        <td style={TD}><Pill tone={r.statut[1]}>{r.statut[0]}</Pill></td>
                        <td style={{ ...TD, color: C.muted }}>{r.m.createdBy || '—'}</td>
                        <td style={{ ...TD, ...NUM, textAlign: 'right', fontWeight: 700 }}>{r.c.rows.length}</td>
                        <td style={{ ...TD, ...NUM, color: C.muted }}>{fmtDate(bin ? r.m.supprimeLe : r.last)}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            {bin ? <>
                              <Btn variant="ghost" onClick={() => trashDossier(id, false)}>Restaurer</Btn>
                              <Btn variant="danger" onClick={() => { setConfirm(id); setTyped(''); }}>Supprimer définitivement</Btn>
                            </> : <>
                              <Btn variant="ghost" onClick={() => openDossier(id)}>Ouvrir</Btn>
                              <Btn variant="ghost" onClick={() => duplicateDossier(id)}>Dupliquer</Btn>
                              <Btn variant="danger" onClick={() => trashDossier(id, true)}>Corbeille</Btn>
                            </>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {confirm && (() => {
        const ref = ((state.dossiers[confirm] || {}).info || {}).ref || '';
        return (
          <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,61,.45)', display: 'grid', placeItems: 'center', zIndex: 40, padding: 16 }}>
            <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, padding: 24, width: 'min(440px, 100%)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'oklch(0.45 0.15 25)' }}>Suppression définitive</div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>Le dossier <b>{ref}</b> et tout son contenu (lots, plans, règlement, historique, certifications) seront effacés. <b>Cette action est irréversible.</b></div>
              <Field label={'Pour confirmer, saisissez la référence : ' + ref} value={typed} onChange={e => setTyped(e.target.value)} mono />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Btn variant="ghost" onClick={() => setConfirm(null)}>Annuler</Btn>
                <Btn disabled={typed.trim() !== ref} onClick={() => { deleteDossier(confirm); setConfirm(null); }} style={{ background: 'oklch(0.5 0.15 25)' }}>Supprimer</Btn>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
