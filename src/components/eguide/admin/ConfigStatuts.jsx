import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Palette, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_STATUTS = [
  { nom: 'Lot en vente', couleur: '#ef4444', fond: 'transparent' },
  { nom: 'Lot vendu', couleur: '#000000', fond: '#22c55e' },
  { nom: 'Lot réservé', couleur: '#000000', fond: '#eab308' },
  { nom: 'Lot non cessible', couleur: '#000000', fond: '#f97316' }
];

export default function ConfigStatuts() {
  const [statuts, setStatuts] = useState(DEFAULT_STATUTS);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const getTextColor = (bg) => {
    if (!bg || bg === 'transparent') return '#0f172a';
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return '#0f172a';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#0f172a' : '#ffffff';
  };

  // Charger la configuration existante
  const { data: configs = [] } = useQuery({
    queryKey: ['config-statuts'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'statuts_lots' })
  });

  useEffect(() => {
    if (configs.length > 0 && configs[0].valeur?.statuts) {
      setStatuts(configs[0].valeur.statuts);
    }
  }, [configs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const configData = {
        cle: 'statuts_lots',
        valeur: { statuts },
        description: 'Configuration des statuts et couleurs des lots'
      };

      if (configs.length > 0) {
        await base44.entities.ConfigurationApp.update(configs[0].id, configData);
      } else {
        await base44.entities.ConfigurationApp.create(configData);
      }

      queryClient.invalidateQueries({ queryKey: ['config-statuts'] });
      toast.success('Configuration enregistrée');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateStatut = (index, field, value) => {
    const updated = [...statuts];
    updated[index][field] = value;
    setStatuts(updated);
  };

  const addStatut = () => {
    setStatuts([...statuts, { nom: 'Nouveau statut', couleur: '#000000', fond: 'transparent' }]);
  };

  const removeStatut = (index) => {
    if (statuts.length <= 1) {
      toast.error('Il doit y avoir au moins un statut');
      return;
    }
    setStatuts(statuts.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Statuts des lots</CardTitle>
        <CardDescription>
          Gérer les statuts et leurs couleurs sur la carte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuts.map((statut, index) => (
          <div key={index} className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-8">
                <Label className="text-xs">Nom du statut</Label>
                <Input
                  value={statut.nom}
                  onChange={(e) => updateStatut(index, 'nom', e.target.value)}
                  placeholder="Ex: Lot en vente"
                />
              </div>
              <div className="md:col-span-3 md:justify-self-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStatut(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="md:col-span-4">
                <Label className="text-xs">Couleur du contour</Label>
                <div className="grid grid-cols-[3rem_1fr] gap-2">
                  <Input
                    type="color"
                    value={statut.couleur}
                    onChange={(e) => updateStatut(index, 'couleur', e.target.value)}
                    className="h-10 w-12 p-1 cursor-pointer rounded-md"
                  />
                  <Input
                    value={statut.couleur}
                    onChange={(e) => updateStatut(index, 'couleur', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <Label className="text-xs">Couleur de fond</Label>
                <div className="grid grid-cols-[3rem_1fr] gap-2">
                  <Input
                    type="color"
                    value={statut.fond === 'transparent' ? '#ffffff' : statut.fond}
                    onChange={(e) => updateStatut(index, 'fond', e.target.value)}
                    className="h-10 w-12 p-1 cursor-pointer rounded-md"
                  />
                  <Input
                    value={statut.fond}
                    onChange={(e) => updateStatut(index, 'fond', e.target.value)}
                    placeholder="transparent ou #ffffff"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <Label className="text-xs">Aperçu</Label>
                <div 
                  className="w-full md:w-32 h-10 rounded border-2 flex items-center justify-center font-medium"
                  style={{ 
                    borderColor: statut.couleur,
                    backgroundColor: statut.fond,
                    color: getTextColor(statut.fond)
                  }}
                >
                  <span className="hidden md:inline">{statut.nom}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 order-2 sm:order-1"
          >
            {saving ? (
              'Enregistrement...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Enregistrer les statuts
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={addStatut}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un statut
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}