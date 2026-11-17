import { base44 } from "@/api/base44Client";
import { sendMail } from "@/components/utils/emailTemplate";
import { isValidEmail } from "@/lib/htmlUtils";

/**
 * Service centralisé pour créer des notifications et envoyer des emails
 * Évite la duplication de code et gère les timeouts automatiquement
 */

export const createNotification = async (userEmail, type, title, message, relatedId = null) => {
  try {
    await base44.entities.Notification.create({
      user_email: userEmail,
      type,
      title,
      message,
      related_id: relatedId,
      is_read: false
    });
  } catch (error) {
    console.error("Erreur création notification:", error);
  }
};

export const sendEmail = async (to, subject, body) => {
  if (!isValidEmail(to)) {
    console.error("Destinataire e-mail invalide, envoi annulé:", to);
    return;
  }
  try {
    await sendMail({ to, subject, body });
  } catch (error) {
    console.error("Erreur envoi email:", error);
  }
};

export const notifyAndEmailUser = async (userEmail, type, title, message, subject, body, relatedId = null) => {
  if (!isValidEmail(userEmail)) {
    console.error("Destinataire e-mail invalide, notification annulée:", userEmail);
    return;
  }
  // Notification in-app (immédiate)
  setTimeout(() => {
    createNotification(userEmail, type, title, message, relatedId);
  }, 300);

  // Email (légèrement différé)
  setTimeout(() => {
    sendEmail(userEmail, subject, body);
  }, 800);
};

export const notifyApprovalAction = async (requesterEmail, requesterName, type, itemType, dates, statusText, balance = null, comment = null) => {
  const isApproved = statusText === "approuvée";
  const notificationType = type === "leave" ? 
    (isApproved ? "leave_approved" : "leave_rejected") :
    (isApproved ? "absence_approved" : "absence_rejected");
  
  const title = `Demande de ${itemType} ${statusText}`;
  const message = `Votre demande de ${itemType} du ${dates.start} au ${dates.end} (${dates.duration}) a été ${statusText}.${balance ? ` ${balance}` : ''}${comment ? ` Commentaire: ${comment}` : ''}`;
  
  const subject = `Votre demande de ${itemType} a été ${statusText}`;
  const body = `
Bonjour ${requesterName},

Votre demande de ${itemType} a été ${statusText}.

Dates: Du ${dates.start} au ${dates.end}
Durée: ${dates.duration}

${balance ? balance + '\n' : ''}
${comment ? `Commentaire RH: ${comment}\n` : ''}
Cordialement,
Service RH - CGESN
  `;

  await notifyAndEmailUser(requesterEmail, notificationType, title, message, subject, body);
};