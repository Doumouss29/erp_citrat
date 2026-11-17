import React, { useEffect, useRef, useState } from 'react';
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
import { Camera, Upload, X } from "lucide-react";


export default function PhotoAddModal({ open, onClose, onSave, photo }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState(photo?.title || photo?.caption || '');
  const [category, setCategory] = useState(photo?.category || '');
  const [incident, setIncident] = useState(photo?.incident_type || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const categories = ['Blessures', 'Véhicule/Moto', 'Équipement', 'Environnement'];
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileUpload(e) {
    const next = e.target.files?.[0];
    if (!next) return;
    e.target.value = '';
    if (next.size > 10 * 1024 * 1024) { setError('Maximum 10 Mo par image.'); return; }
    setError('');
    setFile(next);
  }

  function handleCancel() {
    if (!busy.current) onClose();
  }

  async function handleSubmit() {
    if ((!photo && (!file || !incident || !category)) || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave({ ...(file ? { file } : {}), caption, category, incident });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "L’enregistrement a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {photo ? "Modifier la photo" : "Ajouter une photo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {photo && !preview && <img src={photo.image_url} alt="Photo actuelle" className="w-full rounded-lg max-h-40 object-contain" />}
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Aperçu" className="w-full rounded-lg max-h-48 object-cover" />
              <button
                disabled={saving} onClick={() => setFile(null)}
                className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">
                JPEG, PNG ou WebP · 10 Mo maximum
              </p>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={saving}
                className="hidden"
                id="photo-upload"
              />
              <Label htmlFor="photo-upload" className="cursor-pointer text-sm text-blue-600 hover:underline">
                {photo ? "Remplacer l’image (optionnel)" : "Choisir un fichier"}
              </Label>
            </div>
          )}

          <div>
            <Label className="text-sm">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Type d’événement</Label>
            <Select value={incident} onValueChange={setIncident}><SelectTrigger><SelectValue placeholder="Choisir le type" /></SelectTrigger>
              <SelectContent>{["Accident", "Incident", "Presqu'accident"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Légende (optionnel)</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Description de la photo..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={(!photo && (!file || !category || !incident)) || saving}>
            {saving ? "Enregistrement…" : photo ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}