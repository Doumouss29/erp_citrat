import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Accepte une invitation en attente pour l'utilisateur connecté.
 * - Vérifie qu'une invitation existe avec email === user.email et statut === 'en_attente'.
 * - Définit user.organisation_id via asServiceRole (champ verrouillé par RLS).
 * - Marque l'invitation comme acceptée.
 * L'utilisateur ne peut pas choisir une organisation arbitraire : l'invitation
 * doit exister et avoir été créée par un admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Vérifier qu'une invitation en attente existe pour cet email.
    // Lecture en service role : l'invitation (organisation, commune) est créée et
    // modifiable uniquement par un administrateur (RLS update = admin).
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ email: user.email, statut: 'en_attente' });
    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Aucune invitation en attente' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Définir organisation_id via asServiceRole (champ verrouillé)
    await base44.asServiceRole.entities.User.update(user.id, {
      organisation_id: invitation.organisation_id,
    });

    // Marquer l'invitation comme acceptée
    await base44.asServiceRole.entities.Invitation.update(invitation.id, { statut: 'acceptee' });

    return Response.json({ success: true, organisation_id: invitation.organisation_id });
  } catch (error) {
    console.error('acceptInvitation:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});