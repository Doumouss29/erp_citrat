import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Suppression définitive du compte de l'utilisateur connecté (et de lui seul).
 *
 * - L'identité vient de la session : aucun identifiant n'est accepté depuis le navigateur.
 * - L'utilisateur doit retaper son adresse e-mail pour confirmer.
 * - Les comptes administrateurs et les comptes bureaux partagés sont refusés : ils passent par la DSI.
 *
 * Supprimé : le compte, ses identifiants, ses notifications, sa progression CSST et ses affectations.
 * Anonymisé : le demandeur sur ses tickets d'assistance.
 * Conservé (archivage légal, Politique §5) : fiche employé, congés, absences, pointages,
 * rapports d'activité, preuves de consentement et journal d'audit.
 */
const rows = (result: unknown): Array<Record<string, any>> => {
  if (Array.isArray(result)) return result;
  const items = (result as { items?: unknown })?.items;
  return Array.isArray(items) ? items : [];
};

// Retraite une entité par lots jusqu'à ce que plus aucune ligne ne corresponde.
async function forEachRow(entity: any, query: Record<string, unknown>, action: (row: Record<string, any>) => Promise<unknown>) {
  for (let batch = 0; batch < 100; batch++) {
    const found = rows(await entity.filter(query, null, 200));
    if (found.length === 0) return;
    for (const row of found) await action(row);
  }
  throw new Error('Trop de lignes à traiter');
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Méthode non autorisée' }, { status: 405 });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let body: { confirm_email?: unknown } = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const email = String(user.email);
    if (String(body.confirm_email ?? '').trim().toLowerCase() !== email.trim().toLowerCase()) {
      return Response.json({ error: "L'adresse saisie ne correspond pas à votre compte." }, { status: 400 });
    }

    if (user.role === 'admin' || user.super_admin === true) {
      return Response.json({ error: "Un compte administrateur ne peut pas être supprimé ici. Contactez la DSI du CGESN." }, { status: 403 });
    }
    const srv = base44.asServiceRole.entities;
    const terminals = rows(await srv.OfficeTerminal.filter({ email }));
    if (terminals.length > 0) {
      return Response.json({ error: "Un compte bureau partagé ne peut pas être supprimé ici. Contactez la DSI du CGESN." }, { status: 403 });
    }

    // Trace écrite avant toute suppression : aucune suppression sans audit.
    await srv.JournalAudit.create({
      user_email: email,
      type_action: 'suppression',
      champ_modifie: 'compte_utilisateur',
      ancienne_valeur: user.id,
      nouvelle_valeur: 'Suppression demandée par le titulaire',
    });

    const deletions: Array<[any, Record<string, unknown>]> = [
      [srv.Notification, { user_email: email }],
      [srv.SiNotification, { user_email: email }],
      [srv.CsstProgress, { user_email: email }],
      [srv.SiRequester, { email }],
      [srv.Invitation, { email }],
      [srv.AnnuaireAttente, { email }],
      [srv.ResponsableHSE, { email }],
      [srv.SecretaireBureau, { email }],
      [srv.CgesnUser, { email }],
    ];
    for (const [entity, query] of deletions) {
      await forEachRow(entity, query, (row) => entity.delete(row.id));
    }

    await forEachRow(srv.SiTicket, { requester_email: email }, (row) =>
      srv.SiTicket.update(row.id, { requester_email: '', requester_name: 'Compte supprimé' })
    );

    // En dernier : en cas d'échec plus haut, le compte existe encore et la demande peut être relancée.
    await srv.User.delete(user.id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('deleteMyAccount', error);
    return Response.json({ error: 'La suppression a échoué. Réessayez ou contactez la DSI du CGESN.' }, { status: 500 });
  }
});
