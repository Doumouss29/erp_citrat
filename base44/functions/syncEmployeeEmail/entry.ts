import { createClientFromRequest } from "npm:@base44/sdk@0.8.60";

// RH : après un changement d'adresse sur une fiche employé, les pointages, journées, absences et congés
// de cet employé reprennent la nouvelle adresse. Chaque agent ne lit ses données que si elles portent
// l'adresse de son compte : sans cette mise à jour, son historique disparaît de son espace.
// Les enregistrements sont retrouvés par l'identifiant de la fiche ou le code salarié, jamais par l'ancienne adresse seule.

const norm = (v: unknown) => String(v || "").trim().toLowerCase();
const ENTITIES = ["TimeEntry", "DailyWorkLog", "Absence", "LeaveRequest"];

Deno.serve(async (req) => {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    if (!user || (user.role !== "admin" && user.grade !== "assistante_rh")) {
      return Response.json({ error: "Réservé à l'administration RH" }, { status: 403 });
    }
    const { employee_id } = await req.json().catch(() => ({}));
    const srv = client.asServiceRole.entities;
    const employee = employee_id ? await srv.Employee.get(String(employee_id)).catch(() => null) : null;
    if (!employee) return Response.json({ error: "Fiche employé introuvable" }, { status: 404 });
    const email = String(employee.email || "").trim();
    if (!/.+@.+\..+/.test(email)) return Response.json({ updated: 0, note: "Fiche sans adresse e-mail" });

    const result: Record<string, number> = {};
    for (const name of ENTITIES) {
      const seen = new Map<string, any>();
      const byId = await srv[name].filter({ employee_id: employee.id }, "-created_date", 5000).catch(() => []);
      const byCode = employee.employee_code
        ? await srv[name].filter({ employee_code: employee.employee_code }, "-created_date", 5000).catch(() => [])
        : [];
      for (const r of [...(byId || []), ...(byCode || [])]) seen.set(r.id, r);
      let n = 0;
      for (const r of seen.values()) {
        if (norm(r.employee_email) === norm(email)) continue;
        await srv[name].update(r.id, { employee_email: email });
        n++;
      }
      result[name] = n;
    }
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    if (total) {
      await srv.JournalAudit.create({
        type_action: "modification", user_email: user.email, champ_modifie: "email_employe_propage",
        dossier_reference: employee.employee_code || employee.id, nouvelle_valeur: JSON.stringify({ email, ...result }),
      }).catch(() => null);
    }
    return Response.json({ updated: total, details: result });
  } catch (e) {
    console.error("syncEmployeeEmail:", e);
    return Response.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
});
