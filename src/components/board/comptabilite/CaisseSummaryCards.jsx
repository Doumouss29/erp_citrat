import React from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { formatCurrency } from './caisseUtils';

const cards = [
  {
    key: 'solde',
    title: 'Solde actuel',
    icon: Wallet,
    iconClass: 'bg-slate-100 text-slate-700',
    borderClass: 'border-slate-300'
  },
  {
    key: 'totalEntrees',
    title: 'Total entrées',
    icon: ArrowDownLeft,
    iconClass: 'bg-blue-50 text-blue-600',
    borderClass: 'border-blue-400'
  },
  {
    key: 'totalSorties',
    title: 'Total sorties',
    icon: ArrowUpRight,
    iconClass: 'bg-violet-50 text-violet-600',
    borderClass: 'border-violet-400'
  },
  {
    key: 'alertes',
    title: 'Alertes',
    icon: AlertTriangle,
    iconClass: 'bg-amber-50 text-amber-600',
    borderClass: 'border-amber-400'
  }
];

export default function CaisseSummaryCards({ metrics }) {
  const values = {
    solde: formatCurrency(metrics.solde),
    totalEntrees: formatCurrency(metrics.totalEntrees),
    totalSorties: formatCurrency(metrics.totalSorties),
    alertes: `${metrics.enAttente} en attente • ${metrics.rejetees} rejetée(s)`
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className={`rounded-3xl border-l-4 ${card.borderClass} bg-white p-6 shadow-sm`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="mt-3 text-2xl font-bold text-slate-900">{values[card.key]}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconClass}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}