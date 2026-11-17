/* eslint-disable no-undef */
Deno.serve(async (req) => {
  try {
    const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.25');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const operations = await base44.asServiceRole.entities.OperationCaisse.list();
    const bureaux = await base44.asServiceRole.entities.Bureau.list();

    function generateBonNumber(allOps, type, date, bureauCode) {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const prefix = type === 'entree' ? 'BE' : type === 'sortie' ? 'BS' : 'SD';

      const base = `${prefix}-${bureauCode}-${year}${month}-`;
      const usedNumbers = allOps
        .map(op => {
          const s = String(op.numero_bon || '').trim();
          if (!s.startsWith(base)) return null;
          const tail = s.slice(base.length);
          return /^\d+$/.test(tail) ? Number(tail) : null;
        })
        .filter(n => n !== null && !Number.isNaN(n));

      const nextNumber = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
      const yearMonth = `${year}${month}`;
      return `${prefix}-${bureauCode}-${yearMonth}-${String(nextNumber).padStart(4, '0')}`;
    }

    const opsWithoutNumbers = operations.filter(op => !op.numero_bon);

    if (opsWithoutNumbers.length === 0) {
      return Response.json({ message: 'All operations have numbers', updated: 0 });
    }

    // Sort by date to assign numbers in chronological order
    const sorted = [...operations].sort((a, b) => new Date(a.date_operation) - new Date(b.date_operation));

    let updated = 0;
    for (const op of sorted) {
      if (!op.numero_bon) {
        const bureau = bureaux.find(b => b.id === op.bureau_id);
        if (bureau) {
          const newNumber = generateBonNumber(sorted, op.type_operation, op.date_operation, bureau.code);
          await base44.asServiceRole.entities.OperationCaisse.update(op.id, { numero_bon: newNumber });
          // Update in sorted array for next iteration
          const idx = sorted.findIndex(o => o.id === op.id);
          if (idx >= 0) sorted[idx].numero_bon = newNumber;
          updated++;
        }
      }
    }

    return Response.json({ message: 'Numbers assigned', updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});