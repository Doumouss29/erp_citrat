import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'ecadastre');
    if (denied) return denied;

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { collecteId } = body;

    if (!collecteId) {
      return Response.json({ error: 'collecteId requis' }, { status: 400 });
    }

    const results = await base44.asServiceRole.entities.Collecte.filter({ id: collecteId });
    const collecte = results[0];

    if (!collecte) {
      return Response.json({ error: 'Collecte non trouvée' }, { status: 404 });
    }

    const canAccessCollecte =
      collecte.created_by_id === user.id ||
      user.role === 'admin' ||
      (user.role === 'superviseur' && !!user.organisation_id && collecte.organisation_id === user.organisation_id &&
        (!user.communes_supervisees?.length || user.communes_supervisees.includes(collecte.commune)));
    if (!canAccessCollecte) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const esc = (val) => String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const kvRow = (label, value) =>
      `<tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;width:50%;">${esc(label)}</td><td style="border:1px solid #000;padding:4px 8px;width:50%;">${esc(value)}</td></tr>`;

    const kvRow4 = (l1, v1, l2, v2) =>
      `<tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;width:25%;">${esc(l1)}</td><td style="border:1px solid #000;padding:4px 8px;width:25%;">${esc(v1)}</td><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;width:25%;">${esc(l2)}</td><td style="border:1px solid #000;padding:4px 8px;width:25%;">${esc(v2)}</td></tr>`;

    const heading = (text) =>
      `<h2 style="margin-top:20px;">${esc(text)}</h2>`;

    const table = (rows) => `<table style="border-collapse:collapse;width:100%;">${rows.join('')}</table>`;

    const htmlParts = [];
    htmlParts.push('<div style="text-align:center;">');
    htmlParts.push('<p style="font-weight:bold;font-size:14px;">MINISTERE DE L\'ECONOMIE ET DES FINANCES</p>');
    htmlParts.push('<p style="font-weight:bold;font-size:14px;">DIRECTION GENERALE DES IMPOTS - DIRECTION DU CADASTRE</p>');
    htmlParts.push('<p style="font-weight:bold;font-size:14px;margin-bottom:20px;">OPERATION DE RECENSEMENT DES PROPRIETAIRES FONCIERS</p>');
    htmlParts.push('</div>');

    // I - Parcelle
    htmlParts.push(heading('I - INFORMATIONS SUR LA PARCELLE'));
    htmlParts.push(table([
      kvRow('Commune', collecte.commune),
      kvRow('Section', collecte.section),
      kvRow('Parcelle', collecte.parcelle),
      kvRow('Quartier', collecte.quartier),
      kvRow4('Lot', collecte.lot, 'Îlot', collecte.ilot),
      kvRow('Surface Imposable (m²)', collecte.surface_imposable),
      kvRow('Référence DGI', collecte.reference_dgi),
    ]));

    // II - Propriétaire
    const propTitle = collecte.type_proprietaire === 'societe'
      ? 'II - RENSEIGNEMENTS SUR LE PROPRIETAIRE (Société/Personne Morale)'
      : 'II - RENSEIGNEMENTS SUR LE PROPRIETAIRE (Particulier)';
    htmlParts.push(heading(propTitle));

    if (collecte.type_proprietaire === 'societe') {
      htmlParts.push(table([
        kvRow('Raison sociale', collecte.societe_raison_sociale),
        kvRow('N° Registre de Commerce', collecte.societe_registre_commerce),
        kvRow('N° Compte contribuable', collecte.societe_compte_contribuable),
        kvRow('Adresse postale', collecte.societe_adresse_postale),
        kvRow4('Ville', collecte.societe_ville, 'Quartier', collecte.societe_quartier),
        kvRow('Téléphone', collecte.societe_tel),
      ]));
    } else {
      htmlParts.push(table([
        kvRow4('Nom', collecte.prop_nom, 'Prénoms', collecte.prop_prenoms),
        kvRow4('Date de naissance', collecte.prop_date_naissance, 'Lieu de naissance', collecte.prop_lieu_naissance),
        kvRow('Nationalité', collecte.prop_nationalite),
        kvRow('N° Carte d\'identité', collecte.prop_carte_identite),
        kvRow('Adresse résidence', collecte.prop_adresse_postale),
        kvRow4('Ville', collecte.prop_ville, 'Quartier', collecte.prop_quartier_residence),
        kvRow('Téléphone', collecte.prop_tel),
        kvRow('Profession', collecte.prof_profession),
        kvRow4('Situation familiale', collecte.situation_familiale, 'Enfants à charge', collecte.nombre_enfants),
        kvRow('N° Compte contribuable', collecte.prop_compte_contribuable),
      ]));
    }

    // III - Bien
    htmlParts.push(heading('III - RENSEIGNEMENTS CONCERNANT LE BIEN'));
    htmlParts.push(table([
      kvRow('Nature du local', collecte.bien_nature_local),
      kvRow4('Équipé en eau', collecte.bien_equipe_eau ? 'Oui' : 'Non', 'Équipé en électricité', collecte.bien_equipe_electricite ? 'Oui' : 'Non'),
      kvRow4('Nombre de niveaux', collecte.bien_nombre_niveaux, 'Nombre de bâtiments', collecte.bien_nombre_batiments),
      kvRow('Année d\'achèvement', collecte.bien_annee_achevement),
      kvRow4('Nombre de pièces', collecte.bien_nombre_pieces, 'Val. locative mensuelle', String(collecte.bien_valeur_locative_mensuelle || '') + ' FCFA'),
    ]));

    // IV - Tableau de synthèse
    if (collecte.tableau_synthese && collecte.tableau_synthese.length > 0) {
      htmlParts.push(heading('IV - TABLEAU DE SYNTHÈSE'));
      const synthRows = ['<tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Année achèvement</td><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Nature occupation</td><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Valeur locative annuelle</td><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Nombre pièces</td></tr>'];
      collecte.tableau_synthese.forEach(row => {
        synthRows.push(`<tr><td style="border:1px solid #000;padding:4px 8px;">${esc(row.annee_achevement)}</td><td style="border:1px solid #000;padding:4px 8px;">${esc(row.nature_occupation)}</td><td style="border:1px solid #000;padding:4px 8px;">${esc(row.valeur_locative_annuelle)}</td><td style="border:1px solid #000;padding:4px 8px;">${esc(row.nombre_pieces)}</td></tr>`);
      });
      htmlParts.push(table(synthRows));
    }

    // V - Gestion par agence
    if (collecte.gestion_par_agence && collecte.agence_raison_sociale) {
      htmlParts.push(heading('V - GESTION PAR AGENCE'));
      htmlParts.push(table([
        kvRow('Raison sociale', collecte.agence_raison_sociale),
        kvRow4('Ville', collecte.agence_ville, 'Quartier', collecte.agence_quartier),
        kvRow('Téléphone', collecte.agence_tel),
      ]));
    }

    // VI - Signature
    htmlParts.push(heading('VI - SIGNATURE AGENT RECENSEUR'));
    htmlParts.push(table([
      kvRow('Date de collecte', collecte.date_collecte),
      kvRow('Nom et signature de l\'agent', collecte.signature_agent),
    ]));

    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Fiche de collecte</title></head><body style="font-family:Calibri,sans-serif;font-size:11pt;">${htmlParts.join('')}</body></html>`;

    const base64 = btoa(unescape(encodeURIComponent(html)));

    return Response.json({
      success: true,
      file: base64,
      filename: `collecte_${collecte.commune || 'parcelle'}_${new Date().toISOString().split('T')[0]}.doc`,
      mimeType: 'application/msword'
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});