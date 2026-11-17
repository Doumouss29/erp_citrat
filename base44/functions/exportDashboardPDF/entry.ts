import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.60';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'lotissement');
    if (denied) return denied;

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { lotissement_id, start_date, end_date } = await req.json();
        const scope = lotissement_id ? { id_lotissement: lotissement_id } : {};
        const stats = {
          lotissements: await base44.entities.LotissementEguide.count(lotissement_id ? { id: lotissement_id } : {}),
          ilots: await base44.entities.Ilot.count(scope),
          lots: 0, vendus: 0, montantVendu: 0, statuts: Object.create(null)
        };
        for (let skip = 0; ; skip += 500) {
          const page = await base44.entities.Lot.filter(scope, 'id', 500, skip);
          for (const lot of page) {
            const date = new Date(lot.created_date);
            if ((start_date && date < new Date(start_date)) || (end_date && date > new Date(end_date))) continue;
            stats.lots++;
            const status = lot.statut === 'Lot non à vendre' ? 'Lot non cessible' : lot.statut || 'Lot en vente';
            stats.statuts[status] = (stats.statuts[status] || 0) + 1;
            if (status === 'Lot vendu') {
              stats.vendus++;
              const prix = Number(String(lot.prix || 0).replace(/\s/g, '').replace(',', '.'));
              if (Number.isFinite(prix)) stats.montantVendu += prix;
            }
          }
          if (page.length < 500) break;
        }

        const doc = new jsPDF();
        
        // En-tête
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text('Rapport Dashboard', 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
        doc.text(`Par: ${user.full_name || user.email}`, 20, 35);
        
        // Filtres
        let y = 45;
        doc.setTextColor(0, 0, 0);
        if (lotissement_id) {
           const lotissement = await base44.entities.LotissementEguide.get(lotissement_id);
            doc.text(`Lotissement: ${lotissement.nom}`, 20, y);
            y += 5;
        }
        if (start_date) {
            doc.text(`Periode: du ${new Date(start_date).toLocaleDateString('fr-FR')} au ${end_date ? new Date(end_date).toLocaleDateString('fr-FR') : "aujourd'hui"}`, 20, y);
            y += 5;
        }
        
        y += 10;
        
        // Statistiques globales
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Statistiques Globales', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Lotissements: ', 30, y);
        doc.setTextColor(99, 102, 241);
        doc.text(stats.lotissements.toString(), 65, y);
        
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.text('Ilots: ', 30, y);
        doc.setTextColor(147, 51, 234);
        doc.text(stats.ilots.toString(), 65, y);
        
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.text('Lots: ', 30, y);
        doc.setTextColor(59, 130, 246);
        doc.text(stats.lots.toString(), 65, y);
        
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.text('Lots vendus: ', 30, y);
        doc.setTextColor(16, 185, 129);
        doc.text(stats.vendus.toString(), 65, y);
        
        y += 15;
        
        // Montant vendu
        if (stats.montantVendu !== undefined) {
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Montant Total Vendu', 20, y);
            y += 10;
            
            doc.setFontSize(12);
            doc.setTextColor(16, 185, 129);
            doc.text(`${stats.montantVendu.toLocaleString('fr-FR')} FCFA`, 30, y);
            
            y += 7;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`(${stats.vendus} lot${stats.vendus > 1 ? 's' : ''} vendu${stats.vendus > 1 ? 's' : ''})`, 30, y);
            y += 15;
        }
        
        // Répartition par statut avec graphique
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Repartition par Statut', 20, y);
        y += 10;
        
        const STATUT_COLORS = {
            'Lot en vente': [239, 68, 68],
            'Lot reserve': [245, 158, 11],
            'Lot vendu': [16, 185, 129],
            'Lot non a vendre': [249, 115, 22]
        };
        
        // Dessiner le graphique à barres
        const chartX = 30;
        const chartY = y;
        const chartWidth = 150;
        const chartHeight = 80;
        const maxCount = Math.max(...Object.values(stats.statuts));
        
        let barX = chartX;
        const barWidth = chartWidth / Object.keys(stats.statuts).length - 5;
        
        Object.entries(stats.statuts).forEach(([statut, count]) => {
            const percentage = stats.lots > 0 ? ((count / stats.lots) * 100).toFixed(1) : 0;
            const barHeight = maxCount > 0 ? (count / maxCount) * chartHeight : 0;
            
            // Normaliser le nom du statut pour la couleur
            const normalizedStatut = statut
                .replace(/é/g, 'e')
                .replace(/è/g, 'e')
                .replace(/à/g, 'a')
                .replace(/î/g, 'i');
            
            // Dessiner la barre
            const color = STATUT_COLORS[normalizedStatut] || STATUT_COLORS[statut] || [100, 100, 100];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(barX, chartY + chartHeight - barHeight, barWidth, barHeight, 'F');
            
            // Texte count au-dessus en couleur
            doc.setFontSize(8);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(count.toString(), barX + barWidth / 2, chartY + chartHeight - barHeight - 2, { align: 'center' });
            
            barX += barWidth + 5;
        });
        
        // Axe et labels
        doc.setDrawColor(200, 200, 200);
        doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);
        
        y += chartHeight + 15;
        
        // Légende sous le graphique
        doc.setFontSize(9);
        Object.entries(stats.statuts).forEach(([statut, count]) => {
            const percentage = stats.lots > 0 ? ((count / stats.lots) * 100).toFixed(1) : 0;
            
            // Normaliser le nom du statut
            const normalizedStatut = statut
                .replace(/é/g, 'e')
                .replace(/è/g, 'e')
                .replace(/à/g, 'a')
                .replace(/î/g, 'i');
            
            const color = STATUT_COLORS[normalizedStatut] || STATUT_COLORS[statut] || [100, 100, 100];
            
            // Carré de couleur
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(30, y - 3, 3, 3, 'F');
            
            // Texte label
            doc.setTextColor(0, 0, 0);
            const label = normalizedStatut.charAt(0).toUpperCase() + normalizedStatut.slice(1);
            doc.text(`${label}: `, 35, y);
            
            // Texte chiffres en couleur
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(`${count} (${percentage}%)`, 75, y);
            
            y += 6;
        });
        
        // Pied de page
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} sur ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }
        
        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=rapport-dashboard.pdf'
            }
        });

    } catch (error) {
        console.error('Erreur export PDF:', error);
        return Response.json({ 
            error: 'Erreur lors de l\'export PDF' 
        }, { status: 500 });
    }
});