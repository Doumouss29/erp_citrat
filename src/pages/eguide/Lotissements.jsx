import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safeUrl } from "@/lib/safeUrl";

function useAuthRedirect() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin();
      }
    });
  }, []);
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { 
  Plus, Search, Building, Grid3X3, MapPin, MoreVertical,
  Edit, Trash2, Map, Eye, Calendar, FileText, Layers, AlertCircle, Loader2, File, Download, ExternalLink
} from 'lucide-react';
import DocumentViewerModal from '@/components/eguide/lotissement/DocumentViewerModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createEguidePageUrl as createPageUrl } from '@/lib/eguidePageUrl';
import GestionIlotsModal from '@/components/eguide/lotissement/GestionIlotsModal';
import ImportLotissementModal from '@/components/eguide/import/ImportLotissementModal';
import AddDocumentForm from '@/components/eguide/lotissement/AddDocumentForm';
import AttestationVariablesEditor, { DEFAULT_ATTESTATION_VARIABLES } from '@/components/eguide/lotissement/AttestationVariablesEditor';

export default function Lotissements() {
  useAuthRedirect();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isIlotsModalOpen, setIsIlotsModalOpen] = useState(false);
  const [editingLotissement, setEditingLotissement] = useState(null);
  const [selectedLotissement, setSelectedLotissement] = useState(null);
  const [ilotSearchTerm, setIlotSearchTerm] = useState('');
  const [deleteProgress, setDeleteProgress] = useState(null);
  const [showDeleteProgress, setShowDeleteProgress] = useState(false);
  const [viewingDocuments, setViewingDocuments] = useState(null);
  const [viewDocument, setViewDocument] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    region: '',
    commune: '',
    village: '',
    decret: '',
    superficie_totale: '',
    coordonnees_centre: { lat: 14.6937, lng: -17.4441 },
    zoom_defaut: 16,
    attestation_variables: DEFAULT_ATTESTATION_VARIABLES
  });

  const queryClient = useQueryClient();

  const { data: lotissements = [], isLoading } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: async () => {
      const allLotissements = [];
      let skip = 0;
      const limit = 1000;
      
      while (true) {
        const batch = await base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } }, '-created_date', limit, skip);
        if (batch.length === 0) break;
        allLotissements.push(...batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      
      return allLotissements;
    }
  });

  const { data: ilots = [] } = useQuery({
    queryKey: ['all-ilots'],
    queryFn: () => base44.entities.Ilot.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['all-lots'],
    queryFn: async () => {
      const allLots = [];
      let skip = 0;
      const limit = 1000;
      
      while (true) {
        const batch = await base44.entities.Lot.filter({}, '-created_date', limit, skip);
        if (batch.length === 0) break;
        allLots.push(...batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      
      return allLots;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const allDocs = [];
      let skip = 0;
      const limit = 1000;
      
      while (true) {
        const batch = await base44.entities.Document.filter({}, '-created_date', limit, skip);
        if (batch.length === 0) break;
        allDocs.push(...batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      
      return allDocs;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Précalculer les statistiques une seule fois
  const lotissementsWithStats = React.useMemo(() => {
    return lotissements.map(lotissement => {
      const lotsCount = lots.filter(l => l.id_lotissement === lotissement.id).length;
      const ilotsCount = ilots.filter(i => i.id_lotissement === lotissement.id).length;
      const vendusCount = lots.filter(l => l.id_lotissement === lotissement.id && l.statut === 'Lot vendu').length;
      const docsCount = documents.filter(d => d.id_lotissement === lotissement.id).length;
      return {
        ...lotissement,
        stats: { lotsCount, ilotsCount, vendusCount, docsCount }
      };
    });
  }, [lotissements, lots, ilots, documents]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LotissementEguide.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotissements-eguide'] });
      toast.success('Lotissement créé avec succès');
      closeModal();
    },
    onError: () => toast.error('Erreur lors de la création')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LotissementEguide.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotissements-eguide'] });
      toast.success('Lotissement mis à jour');
      closeModal();
    },
    onError: () => toast.error('Erreur lors de la mise à jour')
  });

  const deleteMutation = useMutation({
  mutationFn: async (id) => {
    setShowDeleteProgress(true);
    setDeleteProgress({
      phase: 'Initialisation...',
      deleted: { lots: 0, ilots: 0, attributaires: 0, historiques: 0, attestations: 0, documents: 0, lotissement: 0 },
      counts: { before: {}, after: {} },
      attempts: 0
    });

    let cursor = null;

    // cumul global
    const totalDeleted = {
      lots: 0,
      ilots: 0,
      attributaires: 0,
      historiques: 0,
      attestations: 0,
      documents: 0,
      lotissement: 0
    };

    // helpers
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const isRetryable = (err) => {
      const msg = (err?.message || '').toLowerCase();
      const status = err?.status || err?.response?.status;
      return (
        status === 429 ||
        (status >= 500 && status <= 599) ||
        msg.includes('connection error') ||
        msg.includes('network') ||
        msg.includes('timeout')
      );
    };

    const invokeStep = async (payload) => {
      // retry/backoff côté front (en plus de celui côté function)
      const maxRetries = 6;
      let lastErr;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await base44.functions.invoke('deleteLotissement', payload);
        } catch (e) {
          lastErr = e;
          if (!isRetryable(e) || attempt === maxRetries) throw e;
          const delay = Math.round(300 * (2 ** attempt) * (0.7 + Math.random() * 0.6));
          await sleep(delay);
        }
      }
      throw lastErr;
    };

    // On continue tant que done=false
    // IMPORTANT: 4000 lots / 20 = 200+ steps -> pas de maxAttempts fixe à 50
    let attempts = 0;
    let maxAttempts = 10000; // garde-fou très large

    while (attempts < maxAttempts) {
      const payload = cursor ? { lotissement_id: id, cursor } : { lotissement_id: id };

      const response = await invokeStep(payload);
      const data = response?.data;

      if (!data?.success) {
        throw new Error(data?.error || 'Suppression échouée');
      }

      // cumuler
      const stepDeleted = data.deleted || {};
      for (const k of Object.keys(totalDeleted)) {
        totalDeleted[k] += stepDeleted[k] || 0;
      }

      // calcul maxAttempts à partir des counts (si dispos)
      // Ex: si counts.before.lots = 4115 et lotsPerCall=20 => ~206 steps
      if (attempts === 0 && data?.counts?.before?.lots != null) {
        const lotsBefore = data.counts.before.lots;
        const approxSteps = Math.ceil(lotsBefore / 20) + 200; // marge pour ilots + fin
        maxAttempts = Math.max(maxAttempts, approxSteps);
      }

      const phase = data.nextCursor?.phase || (data.done ? 'Terminé' : '...');

      setDeleteProgress({
        phase:
          phase === 'lots' ? 'Suppression des lots...' :
          phase === 'ilots' ? 'Suppression des îlots...' :
          phase === 'lotissement' ? 'Suppression du lotissement...' :
          data.done ? 'Terminé !' : 'Traitement...',
        deleted: { ...totalDeleted },
        counts: data.counts || {},
        attempts: attempts + 1
      });

      if (data.done) {
        // petite pause UI
        await sleep(800);
        return data;
      }

      cursor = data.nextCursor;
      attempts++;

      // pause adaptative anti rate-limit (augmente avec le temps)
      // 300–800ms est généralement plus stable que 100ms
      const pause = Math.min(800, 250 + Math.floor(attempts / 10) * 20);
      await sleep(pause);
    }

    throw new Error(`Suppression interrompue (trop d'itérations): ${attempts}`);
  },

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['lotissements-eguide'] });
    queryClient.invalidateQueries({ queryKey: ['all-ilots'] });
    queryClient.invalidateQueries({ queryKey: ['all-lots'] });
    setShowDeleteProgress(false);
    toast.success('Lotissement et données associées supprimés');
  },

  onError: (err) => {
    console.error(err);
    setShowDeleteProgress(false);
    toast.error(`Erreur lors de la suppression: ${err?.message ?? 'inconnue'}`);
  }
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
      queryClient.invalidateQueries({ queryKey: ['all-ilots'] });
      queryClient.invalidateQueries({ queryKey: ['all-lots'] });
      queryClient.invalidateQueries({ queryKey: ['lotissements-eguide'] });
      queryClient.invalidateQueries({ queryKey: ['ilots'] });
      queryClient.invalidateQueries({ queryKey: ['lots'] });
      toast.success('Îlot et lots associés supprimés');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const openModal = (lotissement = null) => {
    if (lotissement) {
      setEditingLotissement(lotissement);
      setFormData({
        nom: lotissement.nom || '',
        region: lotissement.region || '',
        commune: lotissement.commune || '',
        village: lotissement.village || '',
        decret: lotissement.decret || '',
        superficie_totale: lotissement.superficie_totale || '',
        coordonnees_centre: lotissement.coordonnees_centre || { lat: 14.6937, lng: -17.4441 },
        zoom_defaut: lotissement.zoom_defaut || 16,
        attestation_variables: lotissement.attestation_variables?.length ? lotissement.attestation_variables : DEFAULT_ATTESTATION_VARIABLES
      });
    } else {
      setEditingLotissement(null);
      setFormData({
        nom: '',
        region: '',
        commune: '',
        village: '',
        decret: '',
        superficie_totale: '',
        coordonnees_centre: { lat: 14.6937, lng: -17.4441 },
        zoom_defaut: 16,
        attestation_variables: DEFAULT_ATTESTATION_VARIABLES
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLotissement(null);
    setIlotSearchTerm('');
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      superficie_totale: formData.superficie_totale ? parseFloat(formData.superficie_totale) : null
    };

    if (editingLotissement) {
      updateMutation.mutate({ id: editingLotissement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce lotissement ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteIlot = (ilot) => {
    const lotsCount = lots.filter(l => l.id_ilot === ilot.id).length;
    const message = lotsCount > 0 
      ? `Êtes-vous sûr de vouloir supprimer l'îlot ${ilot.numero_ilot} et ses ${lotsCount} lot(s) associé(s) ?`
      : `Êtes-vous sûr de vouloir supprimer l'îlot ${ilot.numero_ilot} ?`;
    
    if (confirm(message)) {
      deleteIlotMutation.mutate(ilot.id);
    }
  };

  const openIlotsModal = (lotissement) => {
    setSelectedLotissement(lotissement);
    setIsIlotsModalOpen(true);
  };

  const handleIlotsSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['lotissements-eguide'] });
    queryClient.invalidateQueries({ queryKey: ['all-ilots'] });
    queryClient.invalidateQueries({ queryKey: ['all-lots'] });
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['lotissements-eguide'] });
    queryClient.invalidateQueries({ queryKey: ['all-ilots'] });
    queryClient.invalidateQueries({ queryKey: ['all-lots'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setIsImportModalOpen(false);
  };

  const filteredLotissements = lotissementsWithStats.filter(l => 
    l.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.commune?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lotissements</h1>
            <p className="hidden sm:block text-slate-500 mt-1">Gérez vos lotissements et leurs configurations</p>
          </div>
          
          <Button onClick={() => setIsImportModalOpen(true)} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Importer un lotissement
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher un lotissement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 mb-6">
          {filteredLotissements.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{l.nom}</p>
                  <p className="text-xs text-slate-600 leading-tight">{l.commune || '-'}</p>
                  {l.region && (
                    <p className="text-[11px] text-slate-400 leading-tight">{l.region}</p>
                  )}
                </div>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <Grid3X3 className="w-4 h-4 text-slate-400 mx-auto" />
                  <div className="text-xs mt-1 text-slate-500">Îlots</div>
                  <div className="text-base font-semibold">{l.stats.ilotsCount}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <MapPin className="w-4 h-4 text-slate-400 mx-auto" />
                  <div className="text-xs mt-1 text-slate-500">Lots</div>
                  <div className="text-base font-semibold">{l.stats.lotsCount}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-200 text-emerald-700 text-[10px] mx-auto">✓</span>
                  <div className="text-xs mt-1 text-emerald-700">Vendus</div>
                  <div className="text-base font-semibold text-emerald-700">{l.stats.vendusCount}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <File className="w-4 h-4 text-slate-400 mx-auto" />
                  <div className="text-xs mt-1 text-slate-500">Docs</div>
                  <div className="text-base font-semibold">{l.stats.docsCount}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <Button asChild size="sm" variant="outline" className="h-9 px-3">
                  <Link to={`${createPageUrl('Carte')}?lotissement=${l.id}`}>
                    <Map className="w-4 h-4 mr-1" /> Voir
                  </Link>
                </Button>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => openModal(l)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 px-2 text-red-600 hover:bg-red-50" onClick={() => handleDelete(l.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredLotissements.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">Aucun lotissement trouvé</p>
              <Button 
                variant="link" 
                onClick={() => openModal()}
                className="mt-2"
              >
                Créer un lotissement
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Lotissement</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Décret</TableHead>
                  <TableHead className="text-center">Îlots</TableHead>
                  <TableHead className="text-center">Lots</TableHead>
                  <TableHead className="text-center">Vendus</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLotissements.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                            <Building className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{l.nom}</p>
                            {l.superficie_totale && (
                              <p className="text-xs text-slate-500">
                                {l.superficie_totale.toLocaleString()} m²
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-[13px] font-medium text-slate-700 uppercase">{l.commune || '-'}</p>
                        {l.region && (
                          <p className="text-[11px] text-slate-400 uppercase mt-0.5">{l.region}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.decret || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Grid3X3 className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{l.stats.ilotsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{l.stats.lotsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {l.stats.vendusCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <File className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{l.stats.docsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(l.created_date), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`${createPageUrl('Carte')}?lotissement=${l.id}`}>
                                <Map className="w-4 h-4 mr-2" />
                                Voir sur la carte
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal(l)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openIlotsModal(l)}>
                              <Layers className="w-4 h-4 mr-2" />
                              Gérer les îlots
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewingDocuments(l)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Voir les documents ({l.stats.docsCount})
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(l.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))}

                {filteredLotissements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Building className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">Aucun lotissement trouvé</p>
                      <Button 
                        variant="link" 
                        onClick={() => openModal()}
                        className="mt-2"
                      >
                        Créer un lotissement
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Lotissement */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLotissement ? 'Modifier le lotissement' : 'Nouveau lotissement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Nom du lotissement *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                placeholder="Ex: Lotissement Diamniadio"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <Label>Région</Label>
                <Input
                  value={formData.region}
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                  placeholder="Ex: Dakar"
                />
              </div>
              <div>
                <Label>Commune</Label>
                <Input
                  value={formData.commune}
                  onChange={(e) => setFormData({...formData, commune: e.target.value})}
                  placeholder="Ex: Diamniadio"
                />
              </div>
              <div>
                <Label>Village</Label>
                <Input
                  value={formData.village || ''}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="Ex: LOGBAKRO BLE"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label>Numéro de décret</Label>
                <Input
                  value={formData.decret}
                  onChange={(e) => setFormData({...formData, decret: e.target.value})}
                  placeholder="Ex: 2023-1234"
                />
              </div>
              <div>
                <Label>Superficie totale (m²)</Label>
                <Input
                  type="number"
                  value={formData.superficie_totale}
                  onChange={(e) => setFormData({...formData, superficie_totale: e.target.value})}
                  placeholder="Ex: 50000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.coordonnees_centre?.lat || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    coordonnees_centre: { 
                      ...formData.coordonnees_centre, 
                      lat: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.coordonnees_centre?.lng || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    coordonnees_centre: { 
                      ...formData.coordonnees_centre, 
                      lng: parseFloat(e.target.value) 
                    }
                  })}
                />
              </div>
              <div>
                <Label>Zoom</Label>
                <Input
                  type="number"
                  value={formData.zoom_defaut}
                  onChange={(e) => setFormData({...formData, zoom_defaut: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <AttestationVariablesEditor
                value={formData.attestation_variables || DEFAULT_ATTESTATION_VARIABLES}
                onChange={(variables) => setFormData({ ...formData, attestation_variables: variables })}
              />
            </div>

            {editingLotissement && (
              <div className="border-t pt-3">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="ilots">
                    <AccordionTrigger className="text-base font-semibold">
                      Îlots du lotissement
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-xs text-slate-500 mb-2">
                        Supprimez les îlots non désirés (les lots associés seront également supprimés)
                      </p>

                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Rechercher un îlot..."
                          value={ilotSearchTerm}
                          onChange={(e) => setIlotSearchTerm(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>

                      {ilots.filter(i => i.id_lotissement === editingLotissement.id && 
                        (!ilotSearchTerm || i.numero_ilot?.toLowerCase().includes(ilotSearchTerm.toLowerCase()))).length > 0 ? (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto border rounded-lg p-2.5 bg-slate-50">
                          {ilots
                            .filter(i => i.id_lotissement === editingLotissement.id && 
                              (!ilotSearchTerm || i.numero_ilot?.toLowerCase().includes(ilotSearchTerm.toLowerCase())))
                            .sort((a, b) => {
                              const numA = parseInt(a.numero_ilot) || 0;
                              const numB = parseInt(b.numero_ilot) || 0;
                              return numA - numB;
                            })
                            .map((ilot) => {
                              const lotsCount = lots.filter(l => l.id_ilot === ilot.id).length;
                              return (
                                <div 
                                  key={ilot.id} 
                                  className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
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
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-lg bg-slate-50">
                          <Grid3X3 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-500">Aucun îlot pour ce lotissement</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.nom || createMutation.isPending || updateMutation.isPending}
            >
              {editingLotissement ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gestion Îlots */}
      <GestionIlotsModal
        isOpen={isIlotsModalOpen}
        onClose={() => setIsIlotsModalOpen(false)}
        lotissement={selectedLotissement}
        onSuccess={handleIlotsSuccess}
      />

      {/* Modal Import Lotissement */}
      <ImportLotissementModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Modal Documents */}
      <Dialog open={!!viewingDocuments} onOpenChange={() => setViewingDocuments(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents - {viewingDocuments?.nom}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <AddDocumentForm 
              lotissementId={viewingDocuments?.id}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
            />
            {documents.filter(d => d.id_lotissement === viewingDocuments?.id).length > 0 ? (
              documents
                .filter(d => d.id_lotissement === viewingDocuments?.id)
                .sort((a, b) => {
                  const pa = a.type_document === 'decret' ? 1 : 0;
                  const pb = b.type_document === 'decret' ? 1 : 0;
                  if (pa !== pb) return pb - pa; // Décret en premier
                  const da = new Date(a.created_date || 0).getTime();
                  const db = new Date(b.created_date || 0).getTime();
                  return db - da; // plus récent en premier
                })
                .map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.nom_fichier}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {doc.type_document === 'decret' ? 'Décret' : 
                             doc.type_document === 'plan' ? 'Plan' : 
                             doc.type_document === 'attestation' ? 'Attestation' :
                             doc.type_document === 'autre' ? 'Autre' : doc.type_document}
                          </Badge>
                          <span>{(doc.taille / 1024).toFixed(0)} Ko</span>
                          <span>{format(new Date(doc.created_date), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-slate-500 mt-1">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewDocument(doc)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={safeUrl(doc.url_fichier)} download>
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">Aucun document pour ce lotissement</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Progression Suppression */}
      <Dialog open={showDeleteProgress} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Suppression en cours
            </DialogTitle>
          </DialogHeader>
          
          {deleteProgress && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-lg font-medium text-slate-900">{deleteProgress.phase}</p>
              </div>

              <div className="space-y-2 bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Lots supprimés:</span>
                  <span className="font-semibold">{deleteProgress.deleted.lots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Îlots supprimés:</span>
                  <span className="font-semibold">{deleteProgress.deleted.ilots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Attributaires supprimés:</span>
                  <span className="font-semibold">{deleteProgress.deleted.attributaires}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Historiques supprimés:</span>
                  <span className="font-semibold">{deleteProgress.deleted.historiques}</span>
                </div>
              </div>

              {deleteProgress.counts.before && (
                <div className="text-xs text-slate-500 text-center">
                  Lots restants: {deleteProgress.counts.after?.lots ?? deleteProgress.counts.before?.lots ?? 0}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DocumentViewerModal
        document={viewDocument}
        open={!!viewDocument}
        onOpenChange={(open) => !open && setViewDocument(null)}
      />
    </div>
  );
}