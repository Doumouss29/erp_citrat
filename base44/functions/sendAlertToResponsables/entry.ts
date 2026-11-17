import { hseDetails, notify, officialLogo } from "../../shared/communications.ts";
import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.60';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'hse');
    if (denied) return denied;
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const eventId = String(payload.event_id || payload.data?.id || '').trim();

    if (!eventId) {
      return Response.json({ success: false, error: 'Identifiant de fiche manquant' }, { status: 400 });
    }

    // Source de vérité : la fiche enregistrée en base (lecture soumise aux RLS).
    // Le contenu de l'e-mail ne peut donc pas être forgé par l'appelant.
    const event = await base44.entities.HSEEvent.get(eventId).catch(() => null);

    if (!event) {
      return Response.json({ success: false, error: 'Fiche introuvable' }, { status: 404 });
    }

    // Seuls l'auteur de la fiche et les administrateurs peuvent déclencher l'alerte
    // (même règle que la modification de la fiche) : évite l'envoi en boucle
    // d'e-mails aux responsables HSE par n'importe quel utilisateur connecté.
    const isAdmin = user.role === 'admin';
    const isAuthor = (event.created_by_id && event.created_by_id === user.id) ||
      (event.created_by && String(event.created_by).toLowerCase() === String(user.email || '').toLowerCase());
    if (!isAdmin && !isAuthor) {
      return Response.json({ success: false, error: "Seul l'auteur de la fiche ou un administrateur peut lancer l'alerte" }, { status: 403 });
    }

    // Destinataires : la liste « Alertes HSE » de l'administration, limitée aux comptes actifs du portail.
    if (payload.action !== 'list' && (payload.action !== 'send' || !Array.isArray(payload.referent_ids) || !payload.referent_ids.length ||
        !payload.referent_ids.every(id => typeof id === 'string' && id.length > 0))) {
      return Response.json({ error: 'Cochez au moins un référent.' }, { status: 400 });
    }
    const selected = new Set<string>(payload.referent_ids || []);
    const srv = base44.asServiceRole;
    const [responsables, users] = await Promise.all([
      srv.entities.ResponsableHSE.filter({ actif: true }),
      srv.entities.User.list('-created_date', 5000, 0, ['id','email','role','statut','grade','super_admin','access','consentement_version']),
    ]);
    const accounts = new Map((users || []).map((u) => [String(u.email || '').trim().toLowerCase(), u]));
    const eligible = [];
    const report = [];
    for (const r of responsables || []) {
      if (payload.action === 'send' && !selected.has(r.id)) continue;
      const account = accounts.get(String(r.email || '').trim().toLowerCase());
      if (account && !(await appDenial(base44, account, 'hse'))) {
        if (!eligible.some(entry => entry.account.id === account.id)) eligible.push({ id: r.id, nom: r.nom, profil: r.profil, account });
      }
    }
    if (payload.action === 'list') {
      return Response.json({ referents: eligible.map(({ id, nom, profil }) => ({ id, nom, profil })) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const recipients = eligible.filter(r => selected.has(r.id));
    if (recipients.length !== selected.size) {
      return Response.json({ error: 'La liste des référents a changé. Rouvrez la sélection.' }, { status: 409 });
    }
    const requestId = payload.request_id;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) {
      return Response.json({ error: 'Rechargez la page et rouvrez la sélection des référents.' }, { status: 400 });
    }
    const key = user.id + '/' + requestId;
    const reservation = await srv.entities.HSEEvent.updateMany(
      { id: event.id, alert_request_ids: { $ne: key } },
      { $push: { alert_request_ids: { $each: [key], $slice: -200 } } }
    );
    if (!reservation.updated) {
      return Response.json({ success: true, duplicate: true, message: 'Cette confirmation a déjà été prise en compte. Aucun nouvel envoi.' });
    }

    const reference = String(event.reference || 'N/A');
    const details = hseDetails(event);
    const logo = officialLogo(srv);
    for (let i = 0; i < recipients.length; i += 4) {
      const batch = await Promise.all(recipients.slice(i, i + 4).map(async ({ nom, account }) => {
        const result = await notify(srv, { module: 'HSE-PRESFOR', type: 'general', id: event.id, event: 'alerte/' + key,
          to: account.email, details, reference, title: 'Alerte HSE · ' + reference, message: 'Une fiche HSE nécessite votre attention. Consultez les détails dans votre espace sécurisé.',
          path: '/hse?fiche=' + encodeURIComponent(event.id), button: 'Consulter la fiche' }, true, logo);
        const status = result === 'accepted' ? 'sent' : ['invalid', 'unconfirmed'].includes(result) ? 'failed' : 'notified_only';
        return { nom, email: account.email, status };
      }));
      report.push(...batch);
    }
    const delivered = report.filter(r => r.status !== 'failed').length;
    const accepted = report.filter(r => r.status === 'sent').length;
    const emailFailed = report.filter(r => r.status !== 'sent').map(r => r.email);

    return Response.json({
      success: true,
      message: `Notifications internes : ${delivered}. Courriels acceptés : ${accepted}.`,
      count: delivered,
      ...(isAdmin ? { email_failed: emailFailed, report } : {}),
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi d\'alertes:', error?.message || error);
    return Response.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
});