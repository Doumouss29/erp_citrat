import { base44 } from '@/api/base44Client';

const asArray = (r) => (Array.isArray(r) ? r : r?.items || []);

/**
 * Responsable des tickets : le super administrateur (case « Super administrateur » dans
 * Administration). À défaut, l'administrateur le plus ancien (propriétaire du portail).
 */
export async function getTicketOwner() {
  try {
    const admins = asArray(await base44.entities.User.filter({ role: 'admin' }, { sort: 'created_date', limit: 100 }));
    const owner = admins.find((u) => u.super_admin) || admins[0];
    return owner ? { email: owner.email, name: owner.full_name || owner.email } : null;
  } catch {
    return null;
  }
}
