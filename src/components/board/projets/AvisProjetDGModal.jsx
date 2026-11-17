import React, { useMemo, useState } from 'react';
import { sendMail, escapeHtml } from "@/components/utils/emailTemplate";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from "sonner";

export default function AvisProjetDGModal({ open, onOpenChange, projets = [], bureaux = [], user, onSuccess }) {
  const [selectedProjetId, setSelectedProjetId] = useState('');
  const [avis, setAvis] = useState('');
  const [loading, setLoading] = useState(false);

  const projetsTries = useMemo(() => {
    return [...projets].sort((a, b) => a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' }));
  }, [projets]);

  const selectedProjet = projetsTries.find(projet => projet.id === selectedProjetId);
  const bureau = bureaux.find(item => item.id === selectedProjet?.bureau_id);

  const resetForm = () => {
    setSelectedProjetId('');
    setAvis('');
  };

  const handleOpenChange = (nextOpen) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjetId || !avis.trim()) return;

    setLoading(true);
    const now = new Date().toISOString();

    await base44.entities.Projet.update(selectedProjetId, {
      avis_dg: avis.trim(),
      avis_dg_date: now,
      avis_dg_email: user?.email || null
    });

    let emailSent = false;

    if (bureau?.responsable_email && selectedProjet) {
      const matchingUsers = await base44.entities.User.filter({ email: bureau.responsable_email });
      const responsableExistsInApp = matchingUsers.length > 0;

      if (responsableExistsInApp) {
        await sendMail({
          to: bureau.responsable_email,
          from_name: 'CGESN – Direction Générale',
          subject: `📋 Avis DG – Projet ${selectedProjet.titre}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#ffffff;padding:24px;color:#334155;">
              <div style="background:#26446d;padding:24px 28px;margin-bottom:28px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;line-height:1.4;">Cabinet de Géomètre Expert Soro Nanga</div>
              </div>

              <div style="padding:0 4px;">
                <p style="font-size:16px;font-weight:700;color:#26446d;margin:0 0 20px;">Bonjour ${escapeHtml(bureau.responsable_nom || 'Responsable')},</p>
                <p style="font-size:15px;line-height:1.8;margin:0 0 16px;">
                  La Direction Générale a émis un avis sur le projet <strong>${escapeHtml(selectedProjet.titre)}</strong>${bureau?.nom ? ` du bureau <strong>${escapeHtml(bureau.nom)}</strong>` : ''}.
                </p>
                <p style="font-size:15px;line-height:1.8;margin:0 0 12px;"><strong>Avis DG :</strong></p>
                <div style="border:1px solid #dbe4f0;background:#f8fafc;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
                  <p style="font-size:15px;line-height:1.8;margin:0;white-space:pre-wrap;">${escapeHtml(avis.trim())}</p>
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
        emailSent = true;
      }
    }

    toast.success(emailSent ? 'Avis envoyé au responsable du bureau' : 'Avis enregistré avec succès');
    setLoading(false);
    handleOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Émettre un avis DG
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un projet puis saisissez l’avis à enregistrer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Projet</Label>
            <Select value={selectedProjetId} onValueChange={setSelectedProjetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un projet" />
              </SelectTrigger>
              <SelectContent>
                {projetsTries.map((projet) => (
                  <SelectItem key={projet.id} value={projet.id}>
                    {projet.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjet && (
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
                Projet : <strong>{selectedProjet.titre}</strong>
                {bureau?.nom ? ` · ${bureau.nom}` : ''}
                {bureau?.responsable_email && (
                  <div className="mt-1 text-xs text-slate-400">
                    Email envoyé à : {bureau.responsable_email}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Avis</Label>
            <Textarea
              value={avis}
              onChange={(e) => setAvis(e.target.value)}
              placeholder="Saisir l’avis du DG..."
              rows={6}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !selectedProjetId || !avis.trim()} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Envoi...' : 'Envoyer l’avis'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}