import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Upload, Image as ImageIcon, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfigCoverPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState({
    right_logo_url: '',
    localite_nom: '',
    titre_lotissement: '',
    date_couverture: '',
    lotissement_nom: '',
    arrete_approbation: '',
    document_nom: 'GUIDE',
    pays: '',
    region: '',
    sous_prefecture: '',
    commune: '',
    type_operation: '',
    ministere_nom: '',
    background_image_url: '',
    background_images: {}
  });
  const [configId, setConfigId] = useState(null);
  const [lotissements, setLotissements] = useState([]);
  const [selectedLotissementId, setSelectedLotissementId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await base44.entities.ConfigurationApp.filter({ cle: 'cover_page' });
        if (cfg.length > 0) {
          setConfigId(cfg[0].id);
          const v = cfg[0].valeur || {};
          setState({
            right_logo_url: v.right_logo_url || '',
            localite_nom: v.localite_nom || '',
            titre_lotissement: v.titre_lotissement || '',
            date_couverture: v.date_couverture || '',
            lotissement_nom: v.lotissement_nom || '',
            arrete_approbation: v.arrete_approbation || '',
            document_nom: v.document_nom || 'GUIDE',
            pays: v.pays || '',
            region: v.region || '',
            sous_prefecture: v.sous_prefecture || '',
            commune: v.commune || '',
            type_operation: v.type_operation || '',
            ministere_nom: v.ministere_nom || '',
            background_image_url: v.background_image_url || '',
            background_images: v.background_images || {}
          });
        }
        const lots = await base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } });
        setLotissements(lots);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const uploadImage = async (side, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setState((s) => ({ ...s, [`${side}_logo_url`]: file_url }));
  };

  const uploadBackground = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setState((s) => {
      if (selectedLotissementId) {
        return {
          ...s,
          background_images: { ...(s.background_images || {}), [selectedLotissementId]: file_url }
        };
      }
      return { ...s, background_image_url: file_url };
    });
  };

   const applyFromLotissement = () => {
    const l = lotissements.find((x) => x.id === selectedLotissementId);
    if (!l) return;
    setState((s) => ({
      ...s,
      lotissement_nom: l.nom || s.lotissement_nom,
      region: l.region || s.region,
      commune: l.commune || s.commune,
      localite_nom: l.village || s.localite_nom,
      arrete_approbation: l.decret || s.arrete_approbation,
    }));
  };

  // Auto-apply when selection changes
  const handleLotissementChange = (id) => {
    setSelectedLotissementId(id);
    const l = lotissements.find((x) => x.id === id);
    if (!l) return;
    setState((s) => ({
      ...s,
      lotissement_nom: l.nom || s.lotissement_nom,
      region: l.region || s.region,
      commune: l.commune || s.commune,
      localite_nom: l.village || s.localite_nom,
      arrete_approbation: l.decret || s.arrete_approbation,
    }));
  };

  const removeBackground = () => {
    if (selectedLotissementId && state.background_images?.[selectedLotissementId]) {
      setState((s) => {
        const next = { ...(s.background_images || {}) };
        delete next[selectedLotissementId];
        return { ...s, background_images: next };
      });
    } else if (state.background_image_url) {
      setState((s) => ({ ...s, background_image_url: '' }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.ConfigurationApp.update(configId, {
          valeur: { ...state },
          description: 'Paramètres de la page de garde (logos, libellés, arrêté, document)'
        });
      } else {
        const created = await base44.entities.ConfigurationApp.create({
          cle: 'cover_page',
          valeur: { ...state },
          description: 'Paramètres de la page de garde (logos, libellés, arrêté, document)'
        });
        setConfigId(created.id);
      }
      toast.success('Paramètres enregistrés');
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const currentBg = (selectedLotissementId && state.background_images?.[selectedLotissementId])
    ? state.background_images[selectedLotissementId]
    : state.background_image_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Paramètres de la page de garde</CardTitle>


      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <Label>Lotissement</Label>
            <Select value={selectedLotissementId} onValueChange={handleLotissementChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un lotissement" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {lotissements.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
        <div>
          <Label className="block mb-2">Logo</Label>
          <div className="flex items-start gap-4">
            {state.right_logo_url ? (
              <div className="relative w-28 h-28 border-2 border-slate-200 rounded-lg overflow-hidden">
                <img src={state.right_logo_url} alt="Logo" className="w-full h-full object-contain" />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="w-28 h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                <ImageIcon className="w-7 h-7 mb-1" />
                <span className="text-xs">Aucune image</span>
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor="right-logo" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                <Upload className="w-4 h-4" />
                {state.right_logo_url ? 'Remplacer le logo' : 'Uploader un logo'}
              </Label>
              <Input id="right-logo" type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage('right', e.target.files?.[0])} />

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Titre du lotissement</Label>
            <Input value={state.titre_lotissement} onChange={(e) => setState({ ...state, titre_lotissement: e.target.value })} placeholder="Ex : GUIDE DE LOTISSEMENT" />
          </div>
          <div>
            <Label>Date</Label>
            <Input value={state.date_couverture} onChange={(e) => setState({ ...state, date_couverture: e.target.value })} placeholder="Ex : Juin 2026" />
          </div>
          <div>
            <Label>Nom du lotissement</Label>
            <Input value={state.lotissement_nom} onChange={(e) => setState({ ...state, lotissement_nom: e.target.value })} placeholder="Ex : LOTISSEMENT LOGBAKRO BLE" />
          </div>
          <div>
            <Label>Arrêté d'approbation</Label>
            <Input value={state.arrete_approbation} onChange={(e) => setState({ ...state, arrete_approbation: e.target.value })} placeholder="Ex : N°16-0080/MCU/DGUF/DU/SDAF" />
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Pays</Label>
            <Input value={state.pays} onChange={(e) => setState({ ...state, pays: e.target.value })} placeholder="Ex : CÔTE D'IVOIRE" />
          </div>
          <div>
            <Label>Région</Label>
            <Input value={state.region} onChange={(e) => setState({ ...state, region: e.target.value })} placeholder="Ex : BELIER" />
          </div>
          <div>
            <Label>Sous-préfecture</Label>
            <Input value={state.sous_prefecture} onChange={(e) => setState({ ...state, sous_prefecture: e.target.value })} placeholder="Ex : TOUMODI" />
          </div>
          <div>
            <Label>Commune</Label>
            <Input value={state.commune} onChange={(e) => setState({ ...state, commune: e.target.value })} placeholder="Ex : YAMOUSSOUKRO" />
          </div>
          <div>
            <Label>Village (localité)</Label>
            <Input value={state.localite_nom} onChange={(e) => setState({ ...state, localite_nom: e.target.value })} placeholder="Ex : LOGBAKRO BLE" />
          </div>
          <div>
            <Label>Type d'opération</Label>
            <Input value={state.type_operation} onChange={(e) => setState({ ...state, type_operation: e.target.value })} placeholder="Ex : RÉGULARISATION DU PLAN DE LOTISSEMENT" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nom du ministère concerné</Label>
            <Input value={state.ministere_nom} onChange={(e) => setState({ ...state, ministere_nom: e.target.value })} placeholder="Ex : MINISTÈRE DE LA CONSTRUCTION, DU LOGEMENT, DE L’ASSAINISSEMENT ET DE L’URBANISME" />
            <p className="text-xs text-slate-500 mt-1">Si le village est vide, la page de garde utilisera automatiquement le champ « Village » du lotissement.</p>
          </div>
        </div>

        <div>
          <Label className="block mb-2">Image de fond (corps de page)</Label>
          <div className="flex items-start gap-4">
            {currentBg ? (
              <div className="relative w-40 h-28 border-2 border-slate-200 rounded-lg overflow-hidden">
                <img src={currentBg} alt="Fond" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <Button variant="destructive" size="icon" className="h-7 w-7" onClick={removeBackground} title="Supprimer l'image">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="w-40 h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                <ImageIcon className="w-7 h-7 mb-1" />
                <span className="text-xs">Aucune image</span>
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor="bg-image" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                <Upload className="w-4 h-4" />
                {currentBg ? "Remplacer l'image" : 'Uploader une image'}
              </Label>
              <Input id="bg-image" type="file" accept="image/*" className="hidden" onChange={(e) => uploadBackground(e.target.files?.[0])} />
              <p className="text-xs text-slate-500 mt-1">Image légère (PNG ou JPG) – plan cadastral/motif technique conseillé</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}