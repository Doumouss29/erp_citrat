import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Recalcule les soldes de tous les employés à partir des demandes APPROUVÉES de l'année en cours :
//  - congés individuels (et autres périodes hors décembre) → remaining_year_days (15 j)
//  - congés collectifs / décembre                         → remaining_december_days (15 j)
//  - absences                                             → absence_days_used (plafond 10 j)
// Mêmes règles que le décompte à l'approbation (fonction rhRequest).
// Limites explicites : le SDK plafonne à 50 enregistrements par défaut (avant ce correctif,
// seuls 50 employés et 50 congés étaient pris en compte).

const INITIAL_YEAR = 15;
const INITIAL_DECEMBER = 15;
const ABSENCE_ALLOWANCE = 10;
const LIMIT = 10000;

const isDecember = (leave) => leave.leave_period === 'collectif' || leave.leave_period === 'decembre';
const norm = (v) => String(v || '').trim().toLowerCase();

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const year = String(new Date().getFullYear());
    const inYear = (r) => String(r.start_date || '').slice(0, 4) === year;

    const [employees, allLeaves, allAbsences] = await Promise.all([
      base44.asServiceRole.entities.Employee.list('-created_date', LIMIT),
      base44.asServiceRole.entities.LeaveRequest.filter({ status: 'approved' }, '-start_date', LIMIT),
      base44.asServiceRole.entities.Absence.filter({ status: 'approved' }, '-start_date', LIMIT),
    ]);
    const leaves = allLeaves.filter(inYear);
    const absences = allAbsences.filter(inYear);

    // Rattachement d'une demande à un employé : identifiant, sinon e-mail
    const belongsTo = (emp) => (r) =>
      r.employee_id === emp.id ||
      (!r.employee_id && !!emp.email && norm(r.employee_email || r.created_by) === norm(emp.email));

    const results = { updated: 0, skipped: 0, errors: [], changes: [] };

    for (const emp of employees) {
      try {
        // Les prestataires et consultants n'ont pas de solde de congés.
        if (emp.contract_type === 'Prestation') {
          results.skipped++;
          continue;
        }
        const mine = belongsTo(emp);
        const empLeaves = leaves.filter(mine);
        const empAbsences = absences.filter(mine);
        const sum = (list) => list.reduce((s, r) => s + (Number(r.total_days) || 0), 0);

        const usedYear = sum(empLeaves.filter((l) => !isDecember(l)));
        const usedDecember = sum(empLeaves.filter(isDecember));
        const usedAbsence = sum(empAbsences);

        const patch = {
          remaining_year_days: Math.max(0, INITIAL_YEAR - usedYear),
          remaining_december_days: Math.max(0, INITIAL_DECEMBER - usedDecember),
          absence_days_used: Math.min(ABSENCE_ALLOWANCE, usedAbsence),
        };

        const changed =
          (emp.remaining_year_days ?? INITIAL_YEAR) !== patch.remaining_year_days ||
          (emp.remaining_december_days ?? INITIAL_DECEMBER) !== patch.remaining_december_days ||
          (emp.absence_days_used || 0) !== patch.absence_days_used;

        if (changed) {
          await base44.asServiceRole.entities.Employee.update(emp.id, patch);
          results.updated++;
          results.changes.push({ employee_code: emp.employee_code, ...patch });
        } else {
          results.skipped++;
        }
      } catch (err) {
        results.errors.push({ employee_id: emp.id, name: `${emp.first_name} ${emp.last_name}`, error: err.message });
      }
    }

    return Response.json({
      success: true,
      message: `Synchronisation terminée (${year}) : ${results.updated} mis à jour, ${results.skipped} inchangés`,
      ...results,
    });
  } catch (error) {
    console.error('syncLeaveBalances:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
