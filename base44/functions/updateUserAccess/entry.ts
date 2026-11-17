import { portalNotice } from "../../shared/communications.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Modifie les accès aux applications d'un utilisateur (grade et accès individuels)
 * ainsi que son rattachement (bureau et département).
 *
 * Ces deux champs sont verrouillés par RLS : un utilisateur ne peut pas les modifier
 * lui-même (ni via l'API, ni depuis l'interface). Seul un administrateur, en passant
 * par cette fonction serveur, peut le faire ; toutes les autres clés envoyées sont
 * ignorées. Les contrôles de périmètre (bureau, organisation, rôle plateforme)
 * restent inchangés.
 */
const CHAMPS_AUTORISES = ['grade', 'access', 'office', 'department', 'super_admin'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (user.role !== 'admin' || user.statut === 'suspendu') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }

    const user_id = body.user_id;
    if (!user_id) {
      return Response.json({ error: 'user_id requis' }, { status: 400 });
    }

    // Seul un super administrateur peut attribuer ou retirer ce statut.
    if (body.super_admin !== undefined && user.super_admin !== true) {
      return Response.json({ error: 'Réservé au super administrateur' }, { status: 403 });
    }

    const patch = {};
    for (const champ of CHAMPS_AUTORISES) {
      if (body[champ] !== undefined) patch[champ] = body[champ];
    }
    // Suspension ou réactivation d'un compte : un administrateur ne peut pas se suspendre lui-même.
    if (body.statut !== undefined) {
      if (!['actif', 'suspendu'].includes(body.statut)) {
        return Response.json({ error: 'Statut invalide' }, { status: 400 });
      }
      if (body.statut === 'suspendu' && user_id === user.id) {
        return Response.json({ error: 'Vous ne pouvez pas suspendre votre propre compte' }, { status: 400 });
      }
      patch.statut = body.statut;
    }
    // Rattachement CGESN-Board : fonction et bureaux, contrôlés ici et non par le navigateur.
    if (body.fonction !== undefined) {
      if (!['', 'admin', 'responsable', 'adjoint', 'secretaire'].includes(body.fonction)) {
        return Response.json({ error: 'Fonction invalide' }, { status: 400 });
      }
      patch.fonction = body.fonction;
    }
    if (body.bureau_ids !== undefined || body.fonction === 'admin') {
      if (body.bureau_ids !== undefined && !Array.isArray(body.bureau_ids)) {
        return Response.json({ error: 'Liste de bureaux invalide' }, { status: 400 });
      }
      const bureaux = (await base44.asServiceRole.entities.Bureau.list(null, 200)) || [];
      // La Direction est rattachée à tous les bureaux.
      const ids = body.fonction === 'admin'
        ? bureaux.map((b) => b.id)
        : body.bureau_ids.filter((id) => bureaux.some((b) => b.id === id));
      const principal = bureaux.find((b) => b.id === ids[0]);
      patch.bureau_ids = ids;
      patch.bureau_id = principal?.id || '';
      patch.bureau_code = principal?.code || '';
    }

    // Une fonction dans CGESN-Board donne accès à l'application, quel que soit le grade.
    if (patch.fonction && patch.access === undefined) {
      const [target] = (await base44.asServiceRole.entities.User.filter({ id: user_id })) || [];
      const current = Array.isArray(target?.access) ? target.access : [];
      const profiles = target?.grade
        ? await base44.asServiceRole.entities.AccessProfile.filter({ profile_id: target.grade })
        : [];
      // Un externe n'obtient CGESN-Board que si l'application lui est attribuée explicitement.
      const external = ['prestataire', 'consultant'].includes(String(body.grade ?? target?.grade ?? ''));
      if (target && !external && !current.includes('cgesnboard') && !profiles?.[0]?.apps?.includes('cgesnboard')) {
        patch.access = [...current, 'cgesnboard'];
      }
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'Aucun accès à mettre à jour' }, { status: 400 });
    }
    if (patch.grade !== null && patch.grade !== undefined && typeof patch.grade !== 'string') {
      return Response.json({ error: 'Grade invalide' }, { status: 400 });
    }
    for (const champ of ['office', 'department']) {
      if (patch[champ] !== undefined && patch[champ] !== null && typeof patch[champ] !== 'string') {
        return Response.json({ error: `Valeur invalide pour ${champ}` }, { status: 400 });
      }
    }
    if (patch.super_admin !== undefined && typeof patch.super_admin !== 'boolean') {
      return Response.json({ error: 'Valeur invalide pour super_admin' }, { status: 400 });
    }
    // Un super administrateur est hors organisation : bureau et département sont vidés
    if (patch.super_admin === true) {
      patch.office = '';
      patch.department = '';
    }
    if (patch.access !== undefined && !Array.isArray(patch.access)) {
      return Response.json({ error: 'Liste d\'accès invalide' }, { status: 400 });
    }

    const target = await base44.asServiceRole.entities.User.get(user_id);
    if (!target) return Response.json({ error: 'Compte introuvable' }, { status: 404 });
    if (target.super_admin && (!user.super_admin || patch.statut === 'suspendu' || patch.super_admin === false)) {
      return Response.json({ error: 'Compte administrateur principal protégé' }, { status: 403 });
    }
    if (target.role === 'admin' && patch.statut === 'suspendu') {
      return Response.json({ error: 'Retirez le rôle administrateur avant la suspension' }, { status: 409 });
    }
    let role_change = null;
    const grants = !!patch.grade || (Array.isArray(patch.access) && patch.access.length > 0);
    if (patch.statut === 'suspendu') role_change = 'suspendu';
    else if (patch.statut === 'actif' && target.role === 'suspendu') role_change = 'user';
    else if (grants && target.role === 'en_attente' && target.statut !== 'suspendu') role_change = 'user';

    // Journal existant : trace durable avant l'opération ; si l'écriture échoue,
    // aucune permission n'est modifiée sans trace.
    await base44.asServiceRole.entities.JournalAudit.create({
      type_action: 'modification',
      user_email: user.email,
      champ_modifie: 'autorisations_portail',
      dossier_reference: user_id,
      nouvelle_valeur: JSON.stringify({ etat: 'operation_demandee', cible: user_id, changements: patch }),
    });
    // COPROCIV : tout compte qui obtient l'accès (accès supplémentaire ou grade) reçoit automatiquement
    // le profil métier « géomètre-expert » s'il n'en a pas encore.
    let coproAuto = null;
    if (!target.copro_profil) {
      const newAccess = Array.isArray(patch.access) ? patch.access : (target.access || []);
      const newGrade = patch.grade !== undefined ? patch.grade : target.grade;
      let hasCopro = newAccess.includes('coprociv');
      if (!hasCopro && newGrade) {
        const [gp] = (await base44.asServiceRole.entities.AccessProfile.filter({ profile_id: newGrade }).catch(() => [])) || [];
        hasCopro = !!gp?.apps?.includes('coprociv');
      }
      if (hasCopro) coproAuto = 'geometre';
    }
    await base44.asServiceRole.entities.User.update(user_id, {
      ...patch,
      ...(role_change ? { role: role_change } : {}),
      ...(coproAuto ? { copro_profil: coproAuto } : {}),
    });

    const changed = (patch.grade !== undefined && patch.grade !== target.grade) ||
      (patch.access !== undefined && JSON.stringify([...patch.access].sort()) !== JSON.stringify([...(target.access || [])].sort())) ||
      (patch.statut !== undefined && patch.statut !== target.statut);
    if (changed || role_change === 'user') {
      const title = patch.statut === 'suspendu' ? 'Accès suspendu' : role_change === 'user' ? 'Accès au portail validé' : 'Vos accès ont été mis à jour';
      await portalNotice(base44.asServiceRole, target, 'decision-' + crypto.randomUUID(), title,
        patch.statut === 'suspendu' ? 'Votre accès a été suspendu. Pour toute question, contactez l’administration.' : 'L’administration a mis à jour vos autorisations. Consultez votre portail.');
    }
    let audit_warning = null;
    try {
      await base44.asServiceRole.entities.JournalAudit.create({
        type_action: 'modification',
        user_email: user.email,
        champ_modifie: 'autorisations_portail',
        dossier_reference: user_id,
        nouvelle_valeur: JSON.stringify({ etat: 'operation_effectuee', cible: user_id, changements: patch, role_change }),
      });
    } catch (error) {
      console.error('updateUserAccess (confirmation du journal):', error);
      audit_warning = 'Opération effectuée ; trace initiale conservée, confirmation du journal indisponible';
    }
    return Response.json({ success: true, user_id, ...patch, role_change, ...(audit_warning ? { audit_warning } : {}) });
  } catch (error) {
    console.error('updateUserAccess:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});