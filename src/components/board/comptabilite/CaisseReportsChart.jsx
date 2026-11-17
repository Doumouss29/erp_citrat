import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactCurrency, formatCurrency } from './caisseUtils';

export default function CaisseReportsChart({ data }) {
  const hasData = data.some((item) => item.entrees > 0 || item.sorties > 0);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm text-slate-500">Graphique</p>
        <h2 className="text-2xl font-bold text-slate-900">Évolution des entrées et sorties</h2>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-slate-500">
          Aucun mouvement à afficher sur cette période.
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={formatCompactCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="entrees" name="Entrées" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sorties" name="Sorties" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}