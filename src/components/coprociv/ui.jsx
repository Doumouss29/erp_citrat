import MonthInput from '@/components/shared/MonthInput';
import { FormSelect } from "@/components/ui/form-select";
import React from 'react';

// ---------- Charte COPROCIV ----------
// Polices : Cinzel uniquement pour le logo et le titre de page ; Manrope partout ailleurs, chiffres en chasse fixe.
// Tailles : 12 (notes, en-têtes de tableau) · 14 (texte, champs) · 16 (titres de carte) · 20 (sous-titres) · 24 (titre de page).
// Boutons : principal (marine) · secondaire (contour) · officiel (or : certifier / valider uniquement) · danger.
export const FS = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };
export const NUM = { fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' };
export const C = {
  ink: 'oklch(0.24 0.020 var(--h))',
  muted: 'oklch(0.48 0.020 var(--h))',
  line: 'oklch(0.88 0.012 85)',
  soft: 'oklch(0.91 0.012 85)',
  card: '#FFFDF8',
  head: 'oklch(0.97 0.014 85)'
};
export const CTRL_H = 36;

export const Card = ({ title, right, children, style }) => (
  <section style={{ background: C.card, border: '1px solid ' + C.soft, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
    {title && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', minHeight: 32 }}>
        <h3 style={{ fontSize: FS.md, fontWeight: 700, color: 'var(--b0)', margin: 0, lineHeight: 1.3 }}>{title}</h3>
        {right}
      </div>
    )}
    {children}
  </section>
);

const LBL = { color: C.muted, fontWeight: 600, fontSize: 13 };
const CTRL = { height: CTRL_H, padding: '0 10px', borderRadius: 8, border: '1px solid ' + C.line, background: 'white', color: 'inherit', fontSize: FS.sm, boxSizing: 'border-box' };

export const Field = ({ label, value, onChange, placeholder, type, min, mono, style, disabled, onBlur }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: min || 0, ...style }}>
    {label && <span style={LBL}>{label}</span>}
    {type === 'month'
      ? <MonthInput value={value} onChange={onChange} disabled={disabled} style={{ ...CTRL, background: disabled ? 'oklch(0.97 0.008 85)' : 'white' }} />
      : <input type={type || 'text'} value={value ?? ''} onChange={onChange} onBlur={onBlur} disabled={disabled} placeholder={placeholder || ''}
      style={{ ...CTRL, background: disabled ? 'oklch(0.97 0.008 85)' : 'white', ...(mono || type === 'number' ? NUM : {}) }} />}
  </label>
);

export const SelectField = ({ label, value, onChange, options, style, disabled }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
    {label && <span style={LBL}>{label}</span>}
    <FormSelect value={value ?? ''} onChange={onChange} disabled={disabled} style={CTRL}>
      {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </FormSelect>
  </label>
);

export const Toggle = ({ value, onChange, label }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <span style={LBL}>{label}</span>}
    <button onClick={() => onChange(!value)} style={{ ...CTRL, background: value ? 'var(--b0)' : 'white', color: value ? 'white' : C.muted, fontWeight: 700, cursor: 'pointer' }}>{value ? 'Oui' : 'Non'}</button>
  </label>
);

// variant : primary | ghost (secondaire) | official (or) | danger. « gold » reste accepté comme alias de « official ».
export const Btn = ({ children, onClick, variant = 'primary', disabled, style, title }) => {
  const base = { height: CTRL_H, padding: '0 16px', borderRadius: 8, fontWeight: 700, fontSize: FS.sm, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, border: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
  const styles = {
    primary: { ...base, background: 'var(--b0)', color: 'white' },
    ghost: { ...base, background: 'white', color: 'var(--b0)', border: '1px solid ' + C.line },
    official: { ...base, background: 'var(--gold)', color: 'var(--b0)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)' },
    danger: { ...base, background: 'white', color: 'oklch(0.45 0.13 25)', border: '1px solid oklch(0.85 0.04 25)' }
  };
  return <button onClick={onClick} disabled={disabled} title={title} style={{ ...(styles[variant] || styles.official), ...style }}>{children}</button>;
};

// Trois états fixes, toujours avec un libellé : conforme · à compléter · bloquant (+ neutre et marine pour l'information).
export const Pill = ({ children, tone = 'neutral' }) => {
  const tones = {
    ok: { bg: 'oklch(0.93 0.07 155)', fg: 'oklch(0.36 0.10 155)' },
    warn: { bg: 'oklch(0.94 0.07 70)', fg: 'oklch(0.42 0.12 55)' },
    bad: { bg: 'oklch(0.94 0.04 25)', fg: 'oklch(0.45 0.15 25)' },
    neutral: { bg: 'oklch(0.95 0.02 85)', fg: C.muted },
    navy: { bg: 'var(--b0)', fg: 'white' }
  };
  const t = tones[tone] || tones.neutral;
  return <span style={{ fontSize: FS.xs, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: t.bg, color: t.fg, whiteSpace: 'nowrap', lineHeight: 1.5 }}>{children}</span>;
};

export const Stat = ({ label, value, sub, tone }) => (
  <div style={{ background: C.card, border: '1px solid ' + C.soft, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: FS.xs, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{label}</span>
    <span style={{ ...NUM, fontSize: FS.xl, fontWeight: 800, color: tone || 'var(--b0)', lineHeight: 1.2 }}>{value}</span>
    {sub && <span style={{ fontSize: FS.xs, color: C.muted }}>{sub}</span>}
  </div>
);

export const Mono = ({ children, style }) => <span style={{ ...NUM, ...style }}>{children}</span>;
