import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, fcfa, levelsLabel, BATL, TYPES } from '@/lib/engine';
import { withDefaults, cotisations, comptes, odjLabel, fmtDate, periodeLabel, today } from '@/lib/syndic';
import { quittanceHtml, extraitBailHtml, comptesHtml, appelHtml } from '@/lib/syndicDocs';
import { reglementHtml, eddHtml, openDoc } from '@/lib/docs';
import { Card, Btn, Pill, Mono, Stat, SelectField } from '@/components/coprociv/ui';

const TH = { padding: '6px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'oklch(0.5 0.020 var(--h))', background: 'oklch(0.97 0.014 85)' };
const TD = { padding: '5px 8px', borderTop: '1px solid oklch(0.94 0.012 85)', fontSize: 14 };

// Espace du copropriétaire : ses lots, ses cotisations et paiements, les documents de la copropriété
// et les comptes du syndicat (droit de consultation, art. 390).
export default function Portail() {
  const { state, user, isAdmin, showToast } = useCopro();
  const c = compute(state);
  const sy = withDefaults((state.meta || {}).syndic);
  const mail = String((user && user.email) || '').toLowerCase();
  const mine = (state.owners || []).filter(o => String(o.email || '').trim().toLowerCase() === mail && mail);
  const [apercu, setApercu] = useState('');
  const owners = (state.owners || []).filter(o => c.rows.some(r => r.owner === o.id));
  const preview = !mine.length && (isAdmin || state.role !== 'coproprietaire' || !user);
  const ids = mine.length ? mine.map(o => o.id) : (apercu ? [apercu] : []);
  const exp = html => { if (!openDoc(html)) showToast('Autorisez les fenêtres pop-up pour ouvrir le document'); };
  const an = String(new Date().getFullYear());
  const cot = cotisations(state, sy, an, c);
  const cpt = comptes(state, sy);
  const lots = c.rows.filter(r => ids.includes(r.owner));
  const lotIds = lots.map(r => r.id);
  const appels = (sy.appels || []).filter(a => lotIds.includes(a.lotId)).sort((a, b) => b.periode.localeCompare(a.periode));
  const paiements = (sy.paiements || []).filter(p => lotIds.includes(p.lotId)).sort((a, b) => b.date.localeCompare(a.date));
  const solde = lotIds.reduce((a, id) => a + ((cpt[id] || {}).solde || 0), 0);
  const prochaine = (sy.ags || []).filter(a => a.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];

  if (!ids.length) return (
    <Card title="Mon espace copropriétaire">
      {preview ? <>
        <div style={{ fontSize: 14 }}>Aperçu de l’espace d’un copropriétaire :</div>
        <SelectField label="Copropriétaire" value={apercu} onChange={e => setApercu(e.target.value)} options={[['', '— Choisir —'], ...owners.map(o => [o.id, o.nom])]} />
      </> : <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        Aucun lot de ce dossier n’est rattaché à votre adresse e-mail ({mail || '—'}). Demandez au syndic de renseigner cette adresse sur votre fiche de copropriétaire.
      </div>}
    </Card>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        <Stat label="Mes lots" value={lots.length} sub={lots.reduce((a, r) => a + r.tg, 0) + ' / ' + state.baseGen + ' tantièmes'} />
        <Stat label="Cotisation mensuelle" value={fcfa(lotIds.reduce((a, id) => a + ((cot.parLot[id] || {}).total || 0), 0))} sub={'budget ' + an} />
        <Stat label="Solde à payer" value={fcfa(Math.max(0, solde))} tone={solde > 0 ? 'oklch(0.5 0.16 30)' : 'var(--b0)'} sub={solde > 0 ? 'échéances dépassées' : 'à jour'} />
        <Stat label="Prochaine AG" value={prochaine ? fmtDate(prochaine.date) : '—'} sub={prochaine ? (prochaine.lieu || '') : ''} />
      </div>

      <Card title="Mes lots">
        <div style={{ overflowX: 'auto', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}><thead><tr>{['Lot', 'Désignation', 'Situation', 'Quote-part générale', 'Charges spéciales', 'Extrait pour bail'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{lots.map(r => <tr key={r.id}>
              <td style={TD}><Mono style={{ fontWeight: 700 }}>{r.id}</Mono></td>
              <td style={TD}>{r.des} <span style={{ color: 'oklch(0.55 0.02 var(--h))' }}>· {(TYPES[r.type] || {}).l}</span></td>
              <td style={TD}>{BATL(r.bat)} — {levelsLabel(r)}</td>
              <td style={TD}><Mono>{r.tg} / {state.baseGen}</Mono></td>
              <td style={TD}>{(state.grids || []).map(g => { const G = c.g[g.id] || { shares: {} }; const sh = G.shares[r.id]; return sh != null ? <div key={g.id} style={{ fontSize: 12 }}>{g.name} : <Mono>{sh}/{G.base}</Mono></div> : null; })}</td>
              <td style={TD}><Btn variant="ghost" style={{ height: 26, padding: '0 8px', fontSize: 12 }} onClick={() => exp(extraitBailHtml(state, r.id))}>Extrait (art. 417)</Btn></td>
            </tr>)}</tbody></table>
        </div>
      </Card>

      <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>
        <Card title="Mes appels de cotisation">
          {appels.length === 0 && <div style={{ fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun appel.</div>}
          {appels.slice(0, 24).map(a => <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, padding: '4px 0', borderBottom: '1px solid oklch(0.94 0.012 85)' }}>
            <span style={{ flex: 1 }}>{periodeLabel(a.periode)} · lot {a.lotId} · échéance {fmtDate(a.echeance)}</span>
            <Mono>{fcfa(a.montant)}</Mono>
            <Btn variant="ghost" style={{ height: 24, padding: '0 6px', fontSize: 12 }} onClick={() => exp(appelHtml(state, sy, a.periode, [a.lotId]))}>Avis</Btn>
          </div>)}
        </Card>
        <Card title="Mes paiements et quittances">
          {paiements.length === 0 && <div style={{ fontSize: 14, color: 'oklch(0.5 0.02 var(--h))' }}>Aucun paiement enregistré.</div>}
          {paiements.slice(0, 24).map(p => <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, padding: '4px 0', borderBottom: '1px solid oklch(0.94 0.012 85)' }}>
            <span style={{ flex: 1 }}>{fmtDate(p.date)} · lot {p.lotId} · {p.mode}</span>
            <Mono>{fcfa(p.montant)}</Mono>
            <Btn variant="ghost" style={{ height: 24, padding: '0 6px', fontSize: 12 }} onClick={() => exp(quittanceHtml(state, sy, p))}>Quittance</Btn>
          </div>)}
        </Card>
      </div>

      <Card title="Documents et comptes de la copropriété" right={<Pill tone="neutral">droit de consultation · art. 390</Pill>}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="gold" onClick={() => exp(reglementHtml(state))}>Règlement de copropriété</Btn>
          <Btn variant="ghost" onClick={() => exp(eddHtml(state))}>État descriptif de division</Btn>
          <Btn variant="ghost" onClick={() => exp(comptesHtml(state, sy, an))}>Comptes du syndicat {an}</Btn>
        </div>
        {prochaine && <div style={{ fontSize: 14 }}>
          <b>Prochaine assemblée générale :</b> {fmtDate(prochaine.date)}{prochaine.heure ? ' à ' + prochaine.heure : ''}, {prochaine.lieu || 'lieu à préciser'}.
          <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>{(prochaine.odj || []).map(r => <li key={r.id}>{r.titre || odjLabel(r.objet)}</li>)}</ol>
        </div>}
        {(sy.diagnostics || []).length > 0 && <div style={{ fontSize: 14 }}><b>Diagnostics techniques :</b> {(sy.diagnostics || []).map(d => `${d.type} (${d.portee}, ${fmtDate(d.date)})`).join(' ; ')}</div>}
        <div style={{ fontSize: 12, color: 'oklch(0.5 0.020 var(--h))' }}>Vous pouvez demander au syndic communication de toute pièce comptable ou information (art. 390). Syndic : {sy.syndic.nom || '—'}.</div>
      </Card>
    </div>
  );
}
