import React from 'react';
import { Eye, Pencil, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getTypeBadgeClass, TYPE_LABELS } from './caisseUtils';

import { canEditOperationCaisse } from '@/lib/userFonctions';

function canEditOperation(operation, user, isAdmin) {
  return isAdmin || canEditOperationCaisse(operation, user);
}

export default function BonsCaisseTable({ operations, user, isAdmin, onView, onEdit, onPrint }) {
  if (operations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Aucun bon de caisse</h3>
        <p className="mt-2 text-sm text-slate-500">Les bons d’entrée et de sortie apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">N° bon</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Bureau</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Bénéficiaire</th>
              <th className="px-6 py-4 font-semibold">Montant</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((operation) => (
              <tr key={operation.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                <td className="px-6 py-4 font-semibold text-slate-900">{operation.bon_numero || '—'}</td>
                <td className="px-6 py-4 text-slate-700">{formatDate(operation.date_operation)}</td>
                <td className="px-6 py-4 text-slate-700">{operation.bureau_code || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClass(operation.type_operation)}`}>
                    {operation.type_operation === 'entree' ? 'Bon d’entrée' : 'Bon de sortie'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-700">{operation.beneficiaire || '—'}</td>
                <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(operation.montant)}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onView(operation)}>
                      <Eye className="h-4 w-4" />
                      Voir
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onPrint(operation)}>
                      <Printer className="h-4 w-4" />
                      Imprimer
                    </Button>
                    {canEditOperation(operation, user, isAdmin) && (
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onEdit(operation)}>
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}