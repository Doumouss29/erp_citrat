import React from 'react';
import { motion } from 'framer-motion';

const STATS = [
  { key: 'nouveau', label: 'Nouveaux', color: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  { key: 'en_attente', label: 'En attente', color: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
  { key: 'en_cours', label: 'En cours', color: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  { key: 'resolu', label: 'Résolus', color: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  { key: 'ferme', label: 'Fermés', color: 'bg-gray-400', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600' },
];

export default function SIStatsBar({ tickets, selected, onSelect }) {
  // onSelect fourni (mobile) : chaque tuile devient un filtre de la liste
  const counts = STATS.map(s => ({
    ...s,
    count: tickets.filter(t => t.status === s.key).length,
  }));

  const urgent = tickets.filter(t => t.priority === 'urgente' && t.status !== 'ferme' && t.status !== 'resolu').length;

  return (
    <div className="grid grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
      {counts.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-pressed={onSelect ? selected === s.key : undefined}
          onClick={onSelect ? () => onSelect(selected === s.key ? null : s.key) : undefined}
          className={`border rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 ${s.bg} ${onSelect ? 'cursor-pointer' : ''} ${selected === s.key ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}
        >
          <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-none ${s.color}`} />
            <span className={`text-xs font-semibold leading-tight ${s.text}`}>{s.label}</span>
          </div>
          <p className={`text-2xl font-heading font-bold ${s.text}`}>{s.count}</p>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-pressed={onSelect ? selected === 'urgent' : undefined}
        onClick={onSelect ? () => onSelect(selected === 'urgent' ? null : 'urgent') : undefined}
        className={`border rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 bg-red-50 border-red-200 ${onSelect ? 'cursor-pointer' : ''} ${selected === 'urgent' ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}
      >
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full flex-none bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold leading-tight text-red-700">Urgents</span>
        </div>
        <p className="text-2xl font-heading font-bold text-red-700">{urgent}</p>
      </motion.div>
    </div>
  );
}