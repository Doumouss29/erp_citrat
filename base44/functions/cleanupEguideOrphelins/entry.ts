import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Nettoyage des références orphelines E-GUIDE :
// supprime les attributaires et attestations dont le lot référencé n'existe plus.
// Idempotent et rejouable : chaque appel recalcule les orphelins restants.

const CHUNK = 500;
const TIME_BUDGET_MS = 240000; // 4 min (la requête est coupée à 5 min)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin requis' }, { status: 403 });

    const srv = base44.asServiceRole;
    const started = Date.now();

    // 1. Tous les lots valides
    const lotIds = new Set();
    let cursor = null;
    for (let i = 0; i < 40; i++) {
      const page = await srv.entities.Lot.filter({}, { limit: 1000, fields: ['id'], cursor });
      for (const l of page.items || []) lotIds.add(l.id);
      if (!page.has_more) break;
      cursor = page.next_cursor;
    }

    // 2. Collecte des identifiants orphelins d'une entité
    async function collectOrphans(entityName, maxPages) {
      const ids = [];
      let cur = null;
      for (let i = 0; i < maxPages; i++) {
        const page = await srv.entities[entityName].filter({}, { limit: 1000, fields: ['id_lot'], cursor: cur });
        for (const rec of page.items || []) {
          if (rec.id_lot && !lotIds.has(rec.id_lot)) ids.push(rec.id);
        }
        if (!page.has_more) break;
        cur = page.next_cursor;
      }
      return ids;
    }

    // 3. Suppression par lots de 500 (reprise possible si le temps manque)
    async function deleteInChunks(entityName, ids) {
      let deleted = 0;
      for (let i = 0; i < ids.length; i += CHUNK) {
        if (Date.now() - started > TIME_BUDGET_MS) break;
        const chunk = ids.slice(i, i + CHUNK);
        await srv.entities[entityName].deleteMany({ id: { $in: chunk } });
        deleted += chunk.length;
      }
      return deleted;
    }

    const orphanAttributaires = await collectOrphans('Attributaire', 20);
    const deletedAttributaires = await deleteInChunks('Attributaire', orphanAttributaires);

    const orphanAttestations = await collectOrphans('Attestation', 25);
    const deletedAttestations = await deleteInChunks('Attestation', orphanAttestations);

    const remaining = (orphanAttributaires.length - deletedAttributaires) + (orphanAttestations.length - deletedAttestations);

    return Response.json({
      done: remaining === 0,
      lotsValides: lotIds.size,
      attributairesOrphelins: orphanAttributaires.length,
      attestationsOrphelines: orphanAttestations.length,
      deletedAttributaires,
      deletedAttestations,
      remaining,
    });
  } catch (error) {
    console.error('cleanupEguideOrphelins:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}