import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const t0 = Date.now();
  const logT = (msg) => console.log(`[+${Date.now() - t0}ms] ${msg}`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function extractStatus(e) {
    return e?.status ?? e?.response?.status ?? e?.cause?.status ?? e?.cause?.response?.status ?? null;
  }
  function extractMessage(e) {
    if (!e) return "Unknown error";
    if (typeof e === "string") return e;
    return e?.message ?? e?.toString?.() ?? "Unknown error";
  }

  async function withRetry(fn, { retries = 5, baseDelayMs = 200 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const status = extractStatus(e);
        const retryable = status === 429 || (status >= 500 && status <= 599) || status == null;
        if (!retryable || attempt === retries) throw e;

        const delay = Math.round(baseDelayMs * (2 ** attempt) * (0.7 + Math.random() * 0.6));
        console.warn(`Retry ${attempt + 1}/${retries} status=${status} delay=${delay}ms err=${extractMessage(e)}`);
        await sleep(delay);
      }
    }
    throw lastErr;
  }

  async function safeFilter(entityApi, field, ids, { chunkSize = 50 } = {}) {
    const out = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);

      try {
        const rows = await withRetry(() => entityApi.filter({ [field]: { in: chunk } }));
        out.push(...rows);
        continue;
      } catch (_) {}

      try {
        const rows = await withRetry(() => entityApi.filter({ [field]: { oneOf: chunk } }));
        out.push(...rows);
        continue;
      } catch (_) {}

      // fallback (à éviter si tables énormes)
      const all = await withRetry(() => entityApi.list());
      for (const row of all) if (chunk.includes(row?.[field])) out.push(row);
    }
    return out;
  }

  async function deleteSequential(label, items, deleter, { perItemDelayMs = 5 } = {}) {
    let done = 0;
    for (const item of items) {
      await withRetry(() => deleter(item.id));
      done++;
      if (perItemDelayMs) await sleep(perItemDelayMs);
    }
    if (items.length) logT(`${label}: supprimés ${done}`);
    return done;
  }

  async function countLots(base44, lotissement_id) {
    const lots = await withRetry(() =>
      base44.asServiceRole.entities.Lot.filter({ id_lotissement: lotissement_id })
    );
    return lots.length;
  }
  async function countIlots(base44, lotissement_id) {
    const ilots = await withRetry(() =>
      base44.asServiceRole.entities.Ilot.filter({ id_lotissement: lotissement_id })
    );
    return ilots.length;
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const lotissement_id = body?.lotissement_id;
    if (!lotissement_id) return Response.json({ error: "lotissement_id requis" }, { status: 400 });

    const cursor = body?.cursor ?? { phase: "lots" };

    const limits = body?.limits ?? {
      lotsPerCall:30,
      idsChunk: 50,
      perDeleteDelayMs: 5,
    };

    const deleted = {
      attributaires: 0,
      historiques: 0,
      attestations: 0,
      documents: 0,
      lots: 0,
      ilots: 0,
      lotissement: 0,
    };

    const beforeLots = await countLots(base44, lotissement_id);
    const beforeIlots = await countIlots(base44, lotissement_id);

    logT(`Step phase=${cursor.phase} before lots=${beforeLots} ilots=${beforeIlots}`);

    // ✅ PHASE LOTS : toujours prendre les N premiers restants
    if (cursor.phase === "lots") {
      const lotsAll = await withRetry(() =>
        base44.asServiceRole.entities.Lot.filter({ id_lotissement: lotissement_id })
      );

      if (!lotsAll.length) {
        cursor.phase = "ilots";
      } else {
        const batchLots = lotsAll.slice(0, limits.lotsPerCall);
        const lotIds = batchLots.map((l) => l.id);

        logT(`Lots batch: ${batchLots.length}/${lotsAll.length}`);

        if (lotIds.length) {
          const attributaires = await safeFilter(
            base44.asServiceRole.entities.Attributaire,
            "id_lot",
            lotIds,
            { chunkSize: limits.idsChunk },
          );
          deleted.attributaires = await deleteSequential(
            "Attributaires",
            attributaires,
            (id) => base44.asServiceRole.entities.Attributaire.delete(id),
            { perItemDelayMs: limits.perDeleteDelayMs },
          );

          const historiques = await safeFilter(
            base44.asServiceRole.entities.HistoriqueAttribution,
            "id_lot",
            lotIds,
            { chunkSize: limits.idsChunk },
          );
          deleted.historiques = await deleteSequential(
            "Historiques",
            historiques,
            (id) => base44.asServiceRole.entities.HistoriqueAttribution.delete(id),
            { perItemDelayMs: limits.perDeleteDelayMs },
          );

          const attestations = await safeFilter(
            base44.asServiceRole.entities.Attestation,
            "id_lot",
            lotIds,
            { chunkSize: limits.idsChunk },
          );
          deleted.attestations = await deleteSequential(
            "Attestations",
            attestations,
            (id) => base44.asServiceRole.entities.Attestation.delete(id),
            { perItemDelayMs: limits.perDeleteDelayMs },
          );

          const documents = await safeFilter(
            base44.asServiceRole.entities.Document,
            "id_lot",
            lotIds,
            { chunkSize: limits.idsChunk },
          );
          deleted.documents = await deleteSequential(
            "Documents",
            documents,
            (id) => base44.asServiceRole.entities.Document.delete(id),
            { perItemDelayMs: limits.perDeleteDelayMs },
          );

          deleted.lots = await deleteSequential(
            "Lots",
            batchLots,
            (id) => base44.asServiceRole.entities.Lot.delete(id),
            { perItemDelayMs: limits.perDeleteDelayMs },
          );
        }

        // IMPORTANT : on reste en phase lots tant qu'il reste des lots
        cursor.phase = "lots";
      }
    }

    // ✅ PHASE ILOTS : même logique (toujours les N premiers restants)
    if (cursor.phase === "ilots") {
      const ilotsAll = await withRetry(() =>
        base44.asServiceRole.entities.Ilot.filter({ id_lotissement: lotissement_id })
      );

      if (!ilotsAll.length) {
        cursor.phase = "lotissement";
      } else {
        const batchIlots = ilotsAll.slice(0, limits.lotsPerCall);

        logT(`Ilots batch: ${batchIlots.length}/${ilotsAll.length}`);

        deleted.ilots = await deleteSequential(
          "Ilots",
          batchIlots,
          (id) => base44.asServiceRole.entities.Ilot.delete(id),
          { perItemDelayMs: limits.perDeleteDelayMs },
        );

        cursor.phase = "ilots";
      }
    }

    // ✅ PHASE LOTISSEMENT
    if (cursor.phase === "lotissement") {
      await withRetry(() =>
        base44.asServiceRole.entities.LotissementEguide.delete(lotissement_id)
      );
      deleted.lotissement = 1;

      const afterLots = await countLots(base44, lotissement_id).catch(() => null);
      const afterIlots = await countIlots(base44, lotissement_id).catch(() => null);

      return Response.json({
        success: true,
        done: true,
        deleted,
        counts: {
          before: { lots: beforeLots, ilots: beforeIlots },
          after: { lots: afterLots, ilots: afterIlots },
        },
        duration_ms: Date.now() - t0,
      });
    }

    const afterLots = await countLots(base44, lotissement_id);
    const afterIlots = await countIlots(base44, lotissement_id);

    return Response.json({
      success: true,
      done: false,
      deleted,
      nextCursor: cursor,
      counts: {
        before: { lots: beforeLots, ilots: beforeIlots },
        after: { lots: afterLots, ilots: afterIlots },
      },
      duration_ms: Date.now() - t0,
    });
  } catch (error) {
    console.error("Erreur suppression:", error);
    return Response.json(
      { error: 'Erreur serveur', status: extractStatus(error) ?? 500 },
      { status: 500 },
    );
  }
});