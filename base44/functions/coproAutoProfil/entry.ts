import { createClientFromRequest } from "npm:@base44/sdk@0.8.60";
import { appDenial } from "../../shared/appAccess.ts";

// COPROCIV : attribution automatique du profil métier.
// Tout compte qui a accès à COPROCIV (grade ou accès supplémentaire) et n'a pas encore de profil
// reçoit « géomètre-expert ». Appelé à l'ouverture du module ; sans effet si un profil existe déjà.
Deno.serve(async (req) => {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    const denied = await appDenial(client, user, "coprociv");
    if (denied) return denied;
    if (user.copro_profil) return Response.json({ copro_profil: user.copro_profil, updated: false });
    await client.asServiceRole.entities.User.update(user.id, { copro_profil: "geometre" });
    return Response.json({ copro_profil: "geometre", updated: true });
  } catch (e) {
    console.error("coproAutoProfil:", e);
    return Response.json({ error: "Attribution du profil impossible" }, { status: 500 });
  }
});
