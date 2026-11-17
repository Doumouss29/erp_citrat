import { notify, portalNotice } from "../../shared/communications.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.60';

// La demande est portée par le compte déjà traité dans Administration → Utilisateurs.
// Aucun compte, aucune demande séparée, aucune attribution d'application n'est créé.
export function requestState(user) {
  if (user.statut === 'suspendu' || user.role === 'suspendu') return 'suspendu';
  if (['admin', 'viewer', 'superviseur'].includes(user.role) || user.super_admin || user.grade || user.access?.length) return 'valide';
  return user.demande_acces_date ? 'en_attente' : 'aucune';
}

export async function handleRequest(req, base44) {
  let user;
  try { user = await base44.auth.me(); } catch { return Response.json({ error: 'Non authentifié' }, { status: 401 }); }
  if (!user?.id) return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (req.method !== 'POST') return Response.json({ error: 'Méthode refusée' }, { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Requête invalide' }, { status: 400 }); }
  if (!body || !['status', 'submit', 'welcome'].includes(body.action) || Object.keys(body).some(k => k !== 'action')) {
    return Response.json({ error: 'Seule une demande générale est acceptée' }, { status: 400 });
  }
  // Identité et date exclusivement côté serveur ; l'appelant ne choisit aucune permission.
  const srv = base44.asServiceRole;
  const [current] = await srv.entities.User.filter({ id: user.id });
  if (!current) return Response.json({ error: 'Compte introuvable' }, { status: 403 });
  const state = requestState(current);
  if (state === 'suspendu') return Response.json({ error: 'Compte suspendu' }, { status: 403 });
  if (body.action === 'welcome') {
    await portalNotice(srv, current, 'inscription', 'Bienvenue sur le Portail Digital CGESN',
      state === 'aucune' ? 'Votre compte est vérifié. Connectez-vous au portail pour demander votre accès.' :
      state === 'en_attente' ? 'Votre compte est vérifié. Votre demande est en attente de validation.' : 'Votre compte est vérifié. Vous pouvez consulter votre portail.');
    return Response.json({ status: state });
  }
  if (body.action === 'status' || state !== 'aucune') {
    return Response.json({ status: state, date: current.demande_acces_date || null, existing: state !== 'aucune' });
  }
  if (!['user', 'en_attente'].includes(current.role)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }
  // Une mise à jour du même identifiant est intrinsèquement sans doublon de compte/demande.
  // Le statut existant en_attente est celui que sait valider updateUserAccess.
  const date = new Date().toISOString();
  const claimed = await srv.entities.User.updateMany({ id: current.id, role: current.role,
    $or: [{ demande_acces_date: { $exists: false } }, { demande_acces_date: null }, { demande_acces_date: '' }]
  }, { $set: { demande_acces_date: date, role: 'en_attente' } });
  if (!claimed.updated) {
    const latest = await srv.entities.User.get(current.id);
    return Response.json({ status: requestState(latest), date: latest.demande_acces_date, existing: true });
  }
  await portalNotice(srv, current, 'demande', 'Demande d’accès reçue', 'Votre demande a été transmise à l’administration. Vous serez informé du traitement.');
  try {
    const admins = await srv.entities.User.filter({ role: 'admin' });
    for (const admin of admins.filter(a => a.statut !== 'suspendu')) {
      await notify(srv, { module: 'Portail CGESN', type: 'validation', id: current.id, event: 'demande-admin',
        to: admin.email, title: 'Demande d’accès à examiner', message: 'Une nouvelle demande attend votre validation.',
        path: '/administration', button: 'Ouvrir l’administration' }, false);
    }
  } catch { console.error('Avis administration à vérifier', current.id); }
  return Response.json({ status: 'en_attente', date, existing: false });
}

Deno.serve(async req => {
  try { return await handleRequest(req, createClientFromRequest(req)); }
  catch (error) {
    console.error('requestPortalAccess:', error);
    return Response.json({ error: 'Demande non enregistrée. Réessayez.' }, { status: 500 });
  }
});
