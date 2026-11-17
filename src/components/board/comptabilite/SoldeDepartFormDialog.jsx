import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatAmountWithDots(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function SoldeDepartFormDialog({ open, onOpenChange, bureaux, defaultBureau, isAdmin, isSubmitting, onSubmit, solde }) {
   const [values, setValues] = useState({
     date_operation: getToday(),
     bureau_id: '',
     montant: '',
     description: 'SOLDE DE DÉPART',
     observation: ''
   });

   useEffect(() => {
     if (!open) return;
     if (solde) {
       setValues({
         date_operation: solde.date_operation || getToday(),
         bureau_id: solde.bureau_id || defaultBureau?.id || '',
         montant: solde.montant || '',
         description: 'SOLDE DE DÉPART',
         observation: solde.observation || ''
       });
     } else {
       setValues({
         date_operation: getToday(),
         bureau_id: defaultBureau?.id || '',
         montant: '',
         description: 'SOLDE DE DÉPART',
         observation: ''
       });
     }
   }, [open, defaultBureau, solde]);

   const selectedBureau = bureaux.find((bureau) => bureau.id === values.bureau_id) || defaultBureau;

   const handleSubmit = (event) => {
     event.preventDefault();
     onSubmit({
       values: {
         ...values,
         type_operation: 'solde_depart',
         montant: Number(String(values.montant || 0).replace(/\./g, '')),
         bureau_code: selectedBureau?.code || ''
       },
       file: null,
       currentOperation: solde || null
     });
   };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Dynamic Header */}
          <div className="bg-purple-600 text-white px-6 py-4">
            <h2 className="text-lg font-semibold">{solde ? 'Modifier le solde de départ' : 'Solde de départ'}</h2>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="date" 
              value={values.date_operation} 
              onChange={(event) => setValues((current) => ({ ...current, date_operation: event.target.value }))} 
              required 
            />

            {isAdmin ? (
              <Select value={values.bureau_id} onValueChange={(value) => setValues((current) => ({ ...current, bureau_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Bureau" />
                </SelectTrigger>
                <SelectContent>
                  {bureaux.map((bureau) => (
                    <SelectItem key={bureau.id} value={bureau.id}>{bureau.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input type="text" value={selectedBureau?.nom || ''} readOnly />
            )}
          </div>

          <Input 
            type="text"
            inputMode="numeric"
            value={formatAmountWithDots(values.montant)}
            onChange={(event) => setValues((current) => ({ ...current, montant: event.target.value.replace(/\D/g, '') }))}
            placeholder="Montant (XOF)"
            required 
          />

          <Input
            type="text"
            value={values.description}
            readOnly
            className="bg-slate-50 text-slate-700 font-semibold"
          />

          <Textarea
            value={values.observation}
            onChange={(event) => setValues((current) => ({ ...current, observation: event.target.value }))}
            placeholder="Observation (optionnel)"
          />

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={isSubmitting || !values.bureau_id}>
              {isSubmitting ? 'Enregistrement...' : solde ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}