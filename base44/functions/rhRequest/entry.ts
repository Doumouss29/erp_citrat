import { rhNotices } from "../../shared/communications.ts";
import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.60';

/**
 * Workflow RH sécurisé (congés et absences).
 *
 * Les entités LeaveRequest et Absence ne sont modifiables que par les
 * administrateurs (RLS). Les agents et les validateurs passent par cette
 * fonction, qui fixe côté serveur tout ce qui ne doit pas être choisi par
 * l'appelant : identité de l'employé, statut, validateurs, décisions, soldes.
 *
 * Actions :
 *  - submit : { kind: 'leave'|'absence', data }   → crée la demande
 *  - review : { kind, id, approved, comment }       → décision du niveau courant
 *  - cancel : { kind, id }                          → retrait d'une demande en attente par son auteur
 */

const ENTITY = { leave: 'LeaveRequest', absence: 'Absence' };

// Champs que l'appelant ne peut jamais fixer lui-même.
const PROTECTED = new Set([
  'id', 'status', 'approver_email', 'approver_name', 'approved_date', 'rejection_reason',
  'level1_approver', 'level1_approver_email', 'level1_status', 'level1_date', 'level1_comment',
  'level2_approver_email', 'level2_status', 'level2_date', 'level2_comment',
  'level3_approver_email', 'level3_status', 'level3_date', 'level3_comment',
  'review_date', 'reviewed_by', 'review_comment',
  'employee_id', 'employee_code', 'employee_name', 'employee_email', 'office', 'employee_location',
  'created_by', 'created_by_id', 'created_date', 'updated_date',
]);

const norm = (v) => String(v || '').trim().toLowerCase();

// Les champs URL (justificatifs) ne peuvent contenir qu'une adresse https :
// un schéma javascript: ou data: deviendrait un XSS stocké chez le validateur.
function isSafeHttpsUrl(value) {
  if (value === null || value === undefined || value === '') return true;
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}

// --- Calcul des jours côté serveur (mêmes règles que les formulaires) ---------
// total_days n'est jamais pris dans la requête : il est recalculé à partir des dates.

function parseIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Congés : jours calendaires, bornes incluses (calculateCalendarDays).
function calendarDays(start, end) {
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// Absences : jours ouvrés en Côte d'Ivoire — dimanche et fériés fixes exclus (calculateWorkingDays).
const HOLIDAYS_CI = new Set(['1-1', '5-1', '8-7', '8-15', '11-1', '11-15', '12-25']);
function workingDays(start, end) {
  let count = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t);
    if (d.getUTCDay() === 0) continue;
    if (HOLIDAYS_CI.has(`${d.getUTCMonth() + 1}-${d.getUTCDate()}`)) continue;
    count++;
  }
  return count;
}

function computeDays(kind, startValue, endValue) {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end || start > end) return null;
  return kind === 'leave' ? calendarDays(start, end) : workingDays(start, end);
}

const MAX_SPAN_DAYS = 366;
const LEAVE_PERIODS = new Set(['individuel', 'collectif', 'maternite']);
const LEAVE_TYPES = new Set(['annuel', 'maladie', 'maternite', 'special', 'sans_solde']);
// Mêmes types que l'ancienne application RH-CGESN (événements familiaux compris)
const ABSENCE_TYPES = new Set(['maladie', 'accident_travail', 'formation', 'mission', 'personnel', 'autre',
  'mariage_travailleur', 'mariage_enfant_frere_soeur', 'deces_conjoint', 'deces_enfant_pere_mere', 'deces_frere_soeur',
  'deces_beau_parent', 'naissance_enfant', 'bapteme_enfant', 'premiere_communion', 'demenagement']);

async function loadValidators(srv) {
  const list = await srv.entities.ConfigurationApp.filter({ cle: 'workflow_validators' });
  const v = (list && list[0] && list[0].valeur) || {};
  const level1 = (Array.isArray(v.level1) ? v.level1 : [])
    .filter((e) => e && String(e.email || '').trim() && e.actif !== false);
  const person = (p) => (p && String(p.email || '').trim() ? { nom: p.nom || '', email: String(p.email).trim() } : null);
  // Personnes sans validateur de bureau (ex. coordinateur) : circuit RH puis DG.
  const directLevel2 = (Array.isArray(v.direct_level2) ? v.direct_level2 : [])
    .filter((e) => e && String(e.email || '').trim() && e.actif !== false);
  // Comptes en lecture seule (ex. assistante RH) : aucune décision, même administrateurs.
  const readOnly = (Array.isArray(v.read_only) ? v.read_only : [])
    .map((e) => norm(e && e.email))
    .filter(Boolean);
  const level1ByEmployee = (Array.isArray(v.level1_by_employee) ? v.level1_by_employee : [])
    .filter((e) => e && String(e.employee_code || '').trim() && String(e.email || '').trim());
  return { level1, level2: person(v.level2), level3: person(v.level3), directLevel2, readOnly, level1ByEmployee };
}

/**
 * Point d'entrée du circuit selon le demandeur :
 *  - DG (Niveau 3)                         → ne dépose pas de demande dans ce circuit ;
 *  - Gestionnaire RH (Niveau 2)            → DG directement ;
 *  - validateur de bureau (Niveau 1)       → DG directement (comme dans l'ancienne application) ;
 *  - personne listée « circuit RH → DG »    → RH puis DG ;
 *  - tous les autres                       → Niveau 1, puis RH, puis DG.
 */
function entryLevel(validators, email: string, employeeCode: string) {
  const me = norm(email);
  const code = norm(employeeCode);
  if (validators.level3 && norm(validators.level3.email) === me) return 'dg';
  if (validators.level2 && norm(validators.level2.email) === me) return 'level3';
  // Validateur de bureau : directement à la Direction Générale (règle de l'ancienne application)
  if (validators.level1.some((e) => norm(e.email) === me)) return 'level3';
  if (validators.directLevel2.some((e) => norm(e.email) === me || (code && norm(e.employee_code) === code))) return 'level2';
  return 'level1';
}

function resolveLevel1(validators, location, department, employeeCode) {
  // Validateur attribué à la personne : prioritaire sur le bureau et le département.
  const code = norm(employeeCode);
  const personal = code ? validators.level1ByEmployee.find((e) => norm(e.employee_code) === code) : null;
  if (personal) return { name: personal.nom || '', email: String(personal.email).trim() };
  const loc = norm(location);
  const dept = norm(department);
  const active = validators.level1;
  // 1. bureau + département ; 2. bureau seul ; 3. département seul (ex. bureau « CAG SECRETARIAT »
  // → validateur du secrétariat) ; 4. repli : ligne « __default__ » si elle existe, sinon le
  // validateur général d'Abidjan (règle de l'ancienne application).
  let m = dept ? active.find((e) => norm(e.localite) === loc && norm(e.departement) === dept) : null;
  if (!m) m = active.find((e) => norm(e.localite) === loc && !norm(e.departement));
  if (!m && dept) m = active.find((e) => norm(e.departement) === dept);
  if (!m) m = active.find((e) => norm(e.localite) === '__default__');
  if (!m) m = active.find((e) => norm(e.localite) === 'abidjan' && !norm(e.departement));
  return { name: m?.nom || '', email: m?.email || '' };
}

async function findEmployeeByEmail(srv, email) {
  const target = norm(email);
  if (!target) return null;
  const direct = await srv.entities.Employee.filter({ email });
  if (direct && direct.length) return direct[0];
  const all = await srv.entities.Employee.list('-created_date', 2000);
  return (all || []).find((e) => norm(e.email) === target) || null;
}

function isDecember(leave) {
  return leave.leave_period === 'collectif' || leave.leave_period === 'decembre';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'rhcgesn');
    if (denied) return denied;
    if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    // Un compte suspendu n'agit plus sur le workflow, un externe ne dépose pas de demande.
    const grade = String(user.grade ?? user.data?.grade ?? '');
    const statut = String(user.statut ?? user.data?.statut ?? '');
    if (statut === 'suspendu' && user.role !== 'admin') {
      return Response.json({ error: 'Votre compte est suspendu' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const kind = String(body.kind || '');
    const entityName = ENTITY[kind];
    if (!entityName) return Response.json({ error: 'Type de demande invalide' }, { status: 400 });

    const srv = base44.asServiceRole;
    const entity = srv.entities[entityName];
    const isAdmin = user.role === 'admin';
    const me = norm(user.email);

    // ------------------------------------------------------------------ submit
    if (action === 'submit') {
      if (['prestataire', 'consultant'].includes(grade)) {
        return Response.json({ error: 'Les congés et absences ne concernent pas les prestataires et consultants' }, { status: 403 });
      }
      const input = body.data && typeof body.data === 'object' ? body.data : {};
      const delegated = kind === "leave" && typeof body.for_employee_id === "string";
      if (delegated && !isAdmin && grade !== "assistante_rh") return Response.json({ error: "Accès refusé" }, { status: 403 });
      const employee = delegated ? await srv.entities.Employee.get(body.for_employee_id) : await findEmployeeByEmail(srv, user.email);
      if (!employee) {
        return Response.json({ error: "Aucune fiche employé n'est associée à votre adresse e-mail." }, { status: 403 });
      }

      const clean = {};
      for (const [k, v] of Object.entries(input)) {
        if (!PROTECTED.has(k) && !k.startsWith('level')) clean[k] = v;
      }
      for (const [k, v] of Object.entries(clean)) {
        if (k.endsWith('_url') && !isSafeHttpsUrl(v)) {
          return Response.json({ error: 'Lien de justificatif invalide (https uniquement)' }, { status: 400 });
        }
      }
      const totalDays = computeDays(kind, clean.start_date, clean.end_date);
      if (totalDays === null || calendarDays(parseIsoDate(clean.start_date), parseIsoDate(clean.end_date)) > MAX_SPAN_DAYS) {
        return Response.json({ error: 'Dates invalides' }, { status: 400 });
      }
      // Le nombre de jours décompté est toujours celui calculé par le serveur.
      clean.total_days = totalDays;
      if (kind === 'leave') {
        clean.leave_period = LEAVE_PERIODS.has(clean.leave_period) ? clean.leave_period : 'individuel';
        clean.leave_type = LEAVE_TYPES.has(clean.leave_type) ? clean.leave_type : 'annuel';
      } else {
        clean.absence_type = ABSENCE_TYPES.has(clean.absence_type) ? clean.absence_type : 'autre';
      }

      const validators = await loadValidators(srv);
      const location = employee.office || 'Non spécifié';
      const entry = delegated ? "level1" : entryLevel(validators, user.email, employee.employee_code);
      if (entry === 'dg') {
        return Response.json({ error: 'La Direction Générale ne dépose pas de demande dans ce circuit.' }, { status: 403 });
      }
      // Le Niveau 1 n'est résolu que pour les demandes qui y passent réellement.
      const level1 = entry === 'level1' ? resolveLevel1(validators, location, employee.department, employee.employee_code) : { name: '', email: '' };
      if (entry === 'level1' && !level1.email) {
        return Response.json({
          error: "Aucun validateur de bureau n'est configuré pour votre bureau et votre département. Contactez le service RH."
        }, { status: 409 });
      }
      const now = new Date().toISOString();

      const record = {
        ...clean,
        employee_id: employee.id,
        employee_code: employee.employee_code || '',
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || user.full_name || user.email,
        employee_email: delegated ? employee.email : user.email,
        employee_location: location,
        office: employee.office || '',
        requested_date: now,
        level1_approver: level1.name,
        level1_approver_email: level1.email,
        level2_approver_email: validators.level2?.email || '',
        level3_approver_email: validators.level3?.email || '',
        // Validateurs de bureau et personnes « circuit RH → DG » : RH puis DG.
        // Gestionnaire RH : DG directement. Les niveaux sautés sont marqués « approved »
        // avec un commentaire explicite (ce n'est pas une validation d'une personne).
        status: `pending_${entry}`,
        level1_status: entry === 'level1' ? 'pending' : 'approved',
        level1_date: entry === 'level1' ? null : now,
        level1_comment: entry === 'level1' ? '' : 'Niveau 1 non applicable (demande d\'un validateur)',
        level2_status: entry === 'level3' ? 'approved' : 'pending',
        level2_date: entry === 'level3' ? now : null,
        level2_comment: entry === 'level3' ? 'Niveau 2 non applicable (transmis directement à la Direction Générale)' : '',
        level3_status: 'pending',
      };

      const created = await entity.create(record);
      await rhNotices(srv, kind, created, "submit");
      return Response.json({ success: true, record: created });
    }

    // Les actions suivantes portent sur une demande existante.
    const id = String(body.id || '');
    if (!id) return Response.json({ error: 'Identifiant manquant' }, { status: 400 });
    const item = await entity.get(id).catch(() => null);
    if (!item) return Response.json({ error: 'Demande introuvable' }, { status: 404 });

    const isOwner = norm(item.employee_email) === me || (item.created_by_id && item.created_by_id === user.id);

    // ------------------------------------------------------------------ cancel
    if (action === 'cancel') {
      if (!isOwner && !isAdmin) return Response.json({ error: 'Non autorisé' }, { status: 403 });
      // Retirer la demande d'un autre agent revient à décider : interdit en lecture seule.
      if (!isOwner && (await loadValidators(srv)).readOnly.includes(me)) {
        return Response.json({ error: 'Votre compte est en lecture seule sur les validations' }, { status: 403 });
      }
      if (!isAdmin && !String(item.status || '').startsWith('pending')) {
        return Response.json({ error: 'Seule une demande en attente peut être retirée' }, { status: 409 });
      }
      await entity.delete(id);
      await rhNotices(srv, kind, item, "cancel", item.status);
      return Response.json({ success: true });
    }

    // ------------------------------------------------------------------ review
    if (action === 'review') {
      const approved = body.approved === true;
      const comment = String(body.comment || '').slice(0, 2000);
      const validators = await loadValidators(srv);
      const status = String(item.status || '');

      if (validators.readOnly.includes(me)) {
        return Response.json({ error: 'Votre compte est en lecture seule sur les validations' }, { status: 403 });
      }

      let level = null;
      if (status === 'pending_level1') level = 'level1';
      else if (status === 'pending_level2') level = 'level2';
      else if (status === 'pending_level3') level = 'level3';
      if (!level) return Response.json({ error: "Cette demande n'est pas en attente de validation" }, { status: 409 });

      // Personne, administrateur compris, ne décide de sa propre demande.
      if (isOwner) return Response.json({ error: 'Vous ne pouvez pas valider votre propre demande' }, { status: 403 });
      if (!approved && !comment.trim()) {
        return Response.json({ error: 'Le motif du refus est obligatoire' }, { status: 400 });
      }
      if (!isAdmin) {
        let allowed = false;
        if (level === 'level1') {
          allowed = validators.level1.some((e) => norm(e.email) === me) && norm(item.level1_approver_email) === me;
        } else if (level === 'level2') {
          allowed = !!validators.level2 && norm(validators.level2.email) === me;
        } else {
          allowed = !!validators.level3 && norm(validators.level3.email) === me;
        }
        if (!allowed) return Response.json({ error: "Vous n'êtes pas le validateur de ce niveau" }, { status: 403 });
      }

      const now = new Date().toISOString();
      const updates = { review_date: now, reviewed_by: user.full_name || user.email };
      updates[`${level}_status`] = approved ? 'approved' : 'rejected';
      updates[`${level}_date`] = now;
      updates[`${level}_comment`] = comment;
      // Auteur réel de la décision (peut différer du validateur prévu si un admin le remplace).
      updates[`${level}_decided_by`] = user.full_name || user.email;
      updates[`${level}_decided_by_email`] = user.email;
      if (level === 'level1') updates.status = approved ? 'pending_level2' : 'rejected';
      if (level === 'level2') updates.status = approved ? 'pending_level3' : 'rejected';
      if (level === 'level3') updates.status = approved ? 'approved' : 'rejected';
      if (updates.status === 'approved') {
        updates.approved_date = now;
        updates.approver_email = user.email;
        updates.approver_name = user.full_name || user.email;
      }
      if (updates.status === 'rejected') updates.rejection_reason = comment;

      if (updates.status === 'pending_level2') updates.level2_approver_email = validators.level2?.email || '';
      if (updates.status === 'pending_level3') updates.level3_approver_email = validators.level3?.email || '';
      if ((updates.status === 'pending_level2' && !updates.level2_approver_email) ||
          (updates.status === 'pending_level3' && !updates.level3_approver_email)) {
        return Response.json({ error: 'Le prochain validateur doit être configuré dans Administration.' }, { status: 409 });
      }
      // Décompte des soldes à l'approbation finale.
      if (updates.status === 'approved' && item.employee_id) {
        const employee = await srv.entities.Employee.get(item.employee_id).catch(() => null);
        if (employee) {
          // Recalcul à partir des dates enregistrées : la valeur stockée n'est pas fiable
          // pour les demandes antérieures à ce correctif ou saisies hors fonction.
          const recomputed = computeDays(kind, item.start_date, item.end_date);
          const days = recomputed ?? (Number(item.total_days) || 0);
          if (recomputed !== null && recomputed !== Number(item.total_days)) {
            updates.total_days = recomputed;
          }
          if (kind === 'leave') {
            if (isDecember(item)) {
              await srv.entities.Employee.update(employee.id, {
                remaining_december_days: Math.max(0, (employee.remaining_december_days ?? 15) - days),
              });
            } else {
              await srv.entities.Employee.update(employee.id, {
                remaining_year_days: Math.max(0, (employee.remaining_year_days ?? 15) - days),
              });
            }
          } else {
            await srv.entities.Employee.update(employee.id, {
              absence_days_used: Math.min(10, (employee.absence_days_used || 0) + days),
            });
          }
        }
      }

      const updated = await entity.update(id, updates);
      await rhNotices(srv, kind, { ...item, ...updated, ...updates }, "review", status);
      return Response.json({ success: true, level, record: updated });
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('rhRequest:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});
