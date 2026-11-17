import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Building2, CalendarRange, Flag, Layers, MapPinned } from "lucide-react";
import { toast } from "sonner";

function SectionLabel({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <div className="w-6 h-6 rounded-md bg-brand-light text-brand flex items-center justify-center">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
      <div className="flex-1 h-px bg-border/70" />
    </div>
  );
}

const CATEGORIES_ACTIVITES = [
  {
    label: "Foncier / Lotissement",
    options: ["Lotissement", "Morcellement", "Bornage", "Délimitation de propriété", "Certificat foncier / Titre foncier"]
  },
  {
    label: "Aménagement",
    options: ["Viabilisation", "Voirie et réseaux divers (VRD)", "Aménagement urbain", "Plan de masse"]
  },
  {
    label: "Études techniques",
    options: ["Étude topographique", "Levé topographique", "Étude d'implantation", "Étude de faisabilité"]
  },
  {
    label: "Construction / Implantation",
    options: ["Implantation de bâtiment", "Suivi de chantier", "Récolement"]
  },
  {
    label: "Administratif / Juridique",
    options: ["Régularisation foncière", "Constat / Expertise judiciaire", "Dossier ACD (Arrêté de Concession Définitive)", "Autorisation de lotir"]
  }
];
const PREDEFINED_ACTIVITES = CATEGORIES_ACTIVITES.flatMap(c => c.options);

export default function ProjetForm({ open, onOpenChange, projet, bureau, bureaux, isAdmin, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [isAutre, setIsAutre] = useState(false);
  const [bloque, setBloque] = useState(false);
  const [cause, setCause] = useState('');
  const [descBlocage, setDescBlocage] = useState('');
  const [form, setForm] = useState({
    titre: '', bureau_id: '', bureau_code: '',
    type_activite: '', localite: '', statut: 'en_cours',
    date_debut: '', date_fin_prevue: ''
  });

  useEffect(() => {
    if (open) {
      if (projet) {
        const val = projet.type_activite || '';
        setIsAutre(!!val && !PREDEFINED_ACTIVITES.includes(val));
        setBloque(!!projet.bloque);
        setCause(projet.cause_blocage || '');
        setDescBlocage(projet.description_blocage || '');
        setForm({
          titre: projet.titre || '',
          bureau_id: projet.bureau_id || '', bureau_code: projet.bureau_code || '',
          type_activite: val, localite: projet.localite || '',
          statut: projet.statut || 'en_cours',
          date_debut: projet.date_debut || '', date_fin_prevue: projet.date_fin_prevue || ''
        });
      } else {
        setIsAutre(false);
        setBloque(false); setCause(''); setDescBlocage('');
        setForm({
          titre: '', bureau_id: bureau?.id || '', bureau_code: bureau?.code || '',
          type_activite: '', localite: '', statut: 'en_cours',
          date_debut: '', date_fin_prevue: ''
        });
      }
    }
  }, [projet, open, bureau]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre) { toast.error("Le titre est requis"); return; }
    if (!form.type_activite) { toast.error("Le type d'activité est requis"); return; }
    const bureauId = form.bureau_id || bureau?.id || projet?.bureau_id;
    const bureauCode = form.bureau_code || bureau?.code || projet?.bureau_code;
    if (!bureauId) { toast.error("Veuillez sélectionner un bureau"); return; }

    setLoading(true);
    try {
      const data = {
        titre: form.titre,
        bureau_id: bureauId, bureau_code: bureauCode,
        type_activite: form.type_activite, localite: form.localite,
        statut: form.statut,
        date_debut: form.date_debut, date_fin_prevue: form.date_fin_prevue,
        bloque,
        cause_blocage: bloque ? cause : '',
        description_blocage: bloque ? descBlocage : ''
      };
      if (projet) {
        await base44.entities.Projet.update(projet.id, data);
        toast.success("Projet mis à jour");
      } else {
        await base44.entities.Projet.create({ ...data, avancement: 0, etapes: [], interlocuteurs: [], travaux_realises: [] });
        toast.success("Projet créé");
      }
      onSuccess();
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Bandeau en-tête */}
        <div className="flex items-center gap-3 px-6 py-4 bg-brand text-brand-foreground">
          <div className="w-10 h-10 rounded-lg bg-brand-foreground/15 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="font-heading text-lg font-bold leading-tight">{projet ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
            <p className="text-xs text-brand-foreground/70 mt-0.5">{projet ? 'Mettez à jour les informations du projet' : 'Renseignez les informations essentielles du projet'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          {/* Section : Rattachement & activité */}
          <section className="space-y-4">
            <SectionLabel icon={Building2} title="Rattachement & activité" />

            {isAdmin ? (
              <div>
                <Label className="text-foreground/80">Bureau *</Label>
                <Select value={form.bureau_id} onValueChange={v => {
                  const b = bureaux?.find(x => x.id === v);
                  setForm(p => ({ ...p, bureau_id: v, bureau_code: b?.code || '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bureau..." /></SelectTrigger>
                  <SelectContent>
                    {(bureaux || []).map(b => <SelectItem key={b.id} value={b.id}>{b.nom} ({b.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : bureau ? (
              <div className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Bureau</span>
                <span className="text-sm font-bold text-foreground">{bureau.nom}</span>
                <span className="ml-auto text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full font-medium">{bureau.code}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground/80">Type d'activité *</Label>
                {isAutre ? (
                  <div className="space-y-1">
                    <Input value={form.type_activite} onChange={e => setForm(p => ({ ...p, type_activite: e.target.value }))} placeholder="Précisez l'activité..." />
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setIsAutre(false); setForm(p => ({ ...p, type_activite: '' })); }}>
                      ← Choisir dans la liste
                    </button>
                  </div>
                ) : (
                  <Select value={PREDEFINED_ACTIVITES.includes(form.type_activite) ? form.type_activite : ''} onValueChange={v => {
                    if (v === '__autre__') { setIsAutre(true); setForm(p => ({ ...p, type_activite: '' })); }
                    else { setForm(p => ({ ...p, type_activite: v })); }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner une activité..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES_ACTIVITES.map(cat => (
                        <SelectGroup key={cat.label}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.label}</SelectLabel>
                          {cat.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          <SelectSeparator />
                        </SelectGroup>
                      ))}
                      <SelectItem value="__autre__">Autre (champ libre)...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-foreground/80">Localité</Label>
                <Input value={form.localite} onChange={e => setForm(p => ({ ...p, localite: e.target.value }))} placeholder="Ville, quartier, zone..." />
              </div>
            </div>

            <div>
              <Label className="text-foreground/80">Titre *</Label>
              <Input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} placeholder="Titre du projet" />
            </div>
          </section>

          {/* Section : Planning */}
          <section className="space-y-4">
            <SectionLabel icon={CalendarRange} title="Planning" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-foreground/80">Date de début</Label><Input type="date" value={form.date_debut} onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))} /></div>
              <div><Label className="text-foreground/80">Date de fin prévue</Label><Input type="date" value={form.date_fin_prevue} onChange={e => setForm(p => ({ ...p, date_fin_prevue: e.target.value }))} /></div>
            </div>
          </section>

          {/* Section : Statut & blocage */}
          <section className="space-y-4">
            <SectionLabel icon={Flag} title="Statut & blocage" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label className="text-foreground/80">Statut</Label>
                <Select value={form.statut} onValueChange={v => setForm(p => ({ ...p, statut: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="en_arret">En arrêt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 bg-secondary/60">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className={`w-4 h-4 ${bloque ? 'text-destructive' : 'text-muted-foreground'}`} />
                  Projet bloqué
                </span>
                <Switch checked={bloque} onCheckedChange={setBloque} />
              </div>
            </div>
          </section>

          <p className="text-xs text-muted-foreground italic">La description et les étapes pourront être renseignés après création, sur la page de détail.</p>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">{loading ? 'Enregistrement...' : (projet ? 'Mettre à jour' : 'Créer le projet')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}