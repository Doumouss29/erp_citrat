import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { ACTION_LABELS, ACTION_BADGES } from '@/lib/caisseApi';

const dateTime = (v) => (v ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Historique complet d'un bon (lecture réservée à l'administration)
export default function OperationHistoryDialog({ operation, onOpenChange }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['caisse-journal-operation', operation?.id],
    queryFn: async () => {
      const list = await base44.entities.JournalCaisse.filter({ operation_id: operation.id }, 'created_date', 500);
      return list.sort((a, b) => new Date(a.date_action || a.created_date) - new Date(b.date_action || b.created_date));
    },
    enabled: !!operation?.id,
  });

  return (
    <Dialog open={!!operation} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historique du bon {operation?.numero_bon || ''}</DialogTitle>
          <DialogDescription>Toutes les actions enregistrées sur ce bon, de la plus ancienne à la plus récente.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Aucune action journalisée pour ce bon.
            {operation?.cree_par_email && <> Saisi par <strong>{operation.cree_par_email}</strong> le {dateTime(operation.created_date)} (avant la mise en place du journal).</>}
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {entries.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${ACTION_BADGES[e.action] || ''}`}>{ACTION_LABELS[e.action] || e.action}</span>
                  <strong className="text-slate-900">{e.user_nom || e.user_email}</strong>
                  <span className="text-slate-400">{e.user_nom ? `(${e.user_email})` : ''}</span>
                  <span className="ml-auto text-xs text-slate-500">{dateTime(e.date_action || e.created_date)}{e.reprise ? ' · reprise' : ''}</span>
                </div>
                {e.motif && <p className="mt-1 text-sm text-slate-700">Motif : <em>{e.motif}</em></p>}
                {e.action === 'modification' && Array.isArray(e.changements) && e.changements.length > 0 && (
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {e.changements.map((c, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="py-1 pr-2 font-semibold text-slate-600">{c.label || c.champ}</td>
                          <td className="py-1 pr-2 text-red-600 line-through">{c.avant || '—'}</td>
                          <td className="py-1 text-emerald-700">{c.apres || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
