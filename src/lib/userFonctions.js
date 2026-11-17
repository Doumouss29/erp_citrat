export const FONCTIONS = [
  { value: 'admin', label: 'Direction', badge: 'bg-purple-100 text-purple-700' },
  { value: 'responsable', label: 'Responsable de bureau', badge: 'bg-blue-100 text-blue-700' },
  { value: 'adjoint', label: 'Adjoint au chef de bureau', badge: 'bg-indigo-100 text-indigo-700' },
  { value: 'secretaire', label: 'Secrétaire', badge: 'bg-emerald-100 text-emerald-700' },
];

export const fonctionLabel = (v) => FONCTIONS.find((f) => f.value === v)?.label || (v || '—');
export const fonctionBadge = (v) => FONCTIONS.find((f) => f.value === v)?.badge || 'bg-slate-100 text-slate-700';

export const isTransversalUser = (u) => u?.role === 'admin' || u?.fonction === 'admin';

// Tous les membres d'un bureau (responsable, adjoint, secrétaire) travaillent sur les mêmes données.
export const isInUserBureau = (u, bureauId) => {
  if (!u || !bureauId) return false;
  const ids = [u.bureau_id, u.data?.bureau_id, ...(u.bureau_ids || []), ...(u.data?.bureau_ids || [])];
  return ids.includes(bureauId);
};

// Une opération de caisse reste modifiable par son bureau tant qu'elle n'est pas traitée par l'administration.
export const canEditOperationCaisse = (operation, u) => {
  const mine = operation?.cree_par_email === u?.email || operation?.created_by === u?.email || isInUserBureau(u, operation?.bureau_id);
  return mine && ['en_attente', 'en_attente_justification'].includes(operation?.statut);
};

export const userDisplayName = (u) => {
  if (!u) return '—';
  const composed = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
  return composed || u.full_name || u.email || '—';
};