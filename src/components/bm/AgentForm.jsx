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
import { User, Save } from "lucide-react";

const emptyAgent = {
  name: '',
  role: 'agent',
  zone: 'Worodougou',
  email: '',
  phone: '',
  active: true,
};

export default function AgentForm({ open, onClose, onSave, agent }) {
  const [form, setForm] = useState(emptyAgent);

  useEffect(() => {
    if (agent) {
      setForm({ ...emptyAgent, ...agent });
    } else {
      setForm(emptyAgent);
    }
  }, [agent, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name) return;
    onSave(form);
    setForm(emptyAgent);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {agent ? 'Modifier l\'agent' : 'Nouvel agent'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Nom complet *</Label>
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="mt-1"
              placeholder="Nom et prénom"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Rôle</Label>
            <Select value={form.role} onValueChange={(v) => handleChange('role', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="superviseur">Superviseur</SelectItem>
                <SelectItem value="coordinateur">Coordinateur</SelectItem>
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
            {agent ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}