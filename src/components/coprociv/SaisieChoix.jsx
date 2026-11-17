import React from 'react';

// Choix exclusif du mode de saisie des surfaces : saisie manuelle OU import des plans.
// Les deux modes alimentent les mêmes données (lots, niveaux, pièces, annexes, parties communes)
// et sont soumis aux mêmes contrôles avant certification.
export const MODES = [
  {
    k: 'manuelle', t: 'Saisie manuelle',
    d: 'Surfaces saisies lot par lot ou pièce par pièce'
  },
  {
    k: 'plans', t: 'Import des plans (DXF)',
    d: 'Surfaces lues sur des plans conformes à la charte'
  }
];

export default function SaisieChoix({ value, onChoose, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
      {MODES.map(m => {
        const on = value === m.k;
        return (
          <button key={m.k} type="button" disabled={disabled} onClick={() => onChoose(m.k)} style={{
            textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: disabled ? 'default' : 'pointer',
            border: '2px solid ' + (on ? 'var(--b0)' : 'oklch(0.9 0.012 85)'), background: on ? 'oklch(0.97 0.014 85)' : 'white',
            display: 'flex', flexDirection: 'column', gap: 4, color: 'inherit'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--b0)', display: 'grid', placeItems: 'center' }}>
                {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--b0)' }} />}
              </span>
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--b0)' }}>{m.t}</span>
            </span>
            <span style={{ fontSize: 13, color: 'oklch(0.5 0.02 var(--h))', paddingLeft: 24 }}>{m.d}</span>
          </button>
        );
      })}
    </div>
  );
}
