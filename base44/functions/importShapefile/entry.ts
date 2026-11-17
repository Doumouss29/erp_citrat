import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';
import shp from 'npm:shpjs@4.0.4';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error) => {
    const status = error?.status || error?.originalError?.response?.status;
    const message = (error?.message || '').toLowerCase();
    return status === 429 || (status >= 500 && status < 600) || message.includes('rate limit') || message.includes('timeout') || message.includes('network');
};

const withRetry = async (operation, label, maxRetries = 6) => {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!isRetryableError(error) || attempt === maxRetries) {
                throw error;
            }

            const delay = Math.round(500 * (2 ** attempt) * (0.8 + Math.random() * 0.4));
            console.warn(`${label} - tentative ${attempt + 1} échouée, nouvelle tentative dans ${delay}ms`, error?.message || error);
            await sleep(delay);
        }
    }

    throw lastError;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { zip_url, csv_url, id_lotissement, date_attribution } = await req.json();

        if (!zip_url || !id_lotissement) {
            return Response.json({ error: 'zip_url et id_lotissement requis' }, { status: 400 });
        }

        console.log('Téléchargement du ZIP depuis:', zip_url);

        // Télécharger le ZIP en tant qu'ArrayBuffer
        validateFetchUrl(zip_url);
        const zipResponse = await safeFetch(zip_url);
        if (!zipResponse.ok) {
            throw new Error(`Impossible de télécharger le ZIP: ${zipResponse.status}`);
        }
        
        const zipArrayBuffer = await zipResponse.arrayBuffer();
        console.log('ZIP téléchargé:', zipArrayBuffer.byteLength, 'octets');

        // Parser le shapefile ZIP
        const geoJSON = await shp(zipArrayBuffer);

        console.log('GeoJSON parsé:', typeof geoJSON, Array.isArray(geoJSON));

        // Trouver les couches ilot et lot
        let ilotsGeoJSON = null;
        let lotsGeoJSON = null;

        if (Array.isArray(geoJSON)) {
            console.log('Nombre de couches:', geoJSON.length);
            for (const layer of geoJSON) {
                const fileName = layer.fileName?.toLowerCase() || '';
                console.log('Couche trouvée:', fileName);
                if (fileName.includes('ilot')) {
                    ilotsGeoJSON = layer;
                } else if (fileName.includes('lot')) {
                    lotsGeoJSON = layer;
                }
            }
        } else if (geoJSON.features) {
            console.log('Une seule couche avec', geoJSON.features.length, 'features');
            const firstFeature = geoJSON.features?.[0];
            console.log('Propriétés de la première feature:', Object.keys(firstFeature?.properties || {}));
            
            if (firstFeature?.properties?.numero && !firstFeature?.properties?.numero_lot) {
                ilotsGeoJSON = geoJSON;
            } else if (firstFeature?.properties?.numero_lot) {
                lotsGeoJSON = geoJSON;
            }
        }

        console.log('Îlots trouvés:', ilotsGeoJSON ? 'oui' : 'non');
        console.log('Lots trouvés:', lotsGeoJSON ? 'oui' : 'non');

        if (!ilotsGeoJSON && !lotsGeoJSON) {
            return Response.json({ 
                error: 'Aucune couche ilot ou lot trouvée dans le ZIP' 
            }, { status: 400 });
        }

        const ilotsMap = {};
        let ilotsCreated = 0;
        let lotsCreated = 0;

        // Préparer les îlots pour création en masse
        if (ilotsGeoJSON?.features) {
            console.log('Préparation de', ilotsGeoJSON.features.length, 'îlots');
            const ilotsToCreate = [];
            
            for (const feature of ilotsGeoJSON.features) {
                const props = feature.properties;
                const numero = props.numero || props.NUMERO || props.numero_ilot || props.NUMERO_ILOT;
                
                if (!numero) {
                    console.warn('Îlot sans numéro ignoré', props);
                    continue;
                }

                ilotsToCreate.push({
                    id_lotissement,
                    numero_ilot: String(numero),
                    geometrie: feature.geometry
                });
            }

            // Créer les îlots par batch de 100
            if (ilotsToCreate.length > 0) {
                const batchSize = 100;
                const allCreatedIlots = [];
                
                for (let i = 0; i < ilotsToCreate.length; i += batchSize) {
                    const batch = ilotsToCreate.slice(i, i + batchSize);
                    const createdIlots = await withRetry(
                        () => base44.asServiceRole.entities.Ilot.bulkCreate(batch),
                        `Création batch îlots ${i}-${i + batch.length}`
                    );
                    allCreatedIlots.push(...createdIlots);
                    console.log(`Îlots créés: ${i + batch.length}/${ilotsToCreate.length}`);
                    await sleep(250);
                }
                
                // Créer la map numero -> id
                allCreatedIlots.forEach((ilot, index) => {
                    ilotsMap[ilotsToCreate[index].numero_ilot] = ilot.id;
                });
                
                ilotsCreated = allCreatedIlots.length;
                console.log('Total îlots créés:', ilotsCreated);
            }
        }

        // Préparer les lots pour création en masse
        if (lotsGeoJSON?.features) {
            console.log('Préparation de', lotsGeoJSON.features.length, 'lots');
            const lotsToCreate = [];
            const lotsByIlot = {};

            for (const feature of lotsGeoJSON.features) {
                const props = feature.properties;
                const numeroLot = props.numero_lot || props.NUMERO_LOT || props.numero || props.NUMERO;
                const numeroIlot = props.ilot || props.ILOT || props.numero_ilot || props.NUMERO_ILOT;
                const parcelle = props.parcelle || props.PARCELLE || props.numero_parcelle || props.NUMERO_PARCELLE;
                const tf = props.tf || props.TF;
                const surface = props.surface || props.SURFACE || props.superficie || props.SUPERFICIE || 0;

                if (!numeroLot) {
                    console.warn('Lot sans numéro ignoré', props);
                    continue;
                }

                const idIlot = ilotsMap[String(numeroIlot)];
                if (!idIlot && numeroIlot) {
                    console.warn(`Îlot ${numeroIlot} non trouvé pour le lot ${numeroLot}`);
                }

                lotsToCreate.push({
                    id_lotissement,
                    id_ilot: idIlot || null,
                    numero_lot: String(numeroLot),
                    parcelle: parcelle ? String(parcelle) : null,
                    TF: tf ? String(tf) : null,
                    surface: Math.round(parseFloat(surface) || 0),
                    statut: 'Lot en vente',
                    geometrie: feature.geometry
                });

                // Compter les lots par îlot
                if (idIlot) {
                    if (!lotsByIlot[idIlot]) {
                        lotsByIlot[idIlot] = {
                            count: 0,
                            min: String(numeroLot),
                            max: String(numeroLot)
                        };
                    }
                    lotsByIlot[idIlot].count++;
                    
                    if (String(numeroLot) < lotsByIlot[idIlot].min) {
                        lotsByIlot[idIlot].min = String(numeroLot);
                    }
                    if (String(numeroLot) > lotsByIlot[idIlot].max) {
                        lotsByIlot[idIlot].max = String(numeroLot);
                    }
                }
            }

            // Créer les lots par batch de 100 et récupérer les IDs
            const allCreatedLots = [];
            if (lotsToCreate.length > 0) {
                const batchSize = 100;
                
                for (let i = 0; i < lotsToCreate.length; i += batchSize) {
                    const batch = lotsToCreate.slice(i, i + batchSize);
                    const createdBatch = await withRetry(
                        () => base44.asServiceRole.entities.Lot.bulkCreate(batch),
                        `Création batch lots ${i}-${i + batch.length}`
                    );
                    allCreatedLots.push(...createdBatch);
                    console.log(`Lots créés: ${i + batch.length}/${lotsToCreate.length}`);
                    await sleep(300);
                }
                
                lotsCreated = lotsToCreate.length;
                console.log('Total lots créés:', lotsCreated);
                
                // Créer les attestations pour tous les lots
                console.log('Création des attestations...');
                const attestationsToCreate = allCreatedLots.map(lot => ({
                    id_lot: lot.id,
                    numero_attestation: lot.numero_lot,
                    date_attestation: date_attribution || new Date().toISOString().split("T")[0],
                    type_attestation: "Attribution"
                }));
                
                for (let i = 0; i < attestationsToCreate.length; i += batchSize) {
                    const batch = attestationsToCreate.slice(i, i + batchSize);
                    await withRetry(
                        () => base44.asServiceRole.entities.Attestation.bulkCreate(batch),
                        `Création batch attestations ${i}-${i + batch.length}`
                    );
                    console.log(`Attestations créées: ${i + batch.length}/${attestationsToCreate.length}`);
                    await sleep(400);
                }
                
                console.log('Total attestations créées:', attestationsToCreate.length);
            }

            // Mettre à jour les îlots avec les infos des lots en batch
            const ilotUpdates = Object.entries(lotsByIlot).map(([idIlot, info]) => 
                withRetry(
                    () => base44.asServiceRole.entities.Ilot.update(idIlot, {
                        nombre_lots: info.count,
                        numero_lot_debut: info.min,
                        numero_lot_fin: info.max
                    }),
                    `Mise à jour îlot ${idIlot}`
                ).catch(err => {
                    console.warn(`Erreur mise à jour îlot ${idIlot}:`, err.message);
                    return null;
                })
            );
            
            const results = await Promise.all(ilotUpdates);
            const ilotsUpdated = results.filter(r => r !== null).length;
            
            if (ilotsUpdated > 0) {
                console.log('Îlots mis à jour:', ilotsUpdated);
            }
        }

        console.log('Import shapes terminé:', ilotsCreated, 'îlots et', lotsCreated, 'lots créés');

        return Response.json({
            success: true,
            ilots_created: ilotsCreated,
            lots_created: lotsCreated,
            date_attribution: date_attribution
        });

    } catch (error) {
        console.error('Erreur import shapefile:', error);
        return Response.json({ 
            error: 'Erreur lors de l\'import du shapefile' 
        }, { status: 500 });
    }
});