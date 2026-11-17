import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FilePlus2, Loader2 } from 'lucide-react';

const DOC_TYPES = [
  { value: 'decret', label: 'Décret' },
  { value: 'plan', label: 'Plan' },
  { value: 'attestation', label: 'Attestation' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'autre', label: 'Autre' }
];

export default function AddDocumentForm({ lotissementId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('autre');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !lotissementId) return;
    setIsSubmitting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Document.create({
        id_lotissement: lotissementId,
        type_document: type,
        nom_fichier: file.name,
        url_fichier: file_url,
        taille: file.size,
        type_mime: file.type || 'application/octet-stream',
        description: description || undefined
      });

      toast.success('Document ajouté');
      setFile(null);
      setDescription('');
      setType('autre');
      onSuccess && onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'ajout du document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FilePlus2 className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-800">Ajouter un document</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Fichier *</Label>
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="text-xs text-slate-500 mt-1">
              {file.name} • {(file.size / 1024).toFixed(0)} Ko
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-1">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            className="h-[42px]"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={!file || isSubmitting} className="bg-slate-900 hover:bg-slate-800">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ajout...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Ajouter
            </>
          )}
        </Button>
      </div>
    </form>
  );
}