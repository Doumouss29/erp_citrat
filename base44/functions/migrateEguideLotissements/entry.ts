import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin requis' }, { status: 403 });
    }

    const srv = base44.asServiceRole;

    // 1. Lister tous les lotissements E-GUIDE (ceux avec un champ commune)
    const allLots = await srv.entities.Lotissement.list('-created_date', 1000);
    const eguideLots = (allLots || []).filter(l => l.commune && l.commune.trim());

    if (eguideLots.length === 0) {
      return Response.json({ message: 'Aucun lotissement E-GUIDE à migrer', migrated: 0 });
    }

    // 2. Créer les copies dans LotissementEguide
    const idMapping = {}; // old_id -> new_id
    const batchSize = 5;
    for (let i = 0; i < eguideLots.length; i += batchSize) {
      const batch = eguideLots.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(lot => {
          const { id, created_date, updated_date, created_by_id, ...data } = lot;
          return srv.entities.LotissementEguide.create(data);
        })
      );
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value) {
          idMapping[batch[idx].id] = res.value.id;
        }
      });
    }

    const migratedCount = Object.keys(idMapping).length;
    const oldIds = Object.keys(idMapping);

    // 3. Mettre à jour les références dans LotissementSuivi (lotissement_id)
    const allSuivi = await srv.entities.LotissementSuivi.list('-created_date', 2000);
    const suiviToUpdate = (allSuivi || []).filter(s => idMapping[s.lotissement_id]);
    for (let i = 0; i < suiviToUpdate.length; i += batchSize) {
      const batch = suiviToUpdate.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(s => srv.entities.LotissementSuivi.update(s.id, { lotissement_id: idMapping[s.lotissement_id] }))
      );
    }

    // 4. Mettre à jour les références dans Lot (id_lotissement)
    const allLotRecords = await srv.entities.Lot.list('-created_date', 5000);
    const lotToUpdate = (allLotRecords || []).filter(l => idMapping[l.id_lotissement]);
    for (let i = 0; i < lotToUpdate.length; i += batchSize) {
      const batch = lotToUpdate.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(l => srv.entities.Lot.update(l.id, { id_lotissement: idMapping[l.id_lotissement] }))
      );
    }

    // 5. Mettre à jour les références dans Ilot (id_lotissement)
    const allIlots = await srv.entities.Ilot.list('-created_date', 5000);
    const ilotToUpdate = (allIlots || []).filter(l => idMapping[l.id_lotissement]);
    for (let i = 0; i < ilotToUpdate.length; i += batchSize) {
      const batch = ilotToUpdate.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(l => srv.entities.Ilot.update(l.id, { id_lotissement: idMapping[l.id_lotissement] }))
      );
    }

    // 6. Mettre à jour les références dans Document (id_lotissement)
    const allDocs = await srv.entities.Document.list('-created_date', 5000);
    const docToUpdate = (allDocs || []).filter(d => idMapping[d.id_lotissement]);
    for (let i = 0; i < docToUpdate.length; i += batchSize) {
      const batch = docToUpdate.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(d => srv.entities.Document.update(d.id, { id_lotissement: idMapping[d.id_lotissement] }))
      );
    }

    // 7. Supprimer les anciens enregistrements E-GUIDE de Lotissement
    for (let i = 0; i < oldIds.length; i += batchSize) {
      const batch = oldIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(id => srv.entities.Lotissement.delete(id))
      );
    }

    return Response.json({
      message: 'Migration terminée',
      migrated: migratedCount,
      suiviUpdated: suiviToUpdate.length,
      lotsUpdated: lotToUpdate.length,
      ilotsUpdated: ilotToUpdate.length,
      docsUpdated: docToUpdate.length,
      deletedOld: oldIds.length
    });
  } catch (error) {
    console.error('migrateEguideLotissements:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}