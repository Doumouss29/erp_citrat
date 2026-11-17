import { createClientFromRequest } from "npm:@base44/sdk@0.8.60";

// RH : quand l'administrateur change l'adresse d'un validateur, les demandes (absences et congés)
// encore en attente à ce niveau suivent la nouvelle adresse. Sans cela, elles restent adressées
// à l'ancienne adresse : le validateur ne les voit pas et ne peut pas les traiter.
// Les demandes déjà traitées ne sont pas modifiées (historique conservé tel quel).

const norm = (v: unknown) => String(v || "").trim().toLowerCase();
const ENTITIES = ["Absence", "LeaveRequest"];

Deno.serve(async (req) => {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    if (!user || user.role !== "admin") return Response.json({ error: "Réservé aux administrateurs" }, { status: 403 });
    const { changes } = await req.json().catch(() => ({}));
    const list = (Array.isArray(changes) ? changes : [])
      .map((c: any) => ({ level: Number(c.level), from: norm(c.from), to: String(c.to || "").trim(), nom: String(c.nom || "").trim() }))
      .filter((c) => [1, 2, 3].includes(c.level) && c.from && c.to && /.+@.+\..+/.test(c.to) && c.from !== norm(c.to))
      .slice(0, 50);

    const srv = client.asServiceRole.entities;
    const done: any[] = [];
    for (const c of list) {
      const field = `level${c.level}_approver_email`;
      let count = 0;
      for (const name of ENTITIES) {
        const pending = await srv[name].filter({ status: `pending_level${c.level}` }, "-created_date", 2000).catch(() => []);
        for (const item of pending || []) {
          if (norm(item[field]) !== c.from) continue;
          const patch: Record<string, string> = { [field]: c.to };
          if (c.level === 1 && c.nom) patch.level1_approver = c.nom;
          if (norm(item.approver_email) === c.from) {
            patch.approver_email = c.to;
            if (c.nom) patch.approver_name = c.nom;
          }
          await srv[name].update(item.id, patch);
          count++;
        }
      }
      done.push({ level: c.level, from: c.from, to: c.to, count });
    }
    if (done.some((d) => d.count)) {
      await srv.JournalAudit.create({
        type_action: "modification", user_email: user.email, champ_modifie: "validateurs_rh",
        dossier_reference: "workflow_validators", nouvelle_valeur: JSON.stringify({ reattributions: done }),
      }).catch(() => null);
    }
    return Response.json({ reassigned: done.reduce((n, d) => n + d.count, 0), details: done });
  } catch (e) {
    console.error("reassignApprovers:", e);
    return Response.json({ error: "Réattribution impossible" }, { status: 500 });
  }
});
