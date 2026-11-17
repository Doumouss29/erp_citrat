import { FormSelect } from "@/components/ui/form-select";
import React, { useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { BATL, LVL } from '@/lib/engine';
import { gabaritDXF, exempleDXF, niveauCode } from '@/lib/dxfCharte';
import { charteDxfHtml, openDoc } from '@/lib/docs';
import { Btn, C } from '@/components/coprociv/ui';
import CharteDxf from '@/components/coprociv/CharteDxf';

// Référentiel des plans DXF (documents indicatifs à remettre au dessinateur) : charte, gabarit par niveau, exemple conforme.
const download = (txt, name) => {
  const url = URL.createObjectURL(new Blob([txt], { type: 'application/dxf' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
const ROW = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center', padding: '14px 0', borderTop: '1px solid ' + C.soft };
const T = { fontWeight: 700, color: 'var(--b0)', fontSize: 15 };
const D = { fontSize: 13, color: C.muted, marginTop: 2 };
const SEL = { height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid ' + C.line, background: 'white', fontSize: 13 };

export default function ReferentielPlans() {
  const { state, showToast } = useCopro();
  const [charte, setCharte] = useState(false);
  const hasDossier = !!state.did && (state.bats || []).length > 0;
  const bats = [...(state.bats || []).map(b => b.id), ...(state.hasSS ? ['SS'] : [])];
  const [gBat, setGBat] = useState(bats[0] || 'A');
  const [gNiv, setGNiv] = useState(gBat === 'SS' ? '-1' : '0');
  const B = (state.bats || []).find(b => b.id === gBat);
  const nivOpts = gBat === 'SS' ? [['-1', 'SS']] : Array.from({ length: (+(B || {}).etages || 0) + 1 }, (_, n) => [String(n), niveauCode(n) + ' — ' + LVL(n)]);
  const ref = (state.info || {}).ref || 'dossier';
  const pdf = () => { if (!openDoc(charteDxfHtml(state))) showToast('Autorisez les fenêtres pour obtenir le PDF'); };

  return (
    <div>
      <div style={{ ...ROW, borderTop: 0, paddingTop: 0 }}>
        <div>
          <div style={T}>Charte DXF COPROCIV</div>
          <div style={D}>Format imposé des plans : fichier, cartouche, calques, règles de dessin et contrôles. Un plan hors charte est refusé à l’import.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={pdf} style={{ height: 32, padding: '0 12px', fontSize: 13 }}>PDF</Btn>
          <Btn onClick={() => setCharte(true)} style={{ minWidth: 150 }}>Consulter</Btn>
        </div>
      </div>

      <div style={ROW}>
        <div>
          <div style={T}>Gabarit de plan (.dxf)</div>
          <div style={D}>{hasDossier ? `Calques de la charte et cartouche prérempli (dossier ${ref}) pour le niveau choisi.` : 'Ouvrez un dossier pour obtenir ses gabarits, avec le cartouche prérempli.'}</div>
        </div>
        {hasDossier && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
            <FormSelect aria-label="Bâtiment" value={gBat} onChange={e => { setGBat(e.target.value); setGNiv(e.target.value === 'SS' ? '-1' : '0'); }} style={SEL}>
              {bats.map(b => <option key={b} value={b}>{b === 'SS' ? 'Sous-sol' : BATL(b)}</option>)}
            </FormSelect>
            <FormSelect aria-label="Niveau" value={gNiv} onChange={e => setGNiv(e.target.value)} style={SEL}>
              {nivOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </FormSelect>
            <Btn onClick={() => download(gabaritDXF(state, gBat, +gNiv), `${ref}_${gBat}_${niveauCode(+gNiv)}.dxf`)} style={{ minWidth: 150 }}>Télécharger</Btn>
          </div>
        )}
      </div>

      <div style={ROW}>
        <div>
          <div style={T}>Exemple de plan conforme (.dxf)</div>
          <div style={D}>{hasDossier ? 'Plan dessiné avec les lots du dossier, pour montrer au dessinateur le résultat attendu.' : 'Disponible une fois un dossier ouvert.'}</div>
        </div>
        {hasDossier && <Btn variant="ghost" onClick={() => download(exempleDXF(state), `${ref}_exemple_conforme.dxf`)} style={{ minWidth: 150 }}>Télécharger</Btn>}
      </div>

      {charte && (
        <div onClick={() => setCharte(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,29,61,.45)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label="Charte DXF COPROCIV" onClick={e => e.stopPropagation()} style={{ width: 'min(1100px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#F6F3EC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontFamily: 'Cinzel, Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--b0)' }}>Charte DXF COPROCIV</span>
              <Btn variant="ghost" onClick={() => setCharte(false)}>Fermer</Btn>
            </div>
            <CharteDxf />
          </div>
        </div>
      )}
    </div>
  );
}
