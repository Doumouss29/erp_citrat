import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Building2, User as UserIcon } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BureauxManager({ bureaux, users, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingBureau, setEditingBureau] = useState(null);
  const [formData, setFormData] = useState({ nom: '', code: '', actif: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingBureau) {
      setFormData({
        nom: editingBureau.nom || '',
        code: editingBureau.code || '',
        actif: editingBureau.actif !== false,
      });
    } else {
      setFormData({ nom: '', code: '', actif: true });
    }
  }, [editingBureau]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom || !formData.code) {
      toast.error("Nom et code sont obligatoires");
      return;
    }
    if (formData.code.length < 2 || formData.code.length > 6) {
      toast.error("Le code doit contenir 2 à 6 caractères");
      return;
    }

    setLoading(true);
    try {
      const payload = { nom: formData.nom, code: formData.code.toUpperCase(), actif: formData.actif };
      if (editingBureau) {
        await base44.entities.Bureau.update(editingBureau.id, payload);
        toast.success("Bureau modifié");
      } else {
        await base44.entities.Bureau.create(payload);
        toast.success("Bureau créé");
      }
      setShowForm(false);
      setEditingBureau(null);
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const usersOfBureau = (bureauId) => {
    return (users || []).filter((u) => {
      const ids = u.bureau_ids || (u.bureau_id ? [u.bureau_id] : []);
      return ids.includes(bureauId) && u.statut !== 'inactif';
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestion des bureaux</h3>
          <p className="text-sm text-slate-500">Fiches bureaux (nom, code, statut). Les personnes rattachées sont gérées depuis « Gestion des utilisateurs ».</p>
        </div>
        <Button onClick={() => { setEditingBureau(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau bureau
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Bureau</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Responsable(s) / Adjoint(s)</TableHead>
              <TableHead>Secrétaire(s)</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...(bureaux || [])].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })).map((bureau) => {
              const bUsers = usersOfBureau(bureau.id);
              const responsables = bUsers.filter((u) => u.fonction === 'responsable' || u.fonction === 'adjoint');
              const secretaires = bUsers.filter((u) => u.fonction === 'secretaire');
              return (
                <TableRow key={bureau.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {bureau.nom}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{bureau.code}</Badge>
                  </TableCell>
                  <TableCell>
                    {responsables.length > 0 ? (
                      <div className="space-y-0.5">
                        {responsables.map((u) => (
                          <div key={u.id} className="text-sm flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{u.full_name || u.email}</span>
                            <Badge variant="outline" className="text-xs ml-1">{u.fonction === 'adjoint' ? 'Adjoint' : 'Responsable'}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Aucun</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {secretaires.length > 0 ? (
                      <div className="space-y-0.5">
                        {secretaires.map((u) => (
                          <div key={u.id} className="text-sm flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{u.full_name || u.email}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Aucune</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={bureau.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                      {bureau.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingBureau(bureau); setShowForm(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBureau ? 'Modifier le bureau' : 'Nouveau bureau'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nom du bureau *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Abidjan"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: ABJ"
                maxLength={6}
              />
              <p className="text-xs text-slate-500">2 à 6 caractères, utilisé dans les références</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.actif}
                onCheckedChange={(v) => setFormData({ ...formData, actif: v })}
              />
              <Label>Bureau actif</Label>
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