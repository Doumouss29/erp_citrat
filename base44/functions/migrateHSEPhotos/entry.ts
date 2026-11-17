import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { items: photos } = await base44.asServiceRole.entities.Photo.filter({}, { limit: 500 });

    const results = { total: photos.length, migrated: 0, failed: 0, skipped: 0, details: [] };

    // Process in batches of 6 (Worker connection limit)
    const batchSize = 6;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(async (photo) => {
        try {
          const oldUrl = photo.image_url;
          if (!oldUrl) {
            results.skipped++;
            results.details.push({ id: photo.id, status: 'no_url' });
            return;
          }

          // Contrôle anti-SSRF : l'URL provient d'une fiche Photo, dont le champ
          // image_url est renseigné côté client. Une URL interne n'est jamais appelée.
          try {
            validateFetchUrl(oldUrl);
          } catch (_) {
            results.skipped++;
            results.details.push({ id: photo.id, status: 'url_non_autorisee' });
            return;
          }

          // Download the image from the old app storage
          const resp = await safeFetch(oldUrl, { signal: AbortSignal.timeout(30000) });
          if (!resp.ok) {
            results.failed++;
            results.details.push({ id: photo.id, status: 'download_failed', code: resp.status });
            return;
          }

          const blob = await resp.blob();
          if (blob.size === 0) {
            results.failed++;
            results.details.push({ id: photo.id, status: 'empty_blob' });
            return;
          }

          // Determine filename from URL
          const urlPath = new URL(oldUrl).pathname;
          const filename = urlPath.split('/').pop() || `photo-${photo.id}.jpg`;
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

          // Re-upload to the new app's public storage
          const upload = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
          const newUrl = upload.file_url;

          // Update the Photo record with the new URL
          await base44.asServiceRole.entities.Photo.update(photo.id, { image_url: newUrl });

          results.migrated++;
          results.details.push({ id: photo.id, status: 'ok', oldUrl, newUrl });
        } catch (err) {
          results.failed++;
          results.details.push({ id: photo.id, status: 'error', error: err.message });
        }
      }));
    }

    return Response.json(results);
  } catch (error) {
    console.error('migrateHSEPhotos:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}