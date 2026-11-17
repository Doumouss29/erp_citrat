import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { generateBonNumero } from './bonNumero';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function montantEnLettres(montant) {
  const n = Math.round(Number(montant));
  if (!n || isNaN(n)) return '';
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  function convertirCentaine(n) {
    if (n === 0) return '';
    if (n < 20) return unites[n];
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 7) return u === 1 ? 'soixante et onze' : u === 0 ? 'soixante-dix' : `soixante-${unites[10 + u]}`;
    if (d === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${unites[u]}`;
    if (d === 9) return `quatre-vingt-${unites[10 + u]}`;
    return dizaines[d] + (u === 1 && d !== 8 ? ' et ' : u !== 0 ? '-' : '') + unites[u];
  }

  function convertirTranche(n) {
    if (n === 0) return '';
    const c = Math.floor(n / 100);
    const r = n % 100;
    const centaines = c === 0 ? '' : c === 1 ? 'cent' : `${unites[c]} cents`;
    const reste = convertirCentaine(r);
    if (c > 1 && r === 0) return centaines;
    return [centaines, reste].filter(Boolean).join(' ');
  }

  if (n >= 1000000000) return 'nombre trop grand';
  const millions = Math.floor(n / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const centaines = n % 1000;

  const parts = [];
  if (millions > 0) parts.push(millions === 1 ? 'un million' : `${convertirTranche(millions)} millions`);
  if (milliers > 0) parts.push(milliers === 1 ? 'mille' : `${convertirTranche(milliers)} mille`);
  if (centaines > 0) parts.push(convertirTranche(centaines));

  const resultat = parts.join(' ');
  return (resultat.charAt(0).toUpperCase() + resultat.slice(1) + ' francs CFA').toUpperCase();
}

function getOperationBonNumero(operation, initialType, existingOperations, bureau) {
  if (operation?.numero_bon) return operation.numero_bon;
  if (!bureau) return '';
  return generateBonNumero(existingOperations, operation?.type_operation || initialType, operation?.date_operation || getToday(), bureau.code);
}

export default function SimpleOperationForm({ open, onOpenChange, operation, initialType = 'entree', bureaux, defaultBureau, isAdmin, isSubmitting, onSubmit, operations = [] }) {
  const [values, setValues] = useState({
    type_operation: 'entree',
    date_operation: getToday(),
    beneficiaire: '',
    description: '',
    montant: '',
    montant_recu: '',
    montant_reste: 0,
    observation: '',
    mode_reglement: 'espece',
    bureau_id: '',
    numero_bon: '',
    montant_lettres: ''
  });

  useEffect(() => {
    if (!open) return;
    const selectedBureau = bureaux?.find(b => b.id === (operation?.bureau_id || defaultBureau?.id));
    const bonNumber = getOperationBonNumero(operation, initialType, operations, selectedBureau);
    
    const montant = operation?.montant || '';
    const montantRecu = operation?.montant_recu ?? '';
    const montantReste = montant && montantRecu !== '' ? Math.max(0, Number(montant) - Number(montantRecu)) : 0;
    setValues({
      type_operation: operation?.type_operation || initialType,
      date_operation: operation?.date_operation || getToday(),
      beneficiaire: operation?.beneficiaire || '',
      description: operation?.description || '',
      montant: montant,
      montant_recu: montantRecu,
      montant_reste: operation?.montant_reste ?? montantReste,
      observation: operation?.observation || '',
      mode_reglement: operation?.mode_reglement || 'espece',
      bureau_id: operation?.bureau_id || defaultBureau?.id || '',
      numero_bon: bonNumber,
      montant_lettres: operation?.montant_lettres || montantEnLettres(montant)
    });
  }, [operation, defaultBureau, open, initialType, operations, bureaux]);

  useEffect(() => {
    // Régénérer le numéro UNIQUEMENT si c'est une création (pas d'operation)
    // ET quand date/type/bureau changent
    if (operation || !values.bureau_id) return;
    
    const selectedBureau = bureaux?.find(b => b.id === values.bureau_id);
    if (selectedBureau) {
      const newBon = generateBonNumero(operations, values.type_operation, values.date_operation, selectedBureau.code);
      setValues(prev => ({ ...prev, numero_bon: newBon }));
    }
  }, [values.type_operation, values.date_operation, values.bureau_id, operations, operation, bureaux]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const montant = Number(values.montant || 0);
    const montantRecu = values.montant_recu !== '' ? Number(values.montant_recu) : montant;
    const montantReste = Math.max(0, montant - montantRecu);
    onSubmit({
      values: {
        ...values,
        montant,
        montant_recu: montantRecu,
        montant_reste: montantReste
      },
      file: null,
      currentOperation: operation || null
    });
  };

  const isEntree = values.type_operation === 'entree';
  const headerColor = isEntree ? 'bg-blue-600' : 'bg-red-600';
  const headerTitle = operation ? 'Modifier l\'opération' : `Nouvelle ${isEntree ? 'entrée' : 'sortie'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Dynamic Header */}
        <div className={`${headerColor} text-white px-6 py-4`}>
          <h2 className="text-lg font-semibold">{headerTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">N° Bon</label>
              <Input type="text" value={values.numero_bon} readOnly className="bg-slate-50 text-slate-700 font-semibold" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Date</label>
              <Input type="date" value={values.date_operation} onChange={(e) => setValues({ ...values, date_operation: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mode de paiement</label>
              <Select value={values.mode_reglement} onValueChange={(value) => setValues({ ...values, mode_reglement: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Mode de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="espece">Espèce</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="mobile_pay">Mobile Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Montant</label>
              <Input 
                type="text" 
                inputMode="numeric" 
                value={values.montant ? values.montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''} 
                onChange={(e) => { const raw = e.target.value.replace(/\./g, ''); setValues({ ...values, montant: raw, montant_lettres: montantEnLettres(raw) }); }} 
                placeholder="Montant (XOF)" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Montant en lettres</label>
            <Input type="text" value={values.montant_lettres ? values.montant_lettres.toUpperCase() : ''} readOnly className="bg-slate-50 text-slate-600 text-xs italic" placeholder="Automatique..." />
          </div>

          {values.type_operation !== 'solde_depart' && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Montant reçu</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={values.montant_recu !== '' ? values.montant_recu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '');
                    const montantRecu = raw === '' ? '' : Number(raw);
                    const montantReste = raw === '' ? 0 : Math.max(0, Number(values.montant || 0) - Number(raw));
                    setValues({ ...values, montant_recu: montantRecu, montant_reste: montantReste });
                  }}
                  placeholder={`= ${values.montant ? values.montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '0'} si paiement complet`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Reste à payer</label>
                <div className={`flex h-9 items-center rounded-md border px-3 text-sm font-bold ${Number(values.montant_reste) > 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-700'}`}>
                  {Number(values.montant_reste) > 0
                    ? `${Number(values.montant_reste).toLocaleString('fr-FR')} XOF`
                    : 'Soldé'}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Bénéficiaire / Personne</label>
            <Input value={values.beneficiaire} onChange={(e) => setValues({ ...values, beneficiaire: e.target.value })} placeholder="Bénéficiaire / Personne" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <Textarea value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} placeholder="Description" required />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={isSubmitting || !values.bureau_id}>
              {isSubmitting ? 'Enregistrement...' : operation ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}