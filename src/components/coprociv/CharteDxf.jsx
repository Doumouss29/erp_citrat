import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { CHARTE_LAYERS, CARTOUCHE_ATTS, niveauCode } from '@/lib/dxfCharte';
import { colorHex } from '@/lib/dxfParse';
import { charteDxfHtml, openDoc } from '@/lib/docs';
import { Btn, Pill, C } from '@/components/coprociv/ui';

// Charte DXF COPROCIV affichée dans l'application (même contenu que le PDF remis au dessinateur).
const BLOCK = { border: '1px solid ' + C.soft, borderRadius: 12, padding: 16, background: 'white', display: 'flex', flexDirection: 'column', gap: 8 };
const H = ({ n, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--b0)' }}>
    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', color: 'var(--b0)', display: 'grid', placeItems: 'center', fontSize: 12 }}>{n}</span>{children}
  </div>
);
const UL = ({ items }) => <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, listStyle: 'disc' }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
const TH = { textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em', padding: '8px 10px', background: C.head, borderBottom: '1px solid ' + C.soft };
const TD = { padding: '8px 10px', fontSize: 14, borderBottom: '1px solid ' + C.soft, verticalAlign: 'top' };
const Code = ({ children }) => <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, fontWeight: 700, color: 'var(--b0)', background: 'oklch(0.96 0.012 85)', padding: '1px 6px', borderRadius: 4 }}>{children}</code>;

export default function CharteDxf() {
  const { state, showToast } = useCopro();
  const i = state.info || {};
  const ex = ((state.bats || [])[0] || {}).id || 'A';
  const pdf = () => { if (!openDoc(charteDxfHtml(state))) showToast('Autorisez les fenêtres pour obtenir le PDF'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 12, background: 'oklch(0.96 0.03 80)', border: '1px solid oklch(0.88 0.06 80)' }}>
        <span style={{ flex: 1, minWidth: 240, fontSize: 14, fontWeight: 600, color: 'oklch(0.38 0.09 60)' }}>
          Un plan qui ne respecte pas cette charte est refusé à l’import : on corrige le dessin, puis on réimporte.
        </span>
        <Btn variant="ghost" onClick={pdf}>Imprimer la charte (PDF)</Btn>
      </div>

      <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, alignItems: 'stretch' }}>
        <section style={BLOCK}>
          <H n={1}>Le fichier</H>
          <UL items={[
            <>Format <b>DXF</b> (AutoCAD 2000 ou plus récent, ou R12), dessin à l’échelle <b>1:1</b>.</>,
            <>Unité : <b>le mètre</b> (commande UNITES ; <Code>$INSUNITS = 6</Code>). Une autre unité est refusée.</>,
            <><b>Un fichier par niveau et par bâtiment</b>, par exemple <Code>{(i.ref || 'REF') + '_' + ex + '_R+1.dxf'}</Code>.</>,
            <>Partir du <b>gabarit</b> : calques et cartouche y sont déjà créés.</>
          ]} />
        </section>
        <section style={BLOCK}>
          <H n={2}>Le cartouche</H>
          <div style={{ fontSize: 14 }}>Un seul bloc <Code>CP_CARTOUCHE</Code> par fichier, avec trois attributs :</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {CARTOUCHE_ATTS.map(([t, d, e]) => (
                <tr key={t}><td style={{ ...TD, width: 110 }}><Code>{t}</Code></td><td style={TD}>{d}</td><td style={{ ...TD, color: C.muted }}>{t === 'DOSSIER' && i.ref ? i.ref : e}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 13, color: C.muted }}>
            Ce dossier : {(state.bats || []).map(b => b.id + ' (RDC à ' + niveauCode(+b.etages || 0) + ')').join(' · ') || '—'}{state.hasSS ? ' · SS (sous-sol)' : ''}.
          </div>
        </section>
      </div>

      <section style={BLOCK}>
        <H n={3}>Les calques</H>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={TH}>Calque</th><th style={TH}>Contenu</th><th style={TH}>Texte à écrire dans le contour</th></tr></thead>
            <tbody>
              {CHARTE_LAYERS.map(([l, d, t, aci]) => (
                <tr key={l}>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 8, background: colorHex('aci:' + aci) || '#999', border: '1px solid rgba(0,0,0,.2)' }} /><Code>{l}</Code></td>
                  <td style={TD}>{d}</td>
                  <td style={TD}>{t === 'aucune' ? <span style={{ color: C.muted }}>aucun</span> : <Code>{t}</Code>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>Tout autre calque (murs, cloisons, cotes, mobilier…) est ignoré. Un calque commençant par <Code>CP_</Code> absent de cette liste est refusé.</div>
      </section>

      <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, alignItems: 'stretch' }}>
        <section style={BLOCK}>
          <H n={4}>Règles de dessin</H>
          <UL items={[
            <>Chaque local est une <b>polyligne fermée</b> (arcs admis), jamais des lignes séparées.</>,
            <>Le texte d’un local est posé <b>à l’intérieur</b> de son contour.</>,
            <>Un lot : <b>un seul contour par niveau</b>, étiqueté <Code>LOT n</Code> (numéro du dossier).</>,
            <>Les <b>pièces</b> (facultatives) restent dans le contour de leur lot ; la surface du lot devient alors la somme des pièces. Hauteur facultative : <Code>HSP 2,50</Code>.</>,
            <>Lots, annexes et parties communes <b>ne se chevauchent pas</b> (côtés communs admis).</>,
            <>Annexe : <Code>LOT n BALCON</Code> (ou LOGGIA, TERRASSE, JARDIN).</>,
            <>Poteaux, gaines, trémies sur <Code>CP_DEDUIRE</Code>, dans le local à réduire.</>,
            <><b>Copropriété horizontale</b> : un plan de masse (<Code>BATIMENT = V</Code>, <Code>NIVEAU = RDC</Code>) ; la parcelle de chaque villa ou terrain sur <Code>CP_PARCELLE</Code>, la surface habitable de la villa sur <Code>CP_LOT</Code>, à l’intérieur de sa parcelle.</>,
            <>Surface écrite facultative (<Code>24,35 m²</Code>) : comparée à la surface calculée.</>
          ]} />
        </section>
        <section style={BLOCK}>
          <H n={5}>Contrôles à l’import</H>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Pill tone="bad">Refus</Pill><span style={{ fontSize: 13, color: C.muted }}>le plan n’est pas importé</span></div>
          <UL items={['Unité autre que le mètre', 'Cartouche absent, en double, ou d’un autre dossier, bâtiment ou niveau', 'Contour ouvert, calque CP_ inconnu', 'Lot sans étiquette, inconnu, d’un autre bâtiment ou dessiné deux fois', 'Pièce hors du lot ou sans nom, annexe sans lot, partie commune sans nom', 'Chevauchements, pièces plus grandes que le lot']} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><Pill tone="warn">Avertissement</Pill><span style={{ fontSize: 13, color: C.muted }}>l’import reste possible</span></div>
          <UL items={['Écart entre surface écrite et surface calculée', 'Lots du niveau non dessinés', 'Contours sur des calques ignorés']} />
        </section>
      </div>

      <section style={BLOCK}>
        <H n={6}>Avant d’envoyer le plan</H>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '6px 16px', fontSize: 14 }}>
          {['Unités en mètres, échelle 1:1', 'Cartouche CP_CARTOUCHE rempli', 'Polylignes fermées sur les calques CP_', 'Un texte « LOT n » dans chaque lot', 'Pièces, annexes et parties communes nommées', 'Aucun chevauchement'].map(t => (
            <span key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 14, height: 14, border: '1.5px solid ' + C.line, borderRadius: 3, flexShrink: 0 }} />{t}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
