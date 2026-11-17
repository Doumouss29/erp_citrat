import { FormSelect } from "@/components/ui/form-select";
import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { TYPES, LVS, LET, WTYPES, wCnt, TYPE_COPRO } from '@/lib/engine';
import SaisieChoix from '@/components/coprociv/SaisieChoix';

// Type de copropriété : il règle les natures de lots, la pondération, les parties communes et la charte DXF.
const TYPE_CARDS = [
  ['verticale', 'Immeubles, lots par niveau'],
  ['horizontale', 'Villas et terrains sur parcelles'],
  ['mixte', 'Immeubles et villas']
];
const toggle = (label, on, click) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
    <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>{label}</span>
    <button type="button" onClick={click} style={{
      height: 34, borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', background: on ? 'var(--b0)' : 'white',
      color: on ? 'white' : 'oklch(0.45 0.03 var(--h))', fontWeight: 700, fontSize: 14, cursor: 'pointer'
    }}>{on ? 'Oui' : 'Non'}</button>
  </label>
);
const USAGE_OPTS = [['habitation', "Habitation"], ['mixte', "Mixte habitation / commerces"], ['tertiaire', "Tertiaire / bureaux"]];
const field = (label, val, on, opts = {}) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, minWidth: opts.min || 0 }}>
    <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>{label}</span>
    <input value={val} onChange={on} placeholder={opts.ph || ''} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', background: 'white', fontSize: 14 }} />
  </label>
);

export default function NouveauDossier() {
  const { state, setWiz, setWizBat, addWizBat, removeWizBat, createDossier } = useCopro();
  const W = state.wiz;
  const role = state.role || 'geometre';
  if (role !== 'geometre') {
    return <div style={{ padding: 20, background: '#FFFDF8', borderRadius: 12, border: '1px solid oklch(0.91 0.012 85)', color: 'oklch(0.45 0.03 var(--h))' }}>
      Seul le profil Géomètre-expert peut créer un dossier.
    </div>;
  }

  const T = TYPE_COPRO[W.type] ? W.type : 'verticale';
  const showBats = T !== 'horizontale', showVillas = T !== 'verticale';
  const nV = showVillas ? Math.max(0, parseInt(W.nVillas) || 0) : 0, nT = showVillas ? Math.max(0, parseInt(W.nTerr) || 0) : 0;
  const invalid = !(W.nom || '').trim() || !W.saisie || (T === 'horizontale' && nV + nT === 0);

  // Aperçu des lots
  let pid = 1;
  const preview = W.bats.map((b, i) => {
    const E = Math.max(0, parseInt(b.etages) || 0);
    const lv = [];
    for (let n = 0; n <= E; n++) {
      const chips = [];
      const inputs = WTYPES.map(([t, l]) => {
        const N = wCnt(W, i, n, t);
        for (let j = 0; j < N; j++) chips.push({ t: 'Lot ' + (pid++), bg: TYPES[t].tint, fg: TYPES[t].ink });
        return { l, v: N, on: e => setWiz({ cnt: { ...(W.cnt || {}), [i + ':' + n + ':' + t]: e.target.value } }) };
      });
      lv.unshift({ label: LVS(n), chips, inputs, empty: !chips.length });
    }
    return { name: (b.name || 'Bâtiment ' + LET[i]) + ' · R+' + E, levels: lv };
  });

  const wLots = W.bats.reduce((a, b, bi) => {
    let t = 0;
    for (let n = 0; n <= Math.max(0, parseInt(b.etages) || 0); n++) WTYPES.forEach(([ty]) => t += wCnt(W, bi, n, ty));
    return a + t;
  }, 0) + (W.ss ? (+W.caves || 0) + (+W.boxes || 0) + (+W.locs || 0) + (+W.parks || 0) : 0);
  const nLots = (showBats ? wLots : 0) + nV + nT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Identification */}
      <section style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)', margin: 0 }}>Identification</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {field("Nom de la copropriété", W.nom, e => setWiz({ nom: e.target.value }), { ph: "Résidence Les Flamboyants" })}
          {field("Adresse", W.adresse, e => setWiz({ adresse: e.target.value }), { ph: "Boulevard Latrille" })}
          {field("Commune", W.commune, e => setWiz({ commune: e.target.value }), { ph: "Cocody" })}
          {field("Ville", W.ville, e => setWiz({ ville: e.target.value }), { ph: "Abidjan" })}
          {field("Titre foncier *", W.tf, e => setWiz({ tf: e.target.value }), { ph: "TF n° 214 587" })}
          {field("ACD (arrêté de concession définitive)", W.acd || '', e => setWiz({ acd: e.target.value }), { ph: "ACD n° … du …" })}
          {field("Contenance du terrain", W.contenance || '', e => setWiz({ contenance: e.target.value }), { ph: "12 a 40 ca / 1 240 m²" })}
          {field("Section cadastrale", W.section, e => setWiz({ section: e.target.value }), { ph: "CK" })}
          {field("Parcelle", W.parcelle, e => setWiz({ parcelle: e.target.value }), { ph: "112" })}
          {field("Îlot / lot", W.ilot, e => setWiz({ ilot: e.target.value }), { ph: "Îlot 45 · lot 312" })}
          {field("Géomètre-expert", W.geometre, e => setWiz({ geometre: e.target.value }), { ph: "Cabinet Koné & Associés" })}
          {field("Notaire", W.notaire, e => setWiz({ notaire: e.target.value }), { ph: "Me A. Diallo" })}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
            <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Usage de l'immeuble</span>
            <FormSelect value={W.usage} onChange={e => setWiz({ usage: e.target.value, cnt: {} })} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', background: 'white', fontSize: 14 }}>
              {USAGE_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </FormSelect>
          </label>
        </div>
      </section>

      {/* Type de copropriété */}
      <section style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)', margin: 0 }}>Type de copropriété</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {TYPE_CARDS.map(([k, d]) => {
            const on = T === k;
            return (
              <button key={k} type="button" onClick={() => setWiz({ type: k })} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: '2px solid ' + (on ? 'var(--b0)' : 'oklch(0.9 0.012 85)'), background: on ? 'oklch(0.97 0.014 85)' : 'white', display: 'flex', flexDirection: 'column', gap: 4, color: 'inherit' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--b0)', display: 'grid', placeItems: 'center' }}>{on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--b0)' }} />}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--b0)' }}>{TYPE_COPRO[k]}</span>
                </span>
                <span style={{ fontSize: 13, color: 'oklch(0.5 0.02 var(--h))', paddingLeft: 24 }}>{d}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Mode de saisie des surfaces */}
      <section style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)', margin: 0 }}>Comment les surfaces seront-elles renseignées ?</h3>
        <SaisieChoix value={W.saisie} onChoose={k => setWiz({ saisie: k })} />
        <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>Type et mode de saisie sont <b>définitifs</b> pour ce dossier.</div>
      </section>

      {/* Bâtiments */}
      {showBats && <section style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)', margin: 0 }}>Bâtiments</h3>
          {W.bats.length < LET.length && (
            <button onClick={addWizBat} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px dashed oklch(0.75 0.033 var(--h))', background: 'transparent', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'oklch(0.45 0.077 var(--h))' }}>+ Ajouter un bâtiment</button>
          )}
        </div>
        {/* Une ligne par bâtiment ; le sous-sol (commun à la résidence) et ses lots figurent sur la première ligne. */}
        {W.bats.map((b, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `minmax(160px, 1fr) 90px 100px 100px${W.ss ? ' repeat(4, 84px)' : ''} 32px`, gap: 10, alignItems: 'end', overflowX: 'auto' }}>
            {field("Nom", b.name, e => setWizBat(i, { name: e.target.value }))}
            {field("Étages (R+)", String(b.etages), e => setWizBat(i, { etages: e.target.value, cnt: {} }))}
            {toggle('Ascenseur', !!b.lift, () => setWizBat(i, { lift: !b.lift }))}
            {i === 0 ? toggle('Sous-sol', !!W.ss, () => setWiz({ ss: !W.ss })) : <span />}
            {W.ss && (i === 0 ? <>
              {field("Caves", String(W.caves), e => setWiz({ caves: e.target.value }))}
              {field("Boxes", String(W.boxes ?? 0), e => setWiz({ boxes: e.target.value }))}
              {field("Locaux", String(W.locs ?? 0), e => setWiz({ locs: e.target.value }))}
              {field("Parkings", String(W.parks), e => setWiz({ parks: e.target.value }))}
            </> : <><span /><span /><span /><span /></>)}
            {W.bats.length > 1 ? (
              <button onClick={() => removeWizBat(i)} title="Retirer ce bâtiment" style={{ height: 34, borderRadius: 8, border: '1px solid oklch(0.85 0.04 25)', background: 'white', color: 'oklch(0.45 0.13 25)', fontWeight: 700, cursor: 'pointer' }}>×</button>
            ) : <span />}
          </div>
        ))}
        {W.ss && <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>Sous-sol : caves / celliers, boxes fermés, locaux annexes privatifs (deux-roues, rangement…) et parkings créés comme lots.</div>}
      </section>}

      {/* Villas et lots de terrain (copropriété horizontale ou mixte) */}
      {showVillas && (
        <section style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)', margin: 0 }}>Villas et lots de terrain</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {field("Nombre de villas", String(W.nVillas ?? ''), e => setWiz({ nVillas: e.target.value }))}
            {field("Surface habitable (m²)", String(W.vSurf ?? ''), e => setWiz({ vSurf: e.target.value }))}
            {field("Parcelle par villa (m²)", String(W.vParc ?? ''), e => setWiz({ vParc: e.target.value }))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <span style={{ color: 'oklch(0.5 0.020 var(--h))', fontWeight: 600 }}>Niveaux des villas</span>
              <FormSelect value={String(W.vNiv ?? 0)} onChange={e => setWiz({ vNiv: e.target.value })} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid oklch(0.88 0.012 85)', background: 'white', fontSize: 14 }}>
                {[['0', 'Plain-pied (RDC)'], ['1', 'RDC + 1 étage'], ['2', 'RDC + 2 étages']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </FormSelect>
            </label>
            {field("Lots de terrain nu", String(W.nTerr ?? ''), e => setWiz({ nTerr: e.target.value }))}
            {field("Parcelle par terrain (m²)", String(W.tParc ?? ''), e => setWiz({ tParc: e.target.value }))}
          </div>
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 var(--h))' }}>Valeurs par défaut, ajustables lot par lot.</div>
        </section>
      )}

      {/* Nombre de lots par niveau */}
      {showBats && <section style={{ background: '#FFFDF8', border: '1px solid oklch(0.91 0.012 85)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)', margin: 0 }}>Nombre de lots par niveau</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
          {field("Lots par étage (défaut)", String(W.parNiv), e => setWiz({ parNiv: e.target.value, cnt: {} }), { min: 200 })}
          {field("Surface par défaut (m²)", String(W.surf), e => setWiz({ surf: e.target.value }), { min: 200 })}
        </div>
        {preview.map((b, bi) => (
          <div key={bi} style={{ borderTop: '1px solid oklch(0.92 0.012 85)', paddingTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--b0)', marginBottom: 8 }}>{b.name}</div>
            {b.levels.map((lv, li) => (
              <div key={li} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'oklch(0.5 0.020 var(--h))', width: 44 }}>{lv.label}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {lv.inputs.map((inp, ii) => (
                    <label key={ii} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                      <span style={{ color: 'oklch(0.5 0.020 var(--h))' }}>{inp.l}</span>
                      <input type="number" min="0" max="50" value={inp.v} onChange={inp.on} style={{ width: 56, height: 30, padding: '0 6px', borderRadius: 6, border: '1px solid oklch(0.88 0.012 85)', fontSize: 14 }} />
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {lv.chips.map((ch, ci) => (
                    <span key={ci} style={{ fontSize: 12, padding: '2px 7px', borderRadius: 5, background: ch.bg, color: ch.fg, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{ch.t}</span>
                  ))}
                  {lv.empty && <span style={{ fontSize: 12, color: 'oklch(0.6 0.020 var(--h))' }}>—</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
          <span style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>Total : <b style={{ color: 'var(--b0)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{nLots} lot{nLots > 1 ? 's' : ''}</b>{showVillas && nV + nT > 0 ? ` dont ${nV} villa(s) et ${nT} terrain(s)` : ''}</span>
          <span style={{ fontSize: 14, color: invalid ? 'oklch(0.55 0.13 55)' : 'oklch(0.45 0.11 155)', fontWeight: 600 }}>
            {!(W.nom || '').trim() ? 'Renseignez au moins le nom de la copropriété.' : !W.saisie ? 'Choisissez le mode de saisie des surfaces.' : !(W.tf || '').trim() ? 'Prêt. * Le titre foncier pourra être saisi plus tard, mais il est exigé pour certifier l’EDD (art. 379).' : 'Prêt : le dossier sera ouvert sur Lots & surfaces.'}
          </span>
        </div>
      </section>}

      {!showBats && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'oklch(0.5 0.020 var(--h))' }}>Total : <b style={{ color: 'var(--b0)' }}>{nLots} lot{nLots > 1 ? 's' : ''}</b> ({nV} villa(s), {nT} terrain(s))</span>
          <span style={{ fontSize: 14, color: invalid ? 'oklch(0.55 0.13 55)' : 'oklch(0.45 0.11 155)', fontWeight: 600 }}>{!(W.nom || '').trim() ? 'Renseignez au moins le nom de la copropriété.' : !W.saisie ? 'Choisissez le mode de saisie des surfaces.' : nV + nT === 0 ? 'Indiquez au moins une villa ou un lot de terrain.' : 'Prêt : le dossier sera ouvert sur Lots & surfaces.'}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={createDossier} disabled={invalid} style={{
          height: 38, padding: '0 22px', borderRadius: 9, border: 0, background: 'var(--b0)', color: 'white',
          fontWeight: 800, fontSize: 14, cursor: invalid ? 'not-allowed' : 'pointer', opacity: invalid ? 0.5 : 1
        }}>Créer le dossier</button>
      </div>
    </div>
  );
}