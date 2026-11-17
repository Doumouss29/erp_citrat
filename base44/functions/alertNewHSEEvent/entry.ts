import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Récapitulatif complet de la fiche. Styles écrits sur chaque élément : les messageries retirent souvent les feuilles de style.
function buildEventEmail(event) {
  const formatDate = (value) => {
    if (!value) return 'Non spécifié';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Non spécifié' : date.toLocaleDateString('fr-FR');
  };
  const sectionTitle = (title) => `<div style="background:#f3f4f6;padding:12px;border-left:4px solid #dc2626;font-weight:bold;margin:0 0 12px 0;">${title}</div>`;
  const detail = (label, value) => `<tr><td style="padding:0 12px 8px 0;font-weight:bold;color:#666666;vertical-align:top;width:190px;">${label}</td><td style="padding:0 0 8px 0;vertical-align:top;">${value}</td></tr>`;
  const badge = (text, background, color) => `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;margin:0 8px 8px 0;background:${background};color:${color};">${text}</span>`;
  const list = (text) => {
    const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return '<em style="color:#9ca3af;">Aucun élément renseigné</em>';
    return `<ul style="margin:0;padding-left:20px;">${lines.map((line) => `<li style="margin-bottom:4px;">${escapeHtml(line)}</li>`).join('')}</ul>`;
  };
  const section = (title, text) => `<div style="margin-bottom:20px;">${sectionTitle(title)}${list(text)}</div>`;

  const eventType = escapeHtml(event.event_type || 'Non spécifié');
  const reference = escapeHtml(event.reference || 'N/A');
  const location = event.location || [event.departure_point, event.arrival_point].filter(Boolean).join(' → ');

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#333333;line-height:1.6;max-width:600px;margin:0 auto;border:1px solid #dddddd;border-radius:8px;overflow:hidden;">
  <div style="background:#b91c1c;color:#ffffff;padding:20px;text-align:center;">
    <div style="font-size:24px;font-weight:bold;">${eventType}</div>
    <div style="margin-top:10px;font-size:16px;">Nouvelle Fiche : <strong>${reference}</strong></div>
  </div>
  <div style="padding:20px;">
    <div style="margin-bottom:20px;">
      ${sectionTitle('1. INFORMATIONS GÉNÉRALES')}
      <div style="margin-bottom:12px;">
        ${badge(eventType, '#fee2e2', '#991b1b')}${badge(`Gravité : ${escapeHtml(event.severity || 'Non spécifié')}`, '#fed7aa', '#9a3412')}${badge(`Zone : ${escapeHtml(event.zone || 'Non spécifié')}`, '#e0e7ff', '#312e81')}
      </div>
      <table role="presentation" style="border-collapse:collapse;width:100%;font-size:14px;">
        ${detail('Référence :', `<strong>${reference}</strong>`)}
        ${detail("Type d'évènement :", eventType)}
        ${detail('Nom et prénoms :', escapeHtml(event.persons_involved || 'Non spécifié'))}
        ${detail('Fonction :', escapeHtml(event.person_role || 'Non spécifié'))}
        ${detail('Date de survenue :', escapeHtml(formatDate(event.date_event)))}
        ${detail('Heure :', escapeHtml(event.time_event || 'Non spécifié'))}
        ${detail('Lieu :', escapeHtml(location || 'Non spécifié'))}
      </table>
    </div>
    ${section("2. DESCRIPTION DE L'ÉVÉNEMENT", event.circumstances)}
    ${section("3. CONSÉQUENCES DE L'ÉVÉNEMENT SURVENU", event.injuries_damages)}
    ${section('4. MESURES IMMÉDIATES PRISES', event.immediate_measures)}
    ${section('5. ACTIONS CORRECTIVES ENGAGÉES', event.corrective_actions)}
    ${section('6. ÉTAT DU SUIVI DES ACTIONS', event.action_followup)}
  </div>
  <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">Système d'Alerte HSE | © 2026</div>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fonction réservée au workflow « Alerte Email - Nouvelle Fiche HSE », qui
    // l'appelle en tant qu'administrateur. Sans ce contrôle, n'importe quel
    // utilisateur connecté pouvait déclencher l'envoi d'une alerte pour la fiche
    // de son choix, en lisant un contenu auquel il n'a pas accès.
    if (user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const eventId = String(payload.event_id || payload.data?.id || '').trim();

    if (!eventId) {
      return Response.json({ success: false, error: 'Identifiant de fiche manquant' }, { status: 400 });
    }

    // Source de vérité : la fiche enregistrée en base (appelée aussi par le workflow
    // « Alerte Email - Nouvelle Fiche HSE »). Le contenu ne peut pas être forgé.
    const event = await base44.asServiceRole.entities.HSEEvent.get(eventId).catch(() => null);

    if (!event) {
      return Response.json({ success: false, error: 'Fiche introuvable' }, { status: 404 });
    }

    // Destinataires : la liste « Alertes HSE » de l'administration, limitée aux comptes actifs du portail.
    const srv = base44.asServiceRole;
    const [responsables, users] = await Promise.all([
      srv.entities.ResponsableHSE.filter({ actif: true }),
      srv.entities.User.list('-created_date', 5000),
    ]);
    const accounts = new Map((users || []).map((u) => [String(u.email || '').trim().toLowerCase(), u]));
    const recipients = [];
    const skipped = [];
    for (const r of responsables || []) {
      const account = accounts.get(String(r.email || '').trim().toLowerCase());
      if (account && account.statut !== 'suspendu') recipients.push({ nom: r.nom, account });
      else skipped.push(r.email);
    }
    // Liste vide : les administrateurs restent prévenus, pour qu'aucune alerte ne se perde.
    if (recipients.length === 0) {
      for (const admin of users || []) {
        if (admin.role === 'admin') recipients.push({ nom: admin.full_name, account: admin });
      }
    }
    const reference = String(event.reference || 'N/A');
    const eventType = String(event.event_type || 'Évènement HSE');
    const emailBody = buildEventEmail(event);
    let delivered = 0;
    const emailFailed = [];
    for (const { nom, account } of recipients) {
      try {
        await srv.entities.Notification.create({
          user_email: account.email,
          type: 'general',
          title: `Alerte HSE : ${eventType}`,
          message: `Fiche ${reference}. Consultez le détail dans HSE-PRESFOR.`,
          related_id: event.id,
          is_read: false,
        });
        delivered++;
      } catch (notificationError) {
        console.error(`Notification HSE non créée pour ${account.email}:`, notificationError);
        continue;
      }
      try {
        await srv.integrations.Core.SendEmail({
          to: account.email,
          subject: `🚨 ${eventType} - ${reference}`,
          body: emailBody,
          from_name: 'Système Alerte HSE'
        });
      } catch (emailError) {
        console.error(`Courriel HSE non envoyé à ${account.email}:`, emailError);
        emailFailed.push(`${account.email} : ${String(emailError?.response?.data?.message || emailError?.message || emailError).slice(0, 200)}`);
      }
    }

    return Response.json({
      success: true,
      message: `Alerte envoyée à ${delivered} destinataire(s)`,
      count: delivered,
      skipped,
      email_failed: emailFailed,
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi d\'alerte:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});