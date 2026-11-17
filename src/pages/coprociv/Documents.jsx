import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute } from '@/lib/engine';
import { eddHtml, modificatifHtml, reglementHtml, attestationHtml, openDoc } from '@/lib/docs';
import { exportExcel, exportEddDocx, exportReglementDocx, exportFicheExcel, ficheJson, ficheHtml } from '@/lib/exports';
import { Card, Btn, Pill, C } from '@/components/coprociv/ui';
import ReferentielPlans from '@/components/coprociv/ReferentielPlans';

// Un document = une ligne, un bouton principal (format par défaut : Word pour les actes) et les autres formats en second.
function Ligne({ titre, desc, formats, busy, last }) {
  const [main, ...autres] = formats;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: last ? 0 : '1px solid ' + C.soft }}>
      <div>
        <div style={{ fontWeight: 700, color: 'var(--b0)', fontSize: 15 }}>{titre}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {autres.map(([k, l, fn]) => <Btn key={k} variant="ghost" onClick={fn} disabled={!!busy} style={{ height: 32, padding: '0 12px', fontSize: 13 }}>{busy === k ? '…' : l}</Btn>)}
        <Btn onClick={main[2]} disabled={!!busy} style={{ minWidth: 160 }}>{busy === main[0] ? 'Préparation…' : 'Télécharger · ' + main[1]}</Btn>
      </div>
    </div>
  );
}

export default function Documents() {
  const { state, showToast, setScreen } = useCopro();
  const [busy, setBusy] = useState('');
  const c = compute(state);
  const journal = (state.journals || {})[state.did] || [];
  const run = async (k, fn) => {
    setBusy(k);
    try { await fn(state); } catch (e) { console.error(e); showToast('Export impossible : ' + (e && e.message ? e.message : 'erreur inconnue')); }
    setBusy('');
  };
  const pdf = html => { if (!openDoc(html)) showToast('Autorisez les fenêtres pop-up pour obtenir le PDF'); };
  const statut = state.validated ? ['ok', 'Version validée par le notaire'] : state.certified ? ['navy', 'Certifié — mention PROJET jusqu\'à validation'] : ['warn', 'Projet'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card title="Documents officiels" right={<Pill tone={statut[0]}>{statut[1]}</Pill>}>
        <div>
          <Ligne titre="État descriptif de division" desc={`${c.rows.length} lots, parties communes et charges spéciales.`} busy={busy}
            formats={[['eddw', 'Word', () => run('eddw', exportEddDocx)], ['eddp', 'PDF', () => pdf(eddHtml(state))]]} />
          <Ligne titre="Règlement de copropriété" desc={`${(state.articles || []).length} articles, avec l'EDD et les grilles de charges intégrés.`} busy={busy}
            formats={[['rcpw', 'Word', () => run('rcpw', exportReglementDocx)], ['rcpp', 'PDF', () => pdf(reglementHtml(state))]]} />
          <Ligne titre="Modificatif" desc={state.avant ? 'Tableau avant / après et historique des modifications.' : `Historique des modifications (${journal.length}). Figez un état d'origine dans EDD & modificatif pour le tableau avant / après.`} busy={busy}
            formats={[['modp', 'PDF', () => pdf(modificatifHtml(state, journal))]]} />
          <Ligne titre="Attestations de superficie" desc="Une attestation par lot, avec la méthode de mesurage déclarée (page Immeuble)." busy={busy} last
            formats={[['attp', 'PDF', () => pdf(attestationHtml(state, c.rows.map(x => x.id)))]]} />
        </div>
        {!state.validated && <div style={{ fontSize: 13, color: 'oklch(0.45 0.13 55)' }}>Tant que l'EDD n'est pas validé par le notaire, les documents portent la mention « PROJET ». <button onClick={() => setScreen('controle')} style={{ border: 0, background: 'transparent', color: 'var(--b0)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 13 }}>Voir le contrôle</button></div>}
      </Card>

      <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'stretch' }}>
        <Card title="Fichier de travail">
          <Ligne titre="Excel des calculs" desc="Pondérations, tantièmes et grilles avec les formules réelles, recalculées par Excel." busy={busy} last
            formats={[['xlsx', 'Excel', () => run('xlsx', exportExcel)]]} />
        </Card>
        <Card title="Échange avec le notaire">
          <Ligne titre="Fiche d'immeuble" desc="Un lot par ligne : numéro, désignation, bâtiment, étage, quote-part." busy={busy} last
            formats={[['fxl', 'Excel', () => run('fxl', exportFicheExcel)], ['fjs', 'JSON', () => run('fjs', async x => ficheJson(x))], ['fpdf', 'PDF', () => pdf(ficheHtml(state))]]} />
        </Card>
      </div>

      <Card title="Référentiel des plans" right={<Pill tone="neutral">à remettre au dessinateur</Pill>}>
        <ReferentielPlans />
      </Card>
    </div>
  );
}
