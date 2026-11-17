import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, User, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRIORITES = [
  { value: 'normale', label: 'Normale', active: 'bg-blue-600 text-white border-blue-600' },
  { value: 'haute', label: 'Haute', active: 'bg-orange-500 text-white border-orange-500' },
  { value: 'express', label: 'Express', active: 'bg-red-600 text-white border-red-600' },
];

const today = () => format(new Date(), 'yyyy-MM-dd');
const toDateInput = (v) => (v ? String(v).slice(0, 10) : '');

function Section({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function DossierForm({ open, onOpenChange, dossier, activites, statuts, bureau, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activite_id: '',
    client_nom: '',
    client_prenom: '',
    description: '',
    cout_estime: '',
    montant_paye: 0,
    priorite: 'normale',
    date_ouverture: today(),
    date_livraison: '',
    motif_suspension: '',
    statut_id: ''
  });

  const set = (field) => (value) => setFormData((f) => ({ ...f, [field]: value }));
  const selectedStatut = statuts?.find(s => s.id === formData.statut_id);

  useEffect(() => {
    if (dossier) {
      setFormData({
        activite_id: dossier.activite_id || '',
        client_nom: dossier.client_nom || '',
        client_prenom: dossier.client_prenom || '',
        description: dossier.description || '',
        cout_estime: dossier.cout_estime || '',
        montant_paye: dossier.montant_paye || 0,
        priorite: dossier.priorite || 'normale',
        date_ouverture: toDateInput(dossier.date_ouverture || dossier.created_date) || today(),
        date_livraison: toDateInput(dossier.date_livraison),
        motif_suspension: dossier.motif_suspension || '',
        statut_id: dossier.statut_id || ''
      });
    } else {
      const statutDefaut = statuts?.find(s => s.ordre === 1 && s.actif);
      setFormData({
        activite_id: '',
        client_nom: '',
        client_prenom: '',
        description: '',
        cout_estime: 0,
        montant_paye: 0,
        priorite: 'normale',
        date_ouverture: today(),
        date_livraison: '',
        motif_suspension: '',
        statut_id: statutDefaut?.id || ''
      });
    }
  }, [dossier, statuts, open]);

  const generateReference = async (activiteId) => {
    const activite = activites.find(a => a.id === activiteId);
    if (!activite) return null;

    const now = new Date();
    const annee = now.getFullYear();
    const mois = String(now.getMonth() + 1).padStart(2, '0');

    // Récupérer le dernier séquentiel
    const existingDossiers = await base44.entities.Dossier.filter({
      bureau_id: bureau.id,
      activite_code: activite.code,
      annee: annee,
      mois: now.getMonth() + 1
    });

    let maxSeq = 0;
    existingDossiers.forEach(d => {
      const parts = d.reference_auto?.split('-');
      if (parts && parts.length === 4) {
        const seq = parseInt(parts[3], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });

    const newSeq = String(maxSeq + 1).padStart(4, '0');
    return `${activite.code}-${bureau.code}-${annee}${mois}-${newSeq}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.activite_id || !formData.client_nom || !formData.statut_id) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (selectedStatut?.est_final && !formData.date_livraison) {
      toast.error("La date de livraison est obligatoire pour ce statut");
      return;
    }
    if (selectedStatut?.requiert_motif && !formData.motif_suspension) {
      toast.error("Le motif est obligatoire pour ce statut");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      const activite = activites.find(a => a.id === formData.activite_id);
      const now = new Date();

      const dossierData = {
        ...formData,
        bureau_id: bureau.id,
        bureau_code: bureau.code,
        activite_code: activite.code,
        statut_libelle: selectedStatut?.libelle || '',
        // Un collègue qui modifie le dossier n'en devient pas le responsable (la modification reste tracée au journal).
        responsable_email: dossier?.responsable_email || user.email,
        cout_estime: parseFloat(formData.cout_estime) || 0,
        montant_paye: parseFloat(formData.montant_paye) || 0,
        date_ouverture: formData.date_ouverture || null,
        date_livraison: formData.date_livraison || null,
        // L'année / le mois servent à la numérotation : on ne les change pas lors d'une modification
        annee: dossier?.annee ?? now.getFullYear(),
        mois: dossier?.mois ?? now.getMonth() + 1
      };

      if (dossier) {
        await base44.entities.Dossier.update(dossier.id, dossierData);

        // Journal d'audit
        await base44.entities.JournalAudit.create({
          dossier_id: dossier.id,
          dossier_reference: dossier.reference_auto,
          user_email: user.email,
          type_action: 'modification',
          bureau_id: bureau.id
        });

        toast.success("Dossier modifié avec succès");
      } else {
        const reference = await generateReference(formData.activite_id);
        dossierData.reference_auto = reference;

        const newDossier = await base44.entities.Dossier.create(dossierData);

        // Journal d'audit
        await base44.entities.JournalAudit.create({
          dossier_id: newDossier.id,
          dossier_reference: reference,
          user_email: user.email,
          type_action: 'creation',
          bureau_id: bureau.id
        });

        toast.success(`Dossier créé: ${reference}`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent hideOverlay className="w-full max-w-2xl max-h-[95vh] overflow-y-auto bg-white p-0">
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle className="text-xl">
            {dossier ? `Modifier ${dossier.reference_auto}` : 'Nouveau dossier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 px-4 py-5 sm:px-6">
            {/* Dossier */}
            <Section icon={FileText} title="Dossier">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Activité *</Label>
                  <Select value={formData.activite_id} onValueChange={set('activite_id')} disabled={!!dossier} modal={false}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une activité" />
                    </SelectTrigger>
                    <SelectContent>
                      {activites?.filter(a => a.actif).map(activite => (
                        <SelectItem key={activite.id} value={activite.id}>
                          {activite.libelle} <span className="text-slate-400">({activite.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Statut *</Label>
                  <Select value={formData.statut_id} onValueChange={set('statut_id')} modal={false}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuts?.filter(s => s.actif).map(statut => (
                        <SelectItem key={statut.id} value={statut.id}>
                          <span className="inline-flex items-center gap-2">
                            {statut.couleur && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statut.couleur }} />}
                            {statut.libelle}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => set('priorite')(p.value)}
                      className={cn(
                        "h-9 rounded-md border text-sm font-medium transition",
                        formData.priorite === p.value ? p.active : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedStatut?.requiert_motif && (
                <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Label>Motif de suspension *</Label>
                  <Textarea
                    value={formData.motif_suspension}
                    onChange={(e) => set('motif_suspension')(e.target.value)}
                    placeholder="Expliquez la raison de la suspension"
                    rows={2}
                    className="bg-white"
                  />
                </div>
              )}
            </Section>

            {/* Client */}
            <Section icon={User} title="Client">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <Input value={formData.client_nom} onChange={(e) => set('client_nom')(e.target.value)} placeholder="Nom" />
                </div>
                <div className="space-y-1.5">
                  <Label>Prénom(s)</Label>
                  <Input value={formData.client_prenom} onChange={(e) => set('client_prenom')(e.target.value)} placeholder="Prénom(s)" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => set('description')(e.target.value)}
                  placeholder="Ex. : Ilot 13, Lot 83, Solibra"
                  rows={2}
                />
              </div>
            </Section>

            {/* Dates */}
            <Section icon={CalendarDays} title="Dates">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Date d'ouverture</Label>
                  <Input type="date" value={formData.date_ouverture} onChange={(e) => set('date_ouverture')(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Date de livraison {selectedStatut?.est_final
                      ? <span className="text-red-600">*</span>
                      : <span className="font-normal text-slate-400">(obligatoire une fois réalisé)</span>}
                  </Label>
                  <Input
                    type="date"
                    value={formData.date_livraison}
                    min={formData.date_ouverture || undefined}
                    onChange={(e) => set('date_livraison')(e.target.value)}
                  />
                </div>
              </div>
            </Section>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dossier ? 'Enregistrer' : 'Créer le dossier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
