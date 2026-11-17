import React from 'react';
import { formatCurrency } from './caisseUtils';

export default function CaisseReportsTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-sm text-slate-500">Synthèse</p>
        <h2 className="text-2xl font-bold text-slate-900">Tableau récapitulatif</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Période</th>
              <th className="px-6 py-4 font-semibold">Total entrées</th>
              <th className="px-6 py-4 font-semibold">Total sorties</th>
              <th className="px-6 py-4 font-semibold">Solde</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-500">Aucune donnée pour cette période.</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.period} className="border-t border-slate-100">
                <td className="px-6 py-4 font-medium text-slate-900">{row.period}</td>
                <td className="px-6 py-4 text-emerald-700">{formatCurrency(row.totalEntrees)}</td>
                <td className="px-6 py-4 text-red-700">{formatCurrency(row.totalSorties)}</td>
                <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(row.solde)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}