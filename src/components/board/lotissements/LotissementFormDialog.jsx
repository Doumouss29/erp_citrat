import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const STATUTS = ["En cours", "Terminé", "Suspendu"];
const BUREAUX = ["ABIDJAN", "DALOA", "YAMOUSSOUKRO", "BOUAFLE", "SINFRA", "ISSIA"];

export default function LotissementFormDialog({ open, onOpenChange, lotissement, onSuccess }) {
  const isEdit = !!lotissement;
  const [form, setForm] = useState({
    nom: "",
    localite: "",
    bureau: "",
    annee: "",
    chef_projet: "",
    superficie_text: "",
    superficie_ha: "",
    date_debut: "",
    date_fin_prevue: "",
    date_fin_reelle: "",
    statut: "En cours",
    avancement: "",
    solutions: "",
    partenaire: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (lotissement) {
        setForm({
          nom: lotissement.nom || "",
          localite: lotissement.localite || "",
          bureau: (lotissement.bureau || "").toUpperCase(),
          annee: lotissement.annee || "",
          chef_projet: lotissement.chef_projet || "",
          superficie_text: lotissement.superficie_text || "",
          superficie_ha: lotissement.superficie_ha || "",
          date_debut: lotissement.date_debut || "",
          date_fin_prevue: lotissement.date_fin_prevue || "",
          date_fin_reelle: lotissement.date_fin_reelle || "",
          statut: lotissement.statut || "En cours",
          avancement: lotissement.avancement || "",
          solutions: lotissement.solutions || "",
          partenaire: lotissement.partenaire || "",
          notes: lotissement.notes || "",
        });
      } else {
        setForm({ nom: "", localite: "", bureau: "", annee: "", chef_projet: "", superficie_text: "", superficie_ha: "", date_debut: "", date_fin_prevue: "", date_fin_reelle: "", statut: "En cours", avancement: "", solutions: "", partenaire: "", notes: "" });
      }
    }
  }, [open, lotissement]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      toast.error("Le nom du projet est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        localite: form.localite || "",
        bureau: form.bureau || "",
        annee: form.annee ? Number(form.annee) : null,
        chef_projet: form.chef_projet || "",
        superficie_text: form.superficie_text || "",
        superficie_ha: form.superficie_ha ? Number(form.superficie_ha) : null,
        date_debut: form.date_debut || null,
        date_fin_prevue: form.date_fin_prevue || null,
        date_fin_reelle: form.date_fin_reelle || null,
        statut: form.statut,
        avancement: form.avancement || "",
        solutions: form.solutions || "",
        partenaire: form.partenaire || "",
        notes: form.notes || "",
      };
      if (isEdit) {
        await base44.entities.Lotissement.update(lotissement.id, payload);
        toast.success("Lotissement modifié");
      } else {
        await base44.entities.Lotissement.create(payload);
        toast.success("Lotissement créé");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le lotissement" : "Nouveau lotissement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du projet *</Label>
              <Input id="nom" required value={form.nom} onChange={handleChange("nom")} placeholder="ex : Lotissement Akwa Extension" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bureau">Bureau</Label>
              <Select value={form.bureau} onValueChange={(v) => setForm((f) => ({ ...f, bureau: v }))}>
                <SelectTrigger id="bureau" className="w-full">
                  <SelectValue placeholder="Sélectionner un bureau" />
                </SelectTrigger>
                <SelectContent>
                  {BUREAUX.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="localite">Localité</Label>
              <Input id="localite" value={form.localite} onChange={handleChange("localite")} placeholder="Commune" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supText">Superficie</Label>
              <Input id="supText" value={form.superficie_text} onChange={handleChange("superficie_text")} placeholder="113 Ha 70 A 71 Ca" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chef">Chef de projet</Label>
              <Input id="chef" value={form.chef_projet} onChange={handleChange("chef_projet")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partenaire">Nom du partenaire</Label>
              <Input id="partenaire" value={form.partenaire} onChange={handleChange("partenaire")} placeholder="ex : M. KONE SOULEYMANE" />
            </div>
          </div>
          {/* Année et échéances sur une même ligne (la date de début n'est plus saisie ; une valeur existante est conservée) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annee">Année</Label>
              <Input id="annee" type="number" inputMode="numeric" min="2000" max="2100" value={form.annee} onChange={handleChange("annee")} placeholder="2026" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dfp">Fin prévue</Label>
              <Input id="dfp" type="date" value={form.date_fin_prevue} onChange={handleChange("date_fin_prevue")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dfr">Fin réelle</Label>
              <Input id="dfr" type="date" value={form.date_fin_reelle} onChange={handleChange("date_fin_reelle")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avancement">Avancement</Label>
            <Textarea id="avancement" rows={2} value={form.avancement} onChange={handleChange("avancement")} placeholder="État d'avancement du dossier" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solutions">Solutions / actions</Label>
            <Textarea id="solutions" rows={2} value={form.solutions} onChange={handleChange("solutions")} placeholder="Solutions ou actions à suivre" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={handleChange("notes")} />
          </div>
          <div className="space-y-2">
            <Label>Statut global</Label>
            <div className="flex gap-2">
              {STATUTS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, statut: st }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    form.statut === st
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}