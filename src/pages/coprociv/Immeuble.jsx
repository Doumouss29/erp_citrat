import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { USAGE, addrOf, f, hspOf, MESURE_DEF, TYPE_COPRO, typeCoproOf } from '@/lib/engine';
import { Card, Field, SelectField, Btn, Pill, C } from '@/components/coprociv/ui';

const USAGE_OPTS = [['habitation', 'Habitation'], ['mixte', 'Mixte habitation / commerces'], ['tertiaire', 'Tertiaire / bureaux']];
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 };
const NOTE = { fontSize: 13, color: C.muted, lineHeight: 1.5 };
const Section = ({ children }) => <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted, paddingTop: 4 }}>{children}</div>;

export default function Immeuble() {
  const { state, setInfo, setBat, setMesure, setMembres, user, isAdmin } = useCopro();
  const role = state.role || 'geometre';
  const canEdit = role === 'geometre';
  const info = state.info;
  const H = hspOf(state);
  const meta = state.meta || {};
  const membres = meta.membres || [];
  const canShare = isAdmin || !user || (meta.owner && user && meta.owner === user.id);
  const [mail, setMail] = useState('');
  const [editMes, setEditMes] = useState(false);
  const addMail = () => { const m = mail.trim().toLowerCase(); if (!/.+@.+\..+/.test(m)) return; setMembres([...membres, m]); setMail(''); };
  const F = (k, label, ph, extra) => <Field label={label} value={info[k]} disabled={!canEdit} onChange={e => setInfo({ [k]: e.target.value })} placeholder={ph} {...extra} />;
  const foncierOk = !!(info.tf || '').trim() && !!(info.section && info.parcelle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card title="Identité et références foncières" right={<Pill tone={foncierOk ? 'ok' : 'warn'}>{foncierOk ? 'Références complètes' : 'TF ou cadastre manquant'}</Pill>}>
        <Section>Copropriété</Section>
        <div style={GRID}>
          {F('nom', 'Nom de la copropriété', 'Résidence…')}
          <SelectField label="Usage de l'immeuble" value={info.usage} disabled={!canEdit} onChange={e => setInfo({ usage: e.target.value })} options={USAGE_OPTS} />
          {F('adresse', 'Adresse')}
          {F('commune', 'Commune')}
          {F('ville', 'Ville')}
          {F('ref', 'Référence du dossier', '', { mono: true })}
          <Field label="Type de copropriété (fixé à la création)" value={TYPE_COPRO[typeCoproOf(state)]} disabled />
        </div>
        <Section>Foncier (art. 379)</Section>
        <div style={GRID}>
          {F('tf', 'Titre foncier', 'TF n°…')}
          {F('acd', 'ACD', 'ACD n°… du…')}
          {F('section', 'Section cadastrale')}
          {F('parcelle', 'Parcelle')}
          {F('ilot', 'Îlot / lot')}
          {F('contenance', 'Contenance du terrain', '1 240 m²')}
        </div>
        <Section>Intervenants désignés dans les actes</Section>
        <div style={GRID}>
          {F('geometre', 'Géomètre-expert')}
          {F('notaire', 'Notaire')}
        </div>
        <div style={NOTE}>{USAGE[info.usage]} · {addrOf(info) || 'adresse à compléter'}</div>
      </Card>

      <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'stretch' }}>
        <Card title={`Bâtiments (${state.bats.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {state.bats.map((b, i) => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: i ? '1px solid ' + C.soft : 0 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--b0)' }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>{b.villas
                    ? `${state.lots.filter(l => l.bat === b.id && l.type === 'villa').length} villa(s), ${state.lots.filter(l => l.bat === b.id && l.type === 'terrain').length} lot(s) de terrain · parcelles privatives · pas de coefficient d'étage`
                    : `R+${b.etages} · coefficient d'étage « ${b.lift ? 'avec' : 'sans'} ascenseur »`}</div>
                </div>
                {!b.villas && <span style={{ fontSize: 13, color: C.muted }}>Ascenseur</span>}
                {!b.villas && <div role="radiogroup" aria-label={'Ascenseur ' + b.name} style={{ display: 'flex', border: '1px solid ' + C.line, borderRadius: 8, overflow: 'hidden' }}>
                  {[[true, 'Oui'], [false, 'Non']].map(([v, l]) => (
                    <button key={l} role="radio" aria-checked={!!b.lift === v} disabled={!canEdit} onClick={() => setBat(b.id, { lift: v })} style={{ height: 32, padding: '0 14px', border: 0, fontWeight: 700, fontSize: 14, cursor: canEdit ? 'pointer' : 'default', background: !!b.lift === v ? 'var(--b0)' : 'white', color: !!b.lift === v ? 'white' : C.muted }}>{l}</button>
                  ))}
                </div>}
              </div>
            ))}
            {state.hasSS && <div style={{ padding: '10px 0', borderTop: '1px solid ' + C.soft, fontSize: 14 }}><b style={{ color: 'var(--b0)' }}>Sous-sol</b> <span style={{ color: C.muted }}>· caves, boxes, locaux annexes et stationnements</span></div>}
          </div>
          <div style={NOTE}>L'ascenseur détermine le jeu de coefficients d'étage appliqué aux lots du bâtiment (réglables dans Tantièmes).</div>
        </Card>

        <Card title="Méthode de mesurage" right={canEdit && <div style={{ display: 'flex', gap: 8 }}>
          {state.mesure && <Btn variant="ghost" onClick={() => setMesure('')}>Méthode standard</Btn>}
          <Btn variant="ghost" onClick={() => setEditMes(v => !v)}>{editMes ? 'Terminer' : 'Modifier'}</Btn>
        </div>}>
          {editMes && canEdit
            ? <textarea value={state.mesure || MESURE_DEF} onChange={e => setMesure(e.target.value)} rows={6} style={{ padding: 10, borderRadius: 8, border: '1px solid ' + C.line, fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical' }} />
            : <div style={{ fontSize: 14, lineHeight: 1.6 }}>{state.mesure || MESURE_DEF}</div>}
          <div style={NOTE}>Reprise dans chaque attestation de superficie. Le Code renvoie le mesurage à la voie réglementaire (art. 249) : la méthode et le seuil de hauteur retenu ({f(H.seuil)} m) sont déclarés par le géomètre-expert.</div>
        </Card>
      </div>

      <Card title="Accès au dossier" right={<Pill tone="neutral">{membres.length + 1} accès</Pill>}>
        <div style={NOTE}>Seuls le créateur du dossier{meta.createdBy ? ' (' + meta.createdBy + ')' : ''}, l'administrateur et les personnes invitées voient ce dossier. Chacun n'agit que selon son profil (géomètre-expert ou notaire).</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {membres.length === 0 && <span style={{ fontSize: 14, color: C.muted }}>Aucune personne invitée.</span>}
          {membres.map(m => (
            <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 12px', borderRadius: 999, background: 'oklch(0.95 0.02 85)', fontSize: 14 }}>
              {m}
              {canShare && <button onClick={() => setMembres(membres.filter(x => x !== m))} title="Retirer l'accès" aria-label={'Retirer ' + m} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'oklch(0.45 0.13 25)', fontSize: 16 }}>×</button>}
            </span>
          ))}
        </div>
        {canShare && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
            <Field label="Inviter par e-mail (le notaire, par exemple)" type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="me.diallo@notaire.ci" style={{ flex: 1, minWidth: 240 }} />
            <Btn onClick={addMail} disabled={!/.+@.+\..+/.test(mail.trim())}>Inviter</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
