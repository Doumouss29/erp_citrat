import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, FileText, AlertCircle } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ActivitesManager({ activites, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingActivite, setEditingActivite] = useState(null);
  const [formData, setFormData] = useState({ libelle: '', code: '', actif: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingActivite) {
      setFormData({
        libelle: editingActivite.libelle || '',
        code: editingActivite.code || '',
        actif: editingActivite.actif !== false
      });
    } else {
      setFormData({ libelle: '', code: '', actif: true });
    }
  }, [editingActivite]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.libelle || !formData.code) {
      toast.error("Libellé et code sont obligatoires");
      return;
    }
    if (formData.code.length < 2 || formData.code.length > 5) {
      toast.error("Le code doit contenir 2 à 5 caractères");
      return;
    }

    const existingCode = activites?.find(a =>
      a.code.toUpperCase() === formData.code.toUpperCase() &&
      a.id !== editingActivite?.id
    );

    if (existingCode) {
      toast.error("Ce code existe déjà");
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        code: formData.code.toUpperCase()
      };

      if (editingActivite) {
        await base44.entities.Activite.update(editingActivite.id, data);
        toast.success("Activité modifiée");
      } else {
        await base44.entities.Activite.create(data);
        toast.success("Activité créée");
      }

      setShowForm(false);
      setEditingActivite(null);
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Catalogue d'activités</h3>
          <p className="text-sm text-slate-500">Gérez les types de prestations</p>
        </div>
        <Button onClick={() => { setEditingActivite(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouvelle activité
        </Button>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Important :</strong> Modifier le code d'une activité n'affecte pas les références des dossiers existants.
          {' '}Seuls les nouveaux dossiers utiliseront le nouveau code.
        </p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Activité</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activites?.map((activite) => (
              <TableRow key={activite.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {activite.libelle}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">{activite.code}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={activite.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                    {activite.actif ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingActivite(activite); setShowForm(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivite ? "Modifier l'activité" : 'Nouvelle activité'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Ex: Dossier Technique"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: DT"
                maxLength={5}
              />
              <p className="text-xs text-slate-500">2 à 5 caractères, utilisé dans les références</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.actif}
                onCheckedChange={(v) => setFormData({ ...formData, actif: v })}
              />
              <Label>Activité active</Label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}