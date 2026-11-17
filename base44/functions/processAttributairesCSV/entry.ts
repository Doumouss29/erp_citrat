import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const clean = (v) => (v ?? '').toString().trim();
const normalizeHeader = (v) => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const buildHeaderMap = (headers) => Object.fromEntries(headers.map((h, i) => [normalizeHeader(h), i]));
const readColumn = (parts, headerMap, names, fallbackIndex = -1) => {
    for (const name of names) {
        const index = headerMap[normalizeHeader(name)];
        if (index !== undefined) return clean(parts[index]);
    }
    return fallbackIndex >= 0 ? clean(parts[fallbackIndex]) : '';
};
const normalizeDate = (value) => {
    const raw = clean(value);
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (!match) return raw;
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

        const { csv_url, id_lotissement, ilotsMap: ilotsMapRaw } = await req.json().catch(() => ({}));
        if (!csv_url || !id_lotissement || !ilotsMapRaw) {
            return Response.json({ error: 'csv_url, id_lotissement et ilotsMap requis' }, { status: 400 });
        }
        const ilotsMap = typeof ilotsMapRaw === 'string' ? JSON.parse(ilotsMapRaw) : ilotsMapRaw;
        
        let attributairesCreated = 0;

        console.log('Traitement du CSV d\'attributaires depuis:', csv_url);
        
        validateFetchUrl(csv_url);
        const csvResponse = await safeFetch(csv_url);
        if (!csvResponse.ok) {
            throw new Error(`Impossible de télécharger le CSV: ${csvResponse.status}`);
        }
        
        const csvText = await csvResponse.text();
        const lines = csvText.split('\n');
        
        console.log('Nombre total de lignes CSV:', lines.length);
        
        // Détecter le délimiteur (virgule ou point-virgule)
        let delimiter = ',';
        if (lines.length > 1) {
            const firstLine = lines[0];
            if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
                delimiter = ';';
            }
        }
        console.log('Délimiteur détecté:', delimiter);

        const headers = lines[0] ? lines[0].split(delimiter).map((part) => part.trim().replace(/^"|"$/g, '')) : [];
        const headerMap = buildHeaderMap(headers);
        
        // Ignorer la première ligne (en-tête)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parser manuellement en gérant les délimiteurs
            const parts = [];
            let currentPart = '';
            let inQuotes = false;
            
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                    parts.push(currentPart.trim().replace(/^"|"$/g, ''));
                    currentPart = '';
                } else {
                    currentPart += char;
                }
            }
            parts.push(currentPart.trim().replace(/^"|"$/g, ''));
            
            console.log(`Ligne ${i}: ${parts.length} colonnes`);
            
            const nom = readColumn(parts, headerMap, ['nom'], 0);
            const prenom = readColumn(parts, headerMap, ['prenom', 'prenoms'], 1);
            const cni = readColumn(parts, headerMap, ['cni', 'numero piece identite', 'numero_piece_identite'], 2);
            const numeroIlot = readColumn(parts, headerMap, ['ilot', 'numero ilot', 'numero_ilot'], 3);
            const lotInfo = readColumn(parts, headerMap, ['lot', 'numero lot', 'numero_lot'], 4);
            const affectation = readColumn(parts, headerMap, ['affectation'], 5);
            const statut = readColumn(parts, headerMap, ['statut', 'status'], 6);
            const telephone = readColumn(parts, headerMap, ['tel', 'telephone', 'contact']);
            const dateExpirationPiece = normalizeDate(readColumn(parts, headerMap, ['etabli', 'établi', 'date expiration piece', 'date_expiration_piece', 'date expiration', 'expiration piece']));
            const etablieA = readColumn(parts, headerMap, ['etablie_a', 'établie à', 'etablie a', 'établie a', 'lieu etablissement cni', "lieu d'etablissement", 'lieu établissement']);
            const profession = readColumn(parts, headerMap, ['profession']);
            const domicile = readColumn(parts, headerMap, ['domicile', 'adresse domicile']);
            
            // Valider les données requises
            if (!nom || !prenom || !numeroIlot || !lotInfo) {
                console.warn(`Ligne ${i} incomplète`);
                continue;
            }
            
            console.log(`Traitement ligne ${i}: ${nom} ${prenom}, ILOT: ${numeroIlot}, LOT: ${lotInfo}`);
            
            // Pas de mapping de statut - les statuts du CSV doivent être exactement comme en base
            const statutMapped = statut?.trim() || 'Lot en vente';
            
            try {
                // Trouver l'îlot correspondant
                const idIlot = ilotsMap[numeroIlot];
                if (!idIlot) {
                    console.warn(`Îlot ${numeroIlot} non trouvé`);
                    continue;
                }
                
                // Récupérer les lots de l'îlot
                const lotsIlot = await base44.asServiceRole.entities.Lot.filter({
                    id_lotissement,
                    id_ilot: idIlot
                });
                
                // Déterminer quels lots attribuer
                let lotsToAssign = [];
                if (lotInfo.trim().toUpperCase() === 'ALL') {
                    // Tous les lots de l'îlot
                    lotsToAssign = lotsIlot;
                } else {
                    // Numéros de lots spécifiques séparés par virgule
                    const numeroLots = lotInfo.split(',').map(n => n.trim());
                    lotsToAssign = lotsIlot.filter(lot => numeroLots.includes(lot.numero_lot));
                }
                
                if (lotsToAssign.length === 0) {
                    console.warn(`Aucun lot trouvé pour ${nom} ${prenom} dans l'îlot ${numeroIlot}`);
                    continue;
                }
                
                console.log(`Attribution de ${lotsToAssign.length} lot(s)`);
                
                // Gérer les attributaires multiples (séparés par &)
                const noms = nom.split('&').map(n => n.trim());
                const prenoms = prenom.split('&').map(p => p.trim());
                
                // Créer les paires nom/prénom
                const attributaires = noms.map((n, idx) => ({
                    nom: n,
                    prenom: prenoms[idx] || prenoms[0] || ''
                }));
                
                // Traiter chaque lot séquentiellement pour éviter les rate limits
                for (const lot of lotsToAssign) {
                    // Désactiver les anciens attributaires
                    const oldAttributaires = await base44.asServiceRole.entities.Attributaire.filter({
                        id_lot: lot.id,
                        actif: true
                    });
                    for (const attr of oldAttributaires) {
                        await base44.asServiceRole.entities.Attributaire.update(attr.id, { actif: false });
                    }
                    
                    // Créer les nouveaux attributaires en parallèle pour ce lot
                    const attributaireOps = [];
                    for (let j = 0; j < attributaires.length; j++) {
                        const attr = attributaires[j];
                        
                        attributaireOps.push(
                            base44.asServiceRole.entities.Attributaire.create({
                                id_lot: lot.id,
                                type_attributaire: 'physique',
                                nom: attr.nom,
                                prenom: attr.prenom,
                                numero_piece_identite: cni || '',
                                nature_piece_identite: cni ? 'CNI' : '',
                                telephone: telephone || '',
                                date_expiration_piece: dateExpirationPiece || '',
                                etablie_a: etablieA || '',
                                profession: profession || '',
                                domicile: domicile || '',
                                est_principal: j === 0,
                                date_attribution: new Date().toISOString().split('T')[0],
                                actif: true
                            })
                        );
                        attributairesCreated++;
                    }
                    
                    if (attributaireOps.length > 0) {
                        await Promise.all(attributaireOps);
                    }
                    
                    // Mettre à jour le lot avec affectation et statut
                    if (affectation?.trim() || statutMapped) {
                        await base44.asServiceRole.entities.Lot.update(lot.id, {
                            ...(affectation?.trim() && { affectation: affectation.trim() }),
                            ...(statutMapped && { statut: statutMapped })
                        });
                    }
                    
                    // Créer l'historique
                    await base44.asServiceRole.entities.HistoriqueAttribution.create({
                        id_lot: lot.id,
                        action: 'creation',
                        nom_attributaire: attributaires.map(a => `${a.prenom} ${a.nom}`.trim()).join(' & '),
                        type_attributaire: 'physique',
                        nouveau_statut: statutMapped || lot.statut,
                        utilisateur_action: user.email,
                        date_action: new Date().toISOString()
                    });
                    
                    // Délai court entre les traitements de lots pour éviter les rate limits
                    await sleep(100);
                }
            } catch (lineError) {
                console.error(`Erreur traitement ligne ${i}:`, lineError.message);
            }
        }
        
        console.log('Attributaires créés depuis CSV:', attributairesCreated);

        return Response.json({
            success: true,
            attributaires_created: attributairesCreated,
            message: 'Attributions terminées'
        });

    } catch (error) {
        console.error('Erreur traitement CSV:', error);
        return Response.json({ 
            error: 'Erreur lors du traitement du CSV' 
        }, { status: 500 });
    }
});