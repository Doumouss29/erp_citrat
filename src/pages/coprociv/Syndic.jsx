import { FormSelect } from "@/components/ui/form-select";
import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, fcfa, n0, OK, WARN } from '@/lib/engine';
import { withDefaults, cotisations, comptes, ownerAJour, controles, quorumAG, resultat, poids, CATS, POSTES_TYPES, ODJ, odjLabel, today, addDays, fmtDate, periodeLabel, uid } from '@/lib/syndic';
import { convocationHtml, pvHtml, appelHtml, quittanceHtml, relanceHtml, comptesHtml, extraitBailHtml } from '@/lib/syndicDocs';
import { reglementHtml, openDoc } from '@/lib/docs';
import { Card, Field, SelectField, Btn, Pill, Mono, Stat } from '@/components/coprociv/ui';

const INP = { height: 32, padding: '0 6px', borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 12, background: 'white' };
const TH = { padding: '6px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'oklch(0.5 0.020 var(--h))', background: 'oklch(0.97 0.014 85)' };
const TD = { padding: '5px 8px', borderTop: '1px solid oklch(0.94 0.012 85)', fontSize: 14, verticalAlign: 'middle' };
const Table = ({ head, children }) => (
  <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
    <table style={{ borderCollapse: 'collapse', width: '100%' }}><thead><tr>{head.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>
  </div>
);
const Note = ({ children }) => <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>{children}</div>;
const TABS = [['bord', 'Tableau de bord'], ['organes', 'Organes'], ['budget', 'Budget & cotisations'], ['encaiss', 'Appels & encaissements'], ['depenses', 'Dépenses'], ['ag', 'Assemblées générales'], ['suivi', 'Litiges & diagnostics']];
const DIAGS = ['Amiante (art. 499-503)', 'Cendres (art. 504-506)', 'Plomb / saturnisme (art. 507-509)', 'Termites (art. 510-512)', 'Installation gaz > 15 ans (art. 517)', 'Installation électrique > 15 ans (art. 518)', 'Certificat de salubrité (art. 498)', 'Autre'];

export default function Syndic() {
  const { state, setSyndic, showToast } = useCopro();
  const role = state.role;
  const canEdit = role === 'syndic';
  const sy = withDefaults((state.meta || {}).syndic);
  const upd = fn => setSyndic(cur => fn(withDefaults(cur)));
  const c = compute(state);
  const [tab, setTab] = useState('bord');
  const exp = html => { if (!openDoc(html)) showToast('Autorisez les fenêtres pop-up pour exporter le document'); };
  const owners = (state.owners || []).filter(o => c.rows.some(r => r.owner === o.id));
  const ownerName = id => ((state.owners || []).find(o => o.id === id) || {}).nom || '—';
  const cpt = comptes(state, sy);
  const P = { state, sy, upd, c, canEdit, exp, owners, ownerName, cpt, showToast };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!canEdit && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'oklch(0.95 0.03 245)', fontSize: 14 }}>Consultation : seule la personne ayant le profil <b>Syndic</b> modifie la gestion du syndicat (art. 394-395).</div>}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'oklch(0.95 0.012 85)', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: tab === k ? 'var(--b0)' : 'transparent', color: tab === k ? 'white' : 'oklch(0.45 0.03 var(--h))' }}>{l}</button>)}
      </div>
      {tab === 'bord' && <Bord {...P} go={setTab} />}
      {tab === 'organes' && <Organes {...P} />}
      {tab === 'budget' && <Budget {...P} />}
      {tab === 'encaiss' && <Encaissements {...P} />}
      {tab === 'depenses' && <Depenses {...P} />}
      {tab === 'ag' && <Assemblees {...P} />}
      {tab === 'suivi' && <Suivi {...P} />}
    </div>
  );
}

// ---------- Tableau de bord ----------
function Bord({ state, sy, c, cpt, go }) {
  const ctl = controles(state, sy);
  const an = String(new Date().getFullYear());
  const cot = cotisations(state, sy, an, c);
  const retard = Object.entries(cpt).filter(([, k]) => k.enRetard);
  const impayes = retard.reduce((a, [, k]) => a + k.solde, 0);
  const prochaine = (sy.ags || []).filter(a => a.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const litOuverts = (sy.litiges || []).filter(l => l.statut !== 'clos').length;
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
      <Stat label={`Budget ${an}`} value={fcfa(cot.annuel)} sub={fcfa(cot.totalMensuel) + ' / mois'} />
      <Stat label="Impayés échus" value={fcfa(impayes)} sub={retard.length + ' lot(s) en retard'} tone={impayes ? WARN : 'var(--b0)'} />
      <Stat label="Plafond 30 % (art. 397)" value={Math.round(cot.taux * 1000) / 10 + ' %'} tone={cot.plafondOk ? 'var(--b0)' : WARN} sub="syndic + commissions + appuis" />
      <Stat label="Prochaine AG" value={prochaine ? fmtDate(prochaine.date) : '—'} sub={prochaine ? (prochaine.odj || []).length + ' résolution(s)' : 'aucune programmée'} />
      <Stat label="Litiges ouverts" value={litOuverts} />
    </div>
    <Card title="Conformité au Livre II" right={<Pill tone={ctl.every(x => x.ok) ? 'ok' : 'warn'}>{ctl.filter(x => x.ok).length}/{ctl.length}</Pill>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 8 }}>
        {ctl.map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.ok ? OK : WARN, flexShrink: 0 }} />
            <span style={{ flex: 1, color: x.ok ? 'inherit' : 'oklch(0.45 0.13 55)' }}>{x.t}</span>
            <span style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>{x.ref}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={() => go('organes')}>Organes</Btn>
        <Btn variant="ghost" onClick={() => go('budget')}>Budget</Btn>
        <Btn variant="ghost" onClick={() => go('encaiss')}>Encaissements</Btn>
      </div>
    </Card>
  </>;
}

// ---------- Organes ----------
function Organes({ state, sy, upd, canEdit, owners, cpt, exp }) {
  const set = (k, patch) => upd(x => ({ ...x, [k]: { ...x[k], ...patch } }));
  const F = (grp, k, label, ph, type) => canEdit
    ? <Field label={label} type={type} value={sy[grp][k] || ''} placeholder={ph} onChange={e => set(grp, { [k]: e.target.value })} />
    : <div style={{ fontSize: 14 }}><div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>{label}</div>{(type === 'date' ? fmtDate(sy[grp][k]) : sy[grp][k]) || '—'}</div>;
  const cs = sy.conseil;
  const toggle = id => set('conseil', { membres: cs.membres.includes(id) ? cs.membres.filter(x => x !== id) : [...cs.membres, id] });
  const occupants = Object.entries(sy.occupants || {}).filter(([, o]) => o.nom);
  const remise = (k, v) => upd(x => ({ ...x, remises: { ...x.remises, [k]: v } }));
  return <>
    <div className="cp-2col cp-master" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <Card title="Syndicat des copropriétaires" right={<Pill tone="neutral">art. 380, 406</Pill>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {F('syndicat', 'dateConstitution', 'Date de constitution', '', 'date')}
          {F('syndicat', 'intitule', 'Intitulé du compte', 'Syndicat des copropriétaires …')}
          {F('syndicat', 'banque', 'Banque', 'SGCI, BICICI, NSIA…')}
          {F('syndicat', 'compte', 'N° de compte / RIB (compte séparé)', 'CI… ')}
        </div>
        <Note>Le syndic ou le conseil syndical ouvre un compte bancaire séparé au nom du syndicat (art. 406). Les cotisations ne peuvent servir qu’aux besoins de la copropriété (art. 405).</Note>
      </Card>
      <Card title="Syndic" right={<Pill tone="neutral">art. 394-401</Pill>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {F('syndic', 'nom', 'Syndic (personne physique ou morale)', 'Cabinet …')}
          {F('syndic', 'agrement', 'N° d’agrément (ministère du Logement)', '')}
          {F('syndic', 'arrete', 'Arrêté entérinant la désignation', 'Arrêté n° … du …')}
          {F('syndic', 'dateDesignation', 'Date de désignation par l’AG', '', 'date')}
          {F('syndic', 'cabinetRecouvrement', 'Cabinet de recouvrement (art. 404)', 'facultatif')}
        </div>
        <Note>Le syndic est désigné par l’AG sur la liste des syndics agréés ; sa désignation est entérinée par arrêté du ministre chargé du Logement (art. 396).</Note>
      </Card>
    </div>
    <Card title={`Conseil syndical (${cs.membres.length} membre${cs.membres.length > 1 ? 's' : ''})`} right={<Pill tone={cs.membres.length >= 3 ? 'ok' : 'warn'}>minimum 3 · art. 392</Pill>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
        {owners.map(o => {
          const ok = ownerAJour(state, cpt, o.id), on = cs.membres.includes(o.id);
          return <label key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, padding: '6px 8px', borderRadius: 8, border: '1px solid ' + (on ? 'var(--b0)' : 'oklch(0.92 0.012 85)'), background: on ? 'oklch(0.97 0.014 85)' : 'white' }}>
            <input type="checkbox" disabled={!canEdit} checked={on} onChange={() => toggle(o.id)} />
            <span style={{ flex: 1 }}>{o.nom}</span>
            <Pill tone={ok ? 'ok' : 'warn'}>{ok ? 'à jour' : 'impayé'}</Pill>
          </label>;
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {F('conseil', 'dateDesignation', 'Date de désignation', '', 'date')}
        {F('conseil', 'duree', 'Durée du mandat fixée par l’AG', '2 ans')}
        {F('conseil', 'pvMinistere', 'PV transmis au ministère du Logement le', '', 'date')}
        {F('conseil', 'pvMairie', 'PV transmis à la mairie le', '', 'date')}
      </div>
      <Note>Seuls des copropriétaires à jour de leurs cotisations peuvent être membres. Le conseil convoque l’AG (art. 388), assiste et contrôle le syndic, fait office de commissaire aux comptes et le supplée en cas de carence (art. 393).</Note>
    </Card>
    <Card title="Remise du règlement de copropriété" right={<Btn variant="gold" onClick={() => exp(reglementHtml(state))}>Imprimer le règlement</Btn>}>
      <Note>Le syndic remet copie du règlement à tous les copropriétaires et à tous les locataires (art. 395).</Note>
      <Table head={['Destinataire', 'Qualité', 'Remis le']}>
        {[...owners.map(o => ['o:' + o.id, o.nom, 'Copropriétaire']), ...occupants.map(([lot, o]) => ['l:' + lot, o.nom, 'Occupant du lot ' + lot])].map(([k, nom, q]) => (
          <tr key={k}><td style={TD}>{nom}</td><td style={TD}>{q}</td><td style={TD}>{canEdit ? <input type="date" value={sy.remises[k] || ''} onChange={e => remise(k, e.target.value)} style={INP} /> : fmtDate(sy.remises[k])}</td></tr>
        ))}
      </Table>
    </Card>
  </>;
}

// ---------- Budget & cotisations ----------
function Budget({ state, sy, upd, c, canEdit, ownerName }) {
  const years = [...new Set([String(new Date().getFullYear()), ...Object.keys(sy.exercices || {})])].sort();
  const [an, setAn] = useState(String(new Date().getFullYear()));
  const ex = (sy.exercices || {})[an] || { postes: [] };
  const setPostes = postes => upd(x => ({ ...x, exercices: { ...x.exercices, [an]: { ...((x.exercices || {})[an] || {}), postes } } }));
  const addP = (lib = 'Nouveau poste', cat = 'entretien') => setPostes([...(ex.postes || []), { id: uid('po'), lib, cat, cle: 'gen', montant: 0 }]);
  const setP = (id, patch) => setPostes(ex.postes.map(p => p.id === id ? { ...p, ...patch } : p));
  const prev = String(+an - 1);
  const cot = cotisations(state, sy, an, c);
  const cles = [['gen', 'Tantièmes généraux'], ...(state.grids || []).map(g => [g.id, 'Grille ' + g.name])];
  const occ = sy.occupants || {};
  const setOcc = (lot, patch) => upd(x => ({ ...x, occupants: { ...x.occupants, [lot]: { ...((x.occupants || {})[lot] || {}), ...patch } } }));
  return <>
    <Card title={`Budget de l’exercice ${an}`} right={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <FormSelect value={an} onChange={e => setAn(e.target.value)} style={{ ...INP, height: 32 }}>{[...years, String(+years[years.length - 1] + 1)].map(y => <option key={y} value={y}>{y}</option>)}</FormSelect>
      {canEdit && (sy.exercices || {})[prev] && !(ex.postes || []).length && <Btn variant="ghost" onClick={() => setPostes(sy.exercices[prev].postes.map(p => ({ ...p, id: uid('po') })))}>Reprendre {prev}</Btn>}
    </div>}>
      <Table head={['Poste', 'Catégorie', 'Clé de répartition', 'Montant annuel (FCFA)', 'Mensuel', canEdit ? '' : null].filter(x => x !== null)}>
        {(ex.postes || []).map(p => (
          <tr key={p.id}>
            <td style={TD}>{canEdit ? <input value={p.lib} onChange={e => setP(p.id, { lib: e.target.value })} style={{ ...INP, width: '100%' }} /> : p.lib}</td>
            <td style={TD}>{canEdit ? <FormSelect value={p.cat} onChange={e => setP(p.id, { cat: e.target.value })} style={INP}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect> : (CATS.find(k => k[0] === p.cat) || [])[1]}</td>
            <td style={TD}>{canEdit ? <FormSelect value={p.cle || 'gen'} onChange={e => setP(p.id, { cle: e.target.value })} style={INP}>{cles.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect> : (cles.find(k => k[0] === (p.cle || 'gen')) || [])[1]}</td>
            <td style={TD}>{canEdit ? <input type="number" min="0" step="1000" value={p.montant || ''} onChange={e => setP(p.id, { montant: e.target.value })} style={{ ...INP, width: 120, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} /> : <Mono>{fcfa(p.montant)}</Mono>}</td>
            <td style={TD}><Mono>{fcfa(Math.round(n0(p.montant) / 12))}</Mono></td>
            {canEdit && <td style={TD}><button onClick={() => setPostes(ex.postes.filter(x => x.id !== p.id))} style={{ ...INP, cursor: 'pointer', color: 'oklch(0.45 0.13 25)' }}>×</button></td>}
          </tr>
        ))}
        {!(ex.postes || []).length && <tr><td colSpan={6} style={{ ...TD, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun poste. Le budget est établi par le syndic (art. 395) et les cotisations fixées par l’AG (art. 387, 402).</td></tr>}
      </Table>
      {canEdit && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn onClick={() => addP()}>+ Poste</Btn>
        <span style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>Missions du syndicat (art. 382) :</span>
        {POSTES_TYPES.filter(([l]) => !(ex.postes || []).some(p => p.lib === l)).map(([l, k]) => <Btn key={l} variant="ghost" onClick={() => addP(l, k)} style={{ height: 28, padding: '0 9px', fontSize: 12 }}>{l}</Btn>)}
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Stat label="Budget annuel" value={fcfa(cot.annuel)} />
        <Stat label="Cotisations mensuelles" value={fcfa(cot.totalMensuel)} />
        <Stat label="Syndic + commissions + appuis" value={Math.round(cot.taux * 1000) / 10 + ' %'} sub={cot.plafondOk ? 'dans le plafond de 30 % (art. 397)' : 'au-delà du plafond légal de 30 % (art. 397)'} tone={cot.plafondOk ? 'var(--b0)' : WARN} />
      </div>
    </Card>
    <Card title={`Cotisation mensuelle par lot — ${an}`}>
      <Note>Chaque poste est réparti au plus fort reste selon sa clé ; la cotisation peut être prélevée sur l’occupant, à charge pour lui de la compenser sur le loyer si son bail ne l’y oblige pas (art. 403).</Note>
      <Table head={['Lot', 'Désignation', 'Propriétaire', 'Occupant', 'Payeur', 'Cotisation mensuelle']}>
        {c.rows.map(r => {
          const o = occ[r.id] || {};
          return <tr key={r.id}>
            <td style={TD}><Mono style={{ fontWeight: 700 }}>{r.id}</Mono></td>
            <td style={TD}>{r.des}</td>
            <td style={TD}>{ownerName(r.owner)}</td>
            <td style={TD}>{canEdit ? <input value={o.nom || ''} placeholder="—" onChange={e => setOcc(r.id, { nom: e.target.value })} style={{ ...INP, width: 150 }} /> : (o.nom || '—')}</td>
            <td style={TD}>{canEdit ? <FormSelect value={o.payeur || 'proprietaire'} onChange={e => setOcc(r.id, { payeur: e.target.value })} style={INP}><option value="proprietaire">Propriétaire</option><option value="occupant">Occupant</option></FormSelect> : (o.payeur === 'occupant' ? 'Occupant' : 'Propriétaire')}</td>
            <td style={{ ...TD, textAlign: 'right' }}><Mono style={{ fontWeight: 700 }}>{fcfa((cot.parLot[r.id] || {}).total)}</Mono></td>
          </tr>;
        })}
      </Table>
    </Card>
  </>;
}

// ---------- Appels & encaissements ----------
function Encaissements({ state, sy, upd, c, canEdit, ownerName, cpt, exp, showToast }) {
  const now = new Date();
  const [periode, setPeriode] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [jour, setJour] = useState('10');
  const [pay, setPay] = useState(null);
  const an = periode.slice(0, 4);
  const cot = cotisations(state, sy, an, c);
  const existants = (sy.appels || []).filter(a => a.periode === periode);
  const generer = () => {
    if (!cot.totalMensuel) { showToast('Établissez d’abord le budget ' + an); return; }
    const ech = `${periode}-${String(Math.min(28, Math.max(1, parseInt(jour) || 10))).padStart(2, '0')}`;
    const nouveaux = c.rows.filter(r => (cot.parLot[r.id] || {}).total > 0 && !existants.some(a => a.lotId === r.id)).map(r => ({ id: uid('ap'), periode, lotId: r.id, montant: cot.parLot[r.id].total, echeance: ech, payeur: ((sy.occupants || {})[r.id] || {}).payeur || 'proprietaire' }));
    upd(x => ({ ...x, appels: [...x.appels, ...nouveaux] }));
    showToast(`${nouveaux.length} appel(s) de cotisation générés pour ${periodeLabel(periode)}`);
  };
  const enregistrer = () => {
    if (!pay || !(n0(pay.montant) > 0)) return;
    const p = { id: uid('pa'), ...pay, montant: n0(pay.montant) };
    upd(x => ({ ...x, paiements: [...x.paiements, p] }));
    setPay(null);
  };
  const relancer = (lotId, type) => {
    upd(x => ({ ...x, relances: [...x.relances, { id: uid('re'), lotId, type, date: today(), montant: (cpt[lotId] || {}).solde }] }));
    exp(relanceHtml(state, sy, lotId, type));
  };
  const derniereRelance = lotId => (sy.relances || []).filter(r => r.lotId === lotId).sort((a, b) => b.date.localeCompare(a.date))[0];
  const totalDu = Object.values(cpt).reduce((a, k) => a + k.du, 0), totalPaye = Object.values(cpt).reduce((a, k) => a + k.paye, 0);
  return <>
    <Card title="Appels de cotisation" right={<Pill tone={existants.length ? 'ok' : 'neutral'}>{existants.length} appel(s) pour {periodeLabel(periode)}</Pill>}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <Field label="Mois" type="month" value={periode} onChange={e => setPeriode(e.target.value)} />
        <Field label="Échéance (jour du mois)" type="number" value={jour} onChange={e => setJour(e.target.value)} style={{ width: 150 }} />
        {canEdit && <Btn onClick={generer}>Générer les appels de {periodeLabel(periode)}</Btn>}
        <Btn variant="gold" onClick={() => exp(appelHtml(state, sy, periode))} disabled={!existants.length}>Imprimer les appels</Btn>
      </div>
      <Note>Montant total du mois : {fcfa(cot.totalMensuel)} (budget {an}). Les lots déjà appelés pour ce mois ne sont pas appelés deux fois.</Note>
    </Card>
    <Card title="Situation des lots" right={<div style={{ display: 'flex', gap: 8 }}><Pill tone="neutral">Échu : {fcfa(totalDu)}</Pill><Pill tone="ok">Encaissé : {fcfa(totalPaye)}</Pill></div>}>
      <Table head={['Lot', 'Propriétaire / payeur', 'Appelé échu', 'Payé', 'Solde', 'Statut', 'Actions']}>
        {c.rows.map(r => {
          const k = cpt[r.id] || {};
          const o = (sy.occupants || {})[r.id] || {};
          const rl = derniereRelance(r.id);
          return <tr key={r.id} style={{ background: k.enRetard ? 'oklch(0.985 0.02 55)' : 'white' }}>
            <td style={TD}><Mono style={{ fontWeight: 700 }}>{r.id}</Mono></td>
            <td style={TD}>{ownerName(r.owner)}{o.payeur === 'occupant' && o.nom ? <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>payé par {o.nom} (occupant)</div> : null}</td>
            <td style={{ ...TD, textAlign: 'right' }}><Mono>{fcfa(k.du)}</Mono></td>
            <td style={{ ...TD, textAlign: 'right' }}><Mono>{fcfa(k.paye)}</Mono></td>
            <td style={{ ...TD, textAlign: 'right' }}><Mono style={{ fontWeight: 700, color: k.solde > 0 ? 'oklch(0.5 0.16 30)' : 'inherit' }}>{fcfa(k.solde)}</Mono></td>
            <td style={TD}>{k.enRetard ? <Pill tone="warn">En retard</Pill> : k.du ? <Pill tone="ok">À jour</Pill> : <Pill tone="neutral">—</Pill>}{rl && <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>{rl.type === 'recouvrement' ? 'mise en demeure' : 'relancé'} le {fmtDate(rl.date)}</div>}</td>
            <td style={TD}><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {canEdit && <Btn variant="ghost" style={{ height: 26, padding: '0 8px', fontSize: 12 }} onClick={() => setPay({ lotId: r.id, date: today(), montant: k.solde > 0 ? k.solde : '', mode: 'Virement', ref: '', payeur: o.payeur === 'occupant' && o.nom ? o.nom : ownerName(r.owner) })}>+ Paiement</Btn>}
              {canEdit && k.enRetard && <Btn variant="ghost" style={{ height: 26, padding: '0 8px', fontSize: 12 }} onClick={() => relancer(r.id, 'relance')}>Relance</Btn>}
              {canEdit && k.enRetard && rl && <Btn variant="danger" style={{ height: 26, padding: '0 8px', fontSize: 12 }} onClick={() => relancer(r.id, 'recouvrement')}>Mise en demeure</Btn>}
            </div></td>
          </tr>;
        })}
      </Table>
      <Note>Relance puis, à défaut de paiement, action en recouvrement forcé par le syndic ou le cabinet désigné par l’AG (art. 404).</Note>
    </Card>
    {pay && (
      <Card title={`Encaissement — lot ${pay.lotId}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <Field label="Date" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
          <Field label="Montant (FCFA)" type="number" value={pay.montant} onChange={e => setPay({ ...pay, montant: e.target.value })} mono />
          <SelectField label="Mode" value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })} options={['Virement', 'Mobile money', 'Chèque', 'Espèces', 'Prélèvement'].map(x => [x, x])} />
          <Field label="Référence" value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} />
          <Field label="Payé par" value={pay.payeur} onChange={e => setPay({ ...pay, payeur: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}><Btn onClick={enregistrer} disabled={!(n0(pay.montant) > 0)}>Enregistrer</Btn><Btn variant="ghost" onClick={() => setPay(null)}>Annuler</Btn></div>
      </Card>
    )}
    <Card title={`Encaissements (${(sy.paiements || []).length})`}>
      <Table head={['Date', 'Lot', 'Payé par', 'Mode', 'Montant', '']}>
        {[...(sy.paiements || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100).map(p => (
          <tr key={p.id}><td style={TD}>{fmtDate(p.date)}</td><td style={TD}><Mono>{p.lotId}</Mono></td><td style={TD}>{p.payeur}</td><td style={TD}>{p.mode}{p.ref ? ' · ' + p.ref : ''}</td><td style={{ ...TD, textAlign: 'right' }}><Mono>{fcfa(p.montant)}</Mono></td>
            <td style={TD}><div style={{ display: 'flex', gap: 4 }}><Btn variant="ghost" style={{ height: 26, padding: '0 8px', fontSize: 12 }} onClick={() => exp(quittanceHtml(state, sy, p))}>Quittance</Btn>
              {canEdit && <button onClick={() => upd(x => ({ ...x, paiements: x.paiements.filter(y => y.id !== p.id) }))} style={{ ...INP, cursor: 'pointer', color: 'oklch(0.45 0.13 25)' }}>×</button>}</div></td></tr>
        ))}
        {!(sy.paiements || []).length && <tr><td colSpan={6} style={{ ...TD, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun encaissement.</td></tr>}
      </Table>
    </Card>
  </>;
}

// ---------- Dépenses ----------
function Depenses({ state, sy, upd, canEdit, exp }) {
  const [an, setAn] = useState(String(new Date().getFullYear()));
  const postes = ((sy.exercices || {})[an] || {}).postes || [];
  const [d, setD] = useState({ date: today(), poste: '', fournisseur: '', piece: '', montant: '' });
  const list = (sy.depenses || []).filter(x => String(x.date).startsWith(an)).sort((a, b) => b.date.localeCompare(a.date));
  const add = () => { if (!(n0(d.montant) > 0)) return; upd(x => ({ ...x, depenses: [...x.depenses, { id: uid('de'), ...d, montant: n0(d.montant) }] })); setD({ ...d, fournisseur: '', piece: '', montant: '' }); };
  const real = id => list.filter(x => x.poste === id).reduce((a, x) => a + n0(x.montant), 0);
  return <>
    <Card title={`Comptabilité ${an}`} right={<div style={{ display: 'flex', gap: 8 }}><input type="number" value={an} onChange={e => setAn(e.target.value)} style={{ ...INP, width: 80, height: 32 }} /><Btn variant="gold" onClick={() => exp(comptesHtml(state, sy, an))}>Comptes du syndicat (PDF)</Btn></div>}>
      <Table head={['Poste', 'Budget', 'Réalisé', 'Reste']}>
        {postes.map(p => <tr key={p.id}><td style={TD}>{p.lib}</td><td style={{ ...TD, textAlign: 'right' }}><Mono>{fcfa(p.montant)}</Mono></td><td style={{ ...TD, textAlign: 'right' }}><Mono>{fcfa(real(p.id))}</Mono></td><td style={{ ...TD, textAlign: 'right' }}><Mono style={{ color: real(p.id) > n0(p.montant) ? WARN : 'inherit' }}>{fcfa(n0(p.montant) - real(p.id))}</Mono></td></tr>)}
        {!postes.length && <tr><td colSpan={4} style={{ ...TD, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun budget pour {an}.</td></tr>}
      </Table>
      <Note>Le syndic tient la comptabilité sous le contrôle du conseil syndical (art. 395, 393) ; tout copropriétaire peut consulter les pièces comptables (art. 390).</Note>
    </Card>
    {canEdit && <Card title="Nouvelle dépense">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Field label="Date" type="date" value={d.date} onChange={e => setD({ ...d, date: e.target.value })} />
        <SelectField label="Poste" value={d.poste} onChange={e => setD({ ...d, poste: e.target.value })} options={[['', '— Choisir —'], ...postes.map(p => [p.id, p.lib])]} />
        <Field label="Fournisseur" value={d.fournisseur} onChange={e => setD({ ...d, fournisseur: e.target.value })} />
        <Field label="N° de pièce / facture" value={d.piece} onChange={e => setD({ ...d, piece: e.target.value })} />
        <Field label="Montant (FCFA)" type="number" value={d.montant} onChange={e => setD({ ...d, montant: e.target.value })} mono />
      </div>
      <div><Btn onClick={add} disabled={!(n0(d.montant) > 0) || !d.poste}>Enregistrer la dépense</Btn></div>
    </Card>}
    <Card title={`Dépenses ${an} (${list.length})`}>
      <Table head={['Date', 'Poste', 'Fournisseur', 'Pièce', 'Montant', '']}>
        {list.map(x => <tr key={x.id}><td style={TD}>{fmtDate(x.date)}</td><td style={TD}>{(postes.find(p => p.id === x.poste) || {}).lib || '—'}</td><td style={TD}>{x.fournisseur}</td><td style={TD}>{x.piece}</td><td style={{ ...TD, textAlign: 'right' }}><Mono>{fcfa(x.montant)}</Mono></td><td style={TD}>{canEdit && <button onClick={() => upd(y => ({ ...y, depenses: y.depenses.filter(z => z.id !== x.id) }))} style={{ ...INP, cursor: 'pointer', color: 'oklch(0.45 0.13 25)' }}>×</button>}</td></tr>)}
      </Table>
    </Card>
  </>;
}

// ---------- Assemblées générales ----------
function Assemblees({ state, sy, upd, c, canEdit, owners, exp }) {
  const [sel, setSel] = useState(((sy.ags || [])[0] || {}).id || null);
  const ag = (sy.ags || []).find(a => a.id === sel);
  const setAg = patch => upd(x => ({ ...x, ags: x.ags.map(a => a.id === sel ? { ...a, ...(typeof patch === 'function' ? patch(a) : patch) } : a) }));
  const nouvelle = () => { const id = uid('ag'); upd(x => ({ ...x, ags: [{ id, date: addDays(today(), 21), heure: '18:00', lieu: '', type: 'ordinaire', convocLe: today(), quorum: 50, president: '', presences: {}, mandataires: {}, odj: [] }, ...x.ags] })); setSel(id); };
  const cles = [['gen', 'Tous (tantièmes généraux)'], ...(state.grids || []).map(g => [g.id, 'Grille ' + g.name])];
  const [obj, setObj] = useState('budget');
  const addRes = () => { const o = ODJ.find(x => x[0] === obj); setAg(a => ({ odj: [...(a.odj || []), { id: uid('re'), objet: obj, titre: o[1], texte: '', cle: 'gen', regle: o[2], votes: {} }] })); };
  const setRes = (id, patch) => setAg(a => ({ odj: a.odj.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const vote = (rid, oid, v) => setAg(a => ({ odj: a.odj.map(r => r.id === rid ? { ...r, votes: { ...(r.votes || {}), [oid]: v } } : r) }));
  const q = ag ? quorumAG(state, c, ag) : null;
  return (
    <div className="cp-2col cp-master" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 2.6fr)', gap: 20, alignItems: 'start' }}>
      <Card title="Assemblées" right={canEdit && <Btn onClick={nouvelle}>+ AG</Btn>}>
        {(sy.ags || []).length === 0 && <Note>Aucune assemblée. L’AG se réunit sur convocation du conseil syndical (art. 388).</Note>}
        {(sy.ags || []).map(a => <button key={a.id} onClick={() => setSel(a.id)} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: '1.5px solid ' + (a.id === sel ? 'var(--b0)' : 'oklch(0.92 0.012 85)'), background: a.id === sel ? 'oklch(0.97 0.014 85)' : 'white' }}>
          <span style={{ fontWeight: 700, color: 'var(--b0)', fontSize: 14 }}>AG {a.type} · {fmtDate(a.date)}</span>
          <span style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>{(a.odj || []).length} résolution(s){a.date < today() ? ' · tenue' : ' · à venir'}</span>
        </button>)}
      </Card>
      {!ag ? <Card><Note>Sélectionnez ou créez une assemblée.</Note></Card> : <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title={`AG ${ag.type} du ${fmtDate(ag.date)}`} right={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn variant="gold" onClick={() => exp(convocationHtml(state, sy, ag))}>Convocations</Btn>
          <Btn variant="gold" onClick={() => exp(pvHtml(state, sy, ag))}>Procès-verbal</Btn>
          {canEdit && <Btn variant="danger" onClick={() => { upd(x => ({ ...x, ags: x.ags.filter(a => a.id !== ag.id) })); setSel(null); }}>Supprimer</Btn>}
        </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <Field label="Date" type="date" value={ag.date} disabled={!canEdit} onChange={e => setAg({ date: e.target.value })} />
            <Field label="Heure" type="time" value={ag.heure} disabled={!canEdit} onChange={e => setAg({ heure: e.target.value })} />
            <Field label="Lieu" value={ag.lieu} disabled={!canEdit} onChange={e => setAg({ lieu: e.target.value })} placeholder="Salle commune, bât. A" />
            <SelectField label="Type" value={ag.type} disabled={!canEdit} onChange={e => setAg({ type: e.target.value })} options={[['ordinaire', 'Ordinaire'], ['extraordinaire', 'Extraordinaire']]} />
            <Field label="Convoquée par le conseil le" type="date" value={ag.convocLe} disabled={!canEdit} onChange={e => setAg({ convocLe: e.target.value })} />
            <Field label="Quorum (% des voix)" type="number" value={ag.quorum} disabled={!canEdit} onChange={e => setAg({ quorum: e.target.value })} mono />
            <Field label="Président de séance" value={ag.president} disabled={!canEdit} onChange={e => setAg({ president: e.target.value })} />
          </div>
          <Note>Quorum et majorités : choix du règlement de copropriété (la loi ne les fixe pas, sauf la destitution du syndic : majorité des membres présents, art. 400). Les décisions prises hors des attributions du syndicat sont nulles (art. 389).</Note>
        </Card>
        <Card title="Feuille de présence" right={<Pill tone={q.atteint ? 'ok' : 'warn'}>{q.voix} / {q.total} voix · quorum {q.atteint ? 'atteint' : 'non atteint'}</Pill>}>
          <Table head={['Copropriétaire', 'Voix', 'Présence', 'Mandataire']}>
            {owners.map(o => <tr key={o.id}>
              <td style={TD}>{o.nom}</td><td style={{ ...TD, textAlign: 'right' }}><Mono>{poids(state, c, o.id, 'gen')}</Mono></td>
              <td style={TD}><FormSelect disabled={!canEdit} value={(ag.presences || {})[o.id] || 'absent'} onChange={e => setAg(a => ({ presences: { ...(a.presences || {}), [o.id]: e.target.value } }))} style={INP}><option value="absent">Absent</option><option value="present">Présent</option><option value="represente">Représenté</option></FormSelect></td>
              <td style={TD}>{(ag.presences || {})[o.id] === 'represente' && <input disabled={!canEdit} value={(ag.mandataires || {})[o.id] || ''} onChange={e => setAg(a => ({ mandataires: { ...(a.mandataires || {}), [o.id]: e.target.value } }))} placeholder="Nom du mandataire" style={INP} />}</td>
            </tr>)}
          </Table>
        </Card>
        <Card title={`Ordre du jour et votes (${(ag.odj || []).length})`}>
          {canEdit && <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
            <SelectField label="Objet (art. 387)" value={obj} onChange={e => setObj(e.target.value)} options={ODJ.map(([k, l]) => [k, l])} />
            <Btn onClick={addRes}>+ Résolution</Btn>
          </div>}
          {(ag.odj || []).map((r, k) => {
            const R = resultat(state, c, ag, r);
            const votants = owners.filter(o => r.regle === 'membres' ? (ag.presences || {})[o.id] === 'present' : ['present', 'represente'].includes((ag.presences || {})[o.id]) && poids(state, c, o.id, r.cle) > 0);
            return <div key={r.id} style={{ border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <b style={{ color: 'var(--b0)' }}>Résolution {k + 1}</b>
                {canEdit ? <input value={r.titre} onChange={e => setRes(r.id, { titre: e.target.value })} style={{ ...INP, flex: 1, minWidth: 220 }} /> : <span style={{ flex: 1 }}>{r.titre || odjLabel(r.objet)}</span>}
                <Pill tone={R.adoptee ? 'ok' : 'warn'}>{R.adoptee ? 'Adoptée' : 'Rejetée'}</Pill>
                {canEdit && <button onClick={() => setAg(a => ({ odj: a.odj.filter(x => x.id !== r.id) }))} style={{ ...INP, cursor: 'pointer', color: 'oklch(0.45 0.13 25)' }}>×</button>}
              </div>
              {canEdit && <textarea value={r.texte || ''} onChange={e => setRes(r.id, { texte: e.target.value })} rows={2} placeholder="Texte de la résolution (montant, durée, nom…)" style={{ padding: 6, borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 14, fontFamily: 'inherit' }} />}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 14, alignItems: 'center' }}>
                <span>Votants :</span>
                <FormSelect disabled={!canEdit} value={r.cle || 'gen'} onChange={e => setRes(r.id, { cle: e.target.value })} style={INP}>{cles.map(([kk, l]) => <option key={kk} value={kk}>{l}</option>)}</FormSelect>
                <FormSelect disabled={!canEdit} value={r.regle} onChange={e => setRes(r.id, { regle: e.target.value })} style={INP}><option value="voix">Majorité des voix exprimées</option><option value="membres">Majorité des membres présents</option></FormSelect>
                <span style={{ color: 'oklch(0.45 0.03 var(--h))' }}>Pour {R.pour} · Contre {R.contre} · Abst. {R.abst} ({R.unite})</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {votants.map(o => { const v = (r.votes || {})[o.id] || ''; return <label key={o.id} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, padding: '3px 6px', borderRadius: 6, background: v === 'pour' ? 'oklch(0.94 0.06 155)' : v === 'contre' ? 'oklch(0.94 0.05 25)' : 'oklch(0.97 0.01 85)' }}>
                  {o.nom}<FormSelect disabled={!canEdit} value={v} onChange={e => vote(r.id, o.id, e.target.value)} style={{ ...INP, height: 24 }}><option value="">abst.</option><option value="pour">pour</option><option value="contre">contre</option></FormSelect>
                </label>; })}
                {!votants.length && <Note>Renseignez la feuille de présence pour voter.</Note>}
              </div>
            </div>;
          })}
        </Card>
      </div>}
    </div>
  );
}

// ---------- Litiges & diagnostics ----------
function Suivi({ state, sy, upd, canEdit, exp, c }) {
  const addL = () => upd(x => ({ ...x, litiges: [{ id: uid('li'), dateSaisine: today(), parties: '', objet: '', statut: 'ouvert', issue: '' }, ...x.litiges] }));
  const setL = (id, p) => upd(x => ({ ...x, litiges: x.litiges.map(l => l.id === id ? { ...l, ...p } : l) }));
  const addD = () => upd(x => ({ ...x, diagnostics: [{ id: uid('di'), type: DIAGS[0], portee: 'Immeuble', date: today(), organisme: '', validite: '', obs: '' }, ...x.diagnostics] }));
  const setD = (id, p) => upd(x => ({ ...x, diagnostics: x.diagnostics.map(l => l.id === id ? { ...l, ...p } : l) }));
  const ro = !canEdit;
  return <>
    <Card title="Litiges et arbitrage" right={canEdit && <Btn onClick={addL}>+ Litige</Btn>}>
      <Note>Les difficultés relatives à la jouissance et à l’administration des parties communes ou aux conditions de jouissance des parties privatives peuvent être soumises à l’arbitrage du ministère en charge de la Construction et du Logement, dans un délai de 45 jours à compter de la demande (art. 407).</Note>
      <Table head={['Saisine', 'Parties', 'Objet', 'Statut', 'Échéance (J+45)', 'Issue', '']}>
        {(sy.litiges || []).map(l => { const ech = l.dateSaisine ? addDays(l.dateSaisine, 45) : ''; const late = l.statut !== 'clos' && ech && ech < today(); return <tr key={l.id} style={{ background: late ? 'oklch(0.985 0.03 30)' : 'white' }}>
          <td style={TD}><input disabled={ro} type="date" value={l.dateSaisine} onChange={e => setL(l.id, { dateSaisine: e.target.value })} style={INP} /></td>
          <td style={TD}><input disabled={ro} value={l.parties} onChange={e => setL(l.id, { parties: e.target.value })} style={{ ...INP, width: 150 }} /></td>
          <td style={TD}><input disabled={ro} value={l.objet} onChange={e => setL(l.id, { objet: e.target.value })} style={{ ...INP, width: 200 }} /></td>
          <td style={TD}><FormSelect disabled={ro} value={l.statut} onChange={e => setL(l.id, { statut: e.target.value })} style={INP}><option value="ouvert">Ouvert</option><option value="arbitrage">Soumis à l’arbitrage</option><option value="clos">Clos</option></FormSelect></td>
          <td style={TD}><Mono style={{ color: late ? 'oklch(0.5 0.17 30)' : 'inherit', fontWeight: late ? 700 : 400 }}>{fmtDate(ech)}</Mono>{late && <div style={{ fontSize: 12, color: 'oklch(0.5 0.17 30)' }}>délai dépassé</div>}</td>
          <td style={TD}><input disabled={ro} value={l.issue} onChange={e => setL(l.id, { issue: e.target.value })} style={{ ...INP, width: 150 }} /></td>
          <td style={TD}>{canEdit && <button onClick={() => upd(x => ({ ...x, litiges: x.litiges.filter(y => y.id !== l.id) }))} style={{ ...INP, cursor: 'pointer', color: 'oklch(0.45 0.13 25)' }}>×</button>}</td>
        </tr>; })}
        {!(sy.litiges || []).length && <tr><td colSpan={7} style={{ ...TD, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun litige.</td></tr>}
      </Table>
    </Card>
    <Card title="Diagnostics techniques" right={canEdit && <Btn onClick={addD}>+ Diagnostic</Btn>}>
      <Note>Le dossier de diagnostic technique (amiante, cendres, plomb, termites ; gaz et électricité de plus de 15 ans) est annexé à toute vente ou tout bail (art. 513 à 518). Établi par les services d’hygiène qui délivrent un certificat de salubrité (art. 498).</Note>
      <Table head={['Type', 'Portée', 'Date', 'Organisme', 'Valable jusqu’au', 'Observations', '']}>
        {(sy.diagnostics || []).map(d => { const exp2 = d.validite && d.validite < today(); return <tr key={d.id}>
          <td style={TD}><FormSelect disabled={ro} value={d.type} onChange={e => setD(d.id, { type: e.target.value })} style={INP}>{DIAGS.map(x => <option key={x} value={x}>{x}</option>)}</FormSelect></td>
          <td style={TD}><FormSelect disabled={ro} value={d.portee} onChange={e => setD(d.id, { portee: e.target.value })} style={INP}><option>Immeuble</option>{c.rows.map(r => <option key={r.id} value={'Lot ' + r.id}>Lot {r.id}</option>)}</FormSelect></td>
          <td style={TD}><input disabled={ro} type="date" value={d.date} onChange={e => setD(d.id, { date: e.target.value })} style={INP} /></td>
          <td style={TD}><input disabled={ro} value={d.organisme} onChange={e => setD(d.id, { organisme: e.target.value })} style={{ ...INP, width: 150 }} /></td>
          <td style={TD}><input disabled={ro} type="date" value={d.validite} onChange={e => setD(d.id, { validite: e.target.value })} style={{ ...INP, borderColor: exp2 ? 'oklch(0.6 0.15 30)' : undefined }} />{exp2 && <div style={{ fontSize: 12, color: 'oklch(0.5 0.17 30)' }}>expiré</div>}</td>
          <td style={TD}><input disabled={ro} value={d.obs} onChange={e => setD(d.id, { obs: e.target.value })} style={{ ...INP, width: 160 }} /></td>
          <td style={TD}>{canEdit && <button onClick={() => upd(x => ({ ...x, diagnostics: x.diagnostics.filter(y => y.id !== d.id) }))} style={{ ...INP, cursor: 'pointer', color: 'oklch(0.45 0.13 25)' }}>×</button>}</td>
        </tr>; })}
        {!(sy.diagnostics || []).length && <tr><td colSpan={7} style={{ ...TD, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun diagnostic enregistré.</td></tr>}
      </Table>
    </Card>
    <Card title="Extraits du règlement pour les baux (art. 417)">
      <Note>Le bailleur remet au locataire qui le demande les extraits du règlement (destination, jouissance des parties privatives et communes) et la quote-part du lot loué dans chaque catégorie de charges.</Note>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{c.rows.map(r => <Btn key={r.id} variant="ghost" style={{ height: 28, padding: '0 9px', fontSize: 12 }} onClick={() => exp(extraitBailHtml(state, r.id))}>Lot {r.id}</Btn>)}</div>
    </Card>
  </>;
}
