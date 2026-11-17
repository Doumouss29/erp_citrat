import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Type } from 'lucide-react';

const VARIABLE_OPTIONS = [
  { value: 'numero_lot', label: 'Numéro lot' },
  { value: 'numero_ilot', label: 'Numéro îlot' },
  { value: 'nom_complet_attributaire', label: 'Nom complet attributaire' },
  { value: 'numero_piece_identite', label: 'Numéro pièce' },
  { value: 'date_piece_identite', label: 'Date pièce' },
  { value: 'etablie_a', label: 'Établie à' },
  { value: 'profession', label: 'Profession' },
  { value: 'domicile', label: 'Domicile' },
  { value: 'telephone', label: 'Téléphone' },
  { value: 'TF', label: 'TF' },
];

const FONT_FAMILIES = [
  { value: 'helvetica', label: 'Helvetica' },
  { value: 'times', label: 'Times' },
  { value: 'courier', label: 'Courier' },
];

const FONT_STYLES = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Gras' },
  { value: 'italic', label: 'Italique' },
  { value: 'bolditalic', label: 'Gras italique' },
];

const TEXT_ALIGNS = [
  { value: 'left', label: 'Gauche' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Droite' },
];

export const DEFAULT_ATTESTATION_VARIABLES = [
  { key: 'v1', variable: 'numero_lot', label: 'Numéro lot', x: 61, y: 51.5, size: 13, fontFamily: 'helvetica', fontStyle: 'bold', align: 'left' },
  { key: 'v2', variable: 'numero_lot', label: 'Numéro lot', x: 98, y: 51.5, size: 13, fontFamily: 'helvetica', fontStyle: 'bold', align: 'left' },
  { key: 'v3', variable: 'numero_ilot', label: 'Numéro îlot', x: 152, y: 51.5, size: 13, fontFamily: 'helvetica', fontStyle: 'bold', align: 'left' },
  { key: 'v4', variable: 'nom_complet_attributaire', label: 'Nom complet attributaire', x: 115.5, y: 111, size: 14, fontFamily: 'helvetica', fontStyle: 'bold', align: 'center' },
  { key: 'v5', variable: 'numero_piece_identite', label: 'Numéro pièce', x: 58, y: 138, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v6', variable: 'date_piece_identite', label: 'Date pièce', x: 123, y: 137.8, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v7', variable: 'etablie_a', label: 'Établie à', x: 146, y: 138, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v8', variable: 'profession', label: 'Profession', x: 45, y: 147.5, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v9', variable: 'domicile', label: 'Domicile', x: 90, y: 147.5, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v10', variable: 'telephone', label: 'Téléphone', x: 144, y: 147.5, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v11', variable: 'numero_lot', label: 'Numéro lot', x: 59, y: 157.42, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v12', variable: 'numero_ilot', label: 'Numéro îlot', x: 105, y: 157.42, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
  { key: 'v13', variable: 'TF', label: 'TF', x: 55, y: 166.37, size: 12, fontFamily: 'helvetica', fontStyle: 'normal', align: 'left' },
];

const createVariable = () => ({
  key: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  variable: 'numero_lot',
  label: 'Numéro lot',
  x: 20,
  y: 20,
  size: 12,
  fontFamily: 'helvetica',
  fontStyle: 'normal',
  align: 'left',
});

export default function AttestationVariablesEditor({ value = [], onChange }) {
  const variables = Array.isArray(value) ? value : [];

  const updateVariable = (key, field, fieldValue) => {
    onChange(variables.map((item) => item.key === key ? { ...item, [field]: fieldValue } : item));
  };

  const addVariable = () => onChange([...(variables || []), createVariable()]);
  const removeVariable = (key) => onChange(variables.filter((item) => item.key !== key));
  const resetDefaults = () => onChange([...DEFAULT_ATTESTATION_VARIABLES.map((item) => ({ ...item }))]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-base font-semibold">Variables des attestations</Label>
          <p className="text-xs text-slate-500 mt-1">Ajoutez, supprimez et positionnez les variables sur la page A4.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>Réinitialiser</Button>
          <Button type="button" size="sm" onClick={addVariable}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {variables.map((item, index) => (
          <Card key={item.key} className="border-slate-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Type className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Variable {index + 1}</p>
                    <Badge variant="outline" className="mt-1">{item.variable}</Badge>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeVariable(item.key)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Variable</Label>
                  <Select
                    value={item.variable}
                    onValueChange={(val) => {
                      const option = VARIABLE_OPTIONS.find((opt) => opt.value === val);
                      onChange(variables.map((current) => current.key === item.key ? {
                        ...current,
                        variable: val,
                        label: option?.label || val,
                      } : current));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIABLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Libellé interne</Label>
                  <Input value={item.label || ''} onChange={(e) => updateVariable(item.key, 'label', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label>Position X</Label>
                  <Input type="number" step="0.1" value={item.x} onChange={(e) => updateVariable(item.key, 'x', parseFloat(e.target.value || 0))} />
                </div>
                <div>
                  <Label>Position Y</Label>
                  <Input type="number" step="0.1" value={item.y} onChange={(e) => updateVariable(item.key, 'y', parseFloat(e.target.value || 0))} />
                </div>
                <div>
                  <Label>Taille</Label>
                  <Input type="number" step="0.1" value={item.size} onChange={(e) => updateVariable(item.key, 'size', parseFloat(e.target.value || 0))} />
                </div>
                <div>
                  <Label>Alignement</Label>
                  <Select value={item.align || 'left'} onValueChange={(val) => updateVariable(item.key, 'align', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEXT_ALIGNS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Police</Label>
                  <Select value={item.fontFamily || 'helvetica'} onValueChange={(val) => updateVariable(item.key, 'fontFamily', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Style</Label>
                  <Select value={item.fontStyle || 'normal'} onValueChange={(val) => updateVariable(item.key, 'fontStyle', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_STYLES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}