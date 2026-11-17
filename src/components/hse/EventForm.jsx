import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, AlertCircle, Shield, Save } from "lucide-react";
import { toast } from "sonner";

const eventCodes = [
  { value: 'V01', label: 'V01 - Accident de circulation' },
  { value: 'E01', label: 'E01 - Environnement / animaux' },
  { value: 'R01', label: 'R01 - Incident lié au relief / terrain' },
  { value: 'H01', label: 'H01 - Chaleur / déshydratation' },
  { value: 'O01', label: 'O01 - Outils / manipulation matériels' },
  { value: 'C01', label: 'C01 - Presque-accident déclaré' },
];

const typeOptions = [
  { value: 'A', label: 'Accident', icon: AlertTriangle, color: 'text-red-600' },
  { value: 'I', label: 'Incident', icon: AlertCircle, color: 'text-amber-600' },
  { value: 'PA', label: 'Presqu\'accident', icon: Shield, color: 'text-blue-600' },
];

const severityOptions = [
  { value: 'G₀', label: 'G₀ - Grave' },
  { value: 'M₁', label: 'M₁ - Modéré' },
  { value: 'm₁', label: 'm₁ - Mineur' },
];

const zoneOptions = ['Worodougou', 'Cavally'];

const statusOptions = ['Ouvert', 'Clos'];

const emptyForm = {
  event_code: '',
  event_type_code: 'I',
  event_type: 'Incident',
  severity: 'm₁',
  date_event: '',
  time_event: '',
  zone: 'Worodougou',
  departure_point: '',
  arrival_point: '',
  location: '',
  persons_involved: '',
  person_role: '',
  equipment: '',
  circumstances: '',
  injuries_damages: '',
  immediate_measures: '',
  status: 'Ouvert',
  supervisor: '',
  observations: '',
  declaration_date: '',
  closure_date: '',
};

export default function EventForm({ open, onClose, onSave, event, nextFicheNumber }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const needsEventCode = !event?.reference;

  useEffect(() => {
    if (event) {
      setForm({ ...emptyForm, ...event });
    } else {
      setForm(emptyForm);
    }
  }, [event, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (code) => {
    const type = typeOptions.find(t => t.value === code);
    setForm(prev => ({
      ...prev,
      event_type_code: code,
      event_type: type?.label || 'Incident',
    }));
  };

  const handleSubmit = async () => {
    const missing = [
      needsEventCode && !form.event_code && 'Code événement',
      !form.date_event && "Date de l'événement",
      !event && !form.departure_point?.trim() && 'Point de départ',
      !event && !form.arrival_point?.trim() && "Point d'arrivée",
      !form.circumstances?.trim() && 'Circonstances',
    ].filter(Boolean);
    if (missing.length > 0) {
      toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
      return;
    }

    // event_code ne sert qu'à construire la référence : il n'existe pas dans l'entité HSEEvent.
    const { event_code, ...data } = form;
    if (!event) data.fiche_number = nextFicheNumber;
    if (needsEventCode) {
      const ficheNumber = data.fiche_number ?? nextFicheNumber;
      data.fiche_number = ficheNumber;
      data.reference = `${event_code}-${data.event_type_code}-${ficheNumber}`;
    }
    // Un champ date vide est omis plutôt qu'envoyé sous forme de chaîne vide.
    ['declaration_date', 'closure_date'].forEach((field) => {
      if (!data[field]) delete data[field];
    });

    // Le formulaire reste ouvert et rempli si l'enregistrement échoue :
    // c'est le tableau de bord qui le ferme une fois la fiche enregistrée.
    setSaving(true);
    try {
      await onSave(data);
    } catch {
      // Message d'erreur déjà affiché par useHSEEvents.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-slate-700" />
            {event ? 'Modifier la fiche HSE-PRESFOR' : 'Nouvelle fiche HSE-PRESFOR'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {needsEventCode && (
            <div>
              <Label className="text-sm font-medium">Code événement *</Label>
              <Select value={form.event_code} onValueChange={(v) => handleChange('event_code', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un code" />
                </SelectTrigger>
                <SelectContent>
                  {eventCodes.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Type d'événement *</Label>
              <Select value={form.event_type_code} onValueChange={handleTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(t => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <span className={`flex items-center gap-2 ${t.color}`}>
                          <Icon className="w-4 h-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Gravité *</Label>
              <Select value={form.severity} onValueChange={(v) => handleChange('severity', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Date de l'événement *</Label>
              <Input
                type="date"
                value={form.date_event || ''}
                onChange={(e) => handleChange('date_event', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Heure</Label>
              <Input
                type="time"
                value={form.time_event || ''}
                onChange={(e) => handleChange('time_event', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Zone & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Zone *</Label>
              <Select value={form.zone} onValueChange={(v) => handleChange('zone', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zoneOptions.map(z => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Statut</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s} value={s}>{s === 'Ouvert' ? 'En cours' : 'Clôturé'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Point de départ{!event && ' *'}</Label>
              <Input
                value={form.departure_point || ''}
                onChange={(e) => handleChange('departure_point', e.target.value)}
                className="mt-1"
                placeholder="Ex: Abidjan"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Point d'arrivée{!event && ' *'}</Label>
              <Input
                value={form.arrival_point || ''}
                onChange={(e) => handleChange('arrival_point', e.target.value)}
                className="mt-1"
                placeholder="Ex: Bouaké"
              />
            </div>
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Personne(s) impliquée(s)</Label>
              <Input
                value={form.persons_involved || ''}
                onChange={(e) => handleChange('persons_involved', e.target.value)}
                className="mt-1"
                placeholder="Nom et prénom"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fonction</Label>
              <Input
                value={form.person_role || ''}
                onChange={(e) => handleChange('person_role', e.target.value)}
                className="mt-1"
                placeholder="Ex: Chauffeur"
              />
            </div>
          </div>

          {/* Equipment */}
          <div>
            <Label className="text-sm font-medium">Matériel / Véhicule</Label>
            <Input
              value={form.equipment || ''}
              onChange={(e) => handleChange('equipment', e.target.value)}
              className="mt-1"
              placeholder="Ex: Camion, plaque..."
            />
          </div>

          {/* Circumstances */}
          <div>
            <Label className="text-sm font-medium">Circonstances *</Label>
            <Textarea
              value={form.circumstances || ''}
              onChange={(e) => handleChange('circumstances', e.target.value)}
              className="mt-1"
              rows={4}
              placeholder="Description détaillée de l'événement..."
            />
          </div>

          {/* Injuries & Damages */}
          <div>
            <Label className="text-sm font-medium">Blessures / Dégâts</Label>
            <Textarea
              value={form.injuries_damages || ''}
              onChange={(e) => handleChange('injuries_damages', e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Description des blessures et dégâts matériels..."
            />
          </div>

          {/* Immediate Measures */}
          <div>
            <Label className="text-sm font-medium">Mesures immédiates</Label>
            <Textarea
              value={form.immediate_measures || ''}
              onChange={(e) => handleChange('immediate_measures', e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Actions prises immédiatement..."
            />
          </div>

          {/* Supervisor & Observations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Superviseur</Label>
              <Input
                value={form.supervisor || ''}
                onChange={(e) => handleChange('supervisor', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Date déclaration</Label>
              <Input
                type="date"
                value={form.declaration_date || ''}
                onChange={(e) => handleChange('declaration_date', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Observations</Label>
            <Textarea
              value={form.observations || ''}
              onChange={(e) => handleChange('observations', e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {form.status === 'Clos' && (
            <div>
              <Label className="text-sm font-medium">Date de clôture</Label>
              <Input
                type="date"
                value={form.closure_date || ''}
                onChange={(e) => handleChange('closure_date', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-slate-800 hover:bg-slate-900">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : event ? 'Mettre à jour' : 'Créer la fiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}