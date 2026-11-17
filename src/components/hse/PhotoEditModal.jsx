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
import { Edit } from "lucide-react";

const categoryOptions = [
  { value: 'scene', label: 'Scène globale' },
  { value: 'detail', label: 'Détail / Dégât' },
  { value: 'context', label: 'Contexte' },
  { value: 'autre', label: 'Autre' },
];

export default function PhotoEditModal({ open, onClose, photo, onSave }) {
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('scene');

  useEffect(() => {
    if (photo) {
      setCaption(photo.caption || '');
      setCategory(photo.category || 'scene');
    }
  }, [photo, open]);

  const handleSubmit = () => {
    onSave({ ...photo, caption, category });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Modifier la photo
          </DialogTitle>
        </DialogHeader>

        {photo && (
          <img
            src={photo.url}
            alt="Aperçu"
            className="w-full rounded-lg max-h-48 object-cover mb-4"
          />
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-sm">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Légende</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Description de la photo..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}