import React from 'react';
import { formatCurrency, formatDate } from './caisseUtils';

// carryOver : solde reporté de la période précédente, affiché en première ligne
export function buildLedgerRows(operations = [], { carryOver = 0, startDate = null } = {}) {
  let soldeProgressif = Number(carryOver) || 0;
  const reportRow = startDate ? [{
    id: 'report-solde-anterieur',
    date_operation: startDate,
    description: 'REPORT DU SOLDE ANTÉRIEUR',
    type_operation: 'solde_depart',
    soldeDepart: soldeProgressif,
    entree: 0,
    sortie: 0,
    montantReste: 0,
    soldeProgressif,
    clientLabel: '—'
  }] : [];

  return reportRow.concat([...operations]
    .sort((a, b) => new Date(a.date_operation) - new Date(b.date_operation))
    .map((operation) => {
      const montant = Number(operation.montant) || 0;
      const montantRecu = operation.montant_recu != null ? Number(operation.montant_recu) : montant;
      const montantReste = Number(operation.montant_reste) || 0;
      const soldeDepart = operation.type_operation === 'solde_depart' ? montant : 0;
      const entree = operation.type_operation === 'entree' ? montantRecu : 0;
      const sortie = operation.type_operation === 'sortie' ? montantRecu : 0;
      soldeProgressif += soldeDepart + entree - sortie;

      return {
        ...operation,
        soldeDepart,
        entree,
        sortie,
        montantReste,
        soldeProgressif,
        clientLabel: operation.beneficiaire || '—'
      };
    }));
}

export default function CaisseLedgerReport({ bureauLabel, periodLabel, rows, metrics }) {
  const totalRestesEntrees = rows.filter(r => r.type_operation === 'entree').reduce((s, r) => s + (r.montantReste || 0), 0);
  const totalRestesSorties = rows.filter(r => r.type_operation === 'sortie').reduce((s, r) => s + (r.montantReste || 0), 0);
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm sm:rounded-3xl">
      <div className="grid gap-4 border-b border-slate-200 p-4 sm:gap-6 sm:p-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="text-xl font-black uppercase text-slate-900 sm:text-2xl">{bureauLabel}</h2>
          <p className="mt-2 text-sm text-slate-500">{periodLabel}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-slate-700">
          <div className="bg-slate-800 px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-white">
            Récapitulatif
          </div>
          <div className="grid grid-cols-[1fr_auto] text-sm">
            <div className="border-b border-slate-300 bg-sky-50 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-slate-700">Solde de départ</div>
            <div className="border-b border-l border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-right font-bold text-sky-700">{formatCurrency(metrics.soldeDepart)}</div>
            <div className="border-b border-slate-300 bg-blue-50 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-slate-700">Entrée de la période</div>
            <div className="border-b border-l border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-right font-bold text-emerald-700">{formatCurrency(metrics.totalEntrees)}</div>
            <div className="border-b border-slate-300 bg-orange-50 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-slate-700">Sortie de la période</div>
            <div className="border-b border-l border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-right font-bold text-red-700">{formatCurrency(metrics.totalSorties)}</div>
            <div className="bg-amber-100 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-slate-900">Solde de fin de période</div>
            <div className="border-l border-slate-300 bg-slate-900 px-3 py-2.5 lg:px-4 lg:py-3 text-right font-bold text-white">{formatCurrency(metrics.solde)}</div>
            {totalRestesEntrees > 0 && (
              <>
                <div className="border-t border-slate-300 bg-emerald-50 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-emerald-800">Restes à encaisser (entrées)</div>
                <div className="border-l border-t border-slate-300 bg-emerald-50 px-3 py-2.5 lg:px-4 lg:py-3 text-right font-bold text-emerald-700">{formatCurrency(totalRestesEntrees)}</div>
              </>
            )}
            {totalRestesSorties > 0 && (
              <>
                <div className="border-t border-slate-300 bg-red-50 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-red-800">Restes à payer (sorties)</div>
                <div className="border-l border-t border-slate-300 bg-red-50 px-3 py-2.5 lg:px-4 lg:py-3 text-right font-bold text-red-700">{formatCurrency(totalRestesSorties)}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile : une carte par ligne du journal */}
      <div className="divide-y divide-slate-200 md:hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Aucune opération sur cette période.</p>
        ) : rows.map((row) => {
          const isReport = row.id === 'report-solde-anterieur' || row.type_operation === 'solde_depart';
          const amount = row.entree || row.sortie || row.soldeDepart;
          const amountCls = row.entree ? 'text-emerald-700' : row.sortie ? 'text-red-700' : 'text-sky-700';
          const sign = row.entree ? '+' : row.sortie ? '−' : '';
          return (
            <div key={row.id} className={`px-3 py-2.5 lg:px-4 lg:py-3 ${isReport ? 'bg-sky-50/60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {formatDate(row.date_operation)}{row.numero_bon ? <> · <span className="font-mono normal-case">{row.numero_bon}</span></> : null}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{row.description || '—'}</p>
                  {row.clientLabel && row.clientLabel !== '—' && <p className="mt-0.5 truncate text-xs text-slate-500">{row.clientLabel}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold tabular-nums ${amountCls}`}>{sign}{formatCurrency(amount)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Solde <span className="font-semibold text-slate-800">{formatCurrency(row.soldeProgressif)}</span></p>
                  {row.montantReste > 0 && <p className="mt-0.5 text-[11px] font-semibold text-red-700">Reste {formatCurrency(row.montantReste)}</p>}
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between bg-sky-100 px-3 py-2.5 lg:px-4 lg:py-3 text-sm">
          <span className="font-bold uppercase text-slate-900">Solde de fin de période</span>
          <span className="font-black text-slate-900">{formatCurrency(metrics.solde)}</span>
        </div>
      </div>

      {/* Tablette et ordinateur : tableau */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-[#f6dfcf] text-slate-800">
            <tr>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Date</th>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Libellé</th>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Solde départ</th>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Entrée</th>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Sortie</th>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Solde progressif</th>
              <th className="border-b border-r border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase text-red-700">Reste à payer</th>
              <th className="border-b border-slate-300 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold uppercase">Client / Bénéficiaire</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-10 text-center text-slate-500">Aucune opération sur cette période.</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="odd:bg-white even:bg-slate-50/60">
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 whitespace-nowrap">{formatDate(row.date_operation)}</td>
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 min-w-[200px] lg:min-w-[320px] text-slate-700">{row.description || '—'}</td>
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-sky-700 text-center">{row.soldeDepart ? formatCurrency(row.soldeDepart) : '—'}</td>
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-emerald-700 text-center">{row.entree ? formatCurrency(row.entree) : '—'}</td>
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 font-semibold text-red-700 text-center">{row.sortie ? formatCurrency(row.sortie) : '—'}</td>
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-bold text-slate-900">{formatCurrency(row.soldeProgressif)}</td>
                <td className="border-b border-r border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 text-center font-semibold">
                  {row.montantReste > 0
                    ? <span className="text-red-700">{formatCurrency(row.montantReste)}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="border-b border-slate-200 px-3 py-2.5 lg:px-4 lg:py-3 whitespace-nowrap text-slate-700">{row.clientLabel}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sky-100">
              <td colSpan="2" className="border-r border-slate-300 px-4 py-4 text-center font-bold uppercase text-slate-900">Totaux de la période</td>
              <td className="border-r border-slate-300 px-4 py-4 text-center font-bold text-sky-700">{formatCurrency(metrics.soldeDepart)}</td>
              <td className="border-r border-slate-300 px-4 py-4 text-center font-bold text-emerald-700">{formatCurrency(metrics.totalEntrees)}</td>
              <td className="border-r border-slate-300 px-4 py-4 text-center font-bold text-red-700">{formatCurrency(metrics.totalSorties)}</td>
              <td className="border-r border-slate-300 px-4 py-4 text-center font-black text-slate-900">{formatCurrency(metrics.solde)}</td>
              <td className="border-r border-slate-300 px-4 py-4 text-center">
                {(totalRestesEntrees > 0 || totalRestesSorties > 0) ? (
                  <div className="flex flex-col gap-1.5 items-center">
                    {totalRestesEntrees > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                        <span className="text-emerald-600">↑</span> {formatCurrency(totalRestesEntrees)}
                      </span>
                    )}
                    {totalRestesSorties > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-300">
                        <span className="text-red-600">↓</span> {formatCurrency(totalRestesSorties)}
                      </span>
                    )}
                  </div>
                ) : <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}