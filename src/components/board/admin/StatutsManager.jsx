import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Circle, AlertCircle, GripVertical } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function StatutsManager({ statuts, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingStatut, setEditingStatut] = useState(null);
  const [formData, setFormData] = useState({ 
    libelle: '', 
    ordre: 1, 
    est_final: false, 
    requiert_motif: false, 
    couleur: '#3B82F6', 
    actif: true 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingStatut) {
      setFormData({
        libelle: editingStatut.libelle || '',
        ordre: editingStatut.ordre || 1,
        est_final: editingStatut.est_final || false,
        requiert_motif: editingStatut.requiert_motif || false,
        couleur: editingStatut.couleur || '#3B82F6',
        actif: editingStatut.actif !== false
      });
    } else {
      const maxOrdre = Math.max(...(statuts?.map(s => s.ordre) || [0]));
      setFormData({ 
        libelle: '', 
        ordre: maxOrdre + 1, 
        est_final: false, 
        requiert_motif: false, 
        couleur: '#3B82F6', 
        actif: true 
      });
    }
  }, [editingStatut, statuts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.libelle) {
      toast.error("Le libellé est obligatoire");
      return;
    }

    // Vérifier qu'il reste au moins 1 statut actif
    if (editingStatut && !formData.actif) {
      const autresActifs = statuts?.filter(s => s.id !== editingStatut.id && s.actif);
      if (!autresActifs?.length) {
        toast.error("Il doit rester au moins un statut actif");
        return;
      }
    }

    setLoading(true);
    try {
      if (editingStatut) {
        await base44.entities.Statut.update(editingStatut.id, formData);
        toast.success("Statut modifié");
      } else {
        await base44.entities.Statut.create(formData);
        toast.success("Statut créé");
      }
      setShowForm(false);
      setEditingStatut(null);
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const sortedStatuts = [...(statuts || [])].sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestion des statuts</h3>
          <p className="text-sm text-slate-500">Configurez les étapes des dossiers</p>
        </div>
        <Button onClick={() => { setEditingStatut(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau statut
        </Button>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p><strong>Ordre 1</strong> = statut par défaut pour les nouveaux dossiers</p>
          <p><strong>Statut final</strong> = requiert une date de livraison</p>
          <p><strong>Requiert motif</strong> = le responsable doit justifier</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[60px]">Ordre</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Motif requis</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStatuts.map(statut => (
              <TableRow key={statut.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <Badge variant="outline">{statut.ordre}</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{statut.libelle}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full border"
                      style={{ backgroundColor: statut.couleur }}
                    />
                    <span className="text-xs text-slate-500 font-mono">{statut.couleur}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {statut.est_final ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Oui</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500">Non</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {statut.requiert_motif ? (
                    <Badge className="bg-amber-100 text-amber-700">Oui</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500">Non</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statut.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                    {statut.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => { setEditingStatut(statut); setShowForm(true); }}
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
            <DialogTitle>{editingStatut ? 'Modifier le statut' : 'Nouveau statut'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Ex: En cours"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordre</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.ordre}
                  onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.couleur}
                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.couleur}
                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.est_final}
                  onCheckedChange={(v) => setFormData({ ...formData, est_final: v })}
                />
                <div>
                  <Label>Statut final</Label>
                  <p className="text-xs text-slate-500">Requiert une date de livraison</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.requiert_motif}
                  onCheckedChange={(v) => setFormData({ ...formData, requiert_motif: v })}
                />
                <div>
                  <Label>Requiert un motif</Label>
                  <p className="text-xs text-slate-500">Ex: justification de suspension</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.actif}
                  onCheckedChange={(v) => setFormData({ ...formData, actif: v })}
                />
                <Label>Statut actif</Label>
              </div>
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