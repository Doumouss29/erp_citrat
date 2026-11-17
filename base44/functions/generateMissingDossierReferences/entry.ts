import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const buildReference = ({ activiteCode, bureauCode, annee, mois, sequence }) => {
  const moisTexte = String(mois).padStart(2, '0');
  const sequenceTexte = String(sequence).padStart(4, '0');
  return `${activiteCode}-${bureauCode}-${annee}${moisTexte}-${sequenceTexte}`;
};

const parseSequence = (reference) => {
  if (!reference) return 0;
  const parts = reference.split('-');
  if (parts.length !== 4) return 0;
  const sequence = parseInt(parts[3], 10);
  return Number.isFinite(sequence) ? sequence : 0;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { batchSize = 20 } = await req.json().catch(() => ({}));

    const [dossiers, bureaux, activites] = await Promise.all([
      base44.asServiceRole.entities.Dossier.list('-created_date', 1000),
      base44.asServiceRole.entities.Bureau.list(),
      base44.asServiceRole.entities.Activite.list()
    ]);

    const bureauCodesById = new Map(bureaux.map((bureau) => [bureau.id, bureau.code]));
    const activiteCodesById = new Map(activites.map((activite) => [activite.id, activite.code]));
    const nextSequenceByGroup = new Map();
    const missingByGroup = new Map();
    const skipped = [];

    for (const dossier of dossiers) {
      const createdAt = dossier.created_date ? new Date(dossier.created_date) : new Date();
      const annee = Number(dossier.annee) || createdAt.getFullYear();
      const mois = Number(dossier.mois) || createdAt.getMonth() + 1;
      const bureauCode = dossier.bureau_code || bureauCodesById.get(dossier.bureau_id);
      const activiteCode = dossier.activite_code || activiteCodesById.get(dossier.activite_id);

      if (!bureauCode || !activiteCode) {
        if (!dossier.reference_auto) {
          skipped.push({
            id: dossier.id,
            client: [dossier.client_nom, dossier.client_prenom].filter(Boolean).join(' '),
            raison: 'Code bureau ou activité introuvable'
          });
        }
        continue;
      }

      const groupKey = `${bureauCode}__${activiteCode}__${annee}__${mois}`;
      const currentMax = nextSequenceByGroup.get(groupKey) || 0;

      if (dossier.reference_auto) {
        const sequence = parseSequence(dossier.reference_auto);
        if (sequence > currentMax) {
          nextSequenceByGroup.set(groupKey, sequence);
        }
        continue;
      }

      const groupItems = missingByGroup.get(groupKey) || [];
      groupItems.push({
        id: dossier.id,
        client_nom: dossier.client_nom,
        client_prenom: dossier.client_prenom,
        bureauCode,
        activiteCode,
        annee,
        mois,
        created_date: dossier.created_date
      });
      missingByGroup.set(groupKey, groupItems);
      if (!nextSequenceByGroup.has(groupKey)) {
        nextSequenceByGroup.set(groupKey, currentMax);
      }
    }

    const updated = [];
    const groupKeys = Array.from(missingByGroup.keys()).sort();
    let processed = 0;

    for (const groupKey of groupKeys) {
      const items = missingByGroup.get(groupKey) || [];
      items.sort((a, b) => {
        const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
        const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
      });

      let sequence = nextSequenceByGroup.get(groupKey) || 0;

      for (const item of items) {
        if (processed >= batchSize) {
          break;
        }

        sequence += 1;
        const reference = buildReference({
          activiteCode: item.activiteCode,
          bureauCode: item.bureauCode,
          annee: item.annee,
          mois: item.mois,
          sequence
        });

        await base44.asServiceRole.entities.Dossier.update(item.id, {
          reference_auto: reference,
          bureau_code: item.bureauCode,
          activite_code: item.activiteCode,
          annee: item.annee,
          mois: item.mois
        });
        await wait(120);

        updated.push({
          id: item.id,
          client: [item.client_nom, item.client_prenom].filter(Boolean).join(' '),
          reference_auto: reference
        });
        processed += 1;
      }

      if (processed >= batchSize) {
        break;
      }
    }

    const totalMissing = Array.from(missingByGroup.values()).reduce((sum, items) => sum + items.length, 0);

    return Response.json({
      success: true,
      updated_count: updated.length,
      skipped_count: skipped.length,
      remaining_count: Math.max(totalMissing - updated.length, 0),
      updated,
      skipped
    });
  } catch (error) {
    console.error('generateMissingDossierReferences:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});