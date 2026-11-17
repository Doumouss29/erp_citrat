import React, { useState } from 'react';
import { sendMail, escapeHtml } from "@/components/utils/emailTemplate";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AvisDGModal({ open, onOpenChange, fiche, bureau, onSuccess }) {
  const [avis, setAvis] = useState('');
  const [sending, setSending] = useState(false);

  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const handleSend = async () => {
    if (!avis.trim()) {
      toast.error("Veuillez rédiger un avis avant d'envoyer");
      return;
    }

    setSending(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();

      // Sauvegarder l'avis sur la fiche
      await base44.entities.SuiviActiviteSemaine.update(fiche.id, {
        avis_dg: avis,
        avis_dg_date: now,
        avis_dg_email: user.email
      });

      // Envoyer l'email au responsable du bureau
      if (bureau?.responsable_email) {
        const semainLabel = fiche.semaine_debut && fiche.semaine_fin
          ? `${format(new Date(fiche.semaine_debut), 'dd MMM', { locale: fr })} – ${format(new Date(fiche.semaine_fin), 'dd MMM yyyy', { locale: fr })}`
          : `Semaine ${fiche.numero_semaine}/${fiche.annee}`;

        const activitesHtml = (fiche.activites_planifiees || []).map((a, i) =>
          `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 12px;color:#94a3b8;font-family:monospace;">${String(i + 1).padStart(2, '0')}</td>
            <td style="padding:8px 12px;color:#1e293b;">${escapeHtml(a.description || '')}</td>
            <td style="padding:8px 12px;text-align:center;">
              <span style="padding:2px 10px;border-radius:999px;font-size:12px;background:${
                a.statut === 'realise' ? '#dcfce7' : a.statut === 'en_cours' ? '#dbeafe' : '#f1f5f9'
              };color:${
                a.statut === 'realise' ? '#15803d' : a.statut === 'en_cours' ? '#1d4ed8' : '#475569'
              };">${
                a.statut === 'realise' ? 'Réalisé' : a.statut === 'en_cours' ? 'En cours' :
                a.statut === 'en_attente' ? 'En attente' : a.statut === 'reporte' ? 'Reporté' : 'Planifié'
              }</span>
            </td>
          </tr>`
        ).join('');

        await sendMail({
          to: bureau.responsable_email,
          from_name: 'CGESN – Direction Générale',
          subject: `📋 Avis DG – Fiche d'activités ${bureau.nom} – ${semainLabel}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#ffffff;padding:24px;color:#334155;">
              <div style="background:#26446d;padding:24px 28px;margin-bottom:28px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;line-height:1.4;">Cabinet de Géomètre Expert Soro Nanga</div>
              </div>

              <div style="padding:0 4px;">
                <p style="font-size:16px;font-weight:700;color:#26446d;margin:0 0 20px;">Bonjour ${escapeHtml(bureau.responsable_nom || 'Responsable')},</p>
                <p style="font-size:15px;line-height:1.8;margin:0 0 16px;">
                  La Direction Générale a émis un avis sur la fiche d'activités du bureau <strong>${escapeHtml(bureau.nom)}</strong> pour la période du <strong>${escapeHtml(semainLabel)}</strong>.
                </p>
                <p style="font-size:15px;line-height:1.8;margin:0 0 12px;"><strong>Avis DG :</strong></p>
                <div style="border:1px solid #dbe4f0;background:#f8fafc;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
                  <p style="font-size:15px;line-height:1.8;margin:0;white-space:pre-wrap;">${escapeHtml(avis)}</p>
                </div>
                <p style="font-size:15px;line-height:1.8;margin:0;">
                  Cordialement,<br/>
                  <strong>La Direction Générale</strong><br/>
                  Cabinet de Géomètre Expert Soro Nanga
                </p>
              </div>

              <div style="background:#f8fafc;padding:18px 24px;margin-top:32px;text-align:center;color:#64748b;font-size:13px;">
                Cet email est envoyé automatiquement, merci de ne pas y répondre.
              </div>
            </div>
          `
        });
      }

      toast.success("Avis envoyé au responsable du bureau");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'avis");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Émettre un avis DG
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
            Bureau : <strong>{bureau?.nom}</strong> · Semaine {fiche?.numero_semaine}/{fiche?.annee}
            {bureau?.responsable_email && (
              <div className="mt-1 text-xs text-slate-400">
                Email envoyé à : {bureau.responsable_email}
              </div>
            )}
          </div>

          <Textarea
            value={avis}
            onChange={e => setAvis(e.target.value)}
            placeholder="Rédigez votre avis, commentaire ou directive pour ce bureau..."
            className="min-h-[150px] resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Envoyer l'avis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}