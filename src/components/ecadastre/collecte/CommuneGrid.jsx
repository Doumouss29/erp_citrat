import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Check } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('fr-FR');

function Stat({ label, value, active, tone }) {
  const tones = {
    base: active ? 'bg-white/15 text-white' : 'bg-white text-slate-900 border border-slate-200',
    green: active ? 'bg-white/15 text-white' : 'bg-green-50 text-green-700 border border-green-100',
    amber: active ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100',
  };
  return (
    <div className={`rounded-xl px-2 py-2.5 text-center ${tones[tone]}`}>
      <p className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className={`text-[10px] sm:text-xs mt-1.5 font-semibold uppercase tracking-wide ${active ? 'text-blue-100' : 'text-slate-500'}`}>{label}</p>
    </div>
  );
}

export default function CommuneGrid({ communes, value, onChange, orgId, disabled = false }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['commune-grid-stats', orgId],
    queryFn: async () => {
      const r = await base44.entities.Collecte.aggregate({
        query: { organisation_id: orgId },
        groupBy: ['commune', 'statut'],
        limit: 1000,
      });
      return r.rows || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  const statsOf = (commune) => {
    const s = { total: 0, validee: 0, brouillon: 0 };
    rows.forEach((r) => {
      if (String(r.commune || '').trim().toUpperCase() !== String(commune).trim().toUpperCase()) return;
      s.total += r.count;
      if (r.statut === 'validee') s.validee += r.count;
      if (r.statut === 'brouillon') s.brouillon += r.count;
    });
    return s;
  };

  if (value) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-blue-800" />
        </span>
        <span className="font-extrabold uppercase tracking-wide text-lg text-slate-800 flex-1 truncate">{value}</span>
        <button
          type="button"
          onClick={() => onChange('')}
          className="h-11 px-4 rounded-xl border-2 border-blue-800 text-blue-800 font-semibold text-sm hover:bg-blue-50 touch-manipulation"
        >
          Changer de commune
        </button>
      </div>
    );
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 block mb-3">
        Choisir une commune <span className="text-red-500">*</span>
      </label>
      {communes.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Aucune commune disponible.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {communes.map((c) => {
            const active = c === value;
            const s = statsOf(c);
            const v = (n) => (isLoading ? '…' : fmt(n));
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange(active ? '' : c)}
                aria-pressed={active}
                className={`text-left rounded-2xl border-2 p-3 sm:p-4 touch-manipulation transition-all ${
                  active
                    ? 'bg-gradient-to-br from-blue-700 to-blue-900 border-blue-900 text-white shadow-lg'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-blue-100'}`}>
                    {active ? <Check className="w-5 h-5" /> : <MapPin className="w-5 h-5 text-blue-800" />}
                  </span>
                  <span className="font-extrabold uppercase tracking-wide text-base sm:text-lg truncate flex-1">{c}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Fiches" value={v(s.total)} active={active} tone="base" />
                  <Stat label="Validées" value={v(s.validee)} active={active} tone="green" />
                  <Stat label="Brouillons" value={v(s.brouillon)} active={active} tone="amber" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}