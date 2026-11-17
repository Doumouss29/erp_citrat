import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/* Réparation des données E-GUIDE.
   Les 5 lotissements E-GUIDE ont été supprimés alors que leurs îlots, lots et
   documents existaient toujours : le module E-GUIDE n'affichait plus rien et des
   milliers d'enregistrements pointaient vers des lotissements inexistants.
   Cette fonction recrée les lotissements manquants (données issues de l'export)
   puis rattache les îlots, les lots et les documents à ces lotissements.
   Elle est rejouable : rappelée autant de fois que nécessaire, elle ne crée
   jamais de doublon. */

const LOTISSEMENTS = [
  {
    oldId: '6ad69613ceb5f55f19b7c457',
    data: {
      nom: 'BOHOUSSOUKRO SOLDE TF 158',
      localite: 'BOHOUSSOUKRO',
      commune: 'DALOA',
      region: 'REGION DU HAUT SASSANDRA',
      village: 'BOHOUSSOUKRO',
      decret: '',
      zoom_defaut: 20,
      coordonnees_centre: { lng: -6.33856, lat: 6.90357 },
      statut: 'En cours'
    }
  },
  {
    oldId: '6ad69613ceb5f55f19b7c458',
    data: {
      nom: 'BOHOUSSOUKRO BLOC B & C',
      localite: 'BOHOUSSOUKRO',
      commune: 'DALOA',
      region: 'REGION DU HAUT SASSANDRA',
      village: 'BOHOUSSOUKRO',
      decret: '',
      zoom_defaut: 15,
      coordonnees_centre: { lng: -6.337753, lat: 6.905366 },
      statut: 'En cours'
    }
  },
  {
    oldId: '6ad69613ceb5f55f19b7c459',
    data: {
      nom: 'BOHOUSSOUKRO BLOC A',
      localite: 'BOHOUSSOUKRO',
      commune: 'DALOA',
      region: 'REGION DU HAUT SASSANDRA',
      village: 'BOHOUSSOUKRO',
      decret: '',
      zoom_defaut: 20,
      coordonnees_centre: { lng: -6.341193, lat: 6.903322 },
      statut: 'En cours'
    }
  },
  {
    oldId: '6ad69613ceb5f55f19b7c45a',
    data: {
      nom: 'ZARA HORIZON',
      localite: 'BINGERVILLE',
      commune: 'BINGERVILLE',
      region: 'REGION DES LAGUNES',
      village: '',
      decret: '',
      zoom_defaut: 16,
      coordonnees_centre: { lng: -3.7781568374622827, lat: 5.302730227943443 },
      statut: 'En cours'
    }
  },
  {
    oldId: '6ad69613ceb5f55f19b7c45b',
    data: {
      nom: 'LOGBAKRO BLE',
      localite: 'LOGBAKRO',
      commune: 'YAMOUSSOUKRO',
      region: 'REGION DES LACS',
      village: 'LOGBAKRO',
      decret: '16-0080/MCU/DGUF/DU/SDAF',
      zoom_defaut: 16,
      coordonnees_centre: { lng: -5.1751302959831085, lat: 6.755130474642398 },
      statut: 'En cours'
    }
  }
];

const IDS_ORPHELINS = LOTISSEMENTS.map((l) => l.oldId);
const TAILLE_LOT = 150;
const MAX_TOURS = 30;

// Retrouve l'identifiant du lotissement recréé pour chaque ancienne référence
async function chargerMapping(srv) {
  const mapping = {};
  for (const lotissement of LOTISSEMENTS) {
    const trouve = await srv.entities.LotissementEguide.filter(
      { nom: lotissement.data.nom, commune: lotissement.data.commune },
      '-created_date',
      5
    );
    mapping[lotissement.oldId] = trouve && trouve.length ? trouve[0].id : null;
  }
  return mapping;
}

// Rattache par lots les enregistrements encore liés à un lotissement supprimé
async function relierEnfants(srv, entite, champ, mapping) {
  let traites = 0;
  for (let tour = 0; tour < MAX_TOURS; tour++) {
    const restants = await srv.entities[entite].filter(
      { [champ]: { $in: IDS_ORPHELINS } },
      '-created_date',
      TAILLE_LOT
    );
    if (!restants || restants.length === 0) return { traites, terminee: true };

    const modifications = restants
      .filter((enr) => mapping[enr[champ]])
      .map((enr) => ({ id: enr.id, [champ]: mapping[enr[champ]] }));

    if (modifications.length === 0) {
      return { traites, terminee: false, erreur: `Lotissement introuvable pour ${entite}` };
    }

    await srv.entities[entite].bulkUpdate(modifications);
    traites += modifications.length;
  }

  const restant = await srv.entities[entite].count({ [champ]: { $in: IDS_ORPHELINS } });
  return { traites, terminee: restant === 0, restant };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Accès refusé' }, { status: 403 });

    const srv = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const etape = body && body.step ? String(body.step) : 'lotissements';

    // 1. Recréer les lotissements manquants
    if (etape === 'lotissements') {
      const mapping = {};
      const crees = [];
      for (const lotissement of LOTISSEMENTS) {
        const existants = await srv.entities.LotissementEguide.filter(
          { nom: lotissement.data.nom, commune: lotissement.data.commune },
          '-created_date',
          5
        );
        if (existants && existants.length) {
          mapping[lotissement.oldId] = existants[0].id;
          continue;
        }
        const cree = await srv.entities.LotissementEguide.create(lotissement.data);
        mapping[lotissement.oldId] = cree.id;
        crees.push(lotissement.data.nom);
      }
      return Response.json({ etape, crees, mapping, suivant: 'ilots' });
    }

    const mapping = await chargerMapping(srv);
    const manquants = Object.values(mapping).filter((v) => !v).length;
    if (manquants > 0) {
      return Response.json(
        { etape, erreur: `${manquants} lotissement(s) manquant(s) : lancez d'abord l'étape lotissements` },
        { status: 400 }
      );
    }

    // 2. Rattacher les îlots
    if (etape === 'ilots') {
      const resultat = await relierEnfants(srv, 'Ilot', 'id_lotissement', mapping);
      return Response.json({ etape, ...resultat, suivant: 'lots' });
    }

    // 3. Rattacher les lots
    if (etape === 'lots') {
      const resultat = await relierEnfants(srv, 'Lot', 'id_lotissement', mapping);
      return Response.json({ etape, ...resultat, suivant: 'documents' });
    }

    // 4. Rattacher les documents
    if (etape === 'documents') {
      const resultat = await relierEnfants(srv, 'Document', 'id_lotissement', mapping);
      return Response.json({ etape, ...resultat, suivant: 'nettoyage' });
    }

    // 5. Compléter les numéros d'îlots incomplets (valeur "_" de l'import) à partir de leurs lots
    if (etape === 'nettoyage') {
      const aCorriger = [];
      for (const champ of ['numero_lot_debut', 'numero_lot_fin']) {
        const trouves = await srv.entities.Ilot.filter({ [champ]: '_' }, '-created_date', 500);
        for (const ilot of trouves || []) {
          if (!aCorriger.some((i) => i.id === ilot.id)) aCorriger.push(ilot);
        }
      }

      const modifications = [];
      for (const ilot of aCorriger) {
        const lots = await srv.entities.Lot.filter({ id_ilot: ilot.id }, '-created_date', 2000);
        const numeros = (lots || [])
          .map((lot) => parseInt(lot.numero_lot, 10))
          .filter((n) => !Number.isNaN(n))
          .sort((a, b) => a - b);
        modifications.push({
          id: ilot.id,
          numero_lot_debut: numeros.length ? String(numeros[0]) : '',
          numero_lot_fin: numeros.length ? String(numeros[numeros.length - 1]) : '',
          nombre_lots: numeros.length ? numeros.length : ilot.nombre_lots
        });
      }
      if (modifications.length) await srv.entities.Ilot.bulkUpdate(modifications);
      return Response.json({ etape, corriges: modifications.length, suivant: 'compteurs' });
    }

    // 6. Recompter les îlots et les lots de chaque lotissement
    if (etape === 'compteurs') {
      const details = [];
      for (const lotissement of LOTISSEMENTS) {
        const id = mapping[lotissement.oldId];
        const nombreIlots = await srv.entities.Ilot.count({ id_lotissement: id });
        const nombreLots = await srv.entities.Lot.count({ id_lotissement: id });
        await srv.entities.LotissementEguide.update(id, {
          nombre_ilots: nombreIlots,
          nombre_lots: nombreLots
        });
        details.push({ nom: lotissement.data.nom, id, nombreIlots, nombreLots });
      }
      return Response.json({ etape, details, termine: true });
    }

    return Response.json({ error: 'Étape inconnue' }, { status: 400 });
  } catch (error) {
    console.error('restoreEguideLotissements:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}