import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, NAV, ROLE_NAV, controlesEDD, phasesEtat } from '@/lib/engine';

const TITLES = { ...Object.fromEntries(NAV), dossiers: 'Mes dossiers', new: 'Nouveau dossier de copropriété', admin: 'Administration' };

const SYNC = {
  loading: ['Connexion…', 'oklch(0.75 0.02 var(--h))'],
  saving: ['Enregistrement…', 'oklch(0.70 0.15 55)'],
  saved: ['Enregistré en ligne', 'oklch(0.64 0.14 155)'],
  error: ['Non enregistré en ligne', 'oklch(0.55 0.18 25)'],
  local: ['Enregistré dans ce navigateur', 'oklch(0.70 0.15 55)']
};
const H1 = { fontFamily: 'Cinzel, Georgia, serif', fontSize: 24, fontWeight: 700, letterSpacing: '.02em', color: 'var(--b0)', lineHeight: 1.25, margin: 0 };
const MUTED = 'oklch(0.48 0.020 var(--h))';
const BAR = { borderBottom: '1px solid oklch(0.91 0.012 85)', background: '#FFFDF8', position: 'sticky', top: 0, zIndex: 5 };
const MenuBtn = ({ onMenu }) => onMenu ? <button aria-label="Menu" onClick={onMenu} style={{ width: 38, height: 38, borderRadius: 9, border: '1px solid oklch(0.88 0.012 85)', background: 'white', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>☰</button> : null;

export default function Header({ onMenu }) {
  const { state, setScreen } = useCopro();
  // Pendant la création d'un dossier, l'en-tête ne montre pas le dossier précédent.
  const hasDossier = !!state.did && state.screen !== 'new' && state.screen !== 'admin';
  const pad = onMenu ? '10px 16px' : '12px 32px';

  if (!hasDossier) {
    return (
      <header style={{ ...BAR, minHeight: 72, display: 'flex', alignItems: 'center', gap: 16, padding: pad }}>
        <MenuBtn onMenu={onMenu} />
        <h1 style={H1}>{TITLES[state.screen] || 'COPROCIV'}</h1>
      </header>
    );
  }

  const etats = phasesEtat(state, controlesEDD(state, compute(state)));
  const allowed = ROLE_NAV[state.role || 'geometre'] || [];
  const [syncLabel, syncColor] = SYNC[state.sync] || SYNC.local;
  const savedLabel = syncLabel + (state.savedAt && (state.sync === 'saved' || state.sync === 'local') ? ' · ' + new Date(state.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <header style={{ ...BAR, padding: pad, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: onMenu ? 10 : 16, flexWrap: 'wrap' }}>
        <MenuBtn onMenu={onMenu} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <h1 style={H1}>{TITLES[state.screen] || 'COPROCIV'}</h1>
        </div>
        <div title={state.sync === 'saved' ? 'Les dossiers sont enregistrés dans la base et partagés entre intervenants' : 'Les modifications sont conservées dans ce navigateur'} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: syncColor }} />{savedLabel}
        </div>
      </div>
      {/* Frise d'avancement : une étape par phase, cliquable vers sa première page. */}
      <ol aria-label="Avancement du dossier" style={{ display: 'flex', gap: 6, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
        {etats.map((p, i) => {
          const target = p.k === 'finaliser' ? 'controle' : p.screens.find(s => allowed.includes(s));
          const here = p.screens.includes(state.screen);
          const tone = p.done ? { bg: 'oklch(0.94 0.06 155)', fg: 'oklch(0.36 0.10 155)', dot: 'oklch(0.55 0.13 155)' }
            : p.partial ? { bg: 'oklch(0.95 0.06 85)', fg: 'oklch(0.40 0.09 75)', dot: 'var(--gold)' }
              : { bg: 'oklch(0.96 0.01 85)', fg: MUTED, dot: 'oklch(0.70 0.15 55)' };
          return (
            <li key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => target && setScreen(target)} disabled={!target} aria-current={here ? 'step' : undefined} style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 999, cursor: target ? 'pointer' : 'default',
                border: here ? '1.5px solid var(--b0)' : '1.5px solid transparent', background: tone.bg, color: tone.fg, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap'
              }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: 'white', background: tone.dot }}>{p.done ? '✓' : i + 1}</span>
                <span style={{ color: 'var(--b0)', fontWeight: 700 }}>{p.l}</span>
                <span>{p.label}</span>
              </button>
              {i < etats.length - 1 && <span aria-hidden style={{ width: 14, height: 1, background: 'oklch(0.85 0.012 85)' }} />}
            </li>
          );
        })}
      </ol>
    </header>
  );
}
