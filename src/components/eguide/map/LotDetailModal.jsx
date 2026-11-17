import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { 
  X, User, Building2, Phone, Mail, CreditCard, Calendar, 
  FileText, History, Edit, UserPlus, Save, Trash2, Upload,
  MapPin, Ruler, Tag, Loader2, CheckCircle2, Eye
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import DocumentViewerModal from '@/components/eguide/lotissement/DocumentViewerModal';
import { formatLotSurface, roundLotSurface } from '@/utils/eguideFormatLotSurface';

const STATUT_COLORS = {
  'Lot en vente': 'bg-red-100 text-red-700',
  'Lot réservé': 'bg-amber-100 text-amber-700',
  'Lot vendu': 'bg-emerald-100 text-emerald-700',
  'Lot non à vendre': 'bg-orange-100 text-orange-700'
};

export default function LotDetailModal({ 
  isOpen, 
  onClose, 
  lot, 
  ilot,
  lotissement,
  onLotUpdated 
}) {
  const [activeTab, setActiveTab] = useState('infos');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingAttributaire, setIsChangingAttributaire] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const isViewer = currentUser?.role === 'viewer';
  const [editedLot, setEditedLot] = useState(null);
  const [currentLot, setCurrentLot] = useState(null);
  const [attributaires, setAttributaires] = useState([]);
  const [historique, setHistoriques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAttributaire, setNewAttributaire] = useState({
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
    piece_identite_url: '',
    est_principal: true
  });
  const [attributairesSupplementaires, setAttributairesSupplementaires] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lotDocuments, setLotDocuments] = useState([]);
  const [viewDocument, setViewDocument] = useState(null);

  const centroid = React.useMemo(() => {
    const geom = lot?.geometrie;
    if (!geom) return null;
    let coords = null;
    try {
      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
        coords = geom.coordinates[0];
      } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
        coords = geom.coordinates[0][0];
      } else if (geom.geometry?.type) {
        const g = geom.geometry;
        if (g.type === 'Polygon') coords = g.coordinates[0];
        if (g.type === 'MultiPolygon') coords = g.coordinates[0][0];
      }
    } catch (_) {}
    if (!coords || coords.length < 3) return null;
    const pts = coords.slice();
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) pts.push(first);
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const x0 = pts[i][0], y0 = pts[i][1];
      const x1 = pts[i+1][0], y1 = pts[i+1][1];
      const a = x0*y1 - x1*y0;
      area += a;
      cx += (x0 + x1) * a;
      cy += (y0 + y1) * a;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-12) {
      let sx = 0, sy = 0;
      for (const p of coords) { sx += p[0]; sy += p[1]; }
      const n = coords.length;
      return { lng: sx/n, lat: sy/n };
    }
    cx = cx / (6*area);
    cy = cy / (6*area);
    return { lng: cx, lat: cy };
  }, [lot]);

  useEffect(() => {
    if (lot) {
      setCurrentLot({ ...lot });
      setEditedLot({ ...lot });
      loadAttributaires();
      loadHistorique();
      loadLotDocuments();
    }
  }, [lot]);

  const loadAttributaires = async () => {
    if (!lot) return;
    try {
      const data = await base44.entities.Attributaire.filter({ id_lot: lot.id, actif: true });
      setAttributaires(data);
    } catch (error) {
      console.error('Erreur chargement attributaires:', error);
    }
  };

  const loadHistorique = async () => {
    if (!lot) return;
    try {
      const data = await base44.entities.HistoriqueAttribution.filter({ id_lot: lot.id }, '-created_date');
      setHistoriques(data);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const loadLotDocuments = async () => {
    if (!lot) return;
    try {
      const data = await base44.entities.Document.filter({ id_lot: lot.id }, '-created_date', 100);
      setLotDocuments(data);
    } catch (error) {
      console.error('Erreur chargement documents lot:', error);
    }
  };

  const handleSaveLot = async () => {
    setLoading(true);
    try {
      const lotPayload = {
        ...editedLot,
        parcelle: (editedLot?.parcelle || '').trim(),
        TF: (editedLot?.TF || '').trim(),
        surface: roundLotSurface(editedLot?.surface),
      };
      await base44.entities.Lot.update(lot.id, lotPayload);
      setCurrentLot({ ...lotPayload });
      toast.success('Lot mis à jour avec succès');
      setIsEditing(false);
      if (onLotUpdated) onLotUpdated();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttributaire = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Préparer les opérations en parallèle
      const operations = [];
      
      // Désactiver les anciens attributaires
      if (attributaires.length > 0) {
        attributaires.forEach(attr => {
          operations.push(
            base44.entities.Attributaire.update(attr.id, { actif: false })
          );
        });

        // Créer l'historique de suppression
        const nomsAttributaires = attributaires.map(a => 
          a.type_attributaire === 'physique' 
            ? `${a.prenom} ${a.nom}` 
            : a.raison_sociale || a.nom
        ).join(' & ');

        operations.push(
          base44.entities.HistoriqueAttribution.create({
            id_lot: lot.id,
            id_attributaire: attributaires[0].id,
            action: 'suppression',
            nom_attributaire: nomsAttributaires,
            prenom_attributaire: '',
            type_attributaire: attributaires[0].type_attributaire,
            ancien_statut: lot.statut,
            utilisateur_action: user.email,
            date_action: new Date().toISOString()
          })
        );
      }
      
      // Exécuter toutes les opérations de suppression en parallèle
      await Promise.all(operations);
      
      // Préparer les créations en parallèle
      const creations = [];
      
      // Créer le nouvel attributaire principal
      const principalAttrPromise = base44.entities.Attributaire.create({
        ...newAttributaire,
        id_lot: lot.id,
        date_attribution: new Date().toISOString().split('T')[0],
        actif: true
      });
      creations.push(principalAttrPromise);
      
      // Ajouter les attributaires supplémentaires
      attributairesSupplementaires.forEach(supp => {
        creations.push(
          base44.entities.Attributaire.create({
            ...supp,
            id_lot: lot.id,
            est_principal: false,
            date_attribution: new Date().toISOString().split('T')[0],
            actif: true
          })
        );
      });
      
      // Ne pas modifier le statut du lot automatiquement
      
      // Exécuter toutes les créations en parallèle
      const results = await Promise.all(creations);
      const createdAttr = results[0];
      
      // Créer l'historique de création avec tous les noms
      const tousLesAttributaires = [
        { ...newAttributaire, nom: newAttributaire.nom, prenom: newAttributaire.prenom, raison_sociale: newAttributaire.raison_sociale },
        ...attributairesSupplementaires
      ];
      
      const nomsAttributaires = tousLesAttributaires.map(a => 
        a.type_attributaire === 'physique' 
          ? `${a.nom} ${a.prenom}` 
          : a.raison_sociale || a.nom
      ).filter(n => n.trim()).join(' & ');
      
      await base44.entities.HistoriqueAttribution.create({
        id_lot: lot.id,
        id_attributaire: createdAttr.id,
        action: 'creation',
        nom_attributaire: nomsAttributaires,
        prenom_attributaire: '',
        type_attributaire: newAttributaire.type_attributaire,
        utilisateur_action: user.email,
        date_action: new Date().toISOString()
      });
      
      // Recharger les attributaires localement
      await loadAttributaires();
      await loadHistorique();

      toast.success('Attributaire enregistré avec succès');
      setIsChangingAttributaire(false);
      setNewAttributaire({
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
        piece_identite_url: '',
        est_principal: true
      });
      setAttributairesSupplementaires([]);

      // Notifier le parent pour rafraîchir les données de la carte
      if (onLotUpdated) onLotUpdated();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewAttributaire({ ...newAttributaire, piece_identite_url: file_url });
      toast.success('Fichier uploadé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'upload du fichier');
      console.error(error);
    } finally {
      setUploadingFile(false);
    }
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
        date_expiration_piece: '',
        piece_identite_url: ''
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

  if (!lot || !currentLot) return null;

  const principalAttributaire = attributaires.find(a => a.est_principal);
  const autresAttributaires = attributaires.filter(a => !a.est_principal);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 z-[9999]">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                Lot {currentLot.numero_lot}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                <span>Îlot {ilot?.numero_ilot || 'N/A'}</span>
                <span>•</span>
                <span>{lotissement?.nom || 'Lotissement'}</span>
              </div>
            </div>

          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="infos" className="rounded-lg data-[state=active]:bg-white">
                <FileText className="w-4 h-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="attributaire" className="rounded-lg data-[state=active]:bg-white">
                <User className="w-4 h-4 mr-2" />
                Attributaire
              </TabsTrigger>
              <TabsTrigger value="historique" className="rounded-lg data-[state=active]:bg-white">
                <History className="w-4 h-4 mr-2" />
                Historique
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-white">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            <div className="p-6">
              <TabsContent value="infos" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">Parcelle</Label>
                      {isEditing ? (
                        <Input
                          value={editedLot?.parcelle || ''}
                          onChange={(e) => setEditedLot({ ...editedLot, parcelle: e.target.value })}
                          className="mt-1"
                          placeholder="Numéro de parcelle"
                        />
                      ) : (
                        <p className="text-lg font-medium mt-1">
                          {currentLot.parcelle || 'Non renseignée'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">TF</Label>
                      {isEditing ? (
                        <Input
                          value={editedLot?.TF || ''}
                          onChange={(e) => setEditedLot({ ...editedLot, TF: e.target.value })}
                          className="mt-1"
                          placeholder="Référence TF"
                        />
                      ) : (
                        <p className="text-lg font-medium mt-1">
                          {currentLot.TF || 'Non renseigné'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">Surface</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedLot?.surface || ''}
                          onChange={(e) => setEditedLot({...editedLot, surface: parseFloat(e.target.value)})}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-lg font-medium flex items-center gap-2 mt-1">
                          <Ruler className="w-4 h-4 text-slate-400" />
                          {formatLotSurface(currentLot.surface) || 'Non renseignée'}
                        </p>
                      )}
                      </div>

                      <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">Affectation</Label>
                      {isEditing ? (
                        <Select 
                          value={editedLot?.affectation || ''} 
                          onValueChange={(value) => setEditedLot({...editedLot, affectation: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {['Habitat', 'Commerce', 'Équipement', 'Espace vert', 'Voirie', 'Autre'].map(aff => (
                              <SelectItem key={aff} value={aff}>{aff}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-lg font-medium flex items-center gap-2 mt-1">
                          <Tag className="w-4 h-4 text-slate-400" />
                          {currentLot.affectation || 'Non renseignée'}
                        </p>
                      )}
                      </div>
                      </div>

                      <div className="space-y-4">
                      <div>
                      <Label className="text-slate-500 text-xs uppercase tracking-wide">Statut</Label>
                      {isEditing ? (
                        <Select 
                          value={editedLot?.statut || 'Initial'} 
                          onValueChange={(value) => setEditedLot({...editedLot, statut: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Lot en vente', 'Lot réservé', 'Lot vendu', 'Lot non à vendre'].map(st => (
                              <SelectItem key={st} value={st}>{st}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`${STATUT_COLORS[currentLot.statut]} mt-1`}>{currentLot.statut}</Badge>
                      )}
                      </div>

                      <div>
                        <Label className="text-slate-500 text-xs uppercase tracking-wide">Localisation</Label>
                        {centroid ? (
                          <div className="mt-1">
                            <a
                              href={`https://www.google.com/maps?q=${centroid.lat},${centroid.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-2"
                            >
                              <MapPin className="w-4 h-4" />
                              Ouvrir dans Google Maps
                            </a>
                            <p className="text-xs text-slate-500 mt-1">{centroid.lat.toFixed(6)}, {centroid.lng.toFixed(6)}</p>
                          </div>
                        ) : (
                          <p className="text-slate-500 mt-1">Non disponible</p>
                        )}
                      </div>

                      {!isViewer && (
                        <div>
                        <Label className="text-slate-500 text-xs uppercase tracking-wide">Prix</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedLot?.prix || ''}
                            onChange={(e) => setEditedLot({...editedLot, prix: parseFloat(e.target.value)})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-lg font-medium mt-1">
                            {currentLot.prix ? `${currentLot.prix.toLocaleString()} FCFA` : 'Non renseigné'}
                          </p>
                        )}
                      </div>
                      )}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wide">Notes</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedLot?.notes || ''}
                      onChange={(e) => setEditedLot({...editedLot, notes: e.target.value})}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="text-slate-600 mt-1">{currentLot.notes || 'Aucune note'}</p>
                  )}
                </div>

                {!isViewer && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={() => {
                          setEditedLot({ ...currentLot });
                          setIsEditing(false);
                        }}>Annuler</Button>
                        <Button onClick={handleSaveLot} disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier les infos
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attributaire" className="mt-0 space-y-6">
                {!isChangingAttributaire ? (
                  <>
                    {attributaires.length > 0 ? (
                      <div className="bg-slate-50 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                              {principalAttributaire?.type_attributaire === 'physique' ? (
                                <User className="w-6 h-6 text-slate-600" />
                              ) : (
                                <Building2 className="w-6 h-6 text-slate-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {attributaires.map(attr => 
                                  attr.type_attributaire === 'physique' 
                                    ? `${attr.prenom} ${attr.nom}`
                                    : attr.raison_sociale || attr.nom
                                ).join(' & ')}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {attributaires.length} attributaire{attributaires.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {attributaires.map((attr, idx) => (
                            <div key={attr.id} className="col-span-2 pb-3 border-b border-slate-200 last:border-0">
                              {attributaires.length > 1 && (
                                <p className="font-medium text-slate-700 mb-2">
                                  {attr.type_attributaire === 'physique' 
                                    ? `${attr.prenom} ${attr.nom}`
                                    : attr.raison_sociale || attr.nom
                                  }
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{attr.telephone || 'Non renseigné'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Mail className="w-4 h-4" />
                                  <span>{attr.email || 'Non renseigné'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <CreditCard className="w-4 h-4" />
                                  <span>
                                    {attr.nature_piece_identite} - {attr.numero_piece_identite || 'Non renseigné'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Attr. le {attr.date_attribution 
                                      ? format(new Date(attr.date_attribution), 'dd/MM/yyyy', { locale: fr })
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                              </div>
                              {attr.type_attributaire === 'morale' && attr.representant_nom && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                  <p className="text-xs text-slate-500">Représentant: {attr.representant_prenom} {attr.representant_nom}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Aucun attributaire pour ce lot</p>
                      </div>
                    )}

                    {!isViewer && (
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => setIsChangingAttributaire(true)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Changer d'attributaire
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Nouvel attributaire</h3>
                      <Select 
                        value={newAttributaire.type_attributaire}
                        onValueChange={(value) => setNewAttributaire({...newAttributaire, type_attributaire: value})}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[999999]">
                          <SelectItem value="physique">Personne physique</SelectItem>
                          <SelectItem value="morale">Personne morale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newAttributaire.type_attributaire === 'physique' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nom *</Label>
                          <Input
                            value={newAttributaire.nom}
                            onChange={(e) => setNewAttributaire({...newAttributaire, nom: e.target.value})}
                            placeholder="Nom de famille"
                          />
                        </div>
                        <div>
                          <Label>Prénom *</Label>
                          <Input
                            value={newAttributaire.prenom}
                            onChange={(e) => setNewAttributaire({...newAttributaire, prenom: e.target.value})}
                            placeholder="Prénom"
                          />
                        </div>
                        <div>
                          <Label>Téléphone</Label>
                          <Input
                            value={newAttributaire.telephone}
                            onChange={(e) => setNewAttributaire({...newAttributaire, telephone: e.target.value})}
                            placeholder="+221 77 xxx xx xx"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newAttributaire.email}
                            onChange={(e) => setNewAttributaire({...newAttributaire, email: e.target.value})}
                            placeholder="email@exemple.com"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Adresse</Label>
                          <Input
                            value={newAttributaire.adresse}
                            onChange={(e) => setNewAttributaire({...newAttributaire, adresse: e.target.value})}
                            placeholder="Adresse complète"
                          />
                        </div>
                        <div>
                          <Label>Type de pièce d'identité</Label>
                          <Select 
                            value={newAttributaire.nature_piece_identite}
                            onValueChange={(value) => setNewAttributaire({...newAttributaire, nature_piece_identite: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="z-[999999]">
                              {['CNI', 'Passeport', 'Carte de séjour', 'Autre'].map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Numéro de pièce</Label>
                          <Input
                            value={newAttributaire.numero_piece_identite}
                            onChange={(e) => setNewAttributaire({...newAttributaire, numero_piece_identite: e.target.value})}
                            placeholder="Numéro"
                          />
                        </div>
                        <div>
                          <Label>Date d'expiration</Label>
                          <Input
                            type="date"
                            value={newAttributaire.date_expiration_piece}
                            onChange={(e) => setNewAttributaire({...newAttributaire, date_expiration_piece: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Pièce d'identité (scan/photo)
                          </Label>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e.target.files?.[0])}
                            className="mt-1"
                            disabled={uploadingFile}
                          />
                          {uploadingFile && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Upload en cours...
                            </p>
                          )}
                          {newAttributaire.piece_identite_url && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Fichier uploadé
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Raison sociale *</Label>
                          <Input
                            value={newAttributaire.raison_sociale}
                            onChange={(e) => setNewAttributaire({
                              ...newAttributaire, 
                              raison_sociale: e.target.value,
                              nom: e.target.value
                            })}
                            placeholder="Nom de l'entreprise"
                          />
                        </div>
                        <div>
                          <Label>Nom du représentant</Label>
                          <Input
                            value={newAttributaire.representant_nom}
                            onChange={(e) => setNewAttributaire({...newAttributaire, representant_nom: e.target.value})}
                            placeholder="Nom"
                          />
                        </div>
                        <div>
                          <Label>Prénom du représentant</Label>
                          <Input
                            value={newAttributaire.representant_prenom}
                            onChange={(e) => setNewAttributaire({...newAttributaire, representant_prenom: e.target.value})}
                            placeholder="Prénom"
                          />
                        </div>
                        <div>
                          <Label>Téléphone</Label>
                          <Input
                            value={newAttributaire.telephone}
                            onChange={(e) => setNewAttributaire({...newAttributaire, telephone: e.target.value})}
                            placeholder="+221 77 xxx xx xx"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newAttributaire.email}
                            onChange={(e) => setNewAttributaire({...newAttributaire, email: e.target.value})}
                            placeholder="email@exemple.com"
                          />
                        </div>
                        <div>
                          <Label>Type de document</Label>
                          <Select 
                            value={newAttributaire.nature_piece_identite}
                            onValueChange={(value) => setNewAttributaire({...newAttributaire, nature_piece_identite: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="z-[999999]">
                              {['Registre de commerce', 'NINEA', 'Autre'].map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Numéro du document</Label>
                          <Input
                            value={newAttributaire.numero_piece_identite}
                            onChange={(e) => setNewAttributaire({...newAttributaire, numero_piece_identite: e.target.value})}
                            placeholder="Numéro"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Document justificatif (scan/photo)
                          </Label>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e.target.files?.[0])}
                            className="mt-1"
                            disabled={uploadingFile}
                          />
                          {uploadingFile && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Upload en cours...
                            </p>
                          )}
                          {newAttributaire.piece_identite_url && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Fichier uploadé
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Attributaires supplémentaires</h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={addAttributaireSupplementaire}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Ajouter
                        </Button>
                      </div>

                      {attributairesSupplementaires.map((attr, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-lg mb-3">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-slate-500">Attributaire {idx + 2}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeAttributaireSupplementaire(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>

                          <div className="mb-3">
                            <Select 
                              value={attr.type_attributaire}
                              onValueChange={(value) => updateAttributaireSupplementaire(idx, 'type_attributaire', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[999999]">
                                <SelectItem value="physique">Personne physique</SelectItem>
                                <SelectItem value="morale">Personne morale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

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
                              <div className="col-span-2">
                                <Input
                                  placeholder="Adresse"
                                  value={attr.adresse}
                                  onChange={(e) => updateAttributaireSupplementaire(idx, 'adresse', e.target.value)}
                                />
                              </div>
                              <Select 
                                value={attr.nature_piece_identite}
                                onValueChange={(value) => updateAttributaireSupplementaire(idx, 'nature_piece_identite', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type de pièce" />
                                </SelectTrigger>
                                <SelectContent className="z-[999999]">
                                  {['CNI', 'Passeport', 'Carte de séjour', 'Autre'].map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Numéro de pièce"
                                value={attr.numero_piece_identite}
                                onChange={(e) => updateAttributaireSupplementaire(idx, 'numero_piece_identite', e.target.value)}
                              />
                              <Input
                                type="date"
                                placeholder="Date d'expiration"
                                value={attr.date_expiration_piece}
                                onChange={(e) => updateAttributaireSupplementaire(idx, 'date_expiration_piece', e.target.value)}
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
                                placeholder="Nom du représentant"
                                value={attr.representant_nom}
                                onChange={(e) => updateAttributaireSupplementaire(idx, 'representant_nom', e.target.value)}
                              />
                              <Input
                                placeholder="Prénom du représentant"
                                value={attr.representant_prenom}
                                onChange={(e) => updateAttributaireSupplementaire(idx, 'representant_prenom', e.target.value)}
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
                              <Select 
                                value={attr.nature_piece_identite}
                                onValueChange={(value) => updateAttributaireSupplementaire(idx, 'nature_piece_identite', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type de document" />
                                </SelectTrigger>
                                <SelectContent className="z-[999999]">
                                  {['Registre de commerce', 'NINEA', 'Autre'].map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Numéro du document"
                                value={attr.numero_piece_identite}
                                onChange={(e) => updateAttributaireSupplementaire(idx, 'numero_piece_identite', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsChangingAttributaire(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleSaveAttributaire} 
                        disabled={loading || !newAttributaire.nom}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historique" className="mt-0">
                {historique.length > 0 ? (
                  <div className="space-y-4">
                    {historique.map((h, idx) => (
                      <div key={h.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            h.action === 'creation' ? 'bg-emerald-100' :
                            h.action === 'modification' ? 'bg-blue-100' :
                            h.action === 'suppression' ? 'bg-red-100' : 'bg-amber-100'
                          }`}>
                            {h.action === 'creation' && <UserPlus className="w-5 h-5 text-emerald-600" />}
                            {h.action === 'modification' && <Edit className="w-5 h-5 text-blue-600" />}
                            {h.action === 'suppression' && <Trash2 className="w-5 h-5 text-red-600" />}
                            {h.action === 'transfert' && <History className="w-5 h-5 text-amber-600" />}
                          </div>
                          {idx < historique.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-200 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">
                                  {h.action === 'creation' && 'Attribution à '}
                                  {h.action === 'modification' && 'Modification de '}
                                  {h.action === 'suppression' && 'Fin d\'attribution de '}
                                  {h.action === 'transfert' && 'Transfert de '}
                                  <span className="text-slate-900">
                                    {h.prenom_attributaire ? `${h.prenom_attributaire} ${h.nom_attributaire}` : h.nom_attributaire}
                                  </span>
                                </p>
                                {h.details_modification && (
                                  <p className="text-sm text-slate-500 mt-1">{h.details_modification}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {h.type_attributaire === 'physique' ? 'Personne physique' : 'Personne morale'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {h.date_action 
                                  ? format(new Date(h.date_action), 'dd/MM/yyyy à HH:mm', { locale: fr })
                                  : format(new Date(h.created_date), 'dd/MM/yyyy à HH:mm', { locale: fr })
                                }
                              </span>
                              {h.utilisateur_action && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {h.utilisateur_action}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun historique pour ce lot</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                {lotDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {lotDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-xl border bg-slate-50 p-4">
                        <div>
                          <p className="font-medium text-slate-900">{doc.nom_fichier}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="outline">{doc.type_document}</Badge>
                            {doc.created_date ? <span>{format(new Date(doc.created_date), 'dd/MM/yyyy', { locale: fr })}</span> : null}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setViewDocument(doc)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun document pour ce lot</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      <DocumentViewerModal
        document={viewDocument}
        open={!!viewDocument}
        onOpenChange={(open) => !open && setViewDocument(null)}
      />
      </DialogContent>
    </Dialog>
  );
}