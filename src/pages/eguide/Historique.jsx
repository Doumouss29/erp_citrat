import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useAuthRedirect() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin();
      }
    });
  }, []);
}
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Search, Calendar, User, UserPlus, Edit, Trash2, 
  ArrowLeftRight, Filter, Download, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const ACTION_CONFIG = {
  creation: { icon: UserPlus, color: 'bg-emerald-100 text-emerald-700', label: 'Attribution' },
  modification: { icon: Edit, color: 'bg-blue-100 text-blue-700', label: 'Modification' },
  suppression: { icon: Trash2, color: 'bg-red-100 text-red-700', label: 'Fin d\'attribution' },
  transfert: { icon: ArrowLeftRight, color: 'bg-amber-100 text-amber-700', label: 'Transfert' }
};

export default function Historique() {
  useAuthRedirect();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [lotissementFilter, setLotissementFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: historique = [], isLoading } = useQuery({
    queryKey: ['historique'],
    queryFn: () => base44.entities.HistoriqueAttribution.list('-created_date', 100)
  });

  const { data: lotissements = [] } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } })
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['all-lots'],
    queryFn: () => base44.entities.Lot.list()
  });

  const getLotInfo = (idLot) => {
    const lot = lots.find(l => l.id === idLot);
    if (!lot) return { numero: 'N/A', lotissement: null };
    const lotissement = lotissements.find(ls => ls.id === lot.id_lotissement);
    return { numero: lot.numero_lot, lotissement };
  };

  const filteredHistorique = historique.filter(h => {
    const matchSearch = 
      h.nom_attributaire?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.prenom_attributaire?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchAction = actionFilter === 'all' || h.action === actionFilter;
    
    const lotInfo = getLotInfo(h.id_lot);
    const matchLotissement = lotissementFilter === 'all' || 
      lotInfo.lotissement?.id === lotissementFilter;
    
    return matchSearch && matchAction && matchLotissement;
  });

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(filteredHistorique.map(h => h.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id, checked) => {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(selectedIds.map(id => base44.entities.HistoriqueAttribution.delete(id)));
      toast.success('Historique supprimé');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['historique'] });
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    } finally {
      setConfirmOpen(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Action', 'Attributaire', 'Type', 'Lot', 'Lotissement', 'Utilisateur'];
    const rows = filteredHistorique.map(h => {
      const lotInfo = getLotInfo(h.id_lot);
      return [
        format(new Date(h.created_date), 'dd/MM/yyyy HH:mm'),
        ACTION_CONFIG[h.action]?.label || h.action,
        `${h.prenom_attributaire || ''} ${h.nom_attributaire || ''}`.trim(),
        h.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale',
        lotInfo.numero,
        lotInfo.lotissement?.nom || 'N/A',
        h.utilisateur_action || 'N/A'
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Historique</h1>
            <Button onClick={exportCSV} variant="outline" size="icon" className="sm:hidden">
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-slate-500 hidden sm:block">Suivi de toutes les attributions et modifications</p>
            <Button onClick={exportCSV} variant="outline" className="hidden sm:inline-flex">
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        {/* Mobile toolbar */}
        <div className="sm:hidden mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filtres</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Action</label>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Toutes les actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les actions</SelectItem>
                        <SelectItem value="creation">Attribution</SelectItem>
                        <SelectItem value="modification">Modification</SelectItem>
                        <SelectItem value="suppression">Fin d'attribution</SelectItem>
                        <SelectItem value="transfert">Transfert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Lotissement</label>
                    <Select value={lotissementFilter} onValueChange={setLotissementFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tous les lotissements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les lotissements</SelectItem>
                        {lotissements.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DrawerFooter className="pt-2">
                    <DrawerClose asChild>
                      <Button className="w-full">Appliquer</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* Desktop filters */}
        <Card className="mb-6 hidden sm:block">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="creation">Attribution</SelectItem>
                  <SelectItem value="modification">Modification</SelectItem>
                  <SelectItem value="suppression">Fin d'attribution</SelectItem>
                  <SelectItem value="transfert">Transfert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={lotissementFilter} onValueChange={setLotissementFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Tous les lotissements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les lotissements</SelectItem>
                  {lotissements.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mobile list */}
        <div className="sm:hidden space-y-3 mb-4">
          {filteredHistorique.map((h) => {
            const config = ACTION_CONFIG[h.action] || ACTION_CONFIG.creation;
            const Icon = config.icon;
            const lotInfo = getLotInfo(h.id_lot);
            return (
              <Card key={h.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{format(new Date(h.created_date), 'dd/MM/yyyy', { locale: fr })}</p>
                      <p className="text-xs text-slate-400">{format(new Date(h.created_date), 'HH:mm', { locale: fr })}</p>
                    </div>
                  </div>
                  <Badge className={`${config.color} whitespace-nowrap`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <div className="mt-2">
                  <p className="font-medium text-slate-900 truncate">{h.prenom_attributaire} {h.nom_attributaire}</p>
                  <p className="text-xs text-slate-500">{h.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale'}</p>
                </div>
                <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-3">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" /> Lot {lotInfo.numero}</span>
                  <span>• {lotInfo.lotissement?.nom || 'N/A'}</span>
                </div>
              </Card>
            );
          })}
          {filteredHistorique.length === 0 && (
            <p className="text-center text-slate-500 py-8">Aucun historique trouvé</p>
          )}
        </div>

        {/* Actions */}
        {selectedIds.length > 0 && (
          <div className="hidden sm:flex justify-end mb-3">
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer ({selectedIds.length})
            </Button>
          </div>
        )}

        {/* Table */}
        <Card className="hidden sm:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === filteredHistorique.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Attributaire</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Lotissement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorique.map((h) => {
                  const config = ACTION_CONFIG[h.action] || ACTION_CONFIG.creation;
                  const Icon = config.icon;
                  const lotInfo = getLotInfo(h.id_lot);
                  
                  return (
                    <TableRow key={h.id} className="hover:bg-slate-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(h.id)}
                          onCheckedChange={(checked) => handleSelectRow(h.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(h.created_date), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                            <p className="text-xs text-slate-400">
                              {format(new Date(h.created_date), 'HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {h.prenom_attributaire} {h.nom_attributaire}
                            </p>
                            <p className="text-xs text-slate-500">
                              {h.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">Lot {lotInfo.numero}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {lotInfo.lotissement?.nom || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {h.ancien_statut && h.nouveau_statut ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline">{h.ancien_statut}</Badge>
                            <span>→</span>
                            <Badge variant="outline">{h.nouveau_statut}</Badge>
                          </div>
                        ) : h.nouveau_statut ? (
                          <Badge variant="outline">{h.nouveau_statut}</Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {h.utilisateur_action || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredHistorique.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">Aucun historique trouvé</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous supprimer {selectedIds.length} élément(s) d'historique ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteSelected}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {Object.entries(ACTION_CONFIG).map(([action, config]) => {
            const count = historique.filter(h => h.action === action).length;
            const Icon = config.icon;
            return (
              <Card key={action} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs text-slate-500">{config.label}s</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}