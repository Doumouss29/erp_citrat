import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ImportLotissementModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: '',
    region: '',
    commune: '',
    decret: '',
    date_attestation: ''
  });
  const [zipFile, setZipFile] = useState(null);
  const [decretFile, setDecretFile] = useState(null);
  const [autresDocuments, setAutresDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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



  const handleDecretChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Le décret doit être un PDF, JPG ou PNG');
        setDecretFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Le fichier décret doit faire moins de 5 Mo');
        setDecretFile(null);
        return;
      }
      setDecretFile(file);
      setError('');
    }
  };

  const handleAutresDocumentsChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5 Mo
      
      const invalidFiles = files.filter(f => !validTypes.includes(f.type) || f.size > maxSize);
      
      if (invalidFiles.length > 0) {
        setError('Certains fichiers ne sont pas valides (PDF, JPG, PNG uniquement, max 5 Mo par fichier)');
        return;
      }
      
      setAutresDocuments(files);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nom || !formData.region || !formData.commune || !formData.decret) {
      setError('Tous les champs sont obligatoires');
      return;
    }

    if (!zipFile) {
      setError('Veuillez sélectionner un fichier ZIP');
      return;
    }

    setIsUploading(true);

    try {
      // Upload du fichier ZIP
      const { file_url: zipUrl } = await base44.integrations.Core.UploadFile({ file: zipFile });

      // Upload du décret si présent
      let decretUrl = null;
      if (decretFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: decretFile });
        decretUrl = file_url;
      }

      // Créer le lotissement
      const lotissement = await base44.entities.LotissementEguide.create({
        nom: formData.nom,
        region: formData.region,
        commune: formData.commune,
        decret: formData.decret,
        coordonnees_centre: { lat: 7.5400, lng: -5.5471 }, // Côte d'Ivoire par défaut
        zoom_defaut: 13
      });

      // Créer un document pour le décret si uploadé
      if (decretUrl) {
        await base44.entities.Document.create({
          id_lotissement: lotissement.id,
          type_document: 'decret',
          nom_fichier: decretFile.name,
          url_fichier: decretUrl,
          taille: decretFile.size,
          type_mime: decretFile.type,
          description: `Décret d'approbation pour ${formData.nom}`
        });
      }

      // Créer les documents pour les autres fichiers uploadés
      if (autresDocuments.length > 0) {
        for (const doc of autresDocuments) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: doc });
          await base44.entities.Document.create({
            id_lotissement: lotissement.id,
            type_document: 'autre',
            nom_fichier: doc.name,
            url_fichier: file_url,
            taille: doc.size,
            type_mime: doc.type,
            description: `Document annexe pour ${formData.nom}`
          });
        }
      }

      // Importer les données Shapefile
      setSuccess('Import des données géographiques en cours...');
      
      let importResult;
      let ilotsCreated = 0;
      let lotsCreated = 0;
      
      try {
        importResult = await base44.functions.invoke('importShapefile', {
          zip_url: zipUrl,
          id_lotissement: lotissement.id,
          date_attribution: formData.date_attestation
        });

        if (!importResult.data.success) {
          throw new Error(importResult.data.error || 'Erreur lors de l\'import des shapefiles');
        }

        ilotsCreated = importResult.data.ilots_created || 0;
        lotsCreated = importResult.data.lots_created || 0;
        
        setSuccess(`Shapefile importé avec succès ✓\n${ilotsCreated} îlots, ${lotsCreated} lots créés`);
      } catch (importError) {
        // Vérifier si les données ont quand même été créées malgré l'erreur
        console.warn('Erreur import (possible timeout):', importError);
        
        try {
          const verifyIlots = await base44.entities.Ilot.filter({ id_lotissement: lotissement.id }, '-created_date', 1);
          const verifyLots = await base44.entities.Lot.filter({ id_lotissement: lotissement.id }, '-created_date', 1);
          
          if (verifyIlots.length > 0 || verifyLots.length > 0) {
            // Les données ont été créées, c'est un timeout mais l'import a réussi
            setSuccess(`Import terminé avec succès ✓\nLes données géographiques ont été importées (calcul final en cours en arrière-plan)`);
            ilotsCreated = verifyIlots.length;
            lotsCreated = verifyLots.length;
          } else {
            // Vraie erreur d'import
            throw importError;
          }
        } catch (verifyError) {
          // Impossible de vérifier ou vraie erreur
          throw importError;
        }
      }

      // Les attestations sont déjà créées par importShapefile avec la date fournie

      // Calculer le centre du lotissement à partir d'un échantillon d'îlots
      try {
        if (ilotsCreated > 0) {
          const ilotsData = await base44.entities.Ilot.filter({ id_lotissement: lotissement.id }, '-created_date', 50);
          
          if (ilotsData.length > 0) {
            let minLat = Infinity, maxLat = -Infinity;
            let minLng = Infinity, maxLng = -Infinity;
            let validCoords = false;
            
            ilotsData.forEach(ilot => {
              if (ilot.geometrie?.coordinates?.[0]) {
                const coords = ilot.geometrie.coordinates[0];
                // Échantillonner uniquement quelques points par îlot
                const step = Math.max(1, Math.floor(coords.length / 10));
                for (let i = 0; i < coords.length; i += step) {
                  const coord = coords[i];
                  if (coord && coord.length === 2) {
                    const [lng, lat] = coord;
                    if (typeof lat === 'number' && typeof lng === 'number' && 
                        !isNaN(lat) && !isNaN(lng) && 
                        isFinite(lat) && isFinite(lng)) {
                      minLat = Math.min(minLat, lat);
                      maxLat = Math.max(maxLat, lat);
                      minLng = Math.min(minLng, lng);
                      maxLng = Math.max(maxLng, lng);
                      validCoords = true;
                    }
                  }
                }
              }
            });
            
            if (validCoords && isFinite(minLat) && isFinite(maxLat) && 
                isFinite(minLng) && isFinite(maxLng)) {
              const centerLat = (minLat + maxLat) / 2;
              const centerLng = (minLng + maxLng) / 2;
              
              if (isFinite(centerLat) && isFinite(centerLng)) {
                await base44.entities.LotissementEguide.update(lotissement.id, {
                  coordonnees_centre: { lat: centerLat, lng: centerLng },
                  zoom_defaut: 16
                });
                
                lotissement.coordonnees_centre = { lat: centerLat, lng: centerLng };
                lotissement.zoom_defaut = 16;
              }
            }
          }
        }
      } catch (centerError) {
        console.error('Erreur calcul centre:', centerError);
        // Ne pas bloquer l'import si le calcul du centre échoue
      }

      setTimeout(() => {
        if (onSuccess) onSuccess(lotissement);
        handleClose();
      }, 2500);

    } catch (err) {
      setError(err.message || 'Erreur lors de l\'import du lotissement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({ nom: '', region: '', commune: '', decret: '', date_attestation: '' });
    setZipFile(null);
    setDecretFile(null);
    setAutresDocuments([]);
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[10000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importer un lotissement
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            Créez un nouveau lotissement avec ses informations administratives
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nom">Nom du lotissement *</Label>
              <Input
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Ex: Cité Keur Gorgui"
                required
              />
            </div>

            <div>
              <Label htmlFor="region">Région *</Label>
              <Input
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="LAGUNES"
                required
              />
            </div>

            <div>
              <Label htmlFor="commune">Commune *</Label>
              <Input
                id="commune"
                name="commune"
                value={formData.commune}
                onChange={handleChange}
                placeholder="ABIDJAN"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="decret">Décret (référence) *</Label>
              <Input
                id="decret"
                name="decret"
                value={formData.decret}
                onChange={handleChange}
                placeholder="Ex: N°2024-XXX du JJ/MM/AAAA"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="date_attestation">Date d'attestation</Label>
              <Input
                id="date_attestation"
                name="date_attestation"
                type="date"
                value={formData.date_attestation}
                onChange={handleChange}
              />
              <p className="hidden sm:block text-xs text-slate-500 mt-1">
                Optionnel - Une attestation sera générée pour chaque lot avec cette date
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="decret_file" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Document du décret d'approbation (PDF/JPG/PNG)
              </Label>
              <Input
                id="decret_file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleDecretChange}
                className="mt-2"
              />
              <p className="hidden sm:block text-xs text-slate-500 mt-1">
                Optionnel - Max 5 Mo
              </p>
              {decretFile && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {decretFile.name} ({(decretFile.size / 1024).toFixed(0)} Ko)
                </p>
              )}
            </div>

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
              <p className="hidden sm:block text-xs text-slate-500 mt-1">
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
              <Label htmlFor="autres_documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Autres documents (plans, PV, etc.)
              </Label>
              <Input
                id="autres_documents"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleAutresDocumentsChange}
                className="mt-2"
              />
              <p className="hidden sm:block text-xs text-slate-500 mt-1">
                Optionnel - Plusieurs fichiers possibles (PDF/JPG/PNG, max 5 Mo par fichier)
              </p>
              {autresDocuments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {autresDocuments.map((file, idx) => (
                    <p key={idx} className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {file.name} ({(file.size / 1024).toFixed(0)} Ko)
                    </p>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isUploading}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}