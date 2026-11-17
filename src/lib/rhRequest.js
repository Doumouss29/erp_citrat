import { base44 } from '@/api/base44Client';

/**
 * Appelle la fonction serveur rhRequest (workflow congés / absences).
 * Les entités LeaveRequest et Absence ne sont modifiables que par les admins :
 * dépôt, validation et retrait passent par le serveur.
 *
 *   submitRhRequest('leave', data)              → enregistrement créé
 *   reviewRhRequest('absence', id, true, '…')    → enregistrement mis à jour
 *   cancelRhRequest('leave', id)
 */
async function callRhRequest(payload) {
  let res;
  try {
    res = await base44.functions.invoke('rhRequest', payload);
  } catch (error) {
    const message = error?.response?.data?.error || error?.data?.error || error?.message || 'Erreur serveur';
    throw new Error(message);
  }
  const data = res?.data ?? res;
  if (!data || data.success !== true) {
    throw new Error(data?.error || 'Erreur serveur');
  }
  return data;
}

export async function submitRhRequest(kind, data, employeeId) {
  const result = await callRhRequest({ action: 'submit', kind, data, ...(employeeId ? { for_employee_id: employeeId } : {}) });
  return result.record;
}

export async function reviewRhRequest(kind, id, approved, comment) {
  const result = await callRhRequest({ action: 'review', kind, id, approved, comment });
  return result.record;
}

export async function cancelRhRequest(kind, id) {
  await callRhRequest({ action: 'cancel', kind, id });
}
