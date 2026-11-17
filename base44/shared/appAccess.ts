type Account = {
  role?: string; statut?: string; consentement_version?: string; grade?: string;
  access?: string[]; super_admin?: boolean;
};

export function isInactive(user: Account) {
  return user.statut === 'suspendu' || user.role === 'suspendu' || user.role === 'en_attente';
}

export async function appDenial(client: any, user: Account | null, app: string) {
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  const denied = () => Response.json({ error: 'Accès refusé' }, { status: 403 });
  if (isInactive(user) || String(user.consentement_version || '') !== '1') return denied();
  if (user.role === 'admin' || user.super_admin || user.access?.includes(app)) return null;
  if (!user.grade) return denied();
  const profiles = await client.asServiceRole.entities.AccessProfile.filter({ profile_id: user.grade });
  return profiles[0]?.apps?.includes(app) ? null : denied();
}
