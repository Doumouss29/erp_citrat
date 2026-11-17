import React from 'react';
import { Eye, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getTypeBadgeClass, TYPE_LABELS } from './caisseUtils';

import { canEditOperationCaisse } from '@/lib/userFonctions';

function canEditOperation(operation, user, isAdmin) {
  return !isAdmin && canEditOperationCaisse(operation, user);
}

export default function OperationsTable({ operations, user, isAdmin, onView, onEdit, onCreate, onPrint, onDelete, canCreate }) {
  if (operations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Aucune opération pour le moment</h3>
        <p className="mt-2 text-sm text-slate-500">Ajoutez votre première opération pour démarrer le suivi de caisse.</p>
        <div className="mt-6">
          <Button onClick={onCreate} disabled={!canCreate} className="rounded-2xl bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            Ajouter une opération
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
             <tr>
               <th className="px-6 py-4 font-semibold">Date</th>
               <th className="px-6 py-4 font-semibold">N° Bon</th>
               <th className="px-6 py-4 font-semibold">Type</th>
               <th className="px-6 py-4 font-semibold">Montant</th>
               <th className="px-6 py-4 font-semibold">Reçu</th>
               <th className="px-6 py-4 font-semibold">Reste</th>
               <th className="px-6 py-4 font-semibold">Justificatif</th>
               <th className="px-6 py-4 font-semibold">Actions</th>
             </tr>
           </thead>
          <tbody>
            {operations.map((operation) => (
              <tr key={operation.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                 <td className="px-6 py-4 font-medium text-slate-900">{formatDate(operation.date_operation)}</td>
                 <td className="px-6 py-4 font-semibold text-slate-900">{operation.numero_bon || '—'}</td>
                 <td className="px-6 py-4">
                   <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClass(operation.type_operation)}`}>
                     {TYPE_LABELS[operation.type_operation]}
                   </span>
                 </td>
                <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(operation.montant)}</td>
                <td className="px-6 py-4 text-slate-700">
                  {operation.montant_recu != null && operation.montant_recu !== operation.montant
                    ? formatCurrency(operation.montant_recu)
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  {operation.montant_reste > 0
                    ? <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">{formatCurrency(operation.montant_reste)}</span>
                    : <span className="text-slate-400 text-xs">—</span>}
                </td>
                <td className="px-6 py-4 text-slate-700">
                  {operation.justificatif_url ? 'Oui' : 'Non'}
                </td>
                <td className="px-6 py-4">
                  {operation.type_operation === 'solde_depart' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={() => onEdit(operation)}>
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-100" onClick={() => onDelete?.(operation)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={() => onPrint?.(operation)}>
                        <Printer className="h-4 w-4" />
                        Imprimer
                      </Button>
                      {canEditOperation(operation, user, isAdmin) && (
                        <>
                          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={() => onEdit(operation)}>
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}