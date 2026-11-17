import React, { useState, useRef } from 'react';
import { readEddExcel, lotsFromImport } from '@/lib/importEdd';
import { useCopro } from '@/lib/coprocivStore';
import { compute, BATL, levelsLabel, TYPES, fm, natureOf, pcLoc, compareAvant, snapshotAvant, controlesEDD } from '@/lib/engine';
import { modificatifHtml, openDoc } from '@/lib/docs';
import { exportEddDocx } from '@/lib/exports';
import { Card, Btn, Pill, Mono, Field } from '@/components/coprociv/ui';

export default function EDD() {
  const { state, setEddTab, setScreen, showToast, setAvant, replaceLots } = useCopro();
  const fileRef = useRef(null);
  const [imp, setImp] = useState(null);
  const [creer, setCreer] = useState(false);
  const cmp = compareAvant(state);
  const onImport = async (file) => {
    if (!file) return;
    try { const r = await readEddExcel(file); setImp({ ...r, fileName: file.name }); setCreer(!state.lots.length || state.lots.every(l => l.prov)); }
    catch (e) { showToast(e.message || 'Fichier illisible'); }
  };
  const applyImport = () => {
    if (!imp) return;
    setAvant({ le: Date.now(), source: 'Import Excel « ' + imp.fileName + ' »', base: imp.base, lots: imp.lots.map(x => ({ id: x.id, des: x.des, bat: x.bat, etage: x.etage, tg: x.tg })) });
    if (creer) replaceLots(lotsFromImport(imp, state.bats));
    showToast(`État d’origine importé : ${imp.lots.length} lots` + (creer ? ' — lots du dossier créés (surfaces à compléter)' : ''));
    setImp(null);
  };
  const STAT_COL = { 'Inchangé': 'oklch(0.5 0.02 var(--h))', 'Modifié': 'oklch(0.5 0.14 60)', 'Créé': 'oklch(0.45 0.12 155)', 'Supprimé': 'oklch(0.5 0.17 25)', 'Divisé / réuni': 'oklch(0.45 0.12 245)' };
  const [showSame, setShowSame] = useState(false);
  const role = state.role;
  const c = compute(state);
  const tab = state.eddTab === 'modif' ? 'modif' : 'edd';
  const journal = (state.journals || {})[state.did] || [];
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const run = async (k, fn) => {
    setBusy(k);
    try { await fn(state); } catch (e) { console.error(e); showToast('Export impossible : ' + (e && e.message ? e.message : 'erreur inconnue')); }
    setBusy('');
  };
  const ownerName = id => ((state.owners || []).find(o => o.id === id) || {}).nom || '—';

  // Même liste de contrôles que la Vue d'ensemble et l'en-tête, quel que soit le mode de saisie.
  const checks = controlesEDD(state, c).map(x => [x.ok, x.t]);
  const ready = checks.every(x => x[0]);
  const exp = html => { if (!openDoc(html)) showToast('Autorisez les fenêtres pop-up pour exporter le document'); };
  const shownJ = journal.filter(e => !q || (e.txt + ' ' + e.who).toLowerCase().includes(q.toLowerCase()));
  const fmtT = t => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const tabBtn = (k, l) => (
    <button onClick={() => setEddTab(k)} style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: tab === k ? 'var(--b0)' : 'transparent', color: tab === k ? 'white' : 'oklch(0.45 0.03 var(--h))' }}>{l}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'oklch(0.95 0.012 85)', alignSelf: 'flex-start' }}>
        {tabBtn('edd', 'État descriptif')}{tabBtn('modif', `Modificatif (${journal.length})`)}
      </div>

      {tab === 'edd' ? <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 12, background: 'white', border: '1px solid oklch(0.91 0.012 85)' }}>
          <Pill tone={state.validated ? 'ok' : state.certified ? 'navy' : ready ? 'neutral' : 'warn'}>{state.validated ? 'Validé par le notaire' : state.certified ? 'Certifié, en attente du notaire' : ready ? 'Prêt à certifier' : checks.filter(x => !x[0]).length + ' point(s) à corriger'}</Pill>
          <span style={{ flex: 1, fontSize: 14, color: 'oklch(0.48 0.020 var(--h))' }}>{state.validated ? 'Document définitif.' : 'Document en projet : il porte la mention « PROJET » jusqu’à la validation du notaire.'}</span>
          <Btn variant="ghost" onClick={() => setScreen('controle')}>{role === 'notaire' ? 'Contrôle & validation' : 'Contrôle & certification'}</Btn>
          <Btn onClick={() => run('eddw', exportEddDocx)} disabled={!!busy}>{busy === 'eddw' ? 'Préparation…' : 'Télécharger · Word'}</Btn>
        </div>

        <Card title="État descriptif de division" right={<Pill tone="navy">{c.sumTg} / {state.baseGen}</Pill>}>
          <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
              <thead><tr style={{ background: 'oklch(0.97 0.014 85)' }}>
                {['Lot', 'Bâtiment', 'Niveau', 'Nature', 'Désignation', 'Surface', 'Quote-part', 'Propriétaire'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'oklch(0.5 0.020 var(--h))' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {c.rows.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid oklch(0.94 0.012 85)' }}>
                    <td style={{ padding: '5px 8px' }}><Mono style={{ fontWeight: 700 }}>{r.id}</Mono></td>
                    <td style={{ padding: '5px 8px' }}>{BATL(r.bat)}</td>
                    <td style={{ padding: '5px 8px' }}>{levelsLabel(r)}{r.multi && <span style={{ fontSize: 12, marginLeft: 6, color: 'oklch(0.5 0.02 var(--h))' }}>(duplex/multi-niveaux)</span>}</td>
                    <td style={{ padding: '5px 8px' }}>{(TYPES[r.type] || {}).l}</td>
                    <td style={{ padding: '5px 8px' }}>{r.des}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono>{fm(r.surfTot)} m²</Mono></td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono style={{ fontWeight: 700, color: 'var(--b0)' }}>{r.tg} / {state.baseGen}</Mono></td>
                    <td style={{ padding: '5px 8px' }}>{ownerName(r.owner)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Parties communes" right={<Pill tone="neutral">{(state.communs || []).length}</Pill>}>
          {[['pcg', 'Générales (P.C.G.) — à tous les copropriétaires'], ['pcs', 'Spéciales (P.C.S.) — aux lots de leur grille']].map(([nat, title]) => {
            const list = (state.communs || []).filter(x => natureOf(x) === nat);
            return (
              <div key={nat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--b0)' }}>{title} · {fm(list.reduce((a, x) => a + (+x.surface || 0), 0))} m²</div>
                {list.length === 0 ? <div style={{ fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Néant.</div> : (
                  <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                      <tbody>{list.map(x => (
                        <tr key={x.id} style={{ borderTop: '1px solid oklch(0.94 0.012 85)' }}>
                          <td style={{ padding: '5px 8px', fontWeight: 600 }}>{x.nom || '—'}</td>
                          <td style={{ padding: '5px 8px' }}>{BATL(x.bat)}</td>
                          <td style={{ padding: '5px 8px' }}>{pcLoc(x)}</td>
                          {nat === 'pcs' && <td style={{ padding: '5px 8px' }}>{(state.grids.find(g => g.id === x.cle) || {}).name || <span style={{ color: 'oklch(0.5 0.14 60)' }}>grille à préciser</span>}</td>}
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono>{x.surface !== '' && x.surface != null ? fm(x.surface) + ' m²' : '—'}</Mono></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </> : (
        <>
        <Card title="Tableau avant / après" right={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {role === 'geometre' && <Btn variant="ghost" onClick={() => { setAvant(snapshotAvant(state)); showToast('État actuel figé comme état d’origine'); }}>Figer l’état actuel</Btn>}
          {role === 'geometre' && <Btn variant="ghost" onClick={() => fileRef.current && fileRef.current.click()}>Importer un EDD (Excel)</Btn>}
          <Btn variant="ghost" onClick={() => exp(modificatifHtml(state, journal))}>Modificatif · PDF</Btn>
        </div>}>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => { onImport(e.target.files[0]); e.target.value = ''; }} />
          {imp && (
            <div style={{ padding: 12, borderRadius: 10, background: 'oklch(0.96 0.03 245)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <div><b>{imp.fileName}</b> · feuille « {imp.sheet} » : {imp.lots.length} lots reconnus, base {imp.base} (colonnes : {imp.cols.join(', ')}).</div>
              <div style={{ fontSize: 12, color: 'oklch(0.45 0.03 var(--h))' }}>Aperçu : {imp.lots.slice(0, 5).map(l => `lot ${l.id} — ${l.des || '…'} — ${l.tg}/${imp.base}`).join(' ; ')}{imp.lots.length > 5 ? ' ; …' : ''}</div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={creer} onChange={e => setCreer(e.target.checked)} />Créer aussi les lots du dossier à partir de ce fichier (remplace les {state.lots.length} lots actuels)</label>
              <div style={{ display: 'flex', gap: 8 }}><Btn onClick={applyImport}>Utiliser comme état d’origine</Btn><Btn variant="ghost" onClick={() => setImp(null)}>Annuler</Btn></div>
            </div>
          )}
          {!cmp ? (
            <div style={{ fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun état d’origine. Pour un modificatif, figez l’EDD en vigueur avant de modifier les lots, ou importez l’EDD existant (Excel : numéro, désignation, bâtiment, étage, millièmes — le format de la fiche d’immeuble convient).</div>
          ) : <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 14 }}>
              <span>Origine : {state.avant.source}{state.avant.le ? ' · ' + new Date(state.avant.le).toLocaleDateString('fr-FR') : ''} · {state.avant.lots.length} lots · base {state.avant.base}</span>
              <Pill tone="neutral">{cmp.stats.inchange} inchangé(s)</Pill><Pill tone="warn">{cmp.stats.modifie} modifié(s)</Pill><Pill tone="ok">{cmp.stats.cree} créé(s)</Pill><Pill tone="warn">{cmp.stats.supprime} supprimé(s)/divisé(s)</Pill>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}><input type="checkbox" checked={showSame} onChange={e => setShowSame(e.target.checked)} />afficher les lots inchangés</label>
              {role === 'geometre' && <Btn variant="danger" onClick={() => setAvant(null)}>Effacer l’état d’origine</Btn>}
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead><tr style={{ background: 'oklch(0.97 0.014 85)' }}>
                  {['Statut', 'Lot avant', 'Désignation avant', 'QP avant', 'Lot après', 'Désignation après', 'QP après', 'Observation'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'oklch(0.5 0.020 var(--h))' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {cmp.rows.filter(x => showSame || x.statut !== 'Inchangé').map((x, i) => (
                    <tr key={i} style={{ borderTop: '1px solid oklch(0.94 0.012 85)' }}>
                      <td style={{ padding: '5px 8px', fontWeight: 700, color: STAT_COL[x.statut] }}>{x.statut}</td>
                      <td style={{ padding: '5px 8px' }}><Mono>{x.avant ? x.avant.id : '—'}</Mono></td>
                      <td style={{ padding: '5px 8px' }}>{x.avant ? x.avant.des : ''}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono>{x.avant ? x.avant.qp : ''}</Mono></td>
                      <td style={{ padding: '5px 8px' }}><Mono>{x.apres ? x.apres.id : '—'}</Mono></td>
                      <td style={{ padding: '5px 8px' }}>{x.apres ? x.apres.des : ''}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}><Mono style={{ fontWeight: 700 }}>{x.apres ? x.apres.qp : ''}</Mono></td>
                      <td style={{ padding: '5px 8px', fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>{x.note}</td>
                    </tr>
                  ))}
                  {!showSame && cmp.rows.every(x => x.statut === 'Inchangé') && <tr><td colSpan={8} style={{ padding: 12, fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun changement par rapport à l’état d’origine.</td></tr>}
                </tbody>
              </table>
            </div>
          </>}
        </Card>
        <Card title="Historique détaillé des modifications">
          <Field value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer (lot, auteur, champ…)" />
          {shownJ.length === 0 ? <div style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>Aucune modification.</div> : (
            <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead><tr style={{ background: 'oklch(0.97 0.014 85)' }}>
                  {['Date', 'Auteur', 'Modification', 'Avant', 'Après'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'oklch(0.5 0.020 var(--h))' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {shownJ.map((e, i) => (
                    <tr key={i} style={{ borderTop: '1px solid oklch(0.94 0.012 85)' }}>
                      <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}><Mono style={{ fontSize: 12 }}>{fmtT(e.t)}</Mono></td>
                      <td style={{ padding: '5px 8px' }}>{e.who}</td>
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--b0)' }}>{e.txt}</td>
                      <td style={{ padding: '5px 8px', color: 'oklch(0.5 0.02 var(--h))' }}>{e.before}</td>
                      <td style={{ padding: '5px 8px' }}>{e.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        </>
      )}
    </div>
  );
}
