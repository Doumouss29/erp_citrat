import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, User, Building2, Phone, Mail, CreditCard,
  Filter, Download, MapPin, Calendar, Eye, Upload, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import ImportAttributairesModal from "@/components/eguide/import/ImportAttributairesModal";
import DeleteAttributairesModal from "@/components/eguide/import/DeleteAttributairesModal";
import { toast } from "sonner";

export default function Attributaires() {
  useAuthRedirect();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lotissementFilter, setLotissementFilter] = useState('all');
  const [selectedAttributaire, setSelectedAttributaire] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedPersons, setSelectedPersons] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  const [expandedPersons, setExpandedPersons] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [personsToDeleteBatch, setPersonsToDeleteBatch] = useState([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedLotsByPerson, setSelectedLotsByPerson] = useState({});

  const queryClient = useQueryClient();

  const { data: attributaires = [], isLoading } = useQuery({
    queryKey: ['attributaires'],
    queryFn: () => base44.entities.Attributaire.filter({ actif: true })
  });

  // Écouter les événements d'import pour rafraîchir automatiquement
  useEffect(() => {
    const handleImport = () => {
      queryClient.invalidateQueries({ queryKey: ['attributaires'] });
      queryClient.invalidateQueries({ queryKey: ['all-lots'] });
    };
    window.addEventListener('attributaires-imported', handleImport);
    return () => window.removeEventListener('attributaires-imported', handleImport);
  }, [queryClient]);

  const { data: lotissements = [] } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } })
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['all-lots'],
    queryFn: () => base44.entities.Lot.list()
  });

  const { data: ilots = [] } = useQuery({
    queryKey: ['all-ilots'],
    queryFn: () => base44.entities.Ilot.list()
  });

  const getLotInfo = (idLot) => {
    const lot = lots.find(l => l.id === idLot);
    if (!lot) return null;
    const ilot = ilots.find(i => i.id === lot.id_ilot);
    const lotissement = lotissements.find(ls => ls.id === lot.id_lotissement);
    return { lot, ilot, lotissement };
  };

  const formatPhysicalName = (person) => `${person?.nom || ''} ${person?.prenom || ''}`.trim();

  // Grouper les attributaires par personne
  const groupedAttributaires = attributaires.reduce((acc, a) => {
    const key = a.type_attributaire === 'physique' 
      ? `${a.nom}_${a.prenom}_${a.numero_piece_identite}`
      : `${a.raison_sociale || a.nom}_${a.numero_piece_identite}`;
    
    if (!acc[key]) {
      acc[key] = {
        ...a,
        attributions: []
      };
    }
    acc[key].attributions.push(a);
    return acc;
  }, {});

  const persons = Object.values(groupedAttributaires);

  const filteredPersons = persons.filter(person => {
    const matchSearch = 
      person.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.telephone?.includes(searchTerm) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === 'all' || person.type_attributaire === typeFilter;
    const hasMatchingLotissement = lotissementFilter === 'all' || person.attributions.some(attr => {
      const lotInfo = getLotInfo(attr.id_lot);
      return lotInfo?.lotissement?.id === lotissementFilter;
    });
    
    return matchSearch && matchType && hasMatchingLotissement;
  });

  const filteredAttributions = filteredPersons.flatMap(person => {
    return person.attributions.filter(attr => {
      if (lotissementFilter === 'all') return true;
      const lotInfo = getLotInfo(attr.id_lot);
      return lotInfo?.lotissement?.id === lotissementFilter;
    });
  });

  const filteredPhysicalPersonsCount = filteredPersons.filter(p => p.type_attributaire === 'physique').length;
  const filteredMoralPersonsCount = filteredPersons.filter(p => p.type_attributaire === 'morale').length;

  const openDetail = (attributaire) => {
    setSelectedAttributaire(attributaire);
    setIsDetailOpen(true);
  };

  const exportCSV = () => {
    const headers = ['Nom', 'Prénom', 'Type', 'Téléphone', 'Email', 'Lot', 'Îlot', 'Lotissement', 'Date attribution'];

    // Appliquer les mêmes filtres que l'affichage, mais sur les attributions unitaires
    const filteredAttributaires = attributaires.filter((a) => {
      const matchSearch = (
        (a.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.raison_sociale || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.telephone || '').includes(searchTerm) ||
        (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchType = typeFilter === 'all' || a.type_attributaire === typeFilter;
      const lotInfo = getLotInfo(a.id_lot);
      const matchLotissement = lotissementFilter === 'all' || lotInfo?.lotissement?.id === lotissementFilter;
      return matchSearch && matchType && matchLotissement;
    });

    const rows = filteredAttributaires.map(a => {
      const lotInfo = getLotInfo(a.id_lot);
      return [
        a.nom || a.raison_sociale || '',
        a.prenom || '',
        a.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale',
        a.telephone || '',
        a.email || '',
        lotInfo?.lot?.numero_lot || 'N/A',
        lotInfo?.ilot?.numero_ilot || 'N/A',
        lotInfo?.lotissement?.nom || 'N/A',
        a.date_attribution ? format(new Date(a.date_attribution), 'dd/MM/yyyy') : ''
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attributaires_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getInitials = (attributaire) => {
    if (attributaire.type_attributaire === 'morale') {
      return attributaire.raison_sociale?.substring(0, 2).toUpperCase() || 'PM';
    }
    return `${attributaire.prenom?.[0] || ''}${attributaire.nom?.[0] || ''}`.toUpperCase() || 'PP';
  };

  const handleDeletePerson = async (person) => {
    // Supprimer tous les attributaires en parallèle
    await Promise.all(
      person.attributions.map(attr => base44.entities.Attributaire.delete(attr.id))
    );
  };

  const handleDeleteComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['attributaires'] });
    setIsDeleteModalOpen(false);
    setPersonsToDeleteBatch([]);
    setIsDeleteDialogOpen(false);
    setPersonToDelete(null);
    setSelectedPersons([]);
    setSelectedLotsByPerson({});
  };

  const startDeleteSingle = (personKey) => {
    const person = persons.find(p => getPersonKey(p) === personKey);
    if (person) {
      setPersonsToDeleteBatch([person]);
      setIsDeleteModalOpen(true);
      setIsDeleteDialogOpen(false);
    }
  };

  const startDeleteMultiple = () => {
    const personsToDelete = selectedPersons
      .map(key => persons.find(p => getPersonKey(p) === key))
      .filter(Boolean);
    
    setPersonsToDeleteBatch(personsToDelete);
    setIsDeleteModalOpen(true);
  };

  const getPersonKey = (person) => {
    return person.type_attributaire === 'physique' 
      ? `${person.nom}_${person.prenom}_${person.numero_piece_identite}`
      : `${person.raison_sociale || person.nom}_${person.numero_piece_identite}`;
  };

  // Sélection de lots pour suppression ciblée
  const toggleLotSelection = (personKey, lotId, checked) => {
    setSelectedLotsByPerson((prev) => {
      const set = new Set(prev[personKey] || []);
      if (checked) set.add(lotId); else set.delete(lotId);
      return { ...prev, [personKey]: Array.from(set) };
    });
  };

  const clearLotSelection = (personKey) => {
    setSelectedLotsByPerson((prev) => ({ ...prev, [personKey]: [] }));
  };

  const handleDeleteSelectedLots = async (person) => {
    const personKey = getPersonKey(person);
    const lotIds = selectedLotsByPerson[personKey] || [];
    if (!lotIds.length) return;
    try {
      const attrsByLot = lotIds.map((lotId) => ({
        lotId,
        attrs: (person.attributions || []).filter((a) => a.id_lot === lotId),
      }));

      // Supprimer les enregistrements Attributaire
      const attrDeletes = attrsByLot.flatMap(({ attrs }) =>
        attrs.map((a) => base44.entities.Attributaire.delete(a.id))
      );

      // Charger l'historique par lot en parallèle puis supprimer les entrées liées
      const histories = await Promise.all(
        lotIds.map((lotId) => base44.entities.HistoriqueAttribution.filter({ id_lot: lotId }, '', 1000))
      );
      const histDeletes = [];
      histories.forEach((hx, idx) => {
        const lotId = lotIds[idx];
        const attrIds = attrsByLot.find((x) => x.lotId === lotId)?.attrs.map((a) => a.id) || [];
        (hx || [])
          .filter((h) => attrIds.includes(h.id_attributaire))
          .forEach((h) => histDeletes.push(base44.entities.HistoriqueAttribution.delete(h.id)));
      });

      await Promise.all([...attrDeletes, ...histDeletes]);
      toast.success('Attributaire supprimé sur les lots sélectionnés');
      clearLotSelection(personKey);
      queryClient.invalidateQueries({ queryKey: ['attributaires'] });
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression ciblée');
    }
  };

  const handleDeleteSingleLot = async (person, lotId) => {
    try {
      const attrs = (person.attributions || []).filter((a) => a.id_lot === lotId);
      if (!attrs.length) return;

      // Supprimer les attributions pour ce lot
      await Promise.all(attrs.map((a) => base44.entities.Attributaire.delete(a.id)));

      // Supprimer l'historique lié à ces attributions sur ce lot
      const hx = await base44.entities.HistoriqueAttribution.filter({ id_lot: lotId }, '', 1000);
      const attrIds = attrs.map((a) => a.id);
      const histDeletes = (hx || [])
        .filter((h) => attrIds.includes(h.id_attributaire))
        .map((h) => base44.entities.HistoriqueAttribution.delete(h.id));
      await Promise.all(histDeletes);

      toast.success('Attributaire supprimé sur ce lot');
      queryClient.invalidateQueries({ queryKey: ['attributaires'] });
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression sur ce lot');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPersons(filteredPersons.map(p => getPersonKey(p)));
    } else {
      setSelectedPersons([]);
    }
  };

  const handleSelectPerson = (personKey, checked) => {
    if (checked) {
      setSelectedPersons([...selectedPersons, personKey]);
    } else {
      setSelectedPersons(selectedPersons.filter(k => k !== personKey));
    }
  };

  const toggleExpanded = (personKey) => {
    if (expandedPersons.includes(personKey)) {
      setExpandedPersons(expandedPersons.filter(k => k !== personKey));
    } else {
      setExpandedPersons([...expandedPersons, personKey]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Attributaires</h1>
            <p className="hidden sm:block text-slate-500 mt-1">
              {filteredPersons.length} personne{filteredPersons.length > 1 ? 's' : ''} • {filteredAttributions.length} attribution{filteredAttributions.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            {selectedPersons.length > 0 && (
              <Button 
                onClick={startDeleteMultiple}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer ({selectedPersons.length})
              </Button>
            )}
            <Button onClick={() => setIsImportOpen(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <Upload className="w-4 h-4 mr-2" />
              Importer CSV
            </Button>
            <Button onClick={exportCSV} variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Mobile toolbar */}
        <div className="md:hidden mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, téléphone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setIsFilterDrawerOpen(true)} className="shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
        </div>

        {/* Mobile Filters Drawer */}
        <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filtres</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Type</p>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="physique">Personne physique</SelectItem>
                    <SelectItem value="morale">Personne morale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Lotissement</p>
                <Select value={lotissementFilter} onValueChange={setLotissementFilter}>
                  <SelectTrigger>
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
            </div>
            <DrawerFooter>
              <Button onClick={() => setIsFilterDrawerOpen(false)}>Appliquer</Button>
              <DrawerClose asChild>
                <Button variant="outline">Annuler</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Mobile list */}
        <div className="md:hidden space-y-2">
          {filteredPersons.map((person) => {
            const personKey = person.type_attributaire === 'physique' 
              ? `${person.nom}_${person.prenom}_${person.numero_piece_identite}`
              : `${person.raison_sociale || person.nom}_${person.numero_piece_identite}`;
            return (
              <div key={personKey} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={
                      person.type_attributaire === 'physique' 
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }>
                      {getInitials(person)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {person.type_attributaire === 'physique' 
                        ? formatPhysicalName(person)
                        : person.raison_sociale || person.nom}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      {person.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale'}
                    </Badge>
                  </div>
                </div>
                <Badge className="ml-2 whitespace-nowrap">
                  {person.attributions.length} lot{person.attributions.length > 1 ? 's' : ''}
                </Badge>
              </div>
            );
          })}
          {filteredPersons.length === 0 && (
            <div className="text-center py-10 bg-white rounded-lg border">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Aucun attributaire trouvé</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6 hidden md:block">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, téléphone, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="physique">Personne physique</SelectItem>
                  <SelectItem value="morale">Personne morale</SelectItem>
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

        {/* Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedPersons.length === filteredPersons.length && filteredPersons.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Attributaire</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Lots attribués</TableHead>
                  <TableHead>Lotissement</TableHead>
                  <TableHead>Date attribution</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersons.map((person) => {
                  const personKey = getPersonKey(person);
                  const isExpanded = expandedPersons.includes(personKey);
                  const lotInfo = getLotInfo(person.id_lot);
                  
                  return (
                    <React.Fragment key={personKey}>
                      <TableRow className="hover:bg-slate-50">
                        <TableCell>
                          <Checkbox 
                            checked={selectedPersons.includes(personKey)}
                            onCheckedChange={(checked) => handleSelectPerson(personKey, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className={
                                person.type_attributaire === 'physique' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }>
                                {getInitials(person)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">
                                {person.type_attributaire === 'physique' 
                                  ? `${person.prenom} ${person.nom}`
                                  : person.raison_sociale || person.nom
                                }
                              </p>
                              <Badge variant="outline" className="text-xs mt-0.5">
                                {person.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {person.telephone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-3 h-3" />
                                {person.telephone}
                              </div>
                            )}
                            {person.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-3 h-3" />
                                {person.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{person.attributions.length} lot{person.attributions.length > 1 ? 's' : ''}</Badge>
                            {person.attributions.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => toggleExpanded(personKey)}
                                className="h-6 px-2"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 mr-1" />
                                    Masquer
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 mr-1" />
                                    Voir plus
                                  </>
                                )}
                              </Button>
                            )}
                            {person.attributions.length === 1 && (() => {
                              const onlyAttr = person.attributions[0];
                              return (
                                <div className="flex items-center gap-2 ml-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <div>
                                    <p className="font-medium">Lot {lotInfo?.lot?.numero_lot || 'N/A'}</p>
                                    <p className="text-xs text-slate-500">
                                      Îlot {lotInfo?.ilot?.numero_ilot || 'N/A'}
                                    </p>
                                  </div>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="ml-2"
                                    onClick={async () => {
                                      await handleDeleteSingleLot(person, onlyAttr.id_lot);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" /> Supprimer de ce lot
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">
                            {lotInfo?.lotissement?.nom || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {person.date_attribution 
                              ? format(new Date(person.date_attribution), 'dd/MM/yyyy', { locale: fr })
                              : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 items-center">
                            {((selectedLotsByPerson[personKey] || []).length > 0) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8"
                                onClick={() => handleDeleteSelectedLots(person)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Supprimer sélection
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openDetail(person)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setPersonToDelete(personKey);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && person.attributions.length > 1 && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-slate-50 p-4">
                            <div className="max-w-4xl">
                              <h4 className="text-sm font-semibold mb-3">Lots attribués à {person.type_attributaire === 'physique' ? formatPhysicalName(person) : person.raison_sociale}</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-10">Sélection</TableHead>
                                    <TableHead>Lot</TableHead>
                                    <TableHead>Îlot</TableHead>
                                    <TableHead>Lotissement</TableHead>
                                    <TableHead>Surface</TableHead>
                                    <TableHead>Statut</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {person.attributions.map((attr) => {
                                    const lotInfo = getLotInfo(attr.id_lot);
                                    return (
                                      <TableRow key={attr.id}>
                                        <TableCell>
                                          <Checkbox
                                            checked={(selectedLotsByPerson[getPersonKey(person)] || []).includes(attr.id_lot)}
                                            onCheckedChange={(checked) => toggleLotSelection(getPersonKey(person), attr.id_lot, checked)}
                                          />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          Lot {lotInfo?.lot?.numero_lot || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          Îlot {lotInfo?.ilot?.numero_ilot || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {lotInfo?.lotissement?.nom || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {lotInfo?.lot?.surface ? `${lotInfo.lot.surface} m²` : '-'}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline">
                                            {lotInfo?.lot?.statut || '-'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                                </Table>
                                <div className="mt-3 flex items-center gap-2">
                                 <Button
                                   variant="destructive"
                                   size="sm"
                                   disabled={(selectedLotsByPerson[getPersonKey(person)] || []).length === 0}
                                   onClick={() => handleDeleteSelectedLots(person)}
                                 >
                                   <Trash2 className="w-3 h-3 mr-1" /> Supprimer sur les lots sélectionnés
                                 </Button>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => clearLotSelection(getPersonKey(person))}
                                 >
                                   Réinitialiser
                                 </Button>
                                </div>
                                </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredPersons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">Aucun attributaire trouvé</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="hidden md:grid grid-cols-3 gap-4 mt-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredPhysicalPersonsCount}
                </p>
                <p className="text-xs text-slate-500">Personnes physiques</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredMoralPersonsCount}
                </p>
                <p className="text-xs text-slate-500">Personnes morales</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredAttributions.length}
                </p>
                <p className="text-xs text-slate-500">Total attributions</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={(open)=>{
        setIsDetailOpen(open);
        if(!open) setSelectedLotsByPerson({});
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de l'attributaire</DialogTitle>
          </DialogHeader>
          
          {selectedAttributaire && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className={
                      selectedAttributaire.type_attributaire === 'physique' 
                        ? 'bg-blue-100 text-blue-700 text-xl'
                        : 'bg-purple-100 text-purple-700 text-xl'
                    }>
                      {getInitials(selectedAttributaire)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedAttributaire.type_attributaire === 'physique' 
                        ? `${selectedAttributaire.prenom} ${selectedAttributaire.nom}`
                        : selectedAttributaire.raison_sociale || selectedAttributaire.nom
                      }
                    </h3>
                    <Badge className={
                      selectedAttributaire.type_attributaire === 'physique'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }>
                      {selectedAttributaire.type_attributaire === 'physique' 
                        ? 'Personne physique' 
                        : 'Personne morale'
                      }
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Coordonnées
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{selectedAttributaire.telephone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{selectedAttributaire.email || 'Non renseigné'}</span>
                    </div>
                  </div>
                  {selectedAttributaire.adresse && (
                    <p className="text-slate-600">{selectedAttributaire.adresse}</p>
                  )}
                </div>

                <Separator />

                {/* ID Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Pièce d'identité
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Type</p>
                      <p className="font-medium">{selectedAttributaire.nature_piece_identite || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Numéro</p>
                      <p className="font-medium">{selectedAttributaire.numero_piece_identite || 'N/A'}</p>
                    </div>
                    {selectedAttributaire.date_expiration_piece && (
                      <div>
                        <p className="text-slate-500">Expiration</p>
                        <p className="font-medium">
                          {format(new Date(selectedAttributaire.date_expiration_piece), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAttributaire.type_attributaire === 'morale' && 
                 selectedAttributaire.representant_nom && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                        Représentant légal
                      </h4>
                      <p className="font-medium">
                        {`${selectedAttributaire.representant_nom || ''} ${selectedAttributaire.representant_prenom || ''}`.trim()}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Lot Info */}
                {(() => {
                  const lotInfo = getLotInfo(selectedAttributaire.id_lot);
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                        Lot attribué
                      </h4>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-semibold">Lot {lotInfo?.lot?.numero_lot || 'N/A'}</p>
                            <p className="text-sm text-slate-500">
                              Îlot {lotInfo?.ilot?.numero_ilot || 'N/A'} • {lotInfo?.lotissement?.nom || 'N/A'}
                            </p>
                          </div>
                        </div>
                        {lotInfo?.lot?.surface && (
                          <p className="text-sm text-slate-600 mt-2">
                            Surface: {lotInfo.lot.surface} m²
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      {lotissements.length > 0 && (
        <ImportAttributairesModal 
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          lotissement={lotissements[0]}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette personne et toutes ses attributions ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startDeleteSingle(personToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Progress Modal */}
      <DeleteAttributairesModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteComplete}
        personsToDelete={personsToDeleteBatch}
        onDeleteComplete={handleDeletePerson}
      />
    </div>
  );
}