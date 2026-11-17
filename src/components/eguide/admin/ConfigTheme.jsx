import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_THEME = {
  primaryColor: '#a3009d',
  primaryTextColor: '#a3009d',
  navbarBgColor: '#ffffff',
  appNameColor: '#0f172a',
  appSubtitleColor: '#64748b',
  navLinkColor: '#475569',
  navLinkHoverBgColor: '#f1f5f9',
  importButtonBgColor: '#1e293b',
  importButtonTextColor: '#ffffff',
  fontSize: 'base',
  appName: 'Geolys'
};

export default function ConfigTheme() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState(DEFAULT_THEME);

  const { data: configs = [] } = useQuery({
    queryKey: ['config-theme'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'theme' })
  });

  useEffect(() => {
    if (configs.length > 0 && configs[0].valeur) {
      setTheme({ ...DEFAULT_THEME, ...configs[0].valeur });
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (newTheme) => {
      if (configs.length > 0) {
        return base44.entities.ConfigurationApp.update(configs[0].id, {
          valeur: newTheme
        });
      } else {
        return base44.entities.ConfigurationApp.create({
          cle: 'theme',
          valeur: newTheme,
          description: 'Configuration du thème de l\'application'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-theme'] });
      toast.success('Thème enregistré avec succès');
      window.location.reload();
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(theme);
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Thème de l'application
        </CardTitle>
        <CardDescription>
          Personnalisez les couleurs et le style de l'application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="appName">Nom de l'application</Label>
            <Input
              id="appName"
              value={theme.appName}
              onChange={(e) => setTheme({ ...theme, appName: e.target.value })}
              placeholder="Nom de l'application"
            />
          </div>

          <div>
            <Label htmlFor="fontSize">Taille de police</Label>
            <FormSelect
              id="fontSize"
              value={theme.fontSize}
              onChange={(e) => setTheme({ ...theme, fontSize: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="sm">Petite</option>
              <option value="base">Normale</option>
              <option value="lg">Grande</option>
            </FormSelect>
          </div>

          <div>
            <Label htmlFor="primaryColor">Couleur principale</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                placeholder="#1e293b"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur des boutons, éléments de navigation, etc.
            </p>
          </div>

          <div>
            <Label htmlFor="primaryTextColor">Couleur du texte principal</Label>
            <div className="flex gap-2">
              <Input
                id="primaryTextColor"
                type="color"
                value={theme.primaryTextColor}
                onChange={(e) => setTheme({ ...theme, primaryTextColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.primaryTextColor}
                onChange={(e) => setTheme({ ...theme, primaryTextColor: e.target.value })}
                placeholder="#a3009d"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur du texte sur les éléments principaux
            </p>
          </div>

          <div>
            <Label htmlFor="navbarBgColor">Couleur de fond du navbar</Label>
            <div className="flex gap-2">
              <Input
                id="navbarBgColor"
                type="color"
                value={theme.navbarBgColor}
                onChange={(e) => setTheme({ ...theme, navbarBgColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.navbarBgColor}
                onChange={(e) => setTheme({ ...theme, navbarBgColor: e.target.value })}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur de fond de la barre de navigation
            </p>
          </div>

          <div>
            <Label htmlFor="appNameColor">Couleur du nom de l'app</Label>
            <div className="flex gap-2">
              <Input
                id="appNameColor"
                type="color"
                value={theme.appNameColor}
                onChange={(e) => setTheme({ ...theme, appNameColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.appNameColor}
                onChange={(e) => setTheme({ ...theme, appNameColor: e.target.value })}
                placeholder="#0f172a"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur du texte "Geolys"
            </p>
          </div>

          <div>
            <Label htmlFor="appSubtitleColor">Couleur du sous-titre</Label>
            <div className="flex gap-2">
              <Input
                id="appSubtitleColor"
                type="color"
                value={theme.appSubtitleColor}
                onChange={(e) => setTheme({ ...theme, appSubtitleColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.appSubtitleColor}
                onChange={(e) => setTheme({ ...theme, appSubtitleColor: e.target.value })}
                placeholder="#64748b"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur du texte "Lotissement"
            </p>
          </div>

          <div>
            <Label htmlFor="navLinkColor">Couleur des boutons non sélectionnés</Label>
            <div className="flex gap-2">
              <Input
                id="navLinkColor"
                type="color"
                value={theme.navLinkColor}
                onChange={(e) => setTheme({ ...theme, navLinkColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.navLinkColor}
                onChange={(e) => setTheme({ ...theme, navLinkColor: e.target.value })}
                placeholder="#475569"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur du texte des boutons de navigation avant sélection
            </p>
          </div>

          <div>
            <Label htmlFor="navLinkHoverBgColor">Couleur de survol des boutons</Label>
            <div className="flex gap-2">
              <Input
                id="navLinkHoverBgColor"
                type="color"
                value={theme.navLinkHoverBgColor}
                onChange={(e) => setTheme({ ...theme, navLinkHoverBgColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.navLinkHoverBgColor}
                onChange={(e) => setTheme({ ...theme, navLinkHoverBgColor: e.target.value })}
                placeholder="#f1f5f9"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur de fond au survol des boutons non sélectionnés
            </p>
          </div>

          <div>
            <Label htmlFor="importButtonBgColor">Couleur du bouton Importer (fond)</Label>
            <div className="flex gap-2">
              <Input
                id="importButtonBgColor"
                type="color"
                value={theme.importButtonBgColor}
                onChange={(e) => setTheme({ ...theme, importButtonBgColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.importButtonBgColor}
                onChange={(e) => setTheme({ ...theme, importButtonBgColor: e.target.value })}
                placeholder="#1e293b"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur de fond du bouton "Importer un lotissement"
            </p>
          </div>

          <div>
            <Label htmlFor="importButtonTextColor">Couleur du bouton Importer (texte)</Label>
            <div className="flex gap-2">
              <Input
                id="importButtonTextColor"
                type="color"
                value={theme.importButtonTextColor}
                onChange={(e) => setTheme({ ...theme, importButtonTextColor: e.target.value })}
                className="w-20 h-9 cursor-pointer"
              />
              <Input
                value={theme.importButtonTextColor}
                onChange={(e) => setTheme({ ...theme, importButtonTextColor: e.target.value })}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Couleur du texte du bouton "Importer un lotissement"
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 w-full md:w-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </Button>

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.primaryTextColor
              }}
              className="gap-2 w-full md:w-auto"
            >
              <Palette className="w-4 h-4" />
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer le thème'}
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-slate-50">
          <h4 className="text-sm font-semibold mb-3">Aperçu</h4>
          <div className="space-y-3">
            <button
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.primaryTextColor,
                fontSize: theme.fontSize === 'sm' ? '0.875rem' : theme.fontSize === 'lg' ? '1.125rem' : '1rem'
              }}
              className="px-4 py-2 rounded-lg font-medium"
            >
              Bouton exemple
            </button>
            <p
              className="text-slate-600"
              style={{
                fontSize: theme.fontSize === 'sm' ? '0.875rem' : theme.fontSize === 'lg' ? '1.125rem' : '1rem'
              }}
            >
              Texte d'exemple avec la taille de police sélectionnée
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}