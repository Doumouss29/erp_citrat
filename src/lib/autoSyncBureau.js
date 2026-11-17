import { base44 } from '@/api/base44Client';

/**
 * Synchronise automatiquement le bureau de l'utilisateur connecté :
 * - Si l'utilisateur est une secrétaire (SecretaireBureau avec son email),
 *   on remplit user.bureau_id (premier bureau) et user.bureau_ids (tous).
 * - Sinon, si l'utilisateur est responsable d'un bureau, on remplit bureau_id.
 * - Ne fait rien si l'utilisateur a déjà bureau_id ET bureau_ids renseignés.
 * - La écriture passe par la fonction backend syncUserBureau (asServiceRole)
 *   car les champs bureau_id/bureau_ids sont verrouillés par RLS.
 * Retourne l'utilisateur éventuellement mis à jour.
 */
export async function ensureUserBureauSynced(user) {
  if (!user || user.role === 'admin') return user;

  const existingBureauId = user.data?.bureau_id || user.bureau_id;
  const existingBureauIds = user.data?.bureau_ids || user.bureau_ids;
  if (existingBureauId && Array.isArray(existingBureauIds) && existingBureauIds.length) {
    return user;
  }

  try {
    const res = await base44.functions.invoke('syncUserBureau', {});
    const data = res?.data || res;
    if (data?.success && data?.bureau_id) {
      const payload = {
        bureau_id: data.bureau_id,
        bureau_code: data.bureau_code || '',
        bureau_ids: data.bureau_ids || [],
      };
      return {
        ...user,
        data: { ...(user.data || {}), ...payload },
        ...payload,
      };
    }
    return user;
  } catch (e) {
    return user;
  }
}