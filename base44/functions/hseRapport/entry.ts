import { createClientFromRequest } from "npm:@base44/sdk@0.8.60";
import { appDenial } from "../../shared/appAccess.ts";
import {
  hsePerms, quarterBounds, previousQuarter, filterEvents, photoCandidates, defaultContent, eventDate, ZONES, MAX_PHOTOS,
} from "../../shared/hseRapport.ts";

// Gestion des rapports trimestriels HSE-PRESFOR.
// Référent HSE : prépare (création, contenu, génération du PDF).
// Coordinateur HSE / Chef de projet HSE : valide, rouvre, marque transmis.
// Administrateurs : tout.

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const EDITABLE = [
  "zones", "deces_invalidite", "recommandations_precedentes", "progres", "risques", "recommandations",
  "pae_ppsps", "pae_synthese", "planification", "inclure_fiches", "inclure_photos", "photos_par_page", "photos_exclues",
];
const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const rows = (v: unknown, keys: string[]) =>
  (Array.isArray(v) ? v : []).slice(0, 60).map((r: any) => Object.fromEntries(keys.map((k) => [k, str(r?.[k], 500)])));

function sanitize(patch: any) {
  const out: any = {};
  for (const k of EDITABLE) if (k in (patch || {})) out[k] = patch[k];
  if ("zones" in out) out.zones = (Array.isArray(out.zones) ? out.zones : []).filter((z: string) => ZONES.includes(z));
  if ("deces_invalidite" in out) out.deces_invalidite = !!out.deces_invalidite;
  if ("inclure_fiches" in out) out.inclure_fiches = !!out.inclure_fiches;
  if ("inclure_photos" in out) out.inclure_photos = !!out.inclure_photos;
  if ("photos_par_page" in out) out.photos_par_page = Number(out.photos_par_page) === 2 ? 2 : 4;
  if ("progres" in out) out.progres = str(out.progres, 5000);
  if ("risques" in out) out.risques = str(out.risques, 5000);
  if ("pae_synthese" in out) out.pae_synthese = str(out.pae_synthese, 5000);
  if ("recommandations" in out) out.recommandations = (Array.isArray(out.recommandations) ? out.recommandations : []).map((t: unknown) => str(t, 500)).filter(Boolean).slice(0, 40);
  if ("photos_exclues" in out) out.photos_exclues = (Array.isArray(out.photos_exclues) ? out.photos_exclues : []).map((t: unknown) => str(t, 1000)).slice(0, 500);
  if ("recommandations_precedentes" in out) out.recommandations_precedentes = rows(out.recommandations_precedentes, ["texte", "etat"]).filter((r) => r.texte);
  if ("pae_ppsps" in out) out.pae_ppsps = rows(out.pae_ppsps, ["activite", "statut", "taux", "observations"]);
  if ("planification" in out) out.planification = rows(out.planification, ["activite", "periode", "responsable", "budget"]);
  return out;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return fail("Méthode non autorisée", 405);
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    const denied = await appDenial(client, user, "hse");
    if (denied) return denied;
    const perms = await hsePerms(client, user);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const db = client.asServiceRole.entities.RapportHSE;

    if (action === "me") return Response.json({ ...perms }, { headers: { "Cache-Control": "no-store" } });
    if (!perms.canView) return fail("Accès réservé au Référent HSE, au Coordinateur HSE, au Chef de projet HSE et aux administrateurs", 403);

    if (action === "list") {
      const list = await db.list("-annee", 200);
      list.sort((a: any, b: any) => (b.annee - a.annee) || (b.trimestre - a.trimestre));
      return Response.json({ rapports: list, perms }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "create") {
      if (!perms.canPrepare) return fail("Seul le Référent HSE peut créer un rapport", 403);
      const annee = Number(body.annee), trimestre = Number(body.trimestre);
      if (!Number.isInteger(annee) || annee < 2020 || annee > 2100 || ![1, 2, 3, 4].includes(trimestre)) return fail("Trimestre invalide");
      const existing = await db.filter({ annee, trimestre });
      if (existing.length) return Response.json({ rapport: existing[0], existing: true });
      const pq = previousQuarter(annee, trimestre);
      const previous = (await db.filter({ annee: pq.annee, trimestre: pq.trimestre }))[0] || null;
      const rapport = await db.create({ annee, trimestre, ...defaultContent(annee, trimestre, previous), prepare_par: user.email });
      return Response.json({ rapport }, { status: 201 });
    }

    const id = str(body.id, 100);
    const rapport = id ? await db.get(id).catch(() => null) : null;
    if (!rapport) return fail("Rapport introuvable", 404);

    if (action === "get") return Response.json({ rapport, perms }, { headers: { "Cache-Control": "no-store" } });

    if (action === "preview") {
      // Aperçu de l'étape 1 et liste des photos (étape 3), selon les zones éventuellement non encore enregistrées.
      const scope = { ...rapport, ...(Array.isArray(body.zones) ? { zones: body.zones.filter((z: string) => ZONES.includes(z)) } : {}) };
      const events = filterEvents(await client.entities.HSEEvent.filter({}, "fiche_number", 5000), scope);
      const photos = await photoCandidates(client, scope, events);
      const count = (code: string) => events.filter((e: any) => e.event_type_code === code).length;
      return Response.json({
        periode: quarterBounds(rapport.annee, rapport.trimestre),
        total: events.length, accidents: count("A"), incidents: count("I"), presquAccidents: count("PA"),
        ouvertes: events.filter((e: any) => e.status === "Ouvert").map((e: any) => ({ fiche_number: e.fiche_number, reference: e.reference, date: eventDate(e) })),
        sansPhoto: events.filter((e: any) => !(e.photos || []).length).map((e: any) => e.fiche_number).sort((a: number, b: number) => a - b),
        photos, maxPhotos: MAX_PHOTOS,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "save") {
      if (!perms.canPrepare) return fail("Seul le Référent HSE peut modifier un rapport", 403);
      if (rapport.statut !== "Brouillon") return fail("Rapport validé : rouvrez-le pour le modifier", 409);
      const patch = sanitize(body.patch);
      const updated = await db.update(id, { ...patch, modifie_apres_pdf: !!rapport.pdf_uri });
      return Response.json({ rapport: updated });
    }

    if (action === "status") {
      const to = body.statut;
      const now = new Date().toISOString();
      if (to === "Validé") {
        if (!perms.canValidate) return fail("La validation revient au Coordinateur HSE ou au Chef de projet HSE", 403);
        if (rapport.statut !== "Brouillon") return fail("Seul un brouillon peut être validé", 409);
        if (!rapport.pdf_uri || rapport.modifie_apres_pdf) return fail("Générez le PDF à jour avant de valider", 409);
        return Response.json({ rapport: await db.update(id, { statut: "Validé", valide_par: user.email, valide_le: now }) });
      }
      if (to === "Transmis") {
        if (!perms.canValidate && !perms.canPrepare) return fail("Action non autorisée", 403);
        if (rapport.statut !== "Validé") return fail("Seul un rapport validé peut être marqué transmis", 409);
        return Response.json({ rapport: await db.update(id, { statut: "Transmis", transmis_le: now }) });
      }
      if (to === "Brouillon") {
        if (!perms.canValidate) return fail("Seul un validateur peut rouvrir un rapport", 403);
        return Response.json({ rapport: await db.update(id, { statut: "Brouillon", valide_par: null, valide_le: null, transmis_le: null }) });
      }
      return fail("Statut inconnu");
    }

    if (action === "pdf") {
      if (!rapport.pdf_uri) return fail("Aucun PDF généré", 404);
      const link = await client.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: rapport.pdf_uri, expires_in: 600 });
      return Response.json({ url: link.signed_url }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "delete") {
      if (!perms.canPrepare) return fail("Action non autorisée", 403);
      if (rapport.statut !== "Brouillon") return fail("Un rapport validé ne peut pas être supprimé", 409);
      await db.delete(id);
      return Response.json({ deleted: true });
    }

    return fail("Action inconnue");
  } catch (e) {
    console.error("hseRapport:", e);
    return fail("Opération impossible. Veuillez réessayer.", 500);
  }
});
