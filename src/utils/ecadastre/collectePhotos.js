import { base44 } from '@/api/base44Client';

// Champs image d'une Collecte. Avant, ces champs contenaient l'image encodée (data:image/...;base64),
// ce qui rendait chaque fiche très lourde (200-400 Ko). Désormais on y stocke l'URL du fichier envoyé.
export const PHOTO_FIELDS = [
  'prop_photo_carte_identite_recto',
  'prop_photo_carte_identite_verso',
  'prop_photo_signature',
  'societe_photo_signature',
  'bien_photo_facade',
  'bien_photo_entree',
  'bien_photo_general',
  'bien2_photo_facade',
  'bien2_photo_entree',
  'bien2_photo_general',
  'signature_agent_photo',
];

// Champs légers pour les listes (sans aucune photo)
export const COLLECTE_LIST_FIELDS = [
  'id', 'organisation_id', 'commune', 'section', 'parcelle', 'lot', 'ilot', 'quartier',
  'nature', 'statut', 'type_proprietaire', 'prop_nom', 'prop_prenoms', 'societe_raison_sociale',
  'date_collecte', 'created_date', 'created_by', 'created_by_id', 'reference_dgi',
];

export const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');

// Cache de session : même image (ex. signature de l'agent réutilisée) => un seul envoi
const uploadCache = new Map();

function dataUrlToFile(dataUrl, name) {
  const [header, b64] = dataUrl.split(',');
  const mime = (header.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mime.split('/')[1] || 'jpg';
  return new File([bytes], `${name}.${ext}`, { type: mime });
}

export async function uploadDataUrl(dataUrl, name = 'photo') {
  if (!isDataUrl(dataUrl)) return dataUrl;
  if (uploadCache.has(dataUrl)) return uploadCache.get(dataUrl);
  const file = dataUrlToFile(dataUrl, name);
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  uploadCache.set(dataUrl, file_url);
  return file_url;
}

/**
 * Remplace chaque photo base64 de `data` par l'URL du fichier envoyé.
 * - strict=false (défaut) : si un envoi échoue (réseau), la photo base64 est conservée
 *   pour ne jamais perdre de données.
 * - strict=true : l'erreur est remontée (utilisé par la migration).
 * Retourne { data, changed } où changed liste les champs convertis.
 */
export async function uploadCollectePhotos(data, { strict = false } = {}) {
  if (!data) return { data, changed: [] };
  const out = { ...data };
  const changed = [];
  for (const field of PHOTO_FIELDS) {
    const value = out[field];
    if (!isDataUrl(value)) continue;
    try {
      out[field] = await uploadDataUrl(value, field);
      changed.push(field);
    } catch (err) {
      if (strict) throw err;
      console.warn(`Envoi de la photo ${field} impossible, conservée en local`, err);
    }
  }
  return { data: out, changed };
}

// Raccourci : renvoie directement les données converties
export async function withUploadedPhotos(data) {
  const { data: out } = await uploadCollectePhotos(data);
  return out;
}
