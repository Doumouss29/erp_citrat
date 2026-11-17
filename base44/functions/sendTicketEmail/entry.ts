import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.60';

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'assistancenum');
    if (denied) return denied;
    if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const { ticketId } = body;

    if (!ticketId) {
      return Response.json({ error: 'ticketId manquant' }, { status: 400 });
    }

    // Dériver les données du ticket réellement créé côté serveur (anti-relais ouvert)
    const ticket = await base44.asServiceRole.entities.SiTicket.get(ticketId);
    if (!ticket) {
      return Response.json({ error: 'Ticket non trouvé' }, { status: 404 });
    }

    // Anti-relais d'e-mail : le destinataire doit être l'appelant authentifié.
    // On ignore requester_email (champ libre contrôlé par le créateur) et on
    // verrouille l'envoi à l'adresse de l'utilisateur connecté.
    const recipientEmail = String(user.email || '').trim();
    if (!isValidEmail(recipientEmail)) {
      return Response.json({ error: 'Destinataire invalide' }, { status: 400 });
    }
    // Vérifier que l'appelant est bien le créateur du ticket ou un admin
    const isCreator = ticket.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return Response.json({ error: 'Non autorisé pour ce ticket' }, { status: 403 });
    }

    const reservation = await base44.asServiceRole.entities.SiTicket.updateMany(
      { id: ticket.id, $or: [{ confirmation_en_cours_le: { $exists: false } }, { confirmation_en_cours_le: null }] },
      { $set: { confirmation_en_cours_le: new Date().toISOString() } }
    );
    if (!reservation.updated) return Response.json({ error: 'Envoi déjà pris en compte' }, { status: 409 });

    const ticketNumber = ticket.ticket_number || ticket.id;
    const safeTitle = escapeHtml(ticket.title || '');
    const safeApplication = escapeHtml(ticket.application || '');
    const safePriority = escapeHtml(ticket.priority || '');
    const safeRequesterName = escapeHtml(ticket.requester_name || '');
    const safeTicketNumber = escapeHtml(ticketNumber);

    // Créer une notification pour le demandeur
    try {
      await base44.asServiceRole.entities.SiNotification.bulkCreate([
      {
        user_email: recipientEmail,
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        type: 'nouveau_ticket',
        message: `Votre ticket ${ticketNumber} "${ticket.title || ''}" a été créé et est en attente de prise en charge.`,
      },
      ]);
    } catch (error) {
      await base44.asServiceRole.entities.SiTicket.update(ticket.id, { confirmation_en_cours_le: null });
      throw error;
    }

    // Envoyer un email de confirmation au demandeur
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Ticket ${ticketNumber} créé - CGESN Support SI`,
        html: `
          <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f5c52; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 20px;">CGESN Support SI</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #0f5c52; margin-top: 0;">Ticket créé avec succès</h2>
              <p style="color: #374151; font-size: 14px;">Bonjour ${safeRequesterName},</p>
              <p style="color: #374151; font-size: 14px;">Votre demande d'assistance a bien été enregistrée. Voici les détails :</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f3f4f6;">Numéro</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safeTicketNumber}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f3f4f6;">Titre</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safeTitle}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f3f4f6;">Application</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safeApplication}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f3f4f6;">Priorité</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safePriority}</td></tr>
              </table>
              <p style="color: #374151; font-size: 14px;">Un technicien prendra en charge votre demande dans les meilleurs délais. Vous pouvez suivre l'état de votre ticket via le portail.</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Ceci est un message automatique, merci de ne pas répondre.</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      // L'email peut échouer si pas de custom domain - non bloquant
      console.log('Email non envoyé:', emailErr.message);
    }

    return Response.json({ success: true, notificationsCreated: 1 });
  } catch (error) {
    console.error('Erreur sendTicketEmail:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}