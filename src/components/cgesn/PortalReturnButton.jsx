import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

/**
 * Bouton unifié "Retour au portail" — pilule, icône maison, fond gris-bleu clair.
 * Utilisé partout dans le portail pour un symbole cohérent.
 */
export default function PortalReturnButton({ to = "/portail", onClick, fullWidth = false, className = "" }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <Home className="w-4 h-4 flex-shrink-0" />
      <span>Retour au portail</span>
    </Link>
  );
}