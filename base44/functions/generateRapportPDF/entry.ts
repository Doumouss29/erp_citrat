import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'cgesnboard');
    if (denied) return denied;

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'suspendu' || user.role === 'en_attente' || user.statut === 'suspendu') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const { rapportId } = await req.json();
    if (typeof rapportId !== 'string' || !rapportId.trim()) {
      return Response.json({ error: 'Identifiant de rapport requis' }, { status: 400 });
    }

    // Récupérer le rapport
    const rapport = await base44.asServiceRole.entities.RapportMensuel.get(rapportId);
    if (!rapport) {
      return Response.json({ error: 'Rapport non trouvé' }, { status: 404 });
    }

    // Vérifier l'autorisation: admin, créateur du rapport, ou même bureau
    const isAdmin = user?.role === 'admin';
    const userBureauId = user?.data?.bureau_id || user?.bureau_id;
    const bureaux = user.data?.bureau_ids || user.bureau_ids || [];
    const sameBureau = typeof rapport.bureau_id === 'string' && !!rapport.bureau_id.trim()
      && (rapport.bureau_id === userBureauId || (Array.isArray(bureaux) && bureaux.includes(rapport.bureau_id)));
    if (!isAdmin && !sameBureau) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Un rapport sans bureau ne permet aucune requête de dossiers hors périmètre.
    if (typeof rapport.bureau_id !== 'string' || !rapport.bureau_id.trim()) {
      return Response.json({ error: 'Le rapport doit être rattaché à un bureau' }, { status: 422 });
    }
    // Récupérer le bureau
    const bureau = await base44.asServiceRole.entities.Bureau.get(rapport.bureau_id);

    // Récupérer les activités et statuts pour les stats
    const [activites, statuts, dossiers] = await Promise.all([
      base44.asServiceRole.entities.Activite.list(),
      base44.asServiceRole.entities.Statut.list(),
      base44.asServiceRole.entities.Dossier.filter({
        bureau_id: rapport.bureau_id,
        mois: rapport.mois,
        annee: rapport.annee
      })
    ]);

    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    const formatMoney = (amount) => {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0);
    };

    // Créer le PDF
    const doc = new jsPDF();
    let y = 15;

    // ===== EN-TÊTE AVEC FOND BLEU =====
    doc.setFillColor(30, 58, 98);
    doc.rect(0, 0, 210, 55, 'F');

    // Logo CGESN
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('CGESN', 105, 20, { align: 'center' });

    // Titre principal
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('Cabinet de Géomètre-Expert Soro Nanga', 105, 30, { align: 'center' });

    // Sous-titre
    doc.setFontSize(12);
    doc.setTextColor(200, 220, 240);
    doc.text(bureau.nom, 105, 38, { align: 'center' });

    // Période du rapport
    doc.setFontSize(11);
    doc.text(`Rapport Mensuel - ${moisNoms[rapport.mois - 1]} ${rapport.annee}`, 105, 48, { align: 'center' });

    y = 65;

    // ===== RESPONSABLE DE BUREAU =====
    doc.setFillColor(249, 250, 251);
    doc.rect(15, y - 5, 180, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y - 5, 180, 30);

    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('RESPONSABLE DE BUREAU', 20, y);
    
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'normal');

    if (bureau.responsable_nom) {
      doc.setFont(undefined, 'bold');
      doc.text('Nom et prénom:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(bureau.responsable_nom, 70, y);
      y += 6;
    }

    if (bureau.responsable_contact) {
      doc.setFont(undefined, 'bold');
      doc.text('Contact:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(bureau.responsable_contact, 70, y);
      y += 6;
    }

    if (bureau.responsable_email) {
      doc.setFont(undefined, 'bold');
      doc.text('Email:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(bureau.responsable_email, 70, y);
    }

    y += 15;

    // ===== STATISTIQUES DU BUREAU =====
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('STATISTIQUES DU BUREAU', 20, y);
    y += 10;

    // Cartes de statistiques
    const cardWidth = 58;
    const cardHeight = 20;
    const cardGap = 4;
    let cardX = 15;
    let cardY = y;

    const statsCards = [
      { label: 'Total dossiers', value: rapport.total_dossiers, color: [226, 232, 240] },
      { label: 'Réalisés', value: rapport.dossiers_realises, color: [209, 250, 229] },
      { label: 'En cours', value: rapport.dossiers_en_cours, color: [254, 243, 199] },
      { label: 'Taux réalisation', value: `${rapport.taux_realisation}%`, color: [233, 213, 255] },
      { label: 'Portefeuille', value: formatMoney(rapport.portefeuille), color: [254, 226, 226] },
      { label: 'CA Réalisé', value: formatMoney(rapport.chiffre_realise), color: [204, 251, 241] }
    ];

    statsCards.forEach((stat, idx) => {
      if (idx === 3) {
        cardX = 15;
        cardY += cardHeight + cardGap;
      }

      // Fond coloré
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
      doc.rect(cardX, cardY, cardWidth, cardHeight, 'F');

      // Label
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.setFont(undefined, 'normal');
      doc.text(stat.label, cardX + 3, cardY + 6);

      // Valeur
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'bold');
      const valueText = String(stat.value);
      doc.text(valueText, cardX + 3, cardY + 15);

      cardX += cardWidth + cardGap;
    });

    y = cardY + cardHeight + 15;

    // Répartition par activité
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('Par activité', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'normal');

    const dossiersParActivite = {};
    dossiers.forEach(d => {
      const activite = activites.find(a => a.id === d.activite_id);
      const code = activite?.code || d.activite_code;
      dossiersParActivite[code] = (dossiersParActivite[code] || 0) + 1;
    });

    Object.entries(dossiersParActivite).forEach(([code, count]) => {
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(2);
      doc.line(22, y - 2, 22, y + 2);
      doc.setTextColor(30, 41, 59);
      doc.text(`${code}: ${count} dossier(s)`, 26, y);
      y += 5;
    });

    y += 10;

    // ===== COMMENTAIRES DU RESPONSABLE =====
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('COMMENTAIRES DU RESPONSABLE', 20, y);
    y += 10;

    // Problèmes / dossiers difficiles
    if (rapport.problemes_dossiers) {
      doc.setFillColor(254, 226, 226);
      doc.rect(15, y - 3, 180, 25, 'F');
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.5);
      doc.rect(15, y - 3, 180, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(239, 68, 68);
      doc.setFont(undefined, 'bold');
      doc.text('Problèmes / Dossiers difficiles', 20, y + 2);
      y += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'normal');
      const lines1 = doc.splitTextToSize(rapport.problemes_dossiers, 170);
      lines1.forEach(line => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 4;
      });
      y += 8;
    }

    // Difficultés rencontrées
    if (rapport.difficultes_rencontrees) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFillColor(254, 243, 199);
      doc.rect(15, y - 3, 180, 25, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.rect(15, y - 3, 180, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(245, 158, 11);
      doc.setFont(undefined, 'bold');
      doc.text('Difficultés rencontrées', 20, y + 2);
      y += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'normal');
      const lines2 = doc.splitTextToSize(rapport.difficultes_rencontrees, 170);
      lines2.forEach(line => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 4;
      });
      y += 8;
    }

    // Perspectives / actions à venir
    if (rapport.perspectives_actions) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFillColor(209, 250, 229);
      doc.rect(15, y - 3, 180, 25, 'F');
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.rect(15, y - 3, 180, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(34, 197, 94);
      doc.setFont(undefined, 'bold');
      doc.text('Perspectives / Actions à venir', 20, y + 2);
      y += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'normal');
      const lines3 = doc.splitTextToSize(rapport.perspectives_actions, 170);
      lines3.forEach(line => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 4;
      });
    }

    // ===== PIED DE PAGE =====
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Ligne de séparation
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(20, 280, 190, 280);
      
      // Date de génération
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 105, 286, { align: 'center' });
      
      // Numéro de page
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} / ${pageCount}`, 105, 291, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Rapport_${bureau.code}_${moisNoms[rapport.mois - 1]}_${rapport.annee}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF Error:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});