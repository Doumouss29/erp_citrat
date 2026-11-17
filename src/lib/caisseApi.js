import { base44 } from '@/api/base44Client';

/**
 * Toutes les écritures de caisse passent par la fonction serveur caisseOperation :
 * l'auteur est fixé côté serveur, le n° de bon y est attribué et chaque action est journalisée.
 */
async function callCaisse(payload) {
  let res;
  try {
    res = await base44.functions.invoke('caisseOperation', payload);
  } catch (error) {
    const message = error?.response?.data?.error || error?.data?.error || error?.message || 'Erreur serveur';
    throw new Error(message);
  }
  const data = res?.data ?? res;
  if (!data || data.success !== true) throw new Error(data?.error || 'Erreur serveur');
  return data.operation;
}

export const createOperationCaisse = (data) => callCaisse({ action: 'create', data });
export const updateOperationCaisse = (id, data) => callCaisse({ action: 'update', id, data });
export const cancelOperationCaisse = (id, motif) => callCaisse({ action: 'cancel', id, motif });

export const ACTION_LABELS = {
  creation: 'Création',
  modification: 'Modification',
  annulation: 'Annulation',
  suppression: 'Suppression',
  validation: 'Validation',
  rejet: 'Rejet',
};

export const ACTION_BADGES = {
  creation: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  modification: 'bg-amber-50 text-amber-700 ring-amber-200',
  annulation: 'bg-red-50 text-red-700 ring-red-200',
  suppression: 'bg-red-50 text-red-700 ring-red-200',
  validation: 'bg-blue-50 text-blue-700 ring-blue-200',
  rejet: 'bg-slate-100 text-slate-700 ring-slate-200',
};
