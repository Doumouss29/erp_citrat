import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from 'lucide-react';
import { formatCurrency } from './caisseUtils';

const cards = [
  {
    key: 'soldeDepart',
    title: 'Solde de départ',
    icon: Landmark,
    cardClass: 'bg-white border border-blue-200 shadow-sm',
    iconClass: 'bg-blue-50 text-blue-600',
    labelClass: 'text-slate-500',
    valueClass: 'text-slate-900'
  },
  {
    key: 'totalEntrees',
    title: 'Total entrées',
    icon: ArrowDownLeft,
    cardClass: 'bg-white border border-emerald-200 shadow-sm',
    iconClass: 'bg-emerald-50 text-emerald-600',
    labelClass: 'text-slate-500',
    valueClass: 'text-slate-900'
  },
  {
    key: 'totalSorties',
    title: 'Total sorties',
    icon: ArrowUpRight,
    cardClass: 'bg-white border border-red-200 shadow-sm',
    iconClass: 'bg-red-50 text-red-600',
    labelClass: 'text-slate-500',
    valueClass: 'text-slate-900'
  },
  {
    key: 'solde',
    title: 'Solde actuel',
    icon: Wallet,
    cardClass: 'bg-gradient-to-br from-purple-600 to-purple-700 border border-purple-700 shadow-lg',
    iconClass: 'bg-white/20 text-white',
    labelClass: 'text-purple-100',
    valueClass: 'text-white'
  }
];

export default function CaisseOperationsKpis({ metrics }) {
  const values = {
    soldeDepart: formatCurrency(metrics.soldeDepart),
    solde: formatCurrency(metrics.solde),
    totalEntrees: formatCurrency(metrics.totalEntrees),
    totalSorties: formatCurrency(metrics.totalSorties)
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className={`rounded-2xl p-3.5 sm:rounded-[26px] sm:p-5 ${card.cardClass}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.14em] ${card.labelClass}`}>{card.title}</p>
                <p className={`mt-2 text-base leading-tight font-bold tabular-nums min-[400px]:text-lg sm:mt-3 sm:text-2xl lg:text-[1.7rem] lg:leading-none ${card.valueClass}`}>{values[card.key]}</p>
              </div>
              <div className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:flex ${card.iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}