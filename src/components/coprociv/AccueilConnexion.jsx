import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Ruler, Scale } from 'lucide-react';
import { useCopro } from '@/lib/coprocivStore';
import { ACTIVE_ROLES, PHASES, ROLES, THEMES } from '@/lib/engine';

// Page d'accueil de COPROCIV, affichée aux comptes connectés à chaque entrée dans le module
// (les visiteurs non connectés sont renvoyés vers la connexion du portail).
// Le choix fait ici n'accorde aucun droit : le profil effectif reste celui attribué au compte
// automatiquement (géomètre-expert par défaut, voir « Profil effectif » dans coprocivStore).
const ESPACES = {
  geometre: { Icon: Ruler, pages: ['Lots & surfaces', 'Tantièmes', 'Charges spéciales'] },
  notaire: { Icon: Scale, pages: ['Règlement', 'EDD & modificatif', 'Contrôle'] }
};
const initials = s => String(s || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

// Élévation d'immeuble cotée, en filigrane : le fil conducteur du relevé à l'acte.
function Elevation() {
  const windows = [];
  for (let f = 0; f < 4; f++) {
    for (let c = 0; c < 4; c++) windows.push(<rect key={`${f}-${c}`} x={146 + c * 62} y={92 + f * 66} width="34" height="40" />);
  }
  return (
    <svg className="cp-accueil-drawing" viewBox="0 0 520 430" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M110 74 260 22 410 74Z" />
        <rect x="124" y="74" width="272" height="296" />
        <path d="M124 140H396M124 206H396M124 272H396M124 338H396" opacity=".5" />
        {windows}
        <path d="M40 370H480" />
      </g>
      <g fill="none" stroke="var(--gold)" strokeWidth="1.2">
        <path d="M84 74V370M76 82l16-16M76 378l16-16" />
        <path d="M124 402H396M116 410l16-16M388 410l16-16" />
      </g>
    </svg>
  );
}

function EspaceCard({ profil, disabled, onClick }) {
  const [k, label, sub] = profil;
  const { Icon, pages } = ESPACES[k];
  return (
    <button type="button" className="cp-accueil-card" disabled={disabled} onClick={onClick}>
      <span className="cp-accueil-icon"><Icon size={24} aria-hidden /></span>
      <strong>Connexion {label.toLowerCase()}</strong>
      <span className="cp-accueil-sub">{sub}</span>
      <span className="cp-accueil-pages">
        {pages.map(p => <span key={p}>{p}</span>)}
      </span>
      {disabled
        ? <span className="cp-accueil-cta cp-accueil-cta-off"><Lock size={15} aria-hidden />Profil non attribué à votre compte</span>
        : <span className="cp-accueil-cta">Entrer<ArrowRight size={17} aria-hidden /></span>}
    </button>
  );
}

export function AccueilProfil({ onEnter }) {
  const { state, user, isAdmin, setRole, setScreen } = useCopro();
  const navigate = useNavigate();
  // Si un enregistrement est en cours, on lui laisse le temps de finir avant de quitter le module.
  const toPortal = (e) => {
    if (state.sync !== 'saving') return;
    e.preventDefault();
    setTimeout(() => navigate('/portail'), 1200);
  };
  // Profil attribué automatiquement : géomètre-expert par défaut pour tout compte ayant accès à COPROCIV.
  const assigned = user ? (ACTIVE_ROLES.includes(user.copro_profil) ? user.copro_profil : 'geometre') : null;
  const allowed = k => isAdmin || assigned === k;

  const enter = (k) => {
    if (k && isAdmin) setRole(k);
    setScreen('dossiers');
    onEnter();
  };

  const who = user ? (user.full_name || user.email) : '';
  return (
    <div className="cp-accueil">
      <aside className="cp-accueil-brand">
        <Elevation />
        <img src={THEMES.marine.logo} alt="COPROCIV" />
        <div className="cp-accueil-pitch">
          <p className="cp-accueil-lead">Du relevé du géomètre-expert à la validation du notaire.</p>
          <p>État descriptif de division, règlement de copropriété et tantièmes réunis dans un même dossier.</p>
        </div>
        <ol className="cp-accueil-phases">
          {PHASES.map(([k, label], i) => <li key={k}><span>{i + 1}</span>{label}</li>)}
        </ol>
      </aside>

      <main className="cp-accueil-main">
        <header className="cp-accueil-top">
          <Link to="/portail" onClick={toPortal} className="cp-accueil-back"><ArrowLeft size={16} aria-hidden />Retour au portail</Link>
          {who && (
            <span className="cp-accueil-user">
              <span className="cp-accueil-avatar" aria-hidden>{initials(who)}</span>
              <span className="cp-accueil-name">{who}</span>
            </span>
          )}
        </header>

        <div className="cp-accueil-content">
          <p className="cp-accueil-eyebrow">Bienvenue sur COPROCIV</p>
          <h1>Choisissez votre espace</h1>
          <div className="cp-accueil-cards">
            {ROLES.map(r => <EspaceCard key={r[0]} profil={r} disabled={!allowed(r[0])} onClick={() => enter(r[0])} />)}
          </div>
        </div>
      </main>
    </div>
  );
}
