import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Conserve les rattachements existants et la mise en attente des nouveaux comptes.
 * Un nom ou une adresse ressemblant à une fiche RH ne prouve aucune autorisation :
 * seuls les rattachements et droits attribués par l'administration sont utilisés.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (user.super_admin || user.role === 'admin') return Response.json({ status: 'ignored' });
    if (user.role === 'suspendu' || user.statut === 'suspendu') {
      return Response.json({ error: 'Compte suspendu' }, { status: 403 });
    }
    if (user.role === 'user' && !user.grade && !(Array.isArray(user.access) && user.access.length > 0)) {
      await base44.asServiceRole.entities.User.update(user.id, { role: 'en_attente' });
      return Response.json({ status: 'admin_validation_required' });
    }
    // Lecture dans le contexte de l'appelant : aucune élévation ni rapprochement approximatif.
    const linked = await base44.entities.Employee.filter({ email: user.email }, '-created_date', 1);
    if (linked?.[0]) return Response.json({ status: 'already_linked', employee_id: linked[0].id });
    return Response.json({ status: 'admin_validation_required' });
  } catch (error) {
    console.error('linkEmployeeOnLogin:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});

