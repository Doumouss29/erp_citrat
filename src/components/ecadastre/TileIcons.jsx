import React from 'react';

// Symboles sur mesure des tuiles d'accueil E-CADASTRE (th\u00e8me cadastre / terrain).
// Bicolores : aplat l\u00e9ger + contour, en currentColor pour suivre la couleur du texte de la tuile.

function Svg({ className, children }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Nouvelle collecte : parcelle bornée + ajout
export function CollecteIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M7 15 L24 8 L37 16 L33 33 L11 35 Z" fill="currentColor" fillOpacity="0.22" />
      <path d="M7 15 L24 8 L37 16" strokeDasharray="0" />
      {[[7, 15], [24, 8], [37, 16], [33, 33], [11, 35]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill="currentColor" stroke="none" />
      ))}
      <circle cx="37" cy="37" r="8.5" fill="currentColor" fillOpacity="0.35" />
      <path d="M37 33 v8 M33 37 h8" strokeWidth="2.6" />
    </Svg>
  );
}

// Recensement par carte : carte pli\u00e9e + rep\u00e8re
export function CarteIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M5 13 L17 8 L30 13 L43 8 V36 L30 41 L17 36 L5 41 Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M17 8 V36 M30 13 V41" strokeOpacity="0.55" />
      <path d="M8 27 L14 25 M20 30 L26 32" strokeOpacity="0.45" strokeDasharray="2 3" />
      <path d="M30 31 C30 31 37.5 24 37.5 18.5 A7.5 7.5 0 0 0 22.5 18.5 C22.5 24 30 31 30 31 Z" fill="currentColor" fillOpacity="0.45" />
      <circle cx="30" cy="18.5" r="2.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// Archive : dossiers de parcelles empil\u00e9s
export function ArchiveIcon({ className }) {
  return (
    <Svg className={className}>
      <rect x="11" y="7" width="29" height="20" rx="3" strokeOpacity="0.5" />
      <path d="M6 16 h11 l3.5 4 H40 a2 2 0 0 1 2 2 v17 a2 2 0 0 1 -2 2 H8 a2 2 0 0 1 -2 -2 Z" fill="currentColor" fillOpacity="0.28" />
      <path d="M14 34 L20 28 L27 30 L33 26" strokeOpacity="0.85" />
      <circle cx="14" cy="34" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="33" cy="26" r="1.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// Rapport compact : fiche + graphique
export function RapportIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M12 5 h17 l9 9 v28 a2 2 0 0 1 -2 2 H12 a2 2 0 0 1 -2 -2 V7 a2 2 0 0 1 2 -2 Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M29 5 v9 h9" />
      <path d="M15 14 h8 M15 19 h12" strokeOpacity="0.6" />
      <rect x="15" y="31" width="4.5" height="7" rx="1" fill="currentColor" stroke="none" />
      <rect x="21.75" y="26" width="4.5" height="12" rx="1" fill="currentColor" stroke="none" fillOpacity="0.8" />
      <rect x="28.5" y="22" width="4.5" height="16" rx="1" fill="currentColor" stroke="none" fillOpacity="0.6" />
    </Svg>
  );
}

// Superviseur : cadran de suivi
export function SuperviseurIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M7 33 A17 17 0 0 1 41 33 Z" fill="currentColor" fillOpacity="0.2" stroke="none" />
      <path d="M7 33 A17 17 0 0 1 41 33" />
      <path d="M11.5 22 l2.5 1.8 M24 16 v3 M36.5 22 l-2.5 1.8" strokeOpacity="0.7" />
      <path d="M24 33 L33 20.5" strokeWidth="2.8" />
      <circle cx="24" cy="33" r="3.4" fill="currentColor" stroke="none" />
      <path d="M6 40 h36" strokeOpacity="0.5" />
    </Svg>
  );
}

// Organisation : organigramme de bureaux
export function OrganisationIcon({ className }) {
  return (
    <Svg className={className}>
      <rect x="17" y="5" width="14" height="11" rx="3" fill="currentColor" fillOpacity="0.4" />
      <path d="M24 16 v6 M11 22 h26 M11 22 v6 M37 22 v6" strokeOpacity="0.75" />
      <rect x="4" y="28" width="14" height="11" rx="3" fill="currentColor" fillOpacity="0.22" />
      <rect x="30" y="28" width="14" height="11" rx="3" fill="currentColor" fillOpacity="0.22" />
      <circle cx="24" cy="10.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="33.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="37" cy="33.5" r="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}
