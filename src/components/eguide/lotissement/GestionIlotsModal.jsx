import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, Trash2, Grid3X3, Loader2, CheckCircle2, 
  AlertCircle, MapPin, FileText, Users, CheckSquare, Search,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function GestionIlotsModal({ isOpen, onClose, lotissement, onSuccess }) {
  const [zipFile, setZipFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLots, setSelectedLots] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ilotSearchTerm, setIlotSearchTerm] = useState('');
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showAttributaireModal, setShowAttributaireModal] = useState(false);
  const [bulkStatut, setBulkStatut] = useState('');
  const [bulkAttributaire, setBulkAttributaire] = useState({
    type_attributaire: 'physique',
    nom: '',
    prenom: '',
    raison_sociale: '',
    representant_nom: '',
    representant_prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    nature_piece_identite: '',
    numero_piece_identite: '',
    date_expiration_piece: '',
    est_principal: true
  });
  const [attributairesSupplementaires, setAttributairesSupplementaires] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [expandedIlots, setExpandedIlots] = useState([]);
  const [listHeight, setListHeight] = useState(1000);
  const queryClient = useQueryClient();

  const toggleIlot = (ilotId) => {
    setExpandedIlots(prev => 
      prev.includes(ilotId) 
        ? prev.filter(id => id !== ilotId)
        : [...prev, ilotId]
    );
  };

  const toggleIlotSelection = (ilotId) => {
    const ilotLots = lots.filter(l => l.id_ilot === ilotId).map(l => l.id);
    const allSelected = ilotLots.every(lotId => selectedLots.includes(lotId));
    
    if (allSelected) {
      setSelectedLots(prev => prev.filter(id => !ilotLots.includes(id)));
    } else {
      setSelectedLots(prev => [...new Set([...prev, ...ilotLots])]);
    }
  };

  const isIlotFullySelected = (ilotId) => {
    const ilotLots = lots.filter(l => l.id_ilot === ilotId).map(l => l.id);
    return ilotLots.length > 0 && ilotLots.every(lotId => selectedLots.includes(lotId));
  };

  const isIlotPartiallySelected = (ilotId) => {
    const ilotLots = lots.filter(l => l.id_ilot === ilotId).map(l => l.id);
    return ilotLots.some(lotId => selectedLots.includes(lotId)) && !isIlotFullySelected(ilotId);
  };

  const { data: ilots = [] } = useQuery({
    queryKey: ['ilots-lotissement', lotissement?.id],
    queryFn: () => lotissement ? base44.entities.Ilot.filter({ id_lotissement: lotissement.id }) : Promise.resolve([]),
    enabled: !!lotissement
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['lots-lotissement', lotissement?.id],
    queryFn: () => lotissement ? base44.entities.Lot.filter({ id_lotissement: lotissement.id }) : Promise.resolve([]),
    enabled: !!lotissement
  });

  const deleteIlotMutation = useMutation({
    mutationFn: async (ilotId) => {
      // Supprimer d'abord les lots de l'îlot
      const lotsToDelete = lots.filter(l => l.id_ilot === ilotId);
      for (const lot of lotsToDelete) {
        await base44.entities.Lot.delete(lot.id);
      }
      // Puis supprimer l'îlot
      await base44.entities.Ilot.delete(ilotId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ilots-lotissement'] });
      queryClient.invalidateQueries({ queryKey: ['lots-lotissement'] });
      queryClient.invalidateQueries({ queryKey: ['all-ilots'] });
      queryClient.invalidateQueries({ queryKey: ['all-lots'] });
      queryClient.invalidateQueries({ queryKey: ['ilots'] });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
      toast.success('Îlot et lots associés supprimés');
      if (onSuccess) onSuccess();
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteIlot = (ilot) => {
    const lotsCount = lots.filter(l => l.id_ilot === ilot.id).length;
    const message = lotsCount > 0 
      ? `Êtes-vous sûr de vouloir supprimer l'îlot ${ilot.numero_ilot} et ses ${lotsCount} lot(s) associé(s) ?`
      : `Êtes-vous sûr de vouloir supprimer l'îlot ${ilot.numero_ilot} ?`;
    
    if (confirm(message)) {
      deleteIlotMutation.mutate(ilot.id);
    }
  };

  const handleZipChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setError('Le fichier doit être un ZIP');
        setZipFile(null);
        return;
      }
      setZipFile(file);
      setError('');
    }
  };

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Le fichier doit être un CSV');
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!zipFile || !lotissement) return;

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      // Upload du fichier ZIP
      const { file_url: zipUrl } = await base44.integrations.Core.UploadFile({ file: zipFile });

      // Upload du fichier CSV si présent
      let csvUrl = null;
      if (csvFile) {
        setSuccess('Upload du fichier CSV en cours...');
        const { file_url } = await base44.integrations.Core.UploadFile({ file: csvFile });
        csvUrl = file_url;
      }

      // Importer les données Shapefile
      setSuccess('Import des données géographiques en cours...');
      
      const importResult = await base44.functions.invoke('importShapefile', {
        zip_url: zipUrl,
        csv_url: csvUrl,
        id_lotissement: lotissement.id
      });

      if (!importResult.data.success) {
        throw new Error(importResult.data.error || 'Erreur lors de l\'import des shapefiles');
      }

      const message = csvUrl 
        ? `${importResult.data.ilots_created} îlot(s), ${importResult.data.lots_created} lot(s) et ${importResult.data.attributaires_created || 0} attributaire(s) ajouté(s)`
        : `${importResult.data.ilots_created} îlot(s) et ${importResult.data.lots_created} lot(s) ajouté(s)`;
      
      toast.success(message);

      // Invalider toutes les queries liées aux îlots et lots pour forcer le rechargement
      await queryClient.invalidateQueries({ queryKey: ['ilots-lotissement'] });
      await queryClient.invalidateQueries({ queryKey: ['lots-lotissement'] });
      await queryClient.invalidateQueries({ queryKey: ['all-ilots'] });
      await queryClient.invalidateQueries({ queryKey: ['all-lots'] });
      await queryClient.refetchQueries({ queryKey: ['all-ilots'] });
      await queryClient.refetchQueries({ queryKey: ['all-lots'] });
      
      setZipFile(null);
      setCsvFile(null);
      setSuccess(`Import réussi ! ${message}`);
      
      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setZipFile(null);
    setCsvFile(null);
    setError('');
    setSuccess('');
    setSelectedLots([]);
    setSearchTerm('');
    setShowStatutModal(false);
    setShowAttributaireModal(false);
    onClose();
  };

  const toggleLotSelection = (lotId) => {
    setSelectedLots(prev => 
      prev.includes(lotId) 
        ? prev.filter(id => id !== lotId)
        : [...prev, lotId]
    );
  };

  const selectAllLots = () => {
    setSelectedLots(lots.map(l => l.id));
  };

  const deselectAllLots = () => {
    setSelectedLots([]);
  };

  const addAttributaireSupplementaire = () => {
    setAttributairesSupplementaires([
      ...attributairesSupplementaires,
      {
        type_attributaire: 'physique',
        nom: '',
        prenom: '',
        raison_sociale: '',
        representant_nom: '',
        representant_prenom: '',
        telephone: '',
        email: '',
        adresse: '',
        nature_piece_identite: '',
        numero_piece_identite: '',
        date_expiration_piece: ''
      }
    ]);
  };

  const removeAttributaireSupplementaire = (index) => {
    setAttributairesSupplementaires(attributairesSupplementaires.filter((_, i) => i !== index));
  };

  const updateAttributaireSupplementaire = (index, field, value) => {
    const updated = [...attributairesSupplementaires];
    updated[index][field] = value;
    setAttributairesSupplementaires(updated);
  };

  const handleBulkStatut = async () => {
    if (!bulkStatut) {
      toast.error('Veuillez sélectionner un statut');
      return;
    }

    setIsProcessingBulk(true);
    try {
      for (const lotId of selectedLots) {
        await base44.entities.Lot.update(lotId, { statut: bulkStatut });
      }
      toast.success(`${selectedLots.length} lot(s) mis à jour`);

      queryClient.invalidateQueries({ queryKey: ['lots-lotissement'] });
      queryClient.invalidateQueries({ queryKey: ['all-lots'] });
      if (onSuccess) onSuccess();

      setSelectedLots([]);
      setBulkStatut('');
      setShowStatutModal(false);
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
      console.error(err);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkAttributaire = async () => {
    if (!bulkAttributaire.nom) {
      toast.error('Veuillez renseigner le nom');
      return;
    }

    setIsProcessingBulk(true);
    try {
      const user = await base44.auth.me();

      // Préparer toutes les opérations par lot
      const allDeactivations = [];
      const allAttributaireCreations = [];
      const allLotUpdates = [];
      const allHistorique = [];

      for (const lotId of selectedLots) {
        // Préparer les désactivations
        const oldAttributaires = await base44.entities.Attributaire.filter({ id_lot: lotId, actif: true });
        oldAttributaires.forEach(attr => {
          allDeactivations.push({ id: attr.id, lotId });
        });

        // Préparer l'attributaire principal
        allAttributaireCreations.push({
          ...bulkAttributaire,
          id_lot: lotId,
          date_attribution: new Date().toISOString().split('T')[0],
          actif: true
        });

        // Préparer les attributaires supplémentaires
        attributairesSupplementaires.forEach(supp => {
          allAttributaireCreations.push({
            ...supp,
            id_lot: lotId,
            est_principal: false,
            date_attribution: new Date().toISOString().split('T')[0],
            actif: true
          });
        });

        // Préparer la mise à jour du lot
        const lot = lots.find(l => l.id === lotId);
        const newStatut = lot?.statut === 'Lot en vente' ? 'Lot réservé' : lot?.statut;
        allLotUpdates.push({ id: lotId, statut: newStatut });

        // Préparer l'historique
        const tousLesAttributaires = [bulkAttributaire, ...attributairesSupplementaires];
        const nomsAttributaires = tousLesAttributaires.map(a => 
          a.type_attributaire === 'physique' 
            ? `${a.prenom} ${a.nom}`
            : a.raison_sociale || a.nom
        ).filter(n => n.trim()).join(' & ');

        allHistorique.push({
          id_lot: lotId,
          action: 'creation',
          nom_attributaire: nomsAttributaires,
          type_attributaire: bulkAttributaire.type_attributaire,
          nouveau_statut: newStatut,
          utilisateur_action: user.email,
          date_action: new Date().toISOString()
        });
      }

      // Exécuter toutes les opérations en parallèle
      await Promise.all([
        // Désactivations en parallèle
        ...allDeactivations.map(({ id }) => 
          base44.entities.Attributaire.update(id, { actif: false })
        ),
        // Créations en batch
        allAttributaireCreations.length > 0 && base44.entities.Attributaire.bulkCreate(allAttributaireCreations),
        // Mises à jour des lots en parallèle
        ...allLotUpdates.map(({ id, statut }) => 
          base44.entities.Lot.update(id, { statut })
        ),
        // Historiques en batch
        allHistorique.length > 0 && base44.entities.HistoriqueAttribution.bulkCreate(allHistorique)
      ].filter(Boolean));

      toast.success(`${selectedLots.length} lot(s) attribués`);

      queryClient.invalidateQueries({ queryKey: ['lots-lotissement'] });
      queryClient.invalidateQueries({ queryKey: ['all-lots'] });
      if (onSuccess) onSuccess();

      setSelectedLots([]);
      setBulkAttributaire({
        type_attributaire: 'physique',
        nom: '',
        prenom: '',
        raison_sociale: '',
        representant_nom: '',
        representant_prenom: '',
        telephone: '',
        email: '',
        adresse: '',
        nature_piece_identite: '',
        numero_piece_identite: '',
        date_expiration_piece: '',
        est_principal: true
      });
      setAttributairesSupplementaires([]);
      setShowAttributaireModal(false);
    } catch (err) {
      toast.error('Erreur lors de l\'attribution');
      console.error(err);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  if (!lotissement) return null;

  const sortedIlots = [...ilots].sort((a, b) => {
    const numA = parseInt(a.numero_ilot) || 0;
    const numB = parseInt(b.numero_ilot) || 0;
    return numA - numB;
  });

  // Grouper les lots par îlot et filtrer par recherche
  const groupedLots = sortedIlots.map(ilot => {
    const ilotsLots = lots
      .filter(l => l.id_ilot === ilot.id)
      .filter(l => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          l.numero_lot?.toLowerCase().includes(search) ||
          ilot.numero_ilot?.toLowerCase().includes(search) ||
          l.statut?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const numA = parseInt(a.numero_lot) || 0;
        const numB = parseInt(b.numero_lot) || 0;
        return numA - numB;
      });
    return { ilot, lots: ilotsLots };
  }).filter(group => group.lots.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col resize">
        <style>{`
          .resize {
            resize: both;
            overflow: auto;
            min-width: 600px;
            min-height: 400px;
            max-width: 95vw;
            max-height: 95vh;
          }
        `}</style>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Gérer les îlots - {lotissement.nom}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ilots" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="ilots" className="flex-1">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Îlots
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1">
              <CheckSquare className="w-4 h-4 mr-2" />
              Actions en masse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ilots" className="flex-1 overflow-hidden flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="zip_file" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Fichier ZIP (ilot.shp + lot.shp) *
                </Label>
                <Input
                  id="zip_file"
                  type="file"
                  accept=".zip"
                  onChange={handleZipChange}
                  className="mt-2"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Le ZIP doit contenir les fichiers Shapefile : ilot.shp et lot.shp avec leurs fichiers associés (.dbf, .shx, .prj)
                </p>
                {zipFile && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {zipFile.name} ({(zipFile.size / 1024).toFixed(0)} Ko)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="csv_file" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Fichier CSV des attributaires (optionnel)
                </Label>
                <Input
                  id="csv_file"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Format: NOM, PRENOM, CNI, ILOT, LOT (ALL ou numéros séparés par virgule), AFFECTATION, STATUT
                </p>
                {csvFile && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {csvFile.name} ({(csvFile.size / 1024).toFixed(0)} Ko)
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleUpload}
                  disabled={!zipFile || isUploading}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer
                    </>
                  )}
                </Button>
              </div>
            </div>

            {ilots.length > 0 && (
              <div className="border-t pt-4 mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">Îlots existants</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Supprimez les îlots non désirés (les lots associés seront également supprimés)
                    </p>
                  </div>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un îlot..."
                    value={ilotSearchTerm}
                    onChange={(e) => setIlotSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {sortedIlots
                    .filter(i => !ilotSearchTerm || i.numero_ilot?.toLowerCase().includes(ilotSearchTerm.toLowerCase()))
                    .map((ilot) => {
                      const lotsCount = lots.filter(l => l.id_ilot === ilot.id).length;
                      return (
                        <div 
                          key={ilot.id} 
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                              <Grid3X3 className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">Îlot {ilot.numero_ilot}</p>
                              <p className="text-xs text-slate-500">
                                {lotsCount} lot{lotsCount > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteIlot(ilot)}
                            disabled={deleteIlotMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  {sortedIlots.filter(i => !ilotSearchTerm || i.numero_ilot?.toLowerCase().includes(ilotSearchTerm.toLowerCase())).length === 0 && (
                    <div className="text-center py-4 text-slate-400">
                      <p className="text-sm">Aucun îlot trouvé</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher un lot, îlot ou statut..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAllLots}>
                Tout
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllLots}>
                Aucun
              </Button>
            </div>

            <div className="flex-1 border rounded-lg overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {groupedLots.map(({ ilot, lots: ilotsLots }) => (
                    <Collapsible 
                      key={ilot.id}
                      open={expandedIlots.includes(ilot.id)}
                      onOpenChange={() => toggleIlot(ilot.id)}
                      className="border rounded-lg"
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isIlotFullySelected(ilot.id)}
                              className={isIlotPartiallySelected(ilot.id) ? 'data-[state=checked]:bg-slate-500' : ''}
                              onCheckedChange={() => toggleIlotSelection(ilot.id)}
                            />
                          </div>
                          {expandedIlots.includes(ilot.id) ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          )}
                          <Grid3X3 className="w-4 h-4 text-slate-600" />
                          <span className="font-semibold text-sm text-slate-700">
                            Îlot {ilot.numero_ilot}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {ilotsLots.length} lot{ilotsLots.length > 1 ? 's' : ''}
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 pt-0 grid grid-cols-3 gap-2">
                          {ilotsLots.map((lot) => (
                            <div
                              key={lot.id}
                              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200"
                            >
                              <Checkbox
                                checked={selectedLots.includes(lot.id)}
                                onCheckedChange={() => toggleLotSelection(lot.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">Lot {lot.numero_lot}</p>
                                <Badge variant="outline" className="text-xs mt-0.5">
                                  {lot.statut === 'Lot non à vendre' ? 'Lot non cessible' : lot.statut}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  
                  {groupedLots.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {searchTerm ? 'Aucun lot trouvé' : 'Aucun lot disponible'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {selectedLots.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedLots.length} lot(s) sélectionné(s)</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowStatutModal(true)}
                    className="border-slate-300"
                  >
                    Changer statut
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAttributaireModal(true)}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Changer attributaire
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>

      {/* Modal Changement de Statut */}
      <Dialog open={showStatutModal} onOpenChange={setShowStatutModal}>
        <DialogContent className="max-w-md resize">
          <style>{`
            .resize {
              resize: both;
              overflow: auto;
              min-width: 400px;
              min-height: 300px;
            }
          `}</style>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {selectedLots.length} lot(s) sélectionné(s)
              </AlertDescription>
            </Alert>
            <div>
              <Label>Nouveau statut</Label>
              <Select value={bulkStatut} onValueChange={setBulkStatut}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lot en vente">Lot en vente</SelectItem>
                  <SelectItem value="Lot réservé">Lot réservé</SelectItem>
                  <SelectItem value="Lot vendu">Lot vendu</SelectItem>
                  <SelectItem value="Lot non à vendre">Lot non cessible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowStatutModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleBulkStatut}
              disabled={!bulkStatut || isProcessingBulk}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isProcessingBulk ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                'Appliquer'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Attribution */}
      <Dialog open={showAttributaireModal} onOpenChange={setShowAttributaireModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto resize">
          <style>{`
            .resize {
              resize: both;
              overflow: auto;
              min-width: 500px;
              min-height: 400px;
            }
          `}</style>
          <DialogHeader>
            <DialogTitle>Attribuer les lots sélectionnés</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {selectedLots.length} lot(s) sélectionné(s)
              </AlertDescription>
            </Alert>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Attributaire principal</h3>
                <Select 
                  value={bulkAttributaire.type_attributaire}
                  onValueChange={(value) => setBulkAttributaire({...bulkAttributaire, type_attributaire: value})}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physique">Personne physique</SelectItem>
                    <SelectItem value="morale">Personne morale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkAttributaire.type_attributaire === 'physique' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={bulkAttributaire.nom}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, nom: e.target.value})}
                      placeholder="Nom"
                    />
                  </div>
                  <div>
                    <Label>Prénom *</Label>
                    <Input
                      value={bulkAttributaire.prenom}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, prenom: e.target.value})}
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={bulkAttributaire.telephone}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, telephone: e.target.value})}
                      placeholder="Téléphone"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={bulkAttributaire.email}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, email: e.target.value})}
                      placeholder="Email"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Adresse</Label>
                    <Input
                      value={bulkAttributaire.adresse}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, adresse: e.target.value})}
                      placeholder="Adresse"
                    />
                  </div>
                  <div>
                    <Label>Type de pièce</Label>
                    <Select 
                      value={bulkAttributaire.nature_piece_identite}
                      onValueChange={(value) => setBulkAttributaire({...bulkAttributaire, nature_piece_identite: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNI">CNI</SelectItem>
                        <SelectItem value="Passeport">Passeport</SelectItem>
                        <SelectItem value="Carte de séjour">Carte de séjour</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Numéro</Label>
                    <Input
                      value={bulkAttributaire.numero_piece_identite}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, numero_piece_identite: e.target.value})}
                      placeholder="Numéro"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Raison sociale *</Label>
                    <Input
                      value={bulkAttributaire.raison_sociale}
                      onChange={(e) => setBulkAttributaire({
                        ...bulkAttributaire, 
                        raison_sociale: e.target.value,
                        nom: e.target.value
                      })}
                      placeholder="Raison sociale"
                    />
                  </div>
                  <div>
                    <Label>Nom du représentant</Label>
                    <Input
                      value={bulkAttributaire.representant_nom}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, representant_nom: e.target.value})}
                      placeholder="Nom"
                    />
                  </div>
                  <div>
                    <Label>Prénom du représentant</Label>
                    <Input
                      value={bulkAttributaire.representant_prenom}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, representant_prenom: e.target.value})}
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={bulkAttributaire.telephone}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, telephone: e.target.value})}
                      placeholder="Téléphone"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={bulkAttributaire.email}
                      onChange={(e) => setBulkAttributaire({...bulkAttributaire, email: e.target.value})}
                      placeholder="Email"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Attributaires supplémentaires</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addAttributaireSupplementaire}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {attributairesSupplementaires.map((attr, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg mb-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Attributaire {idx + 2}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeAttributaireSupplementaire(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <Select 
                    value={attr.type_attributaire}
                    onValueChange={(value) => updateAttributaireSupplementaire(idx, 'type_attributaire', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physique">Personne physique</SelectItem>
                      <SelectItem value="morale">Personne morale</SelectItem>
                    </SelectContent>
                  </Select>

                  {attr.type_attributaire === 'physique' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Nom"
                        value={attr.nom}
                        onChange={(e) => updateAttributaireSupplementaire(idx, 'nom', e.target.value)}
                      />
                      <Input
                        placeholder="Prénom"
                        value={attr.prenom}
                        onChange={(e) => updateAttributaireSupplementaire(idx, 'prenom', e.target.value)}
                      />
                      <Input
                        placeholder="Téléphone"
                        value={attr.telephone}
                        onChange={(e) => updateAttributaireSupplementaire(idx, 'telephone', e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        value={attr.email}
                        onChange={(e) => updateAttributaireSupplementaire(idx, 'email', e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Input
                          placeholder="Raison sociale"
                          value={attr.raison_sociale}
                          onChange={(e) => updateAttributaireSupplementaire(idx, 'raison_sociale', e.target.value)}
                        />
                      </div>
                      <Input
                        placeholder="Téléphone"
                        value={attr.telephone}
                        onChange={(e) => updateAttributaireSupplementaire(idx, 'telephone', e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        value={attr.email}
                        onChange={(e) => updateAttributaireSupplementaire(idx, 'email', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowAttributaireModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleBulkAttributaire}
              disabled={!bulkAttributaire.nom || isProcessingBulk}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isProcessingBulk ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                'Attribuer'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}