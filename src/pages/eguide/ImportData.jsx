import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, FileJson, FileSpreadsheet, MapPin, Grid3X3,
  CheckCircle, AlertCircle, Loader2, Info, Download
} from 'lucide-react';
import { toast } from 'sonner';

export default function ImportData() {
  const [activeTab, setActiveTab] = useState('geojson');
  const [selectedLotissement, setSelectedLotissement] = useState('');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [importType, setImportType] = useState('ilots');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: lotissements = [] } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } })
  });

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResults(null);

    try {
      const content = await selectedFile.text();
      
      if (activeTab === 'geojson') {
        const geojson = JSON.parse(content);
        if (geojson.type === 'FeatureCollection') {
          setParsedData(geojson);
          toast.success(`${geojson.features.length} éléments détectés`);
        } else {
          toast.error('Format GeoJSON invalide');
        }
      } else if (activeTab === 'csv') {
        const lines = content.split('\n');
        const headers = lines[0].split(';').map(h => h.trim());
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(';');
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = values[i]?.trim();
            });
            return obj;
          });
        setParsedData({ headers, data });
        toast.success(`${data.length} lignes détectées`);
      }
    } catch (error) {
      toast.error('Erreur lors de la lecture du fichier');
      console.error(error);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !selectedLotissement) {
      toast.error('Veuillez sélectionner un lotissement et un fichier');
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      let successCount = 0;
      let errorCount = 0;

      if (activeTab === 'geojson' && importType === 'ilots') {
        for (const feature of parsedData.features) {
          try {
            await base44.entities.Ilot.create({
              id_lotissement: selectedLotissement,
              numero_ilot: feature.properties.numero || feature.properties.NUMERO || `I${successCount + 1}`,
              nombre_lots: feature.properties.nb_lots || 0,
              geometrie: feature.geometry,
              couleur: feature.properties.couleur || '#1e293b'
            });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      } else if (activeTab === 'geojson' && importType === 'lots') {
        for (const feature of parsedData.features) {
          try {
            await base44.entities.Lot.create({
              id_lotissement: selectedLotissement,
              id_ilot: feature.properties.id_ilot || null,
              numero_lot: feature.properties.numero || feature.properties.NUMERO || `L${successCount + 1}`,
              surface: feature.properties.surface || feature.properties.SURFACE || null,
              affectation: feature.properties.affectation || 'Habitat',
              statut: feature.properties.statut || 'Initial',
              geometrie: feature.geometry
            });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      } else if (activeTab === 'csv' && importType === 'lots') {
        for (const row of parsedData.data) {
          try {
            await base44.entities.Lot.create({
              id_lotissement: selectedLotissement,
              numero_lot: row.numero_lot || row.numero,
              surface: row.surface ? parseFloat(row.surface) : null,
              affectation: row.affectation || 'Habitat',
              statut: row.statut || 'Initial'
            });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      } else if (activeTab === 'csv' && importType === 'attributaires') {
        for (const row of parsedData.data) {
          try {
            await base44.entities.Attributaire.create({
              id_lot: row.id_lot,
              type_attributaire: row.type || 'physique',
              nom: row.nom,
              prenom: row.prenom,
              telephone: row.telephone,
              email: row.email,
              est_principal: true,
              actif: true,
              date_attribution: new Date().toISOString().split('T')[0]
            });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }

      setImportResults({ successCount, errorCount });
      queryClient.invalidateQueries();
      
      if (successCount > 0) {
        toast.success(`${successCount} élément(s) importé(s)`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'import`);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Import de données</h1>
          <p className="text-slate-500 mt-1">Importez vos données géographiques et attributaires</p>
        </div>

        {/* Lotissement Selection */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <Label className="text-base font-semibold">Lotissement cible</Label>
            <p className="text-sm text-slate-500 mb-3">
              Sélectionnez le lotissement dans lequel importer les données
            </p>
            <Select value={selectedLotissement} onValueChange={setSelectedLotissement}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un lotissement" />
              </SelectTrigger>
              <SelectContent>
                {lotissements.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Import Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetForm(); }}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="geojson" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              GeoJSON
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geojson">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import GeoJSON</CardTitle>
                <CardDescription>
                  Importez des fichiers GeoJSON contenant les géométries des îlots ou des lots
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Type de données</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ilots">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="w-4 h-4" />
                          Îlots
                        </div>
                      </SelectItem>
                      <SelectItem value="lots">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Lots
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fichier GeoJSON</Label>
                  <div 
                    className="mt-2 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-300 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".geojson,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    {file ? (
                      <div>
                        <p className="font-medium text-slate-700">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-600">Cliquez pour sélectionner un fichier</p>
                        <p className="text-sm text-slate-400">ou glissez-déposez</p>
                      </div>
                    )}
                  </div>
                </div>

                {parsedData && (
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {parsedData.features.length} élément(s) prêt(s) à être importé(s)
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className="bg-slate-50 border-slate-200">
                  <Info className="w-4 h-4 text-slate-500" />
                  <AlertDescription className="text-slate-600">
                    <strong>Propriétés attendues:</strong>
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {importType === 'ilots' ? (
                        <>
                          <li>numero (ou NUMERO) - Numéro de l'îlot</li>
                          <li>nb_lots - Nombre de lots (optionnel)</li>
                          <li>couleur - Couleur d'affichage (optionnel)</li>
                        </>
                      ) : (
                        <>
                          <li>numero (ou NUMERO) - Numéro du lot</li>
                          <li>surface (ou SURFACE) - Surface en m² (optionnel)</li>
                          <li>affectation - Type d'affectation (optionnel)</li>
                          <li>statut - Statut du lot (optionnel)</li>
                        </>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import CSV</CardTitle>
                <CardDescription>
                  Importez des données tabulaires (lots, attributaires) au format CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Type de données</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lots">Lots</SelectItem>
                      <SelectItem value="attributaires">Attributaires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fichier CSV</Label>
                  <div 
                    className="mt-2 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-300 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    {file ? (
                      <div>
                        <p className="font-medium text-slate-700">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-600">Cliquez pour sélectionner un fichier</p>
                        <p className="text-sm text-slate-400">Séparateur : point-virgule (;)</p>
                      </div>
                    )}
                  </div>
                </div>

                {parsedData && (
                  <>
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        {parsedData.data.length} ligne(s) détectée(s)
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label className="mb-2 block">Colonnes détectées</Label>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.headers.map(h => (
                          <Badge key={h} variant="outline">{h}</Badge>
                        ))}
                      </div>
                    </div>

                    <ScrollArea className="h-48 border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            {parsedData.headers.map(h => (
                              <th key={h} className="px-3 py-2 text-left font-medium text-slate-600">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.data.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t">
                              {parsedData.headers.map(h => (
                                <td key={h} className="px-3 py-2 text-slate-600">
                                  {row[h] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import Results */}
        {importResults && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {importResults.errorCount === 0 ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">Import terminé</h3>
                  <p className="text-slate-500">
                    {importResults.successCount} élément(s) importé(s)
                    {importResults.errorCount > 0 && ` • ${importResults.errorCount} erreur(s)`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={resetForm}>
            Réinitialiser
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!parsedData || !selectedLotissement || importing}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importer les données
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}