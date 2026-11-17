import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Calendrier d'équipe : renvoie UNIQUEMENT le nom, les dates et le type
// (congé / absence) des demandes approuvées. Aucun motif, type d'absence
// détaillé ni justificatif n'est exposé.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'rhcgesn');
    if (denied) return denied;
    if (!user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const start = body.start ? String(body.start).slice(0, 10) : null;
    const end = body.end ? String(body.end).slice(0, 10) : null;

    const [absences, leaves] = await Promise.all([
      base44.asServiceRole.entities.Absence.filter({ status: 'approved' }, '-start_date', 2000),
      base44.asServiceRole.entities.LeaveRequest.filter({ status: 'approved' }, '-start_date', 2000),
    ]);

    const overlaps = (r) => {
      const s = String(r.start_date || '').slice(0, 10);
      const e = String(r.end_date || r.start_date || '').slice(0, 10);
      if (!s) return false;
      if (start && e < start) return false;
      if (end && s > end) return false;
      return true;
    };

    const pick = (kind) => (r) => ({
      id: r.id,
      kind,
      employee_name: r.employee_name || 'Employé',
      start_date: r.start_date,
      end_date: r.end_date || r.start_date,
    });

    const events = [
      ...(absences || []).filter(overlaps).map(pick('absence')),
      ...(leaves || []).filter(overlaps).map(pick('conge')),
    ];

    return Response.json({ events });
  } catch (error) {
    console.error('getTeamCalendar:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});