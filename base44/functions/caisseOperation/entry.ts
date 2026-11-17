import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Point d'entrée unique pour écrire dans les caisses (OperationCaisse).
 * - L'auteur (cree_par_email, modifie_par_email, annule_par_email) est fixé ici, à partir du compte connecté :
 *   il ne peut pas être falsifié depuis l'écran.
 * - Le n° de bon est attribué ici, à partir de toutes les opérations du bureau (pas de doublon).
 * - Chaque action est inscrite dans JournalCaisse (non modifiable, lisible par l'administration).
 * - Un bon n'est jamais effacé : il est annulé avec un motif.
 *
 * Corps attendu : { action: 'create' | 'update' | 'cancel', id?, data?, motif? }
 */

const EDITABLE = [
  'type_operation', 'date_operation', 'beneficiaire', 'description', 'montant', 'montant_recu',
  'montant_reste', 'montant_lettres', 'observation', 'mode_reglement', 'bureau_id',
  'justificatif_url', 'justificatif_nom',
];

const LABELS: Record<string, string> = {
  type_operation: 'Type',
  date_operation: 'Date',
  beneficiaire: 'Bénéficiaire',
  description: 'Description / motif',
  montant: 'Montant',
  montant_recu: 'Montant reçu',
  montant_reste: 'Reste à payer',
  montant_lettres: 'Montant en lettres',
  observation: 'Observation',
  mode_reglement: 'Mode de paiement',
  bureau_id: 'Bureau',
  justificatif_url: 'Justificatif',
  justificatif_nom: 'Nom du justificatif',
};

const NUMERIC = new Set(['montant', 'montant_recu', 'montant_reste']);
const OPEN_STATUTS = ['en_attente', 'en_attente_justification'];
const TYPES = ['entree', 'sortie', 'solde_depart'];

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

function isDirection(u: any) {
  return u?.super_admin === true || u?.role === 'admin' || u?.fonction === 'admin' || u?.data?.fonction === 'admin';
}

function bureauIdsOf(u: any): string[] {
  const ids = [
    ...(Array.isArray(u?.bureau_ids) ? u.bureau_ids : []),
    ...(Array.isArray(u?.data?.bureau_ids) ? u.data.bureau_ids : []),
    u?.bureau_id,
    u?.data?.bureau_id,
  ].filter(Boolean);
  return Array.from(new Set(ids));
}

function canAccessBureau(u: any, bureauId: string) {
  return isDirection(u) || bureauIdsOf(u).includes(bureauId);
}

function canChange(u: any, op: any) {
  if (!op || op.statut === 'annule') return false;
  if (isDirection(u)) return true;
  const mine = norm(op.cree_par_email) === norm(u.email) || bureauIdsOf(u).includes(op.bureau_id);
  return mine && OPEN_STATUTS.includes(op.statut || 'en_attente');
}

function userName(u: any) {
  const composed = [u?.prenom || u?.data?.prenom, u?.nom || u?.data?.nom].filter(Boolean).join(' ').trim();
  return composed || u?.full_name || u?.email || '';
}

function pickEditable(data: any) {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (data && Object.prototype.hasOwnProperty.call(data, key)) {
      const v = data[key];
      out[key] = NUMERIC.has(key) ? (v === '' || v === null || v === undefined ? 0 : Number(v)) : (v ?? '');
    }
  }
  return out;
}

function display(key: string, v: unknown) {
  if (v === null || v === undefined || v === '') return '';
  if (NUMERIC.has(key)) return Number(v).toLocaleString('fr-FR');
  return String(v);
}

function nextBonNumero(ops: any[], type: string, date: string, bureauCode: string) {
  if (!bureauCode || (type !== 'entree' && type !== 'sortie')) return '';
  const d = new Date(date || new Date().toISOString());
  const base = `${type === 'entree' ? 'BE' : 'BS'}-${bureauCode}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-`;
  const used = ops
    .map((op) => String(op?.numero_bon || '').trim())
    .filter((s) => s.startsWith(base) && /^\d+$/.test(s.slice(base.length)))
    .map((s) => Number(s.slice(base.length)));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${base}${String(next).padStart(4, '0')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non connecté' }, { status: 401 });
    if (['en_attente', 'suspendu'].includes(user.role) || user.statut === 'suspendu') {
      return Response.json({ error: 'Compte non autorisé' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');
    const db = base44.asServiceRole.entities;
    const now = new Date().toISOString();
    const nom = userName(user);

    const log = (op: any, act: string, extra: Record<string, unknown> = {}) =>
      db.JournalCaisse.create({
        action: act,
        operation_id: op.id,
        numero_bon: op.numero_bon || '',
        type_operation: op.type_operation || '',
        bureau_id: op.bureau_id || '',
        bureau_code: op.bureau_code || '',
        montant: Number(op.montant || 0),
        beneficiaire: op.beneficiaire || '',
        user_email: user.email,
        user_nom: nom,
        ...extra,
      });

    // ---------- CRÉATION ----------
    if (action === 'create') {
      const values = pickEditable(body.data || {});
      const type = String(values.type_operation || '');
      const bureauId = String(values.bureau_id || '');
      if (!TYPES.includes(type)) return Response.json({ error: "Type d'opération invalide" }, { status: 400 });
      if (!bureauId || !canAccessBureau(user, bureauId)) {
        return Response.json({ error: "Vous n'avez pas accès à ce bureau" }, { status: 403 });
      }
      if (!values.date_operation) return Response.json({ error: 'Date obligatoire' }, { status: 400 });
      if (!(Number(values.montant) > 0) && type !== 'solde_depart') {
        return Response.json({ error: 'Montant invalide' }, { status: 400 });
      }

      const bureau = await db.Bureau.get(bureauId).catch(() => null);
      if (!bureau) return Response.json({ error: 'Bureau introuvable' }, { status: 404 });

      const bureauOps = await db.OperationCaisse.filter({ bureau_id: bureauId }, '-created_date', 5000);
      const numero_bon = nextBonNumero(bureauOps, type, String(values.date_operation), bureau.code);

      const created = await db.OperationCaisse.create({
        ...values,
        bureau_id: bureauId,
        bureau_code: bureau.code || '',
        numero_bon,
        statut: 'en_attente',
        cree_par_email: user.email,
      });
      await log(created, 'creation');
      return Response.json({ success: true, operation: created });
    }

    // ---------- MODIFICATION / ANNULATION ----------
    const id = String(body?.id || '');
    if (!id) return Response.json({ error: 'Identifiant manquant' }, { status: 400 });
    const op = await db.OperationCaisse.get(id).catch(() => null);
    if (!op) return Response.json({ error: 'Opération introuvable' }, { status: 404 });
    if (!canAccessBureau(user, op.bureau_id) || !canChange(user, op)) {
      return Response.json({ error: "Vous ne pouvez pas modifier ce bon (déjà traité, annulé ou hors de votre bureau)" }, { status: 403 });
    }

    if (action === 'update') {
      const values = pickEditable(body.data || {});
      if (values.bureau_id && values.bureau_id !== op.bureau_id && !canAccessBureau(user, String(values.bureau_id))) {
        return Response.json({ error: "Vous n'avez pas accès à ce bureau" }, { status: 403 });
      }
      if (values.type_operation && !TYPES.includes(String(values.type_operation))) {
        return Response.json({ error: "Type d'opération invalide" }, { status: 400 });
      }

      const changements = Object.keys(values)
        .filter((k) => display(k, op[k]) !== display(k, values[k]))
        .map((k) => ({ champ: k, label: LABELS[k] || k, avant: display(k, op[k]), apres: display(k, values[k]) }));

      if (!changements.length) return Response.json({ success: true, operation: op, unchanged: true });

      let bureauCode = op.bureau_code;
      if (values.bureau_id && values.bureau_id !== op.bureau_id) {
        const b = await db.Bureau.get(String(values.bureau_id)).catch(() => null);
        bureauCode = b?.code || bureauCode;
      }

      const updated = await db.OperationCaisse.update(op.id, {
        ...values,
        bureau_code: bureauCode,
        modifie_par_email: user.email,
        date_modification: now,
      });
      await log({ ...op, ...values, bureau_code: bureauCode }, 'modification', { changements });
      return Response.json({ success: true, operation: updated });
    }

    if (action === 'cancel') {
      const motif = String(body?.motif || '').trim();
      if (motif.length < 3) return Response.json({ error: "Le motif d'annulation est obligatoire" }, { status: 400 });
      const updated = await db.OperationCaisse.update(op.id, {
        statut: 'annule',
        annule_par_email: user.email,
        date_annulation: now,
        motif_annulation: motif,
      });
      await log(op, 'annulation', {
        motif,
        changements: [{ champ: 'statut', label: 'Statut', avant: op.statut || 'en_attente', apres: 'annule' }],
      });
      return Response.json({ success: true, operation: updated });
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('caisseOperation:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});
