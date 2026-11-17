import { retryFailed } from "../../shared/communications.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.60';

/**
 * Sécurité : un compte qui vient de s'inscrire n'a accès à aucune donnée tant qu'un
 * administrateur ne l'a pas validé.
 *
 * Le rôle « user » donné par défaut par Base44 ouvre plusieurs tables en lecture ; il est
 * remplacé par « en_attente », qu'aucune règle n'accepte. Dès que l'administrateur attribue
 * un grade ou une application (updateUserAccess), le compte redevient « user ».
 *
 * Appelée par le workflow planifié « Mise en attente des nouveaux comptes » (toutes les heures,
 * en tant qu'administrateur) : passe en revue tous les comptes. La mise en attente à la première
 * ouverture de l'app est faite par linkEmployeeOnLogin.
 *
 * Ne touche jamais : administrateurs, super administrateurs, superviseurs, lecteurs, comptes
 * déjà validés (grade ou applications attribués, ex. invitation préparée).
 */
export const needsHold = (u: any) =>
  !!u && u.role === 'user' && !u.super_admin && !u.grade && !(Array.isArray(u.access) && u.access.length > 0);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Accès refusé' }, { status: 403 });

    const srv = base44.asServiceRole;
    const users = (await srv.entities.User.list('-created_date', 5000)) || [];
    const held: string[] = [];
    for (const u of users) {
      if (!needsHold(u)) continue;
      try {
        await srv.entities.User.update(u.id, { role: 'en_attente' });
        held.push(u.email);
      } catch (err) {
        console.error('holdNewAccount', u.email, err);
      }
    }
    await retryFailed(srv);
    return Response.json({ success: true, checked: users.length, held });
  } catch (error) {
    console.error('holdNewAccount:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});
