import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


const STATUTS = [
  { value: 'planifie', label: 'Planifié', color: 'bg-slate-100 text-slate-600' },
  { value: 'realise', label: 'Réalisé ✓', color: 'bg-green-100 text-green-700' },
  { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  { value: 'en_attente', label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  { value: 'reporte', label: 'Reporté', color: 'bg-red-100 text-red-700' },
];

export default function FicheSuiviForm({ open, onOpenChange, fiche, typeFiche, bureau, numeroSemaine, semaineDebut, semaineFin, annee, onSuccess }) {
  const [activites, setActivites] = useState([]);
  const [valide, setValide] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fiche) {
      setActivites(fiche.activites_planifiees || []);
      setValide(fiche.valide || false);
    } else {
      setActivites([{ numero: 1, description: '', statut: 'planifie', commentaire_realisation: '' }]);
      setValide(false);
    }
  }, [fiche, open]);

  const addActivite = () => {
    setActivites(prev => [...prev, {
      numero: prev.length + 1,
      description: '',
      statut: 'planifie',
      commentaire_realisation: ''
    }]);
  };

  const removeActivite = (index) => {
    setActivites(prev => prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, numero: i + 1 })));
  };

  const updateActivite = (index, field, value) => {
    setActivites(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bureau) { toast.error("Bureau non trouvé"); return; }

    setLoading(true);
    const data = {
      bureau_id: bureau.id,
      bureau_code: bureau.code,
      semaine_debut: semaineDebut ? format(semaineDebut, 'yyyy-MM-dd') : fiche?.semaine_debut,
      semaine_fin: semaineFin ? format(semaineFin, 'yyyy-MM-dd') : fiche?.semaine_fin,
      annee: annee || fiche?.annee,
      numero_semaine: numeroSemaine || fiche?.numero_semaine,
      type_fiche: typeFiche,
      activites_planifiees: activites,
      valide
    };

    if (fiche) {
      await base44.entities.SuiviActiviteSemaine.update(fiche.id, data);
      toast.success("Fiche mise à jour");
    } else {
      await base44.entities.SuiviActiviteSemaine.create(data);
      toast.success("Fiche créée");
    }
    setLoading(false);
    onSuccess();
  };

  const titre = typeFiche === 'diligence' ? 'Diligence (Projet long terme)' : `Fiche hebdomadaire — Semaine ${numeroSemaine || fiche?.numero_semaine}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{titre}</DialogTitle>
          <p className="text-sm text-slate-500">
            {bureau?.nom}
            {semaineDebut && semaineFin && ` · ${format(semaineDebut, 'dd MMM', { locale: fr })} au ${format(semaineFin, 'dd MMM yyyy', { locale: fr })}`}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Activités */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-800">Activités planifiées / réalisées</h3>
              <Button type="button" variant="outline" size="sm" onClick={addActivite}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {activites.map((act, index) => (
                <div key={index} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1">
                      {act.numero || index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Description de l'activité..."
                        value={act.description}
                        onChange={e => updateActivite(index, 'description', e.target.value)}
                        className="bg-white text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Select value={act.statut} onValueChange={v => updateActivite(index, 'statut', v)}>
                          <SelectTrigger className="w-40 h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUTS.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className={`text-xs ${s.color} px-2 py-0.5 rounded-full`}>{s.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Commentaire de réalisation..."
                          value={act.commentaire_realisation || ''}
                          onChange={e => updateActivite(index, 'commentaire_realisation', e.target.value)}
                          className="flex-1 h-8 text-xs bg-white"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => removeActivite(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* Validation */}
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <input
              type="checkbox"
              id="valide"
              checked={valide}
              onChange={e => setValide(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="valide" className="text-sm text-green-800 font-medium flex items-center gap-1.5 cursor-pointer">
              <CheckCircle2 className="w-4 h-4" />
              Marquer comme validée
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : fiche ? 'Mettre à jour' : 'Créer la fiche'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}