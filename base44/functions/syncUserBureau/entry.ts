import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Synchronise le bureau de l'utilisateur connecté de manière sécurisée.
 * - Vérifie que l'utilisateur est bien une secrétaire (SecretaireBureau avec son email)
 *   ou un responsable de bureau (Bureau.responsable_email === user.email).
 * - Ne permet JAMAIS à l'utilisateur de choisir un bureau arbitraire : les valeurs
 *   proviennent exclusivement des enregistrements admin-controlled.
 * - Écrit via asServiceRole car les champs bureau_id/bureau_ids sont verrouillés
 *   par RLS (collaborator_role: editor).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'en_attente' || user.role === 'suspendu' || user.statut === 'suspendu') {
      return Response.json({ error: 'Compte suspendu' }, { status: 403 });
    }

    // Externes : aucune affectation automatique, car elle ajouterait CGESN-Board à leurs applications.
    if (['prestataire', 'consultant'].includes(String(user.data?.grade || user.grade || ''))) {
      return Response.json({ success: true, external: true });
    }

    // Vérifier si déjà synchronisé
    const existingBureauId = user.data?.bureau_id || user.bureau_id;
    const existingBureauIds = user.data?.bureau_ids || user.bureau_ids;
    const existingFonction = user.data?.fonction || user.fonction;
    const hasBureau = !!existingBureauId && Array.isArray(existingBureauIds) && existingBureauIds.length > 0;

    if (hasBureau && existingFonction) return Response.json({ success: true, alreadySynced: true, user });

    // Lire les sources de confiance (admin-controlled)
    const [annuaire, secretaires, bureaux] = await Promise.all([
      base44.asServiceRole.entities.AnnuaireAttente.list(null, 500),
      base44.asServiceRole.entities.SecretaireBureau.list(null, 500),
      base44.asServiceRole.entities.Bureau.list(),
    ]);

    // Les e-mails sont comparés sans tenir compte de la casse (ex. Ange4Bony@ / ange4bony@).
    const email = String(user.email || '').trim().toLowerCase();
    const same = (v: unknown) => String(v || '').trim().toLowerCase() === email;

    // Priorité : annuaire (affectation reprise de CGESN-Board), puis secrétariat, puis responsable.
    // Une fiche « admin » de l'annuaire n'est jamais appliquée automatiquement : l'administrateur la traite.
    // L'accès automatique au Board est réservé aux personnes inscrites dans la liste de l'administration.
    const fiche = annuaire.find((a) => same(a.email));
    if (!fiche || fiche.fonction === 'admin') {
      return Response.json({ success: true, noBureau: true, user });
    }
    const myBureau = bureaux.find((b) => same(b.responsable_email));
    const myAnnuaire = fiche.bureau_ids?.length ? fiche : undefined;
    const mySecretaire = [...new Set(secretaires.filter((s) => same(s.email)).flatMap((s) => s.bureau_ids || []))] as string[];
    let bureauIds: string[] = [];
    let fonction = '';
    if (myBureau) {
      bureauIds = [myBureau.id];
      fonction = 'responsable';
    } else if (myAnnuaire) {
      bureauIds = myAnnuaire.bureau_ids;
      fonction = myAnnuaire.fonction;
    } else if (mySecretaire.length) {
      bureauIds = mySecretaire;
      fonction = 'secretaire';
    }

    if (bureauIds.length === 0) {
      return Response.json({ success: true, noBureau: true, user });
    }

    const primaryBureau = bureaux.find((b) => b.id === bureauIds[0]);
    // Un bureau déjà affecté par l'administrateur n'est pas remplacé : seule la fonction manquante est complétée.
    const payload = hasBureau
      ? { bureau_id: existingBureauId, bureau_code: user.data?.bureau_code || user.bureau_code || '', bureau_ids: existingBureauIds, fonction }
      : {
          bureau_id: primaryBureau?.id || bureauIds[0],
          bureau_code: primaryBureau?.code || '',
          bureau_ids: bureauIds,
          fonction: existingFonction || fonction,
        };

    await base44.asServiceRole.entities.User.update(user.id, payload);

    return Response.json({ success: true, updated: true, ...payload });
  } catch (error) {
    console.error('syncUserBureau:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});