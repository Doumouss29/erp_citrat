import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin uniquement' }, { status: 403 });

    const body = await req.json();
    const fileUrl = body?.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url requis' }, { status: 400 });

    // Extraire les données structurées du fichier Excel
    const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          bureau: { type: 'string' },
          numero: { type: 'number' },
          annee: { type: 'string' },
          localite: { type: 'string' },
          nom: { type: 'string' },
          superficie_text: { type: 'string' },
          superficie_ha: { type: 'number' },
          avancement: { type: 'string' },
          observations: { type: 'string' },
          solutions: { type: 'string' }
        },
        required: ['nom']
      }
    });

    if (extractResult.status !== 'success' || !extractResult.output) {
      return Response.json({ error: 'Extraction échouée', details: extractResult.details }, { status: 500 });
    }

    const rows = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];

    // Filtrer les lignes vides ou invalides et mapper vers le schéma Lotissement
    const records = rows
      .filter((r: any) => r && r.nom && String(r.nom).trim())
      .map((r: any) => ({
        nom: String(r.nom).trim(),
        localite: r.localite ? String(r.localite).trim() : '',
        bureau: r.bureau ? String(r.bureau).trim() : '',
        annee: r.annee ? Number(r.annee) : undefined,
        superficie_text: r.superficie_text ? String(r.superficie_text).trim() : '',
        superficie_ha: r.superficie_ha ? Number(r.superficie_ha) : undefined,
        avancement: r.avancement ? String(r.avancement).trim() : '',
        solutions: r.solutions ? String(r.solutions).trim() : '',
        notes: r.observations ? String(r.observations).trim() : '',
        statut: 'En cours'
      }))
      .filter((r: any) => r.nom);

    if (records.length === 0) {
      return Response.json({ error: 'Aucun lotissement valide trouvé dans le fichier' }, { status: 400 });
    }

    const created = await base44.entities.Lotissement.bulkCreate(records);

    return Response.json({
      success: true,
      imported: created.length,
      total_extracted: rows.length
    });
  } catch (error) {
    console.error('importLotissements:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}