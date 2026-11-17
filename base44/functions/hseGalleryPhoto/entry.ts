import { createClientFromRequest } from "npm:@base44/sdk@0.8.60";
import { appDenial } from "../../shared/appAccess.ts";

const categories = new Set(["Blessures", "Véhicule/Moto", "Équipement", "Environnement"]);
const incidents = new Set(["Accident", "Incident", "Presqu'accident"]);
const maxBytes = 10 * 1024 * 1024;
const fail = (error: string, status: number) => Response.json({ error }, { status });

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return fail("Méthode non autorisée", 405);
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    const denied = await appDenial(client, user, "hse");
    if (denied) return denied;
    const core = client.asServiceRole.integrations.Core;
    const json = req.headers.get("content-type")?.includes("application/json") ? await req.json() : null;
    const canEdit = (photo: any) => user.role === "admin" || photo.created_by_id === user.id;
    if (json?.action === "list") {
      const photos = await client.entities.Photo.list("-date_photo");
      for (let i = 0; i < photos.length; i += 8) {
        await Promise.all(photos.slice(i, i + 8).map(async (photo: any) => {
          photo.can_edit = canEdit(photo);
          if (!photo.hse_private_uri) return;
          const link = await core.CreateFileSignedUrl({ file_uri: photo.hse_private_uri, expires_in: 3600 });
          photo.image_url = link.signed_url;
          delete photo.hse_private_uri;
        }));
      }
      return Response.json({ photos }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!["admin", "user"].includes(user.role)) return fail("Ajout non autorisé", 403);
    if (Number(req.headers.get("content-length")) > maxBytes + 65536) return fail("Maximum 10 Mo par image", 413);
    if (json && json.action !== "edit") return fail("Action inconnue", 400);
    const form = json ? null : await req.formData();
    const field = (name: string) => json ? json[name] : form?.get(name);
    const file = form?.get("file");
    const caption = String(field("caption") || "").trim();
    const category = String(field("category") || "");
    const incident = String(field("incident") || "");
    const editing = field("action") === "edit";
    const patch: Record<string, string> = {};
    let id = "";
    if (editing) {
      id = String(field("id") || "");
      if (!id) return fail("Photo requise", 400);
      const current = await client.entities.Photo.get(id).catch(() => null);
      if (!current || !canEdit(current)) return fail("Modification non autorisée", 403);
      if (caption !== (current.title || current.caption || "")) patch.title = caption || "Photo";
      if (category && category !== current.category) {
        if (!categories.has(category)) return fail("Catégorie invalide", 400);
        patch.category = category;
      }
      if (incident && incident !== current.incident_type) {
        if (!incidents.has(incident)) return fail("Type invalide", 400);
        patch.incident_type = incident;
      }
      if (!file) {
        if (Object.keys(patch).length) await client.entities.Photo.update(id, patch);
        return Response.json({ id });
      }
    } else if (!categories.has(category) || !incidents.has(incident)) return fail("Catégorie ou type d’événement invalide", 400);
    if (!(file instanceof File) || !file.size || file.size > maxBytes) return fail("Sélectionnez une image de 10 Mo maximum", 400);
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const format = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpeg"
      : [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n) ? "png"
      : new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP" ? "webp" : "";
    if (!format) return fail("Formats acceptés : JPEG, PNG et WebP", 400);
    const upload = await core.UploadPrivateFile({ file: new File([file], crypto.randomUUID() + "." + format, { type: "image/" + format }) });
    if (!upload.file_uri) throw new Error("Transfert incomplet");
    if (editing) {
      await client.asServiceRole.entities.Photo.update(id, { ...patch, image_url: upload.file_uri, hse_private_uri: upload.file_uri });
      return Response.json({ id });
    }
    const photo = await client.asServiceRole.entities.Photo.create({
      created_by_id: user.id, title: caption || file.name, category, incident_type: incident,
      date_photo: new Date().toISOString().slice(0, 10), image_url: upload.file_uri, hse_private_uri: upload.file_uri
    });
    return Response.json({ id: photo.id }, { status: 201 });
  } catch {
    return fail("Opération impossible. Veuillez réessayer.", 500);
  }
});
