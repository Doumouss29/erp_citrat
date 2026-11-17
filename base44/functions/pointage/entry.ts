import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Terminal de pointage (tablettes des bureaux).
 *
 * Les comptes bureaux n'ont pas accès aux fiches employés ni à l'historique de pointage (RLS).
 * Le pointage passe donc par cette fonction, réservée aux comptes listés dans OfficeTerminal :
 * elle retrouve l'agent par son code, applique les règles et ne renvoie à la tablette que
 * le strict nécessaire à l'affichage (nom, poste, département).
 *
 * Actions :
 *  - punch    : { code, type: 'entry'|'break_start'|'break_end'|'exit' }
 *  - overtime : { code, reason } → motif des heures supplémentaires du jour
 *
 * Heure : celle du serveur (UTC, identique à l'heure de la Côte d'Ivoire), et non celle de la
 * tablette, pour qu'un mauvais réglage de l'appareil ne fausse ni la date ni les heures.
 */
const LABELS: Record<string, string> = {
  entry: 'Arrivée',
  break_start: 'Début de pause',
  break_end: 'Retour de pause',
  exit: 'Départ',
};

const norm = (v: unknown) =>
  String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const pad2 = (n: number) => String(n).padStart(2, '0');
const round2 = (n: number) => Math.round(n * 100) / 100;
const refuse = (error: string) => Response.json({ success: false, error });

// Mêmes règles que src/components/utils/workHoursCalc.jsx
function calculateWorkHours(entryTime: string, exitTime: string, breakStartTime: string | null, breakEndTime: string | null) {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const entry = parse(entryTime);
  const exit = parse(exitTime);
  if (exit <= entry) return { hoursWorked: 0, overtimeHours: 0, balance: -8 };

  const WORK_START = 8 * 60;
  const WORK_END = 17 * 60;
  const adjustedEntry = Math.max(entry, WORK_START);
  const normalEnd = Math.min(exit, WORK_END);
  let normalMinutes = 0;
  let realBreak = false;

  if (breakStartTime && breakEndTime) {
    const start = parse(breakStartTime);
    const end = parse(breakEndTime);
    if (end > start && start >= entry && end <= exit && end - start >= 30) {
      realBreak = true;
      const morning = Math.max(0, Math.min(start, WORK_END) - adjustedEntry);
      const afternoon = Math.max(0, normalEnd - Math.max(end, WORK_START));
      normalMinutes = Math.max(0, morning + afternoon);
    }
  }
  if (!realBreak && normalEnd > adjustedEntry) {
    normalMinutes = Math.max(0, normalEnd - adjustedEntry - 60);
  }

  const overtimeMinutes = exit > WORK_END ? exit - WORK_END : 0;
  const hoursWorked = round2(normalMinutes / 60);
  return {
    hoursWorked: Math.max(0, hoursWorked),
    overtimeHours: Math.max(0, round2(overtimeMinutes / 60)),
    balance: round2(hoursWorked - 8),
  };
}

async function findEmployee(srv: any, code: string) {
  const rows = (await srv.entities.Employee.filter({ employee_code: code })) || [];
  return rows.find((e: any) => e.is_active !== false) || rows[0] || null;
}

async function updateWorkLog(srv: any, employee: any, date: string, entries: any[]) {
  const pick = (t: string) => entries.find((e) => e.entry_type === t);
  const entry = pick('entry');
  const exit = pick('exit');
  if (!entry || !exit) return null;

  const breakStart = pick('break_start');
  const breakEnd = pick('break_end');
  const { hoursWorked, overtimeHours, balance } = calculateWorkHours(
    entry.time, exit.time, breakStart?.time || null, breakEnd?.time || null,
  );

  const logs = (await srv.entities.DailyWorkLog.filter({ employee_code: employee.employee_code }, '-date', 5000)) || [];
  const previous = logs
    .filter((l: any) => l.date < date)
    .reduce((sum: number, l: any) => sum + (l.balance || 0), 0);

  const data = {
    employee_id: employee.id,
    employee_code: employee.employee_code,
    employee_name: `${employee.first_name} ${employee.last_name}`,
    employee_email: employee.email,
    office: employee.office,
    date,
    entry_time: entry.time,
    break_start_time: breakStart?.time || null,
    break_end_time: breakEnd?.time || null,
    exit_time: exit.time,
    hours_worked: hoursWorked,
    overtime_hours: overtimeHours,
    balance,
    cumulative_balance: round2(previous + balance),
  };
  const existing = logs.find((l: any) => l.date === date);
  if (existing) await srv.entities.DailyWorkLog.update(existing.id, data);
  else await srv.entities.DailyWorkLog.create(data);
  return { hoursWorked, balance };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    if (user.statut === 'suspendu' || user.role === 'suspendu') return Response.json({ error: 'Compte suspendu' }, { status: 403 });
    const srv = base44.asServiceRole;
    const terminals = (await srv.entities.OfficeTerminal.list('office_name', 200)) || [];
    const terminal = terminals.find((t: any) => t.email && norm(t.email) === norm(user.email));
    // Pointage depuis un navigateur (régularisation) : réservé aux administrateurs et au service RH.
    // Le grade est un champ verrouillé (modifiable uniquement par un administrateur).
    const isRh = user.grade === 'assistante_rh' || user.data?.grade === 'assistante_rh';
    const browserOperator = !terminal && user.statut !== 'suspendu' && (user.role === 'admin' || isRh);
    if (!terminal && browserOperator) {
      const denied = await appDenial(base44, user, 'rhcgesn');
      if (denied) return denied;
    }
    if (!terminal && !browserOperator) {
      return Response.json({ success: false, error: 'Réservé aux terminaux de pointage, au service RH et aux administrateurs' }, { status: 403 });
    }
    if (terminal && terminal.is_active === false) {
      return refuse('Ce terminal de pointage est désactivé. Contactez le service RH.');
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) return refuse('Veuillez saisir votre code salarié');

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const employee = await findEmployee(srv, code);
    if (!employee) return refuse('Code salarié invalide');

    // ---------------------------------------------------------------- overtime
    if (action === 'overtime') {
      const reason = String(body.reason || '').trim().slice(0, 1000);
      if (!reason) return Response.json({ success: true });
      const logs = (await srv.entities.DailyWorkLog.filter({ employee_code: employee.employee_code, date: today })) || [];
      if (!logs[0]) return refuse('Journée de travail introuvable');
      await srv.entities.DailyWorkLog.update(logs[0].id, { overtime_reason: reason });
      return Response.json({ success: true });
    }

    if (action !== 'punch') {
      return Response.json({ success: false, error: 'Action inconnue' }, { status: 400 });
    }

    // ------------------------------------------------------------------- punch
    const type = String(body.type || '');
    if (!LABELS[type]) return Response.json({ success: false, error: 'Type de pointage invalide' }, { status: 400 });

    if (employee.is_active === false) return refuse('Compte employé inactif');
    if (employee.attendance_status === 'Actif - Pointage non requis') {
      return refuse("Le pointage n'est pas requis pour ce profil. Contactez le service RH.");
    }

    const hour = now.getUTCHours();
    if (hour < 6 || hour >= 22) return refuse('Pointage hors plage horaire autorisée (06h - 22h)');

    const entries = (await srv.entities.TimeEntry.filter(
      { employee_code: employee.employee_code, date: today }, '-timestamp', 50,
    )) || [];
    const last = entries[0] || null;
    const name = `${employee.first_name} ${employee.last_name}`;
    const has = (t: string) => entries.some((e: any) => e.entry_type === t);
    const find = (t: string) => entries.find((e: any) => e.entry_type === t);
    const minutesSince = (e: any) => Math.floor((now.getTime() - new Date(e.timestamp).getTime()) / 60000);

    if (last) {
      const seconds = Math.floor((now.getTime() - new Date(last.timestamp).getTime()) / 1000);
      if (seconds < 0) return refuse('Incohérence temporelle : le pointage ne peut pas être avant le pointage précédent.');
      if (seconds < 30) return refuse(`Veuillez attendre ${30 - seconds} secondes avant de pointer à nouveau.`);
    }
    if (has(type)) return refuse(`${name} a déjà pointé son ${LABELS[type].toLowerCase()}.`);
    if (type === 'break_start' && !has('entry')) {
      return refuse(`${name} doit d'abord pointer son arrivée avant de pointer un début de pause.`);
    }
    if (type === 'break_end' && !has('break_start')) {
      return refuse(`${name} doit d'abord pointer son début de pause avant de pointer un retour de pause.`);
    }
    if (type === 'exit' && !has('entry')) {
      return refuse(`${name} doit d'abord pointer son arrivée avant de pointer un départ.`);
    }
    if (type === 'exit') {
      const minutes = minutesSince(find('entry'));
      if (minutes < 30) {
        return refuse(`Durée de présence trop courte. Minimum 30 minutes requis entre arrivée et départ (actuellement ${minutes} minutes).`);
      }
    }
    if (type === 'break_end') {
      const minutes = minutesSince(find('break_start'));
      if (minutes < 15) return refuse(`Pause trop courte. Minimum 15 minutes requises (actuellement ${minutes} minutes).`);
      if (minutes > 180) return refuse(`Pause trop longue. Maximum 3h autorisées (actuellement ${minutes} minutes).`);
    }

    let warning: string | null = null;
    const minuteOfDay = hour * 60 + now.getUTCMinutes();
    if (type === 'entry' && minuteOfDay < 6 * 60 + 30) warning = '⚠️ Arrivée très matinale détectée (avant 6h30)';
    if (type === 'exit' && hour >= 21) warning = '⚠️ Départ tardif détecté (après 21h)';

    const created = await srv.entities.TimeEntry.create({
      employee_id: employee.id,
      employee_code: employee.employee_code,
      employee_name: name,
      employee_email: employee.email,
      entry_type: type,
      timestamp: now.toISOString(),
      date: today,
      time: `${pad2(hour)}:${pad2(now.getUTCMinutes())}`,
      // Pointage navigateur : bureau de l'agent + auteur de la saisie, pour la traçabilité
      location: terminal
        ? (terminal.office_name || employee.office || 'Non spécifié')
        : `${employee.office || 'Non spécifié'} (navigateur · ${user.email})`,
    });

    // Le pointage est enregistré : une erreur de calcul ne doit pas le faire passer pour refusé.
    let workLog = null;
    try {
      workLog = await updateWorkLog(srv, employee, today, [created, ...entries]);
    } catch (e) {
      console.error('pointage: calcul de la journée', employee.employee_code, e);
    }

    const label = LABELS[type];
    return Response.json({
      success: true,
      message: warning ? `${label} enregistré pour ${name}. ${warning}` : `${label} enregistré avec succès pour ${name}`,
      employee: {
        first_name: employee.first_name,
        last_name: employee.last_name,
        position: employee.position,
        department: employee.department,
      },
      overtime: type === 'exit' && workLog && workLog.balance >= 2
        ? { hoursWorked: workLog.hoursWorked, overtime: workLog.balance }
        : null,
    });
  } catch (error) {
    console.error('pointage:', error);
    return Response.json({ success: false, error: 'Erreur lors du pointage. Veuillez réessayer.' }, { status: 500 });
  }
});
