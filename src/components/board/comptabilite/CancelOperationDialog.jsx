import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from './caisseUtils';

// Annulation d'un bon : le bon reste visible (barré) et l'action est inscrite au journal avec son motif.
export default function CancelOperationDialog({ operation, onOpenChange, onConfirm, isSubmitting }) {
  const [motif, setMotif] = useState('');
  useEffect(() => { if (operation) setMotif(''); }, [operation]);
  const valid = motif.trim().length >= 3;

  return (
    <Dialog open={!!operation} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Annuler le bon {operation?.numero_bon || ''}</DialogTitle>
          <DialogDescription>
            Le bon ne sera pas effacé : il restera visible avec la mention « Annulé » et ne comptera plus dans les soldes.
            Cette action est enregistrée dans le journal.
          </DialogDescription>
        </DialogHeader>
        {operation && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <div><strong>{operation.beneficiaire || '—'}</strong> · {formatCurrency(operation.montant)}</div>
            <div className="text-slate-500">{operation.description}</div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Motif de l'annulation *</label>
          <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : erreur de montant, doublon de saisie…" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Retour</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!valid || isSubmitting} onClick={() => onConfirm(motif.trim())}>
            {isSubmitting ? 'Annulation…' : 'Annuler le bon'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
