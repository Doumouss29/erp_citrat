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
import { Building2, Save } from "lucide-react";

const emptyTier = {
  name: '',
  type: 'sous_traitant',
  zone: 'Worodougou',
  contact: '',
  email: '',
  phone: '',
  active: true,
};

export default function TierForm({ open, onClose, onSave, tier }) {
  const [form, setForm] = useState(emptyTier);

  useEffect(() => {
    if (tier) {
      setForm({ ...emptyTier, ...tier });
    } else {
      setForm(emptyTier);
    }
  }, [tier, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name) return;
    onSave(form);
    setForm(emptyTier);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {tier ? 'Modifier le tiers' : 'Nouveau tiers'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Nom / Raison sociale *</Label>
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Type</Label>
            <Select value={form.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sous_traitant">Sous-traitant</SelectItem>
                <SelectItem value="fournisseur">Fournisseur</SelectItem>
                <SelectItem value="partenaire">Partenaire</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Zone</Label>
            <Select value={form.zone} onValueChange={(v) => handleChange('zone', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Worodougou">Worodougou</SelectItem>
                <SelectItem value="Cavally">Cavally</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Contact</Label>
            <Input
              value={form.contact}
              onChange={(e) => handleChange('contact', e.target.value)}
              className="mt-1"
              placeholder="Personne à contacter"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Téléphone</Label>
            <Input
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            {tier ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}