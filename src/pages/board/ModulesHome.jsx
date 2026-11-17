import React from 'react';
import { Calculator, ClipboardList, MapPinned } from 'lucide-react';
import ModuleCard from '@/components/board/home/ModuleCard';
import useModuleMetrics from '@/hooks/useModuleMetrics';

const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0
}).format(value || 0);

export default function ModulesHome() {
  const { user, userBureau, isAdmin, isLoading, metrics } = useModuleMetrics();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10 lg:py-12 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 sm:space-y-8 lg:space-y-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-garamond text-2xl font-black uppercase tracking-tight text-slate-900 xs:text-3xl sm:text-5xl lg:text-6xl">
              <span className="block">BIENVENUE SUR</span>
              <span className="mt-2 block text-blue-700">CITRAT-BOARD</span>
            </h1>
            <div className="mt-4 sm:mt-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm">
              {isAdmin ? 'Direction Générale' : `Bureau de ${userBureau?.nom || ''}`}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <ModuleCard
              to="/board/Accueil"
              icon={ClipboardList}
              title={isAdmin ? "Activités des bureaux" : "Activité du bureau"}
              statLabel="Dossiers"
              statValue={metrics.totalDossiers}
              ctaLabel="Ouvrir le dashboard"
              accentClass="bg-blue-100 text-blue-700"
              iconClass="bg-blue-100 text-blue-700"
              cardClass="bg-gradient-to-br from-blue-50 via-white to-indigo-50"
              glowClass="bg-blue-200/70"
              topBarClass="bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-400"
              ctaButtonClass="bg-blue-500"
            />

            <ModuleCard
              to="/board/Comptabilite/operations"
              icon={Calculator}
              title={isAdmin ? "Gestion des caisses" : "Gestion de caisse"}
              statLabel={isAdmin ? "Solde cumulé" : "Solde du bureau"}
              statValue={formatCurrency(metrics.soldeCaisse)}
              ctaLabel="Ouvrir la comptabilité"
              accentClass="bg-emerald-100 text-emerald-700"
              iconClass="bg-emerald-100 text-emerald-700"
              cardClass="bg-gradient-to-br from-emerald-50 via-white to-teal-50"
              glowClass="bg-emerald-200/70"
              topBarClass="bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-400"
              ctaButtonClass="bg-emerald-500"
            />

            <ModuleCard
              to="/board/LotissementsList"
              icon={MapPinned}
              title="Suivi des lotissements"
              statLabel="Projets en cours"
              statValue={metrics.lotissementsEnCours}
              ctaLabel="Ouvrir le suivi"
              accentClass="bg-amber-100 text-amber-700"
              iconClass="bg-amber-100 text-amber-700"
              cardClass="bg-gradient-to-br from-amber-50 via-white to-orange-50"
              glowClass="bg-amber-200/70"
              topBarClass="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-400"
              ctaButtonClass="bg-amber-500"
            />
          </div>
        </div>
      </main>
    </div>
  );
}