import React from 'react';
import { Layers, CheckCircle2, Ban, TrendingUp } from 'lucide-react';

function KpiCard({ icon: Icon, label, value, color, bg, iconBg }) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 ${bg} border border-white/60 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color} ${iconBg}`}><Icon className="w-4 h-4" /></div>
        <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
      </div>
      <p className="text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}

export default function ProjetsKPI({ projets }) {
  if (!projets?.length) return null;
  const enCours = projets.filter(p => p.statut === 'en_cours');
  const termines = projets.filter(p => p.statut === 'termine');
  const enArret = projets.filter(p => p.statut === 'en_arret');
  const bloques = projets.filter(p => p.bloque);
  const avg = projets.length > 0 ? Math.round(projets.reduce((s, p) => s + (p.avancement || 0), 0) / projets.length) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KpiCard icon={Layers} label="Projets en cours" value={enCours.length} color="text-blue-600" bg="bg-blue-50" iconBg="bg-blue-200" />
      <KpiCard icon={TrendingUp} label="Avancement moyen" value={`${avg}%`} color="text-indigo-600" bg="bg-indigo-50" iconBg="bg-indigo-200" />
      <KpiCard icon={CheckCircle2} label="Projets terminés" value={termines.length} color="text-green-600" bg="bg-green-50" iconBg="bg-green-200" />
      <KpiCard icon={Ban} label="En arrêt / bloqués" value={enArret.length + bloques.length} color="text-red-600" bg="bg-red-50" iconBg="bg-red-200" />
    </div>
  );
}