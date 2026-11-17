import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const lots = await base44.asServiceRole.entities.Lot.list('-created_date', 1000);
    const grouped = {};

    for (const lot of lots) {
      const currentTf = typeof lot.TF === 'string' ? lot.TF : lot.data?.TF;
      if (typeof currentTf !== 'string') continue;
      if (!/^TF\s*/i.test(currentTf)) continue;

      const cleanedTf = currentTf.replace(/^TF\s*/i, '').trim();
      if (!grouped[currentTf]) {
        grouped[currentTf] = { cleaned: cleanedTf, count: 0 };
      }
      grouped[currentTf].count += 1;
    }

    return Response.json({ success: true, groups: grouped });
  } catch (error) {
    console.error('normalizeLotTf:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});