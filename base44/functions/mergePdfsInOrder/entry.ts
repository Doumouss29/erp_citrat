import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';


const MAX_BYTES = 15 * 1024 * 1024;
const MAX_JSON_BYTES = Math.ceil(MAX_BYTES / 3) * 4 + 4096;
const MAX_PAGES = 400;

async function readBoundedJson(req) {
  if (Number(req.headers.get('content-length')) > MAX_JSON_BYTES) {
    return { error: 'Fichiers trop volumineux', status: 413 };
  }
  if (!req.body) return { error: 'Requête vide', status: 400 };
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel();
        return { error: 'Fichiers trop volumineux', status: 413 };
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  try { return { body: JSON.parse(new TextDecoder().decode(buffer)) }; }
  catch { return { error: 'JSON invalide', status: 400 }; }
}

function b64ToUint8Array(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'suspendu' || user.role === 'en_attente' || user.statut === 'suspendu') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const input = await readBoundedJson(req);
    if (input.error) return Response.json({ error: input.error }, { status: input.status });
    const body = input.body;
    const firstB64 = body?.first_pdf_b64;
    const secondB64 = body?.second_pdf_b64;
    if (typeof firstB64 !== 'string' || typeof secondB64 !== 'string' || !firstB64 || !secondB64) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    if (firstB64.length + secondB64.length > Math.ceil(MAX_BYTES / 3) * 4 + 4) {
      return Response.json({ error: 'Maximum 15 Mo au total' }, { status: 413 });
    }
    if (![firstB64, secondB64].every(s => s.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(s))) {
      return Response.json({ error: 'Encodage PDF invalide' }, { status: 400 });
    }
    const firstBytes = b64ToUint8Array(firstB64);
    const secondBytes = b64ToUint8Array(secondB64);

    if (firstBytes.byteLength + secondBytes.byteLength > MAX_BYTES) {
      return Response.json({ error: 'Maximum 15 Mo au total' }, { status: 413 });
    }
    const merged = await PDFDocument.create();

    const docA = await PDFDocument.load(firstBytes);
    if (docA.getPageCount() > MAX_PAGES) return Response.json({ error: 'Maximum 400 pages' }, { status: 413 });
    const aPages = await merged.copyPages(docA, docA.getPageIndices());
    aPages.forEach((p) => merged.addPage(p));

    const docB = await PDFDocument.load(secondBytes);
    if (docA.getPageCount() + docB.getPageCount() > MAX_PAGES) return Response.json({ error: 'Maximum 400 pages' }, { status: 413 });
    const bPages = await merged.copyPages(docB, docB.getPageIndices());
    bPages.forEach((p) => merged.addPage(p));

    const finalBytes = await merged.save();

    return new Response(finalBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=guide_global_merge.pdf',
      },
    });
  } catch (error) {
    console.error('mergePdfsInOrder:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});