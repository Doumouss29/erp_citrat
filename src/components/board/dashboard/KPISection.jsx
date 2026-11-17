import React from 'react';
import StatCard from './StatCard';
import { FolderOpen, CheckCircle2, Clock, TrendingUp, BarChart3, Users } from 'lucide-react';

export default function KPISection({ dossiers, statuts, projets, isAdmin }) {
  const statutFinal = statuts?.find(s => s.est_final);
  const dossiersFinals = dossiers?.filter(d => d.statut_id === statutFinal?.id) || [];
  const dossiersEnCours = dossiers?.filter(d => d.statut_id !== statutFinal?.id) || [];
  const tauxRealisation = dossiers?.length ? ((dossiersFinals.length / dossiers.length) * 100).toFixed(1) : 0;

  // Clients uniques = noms uniques dans les dossiers
  const clientsUniques = new Set(
    (dossiers || []).map(d => `${d.client_nom || ''}${d.client_prenom || ''}`).filter(Boolean)
  ).size;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard
        title="Total Dossiers"
        value={dossiers?.length || 0}
        icon={FolderOpen}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        borderColor="border-blue-500"
      />
      <StatCard
        title="Réalisés"
        value={dossiersFinals.length}
        icon={CheckCircle2}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        borderColor="border-emerald-500"
      />
      <StatCard
        title="En cours"
        value={dossiersEnCours.length}
        icon={Clock}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        borderColor="border-amber-500"
      />
      <StatCard
        title="Taux réalisation"
        value={`${tauxRealisation}%`}
        icon={TrendingUp}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        borderColor="border-purple-500"
      />
      <StatCard
        title="Projets"
        value={projets?.length || 0}
        icon={BarChart3}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        borderColor="border-indigo-500"
      />
      <StatCard
        title="Clients"
        value={clientsUniques}
        icon={Users}
        iconBg="bg-rose-50"
        iconColor="text-rose-600"
        borderColor="border-rose-500"
      />
    </div>
  );
}