import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';

// Ray casting point-in-polygon
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function pointInFeature(lon, lat, feature) {
  const g = feature.geometry;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  for (const poly of polys) {
    if (pointInRing(lon, lat, poly[0])) return true;
  }
  return false;
}

function findSection(lon, lat, sections) {
  for (const sec of sections) {
    for (const f of sec.features) {
      if (pointInFeature(lon, lat, f)) return sec.code;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const offset = body.offset || 0;
    const batchSize = 50;

    // Charger le cadastre BEDIALA
    const cadastre = await base44.asServiceRole.entities.CadastreCommunal.filter({ commune: 'BEDIALA' });

    // Charger les GeoJSON de toutes les sections (5 à la fois)
    const sections = [];
    for (let i = 0; i < cadastre.length; i += 5) {
      const chunk = cadastre.slice(i, i + 5);
      const loaded = await Promise.all(chunk.map(async (c) => {
        // geojson_url provient d'un enregistrement : on refuse les URL internes
        // (localhost, IP privées, métadonnées cloud) avant tout appel réseau.
        try {
          validateFetchUrl(c.geojson_url);
        } catch (e) {
          console.warn(`Section ignorée (URL refusée) : ${c.nom_section}`);
          return null;
        }
        const res = await safeFetch(c.geojson_url, { redirect: 'error' });
        if (!res.ok) return null;
        const gj = await res.json();
        if (!gj || !Array.isArray(gj.features)) return null;
        return {
          code: c.nom_section.replace('SECTION - ', '').trim(),
          features: gj.features
        };
      }));
      sections.push(...loaded.filter(Boolean));
    }

    // Charger le batch de collectes BEDIALA
    const batch = await base44.asServiceRole.entities.Collecte.filter({ commune: 'BEDIALA' }, 'id', batchSize, offset);

    const updates = [];
    let noGps = 0, notFound = 0, unchanged = 0;

    for (const c of batch) {
      if (!c.latitude || !c.longitude) { noGps++; continue; }
      const newSection = findSection(c.longitude, c.latitude, sections);
      if (!newSection) { notFound++; continue; }
      if (newSection === (c.section || '').trim()) { unchanged++; continue; }
      updates.push({ id: c.id, section: newSection });
    }

    if (updates.length > 0) {
      await base44.asServiceRole.entities.Collecte.bulkUpdate(updates);
    }

    return Response.json({
      offset,
      batchSize,
      fetched: batch.length,
      updated: updates.length,
      unchanged,
      noGps,
      notFound,
      hasMore: batch.length === batchSize
    });

  } catch (error) {
    console.error('reassignSectionsBediala:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});