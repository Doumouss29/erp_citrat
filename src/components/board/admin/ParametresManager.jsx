import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw, Eye } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ParametresManager({ parametres, onRefresh }) {
  const [format, setFormat] = useState('{CODE_ACTIVITE}-{BUREAU_CODE}-{ANNEE}{MOIS}-{SEQ}');
  const [longueurSeq, setLongueurSeq] = useState('4');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const formatParam = parametres?.find(p => p.cle === 'format_reference');
    const seqParam = parametres?.find(p => p.cle === 'longueur_seq');
    if (formatParam) setFormat(formatParam.valeur);
    if (seqParam) setLongueurSeq(seqParam.valeur);
  }, [parametres]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const formatParam = parametres?.find(p => p.cle === 'format_reference');
      const seqParam = parametres?.find(p => p.cle === 'longueur_seq');

      if (formatParam) {
        await base44.entities.Parametre.update(formatParam.id, { valeur: format });
      } else {
        await base44.entities.Parametre.create({ cle: 'format_reference', valeur: format });
      }

      if (seqParam) {
        await base44.entities.Parametre.update(seqParam.id, { valeur: longueurSeq });
      } else {
        await base44.entities.Parametre.create({ cle: 'longueur_seq', valeur: longueurSeq });
      }

      toast.success("Paramètres enregistrés");
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const now = new Date();
    const annee = now.getFullYear();
    const mois = String(now.getMonth() + 1).padStart(2, '0');
    const seq = '1'.padStart(parseInt(longueurSeq) || 4, '0');
    
    return format
      .replace('{CODE_ACTIVITE}', 'DT')
      .replace('{BUREAU_CODE}', 'ABJ')
      .replace('{ANNEE}', annee.toString())
      .replace('{MOIS}', mois)
      .replace('{SEQ}', seq);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Paramètres de numérotation</h3>
        <p className="text-sm text-slate-500">Configurez le format des références de dossiers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Format de référence
          </CardTitle>
          <CardDescription>
            Utilisez les variables entre accolades pour personnaliser le format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="{CODE_ACTIVITE}-{BUREAU_CODE}-{ANNEE}{MOIS}-{SEQ}"
              className="font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer" onClick={() => setFormat(format + '{CODE_ACTIVITE}')}>
              {'{CODE_ACTIVITE}'}
            </Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setFormat(format + '{BUREAU_CODE}')}>
              {'{BUREAU_CODE}'}
            </Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setFormat(format + '{ANNEE}')}>
              {'{ANNEE}'}
            </Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setFormat(format + '{MOIS}')}>
              {'{MOIS}'}
            </Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setFormat(format + '{SEQ}')}>
              {'{SEQ}'}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label>Longueur du numéro séquentiel</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={longueurSeq}
              onChange={(e) => setLongueurSeq(e.target.value)}
              className="w-24"
            />
            <p className="text-xs text-slate-500">Nombre de chiffres (ex: 4 → 0001, 0002...)</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Eye className="w-4 h-4" />
              Aperçu
            </div>
            <p className="font-mono text-lg font-medium text-slate-800">{generatePreview()}</p>
            <p className="text-xs text-slate-500 mt-1">
              Exemple avec: Activité=DT, Bureau=ABJ, Date=aujourd'hui, Séquence=1
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Note :</strong> Les modifications n'affectent que les nouveaux dossiers. 
            Les références existantes restent inchangées.
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les paramètres'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}