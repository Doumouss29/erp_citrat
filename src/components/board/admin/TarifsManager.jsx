import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, DollarSign, Edit } from 'lucide-react';
import { toast } from "sonner";

export default function TarifsManager({ activites, bureaux }) {
  const [selectedActivite, setSelectedActivite] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('global');
  const [editingTarif, setEditingTarif] = useState(null);
  const [newTarif, setNewTarif] = useState({ type_tarif: 'standard', prix: '' });
  const queryClient = useQueryClient();

  // Sélectionner la première activité par défaut
  React.useEffect(() => {
    if (!selectedActivite && activites?.length > 0) {
      setSelectedActivite(activites[0].id);
    }
  }, [activites]);

  const { data: tarifs } = useQuery({
    queryKey: ['tarifs', selectedActivite],
    queryFn: async () => {
      if (!selectedActivite) return [];
      return base44.entities.TarifReference.filter({ activite_id: selectedActivite });
    },
    enabled: !!selectedActivite
  });

  const createTarifMutation = useMutation({
    mutationFn: async (data) => {
      const activite = activites.find(a => a.id === selectedActivite);
      const tarifData = {
        activite_id: selectedActivite,
        activite_libelle: activite?.libelle,
        type_tarif: data.type_tarif,
        prix: parseFloat(data.prix),
        description: data.description || ''
      };
      
      if (selectedBureau !== 'global') {
        const bureau = bureaux.find(b => b.id === selectedBureau);
        tarifData.bureau_id = selectedBureau;
        tarifData.bureau_code = bureau?.code;
      }
      
      if (editingTarif) {
        return base44.entities.TarifReference.update(editingTarif.id, tarifData);
      }
      return base44.entities.TarifReference.create(tarifData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifs', selectedActivite] });
      setNewTarif({ type_tarif: 'standard', prix: '' });
      setEditingTarif(null);
      toast.success(editingTarif ? "Tarif modifié" : "Tarif ajouté");
    },
    onError: () => toast.error("Erreur")
  });

  const deleteTarifMutation = useMutation({
    mutationFn: (tarifId) => base44.entities.TarifReference.delete(tarifId),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tarifs', selectedActivite] });
        toast.success("Tarif supprimé");
      }
    });

    const handleAddTarif = () => {
    if (!newTarif.prix) {
      toast.error("Veuillez entrer un prix");
      return;
    }
    createTarifMutation.mutate(newTarif);
  };

  const handleEditTarif = (tarif) => {
    setEditingTarif(tarif);
    setNewTarif({
      type_tarif: tarif.type_tarif,
      prix: tarif.prix,
      description: tarif.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingTarif(null);
    setNewTarif({ type_tarif: 'standard', prix: '' });
  };

  const typeTarifLabels = {
    standard: "Prix Standard",
    hectare: "À l'hectare",
    lot: "Par lot",
    trajet: "Trajet",
    localisation: "Localisation"
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Gestion des tarifs de référence</h2>
        <p className="text-slate-600">Définissez les différents types de tarifs par activité</p>
      </div>

      {/* Sélection activité et bureau */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Sélectionner une activité</label>
          <Select value={selectedActivite} onValueChange={setSelectedActivite}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une activité" />
            </SelectTrigger>
            <SelectContent>
              {activites?.filter(a => a.actif).map(activite => (
                <SelectItem key={activite.id} value={activite.id}>
                  {activite.code} - {activite.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Sélectionner un bureau</label>
          <Select value={selectedBureau} onValueChange={setSelectedBureau}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Tarifs globaux (tous bureaux)</SelectItem>
              {bureaux?.filter(b => b.actif).map(bureau => (
                <SelectItem key={bureau.id} value={bureau.id}>
                  {bureau.code} - {bureau.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedActivite && (
        <>
          {/* Formulaire d'ajout/modification */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {editingTarif ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingTarif ? 'Modifier le tarif' : 'Ajouter un nouveau tarif'}
                </CardTitle>
                {editingTarif && (
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Annuler
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Type</label>
                  <Select value={newTarif.type_tarif} onValueChange={(val) => setNewTarif({...newTarif, type_tarif: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeTarifLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Prix (XOF)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newTarif.prix}
                    onChange={(e) => setNewTarif({...newTarif, prix: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Description</label>
                  <Input
                    placeholder="Optionnel"
                    value={newTarif.description || ''}
                    onChange={(e) => setNewTarif({...newTarif, description: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddTarif}
                    disabled={createTarifMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {editingTarif ? 'Modifier' : <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Ajouter
                    </>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des tarifs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarifs existants</CardTitle>
            </CardHeader>
            <CardContent>
              {tarifs?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Niveau</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tarifs.map(tarif => (
                        <TableRow key={tarif.id}>
                          <TableCell>
                            <Badge variant="outline">{typeTarifLabels[tarif.type_tarif]}</Badge>
                          </TableCell>
                          <TableCell className="font-bold text-emerald-600">{formatMoney(tarif.prix)} XOF</TableCell>
                          <TableCell className="text-slate-500 text-sm">{tarif.description || tarif.activite_libelle}</TableCell>
                          <TableCell>
                            <Badge className="bg-slate-100 text-slate-700">
                              {tarif.bureau_code ? `${tarif.bureau_code} - Spécifique` : 'Global'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={tarif.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                              {tarif.actif ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleEditTarif(tarif)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {typeTarifLabels[tarif.type_tarif]} - {formatMoney(tarif.prix)} XOF
                                </AlertDialogDescription>
                                <div className="flex gap-3 justify-end">
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTarifMutation.mutate(tarif.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">Aucun tarif défini pour cette activité</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}