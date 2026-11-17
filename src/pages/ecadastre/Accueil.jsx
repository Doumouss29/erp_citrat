import React, { useState } from 'react';
import usePortalAppIcon from '@/hooks/usePortalAppIcon';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Archive, LogOut, FileText, Building2, Building2 as Building2Icon, ChevronDown, Settings, MoreVertical, BarChart3, Map, ArrowLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CollecteIcon, CarteIcon, ArchiveIcon, RapportIcon, SuperviseurIcon, OrganisationIcon } from '@/components/ecadastre/TileIcons';
import { createEcadastrePageUrl } from '@/lib/ecadastrePageUrl';
import { base44 } from '@/api/base44Client';
import PortalReturnButton from '@/components/cgesn/PortalReturnButton';
import AgentNameModal from '@/components/ecadastre/collecte/AgentNameModal';

export default function Accueil() {
  const appLogo = usePortalAppIcon('ecadastre', "https://media.base44.com/images/public/6aa96886350e13fe6882c8af/72923d3d9_image.png");
  const navigate = useNavigate();
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  // Application interne au cabinet : navigation directe, sans choix d'organisation
  const handleAdminNav = (target) => {
    const page = { archive: 'MesCollectes', rapportCompact: 'RapportCollecteCompact', collecteParCarte: 'CollecteParCarte', dashboardSuperviseur: 'DashboardSuperviseur' }[target];
    if (page) navigate(createEcadastrePageUrl(page));
  };

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleNewCollecte = () => {
    const savedAgent = localStorage.getItem('agentReviewerName');
    const savedSignature = localStorage.getItem('agentReviewerSignature');
    if (!savedAgent || !savedSignature) {
      setIsAgentModalOpen(true);
    } else {
      navigate(createEcadastrePageUrl('NouvelleCollecte'));
    }
  };

  const handleAgentNameSubmit = (agentName, agentSignature) => {
    navigate(createEcadastrePageUrl('NouvelleCollecte'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex flex-col">

      {/* Bandeau titre sous le header */}
      <div className="w-full bg-white/10 border-b border-white/10 px-3 py-2 sm:py-4 text-center">
       <h2 className="inline-block bg-white text-blue-900 text-xs sm:text-base font-bold leading-tight tracking-widest uppercase px-3 py-0.5 sm:py-1 rounded-full">
         PROJET E-CADASTRE
       </h2>
       <p className="text-white text-sm sm:text-lg font-semibold mt-1.5 sm:mt-3">
         RECENSEMENT DES PROPRIÉTAIRES FONCIERS
         </p>
      </div>

      {/* Contenu principal - tuiles */}
      <div className="flex-1 flex flex-col items-center justify-start px-3 pt-4 pb-4 sm:py-6 xl:py-10">
      <div className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl text-center">

        {/* Boutons de navigation en tuiles */}
        {/* Mobile (utilisateurs) : une tuile par ligne. Tablette : 2 colonnes de grandes tuiles qui occupent toute la hauteur. */}
        <style>{`
          /* La hauteur des tuiles se cale sur l'espace visible : toutes les tuiles tiennent à l'écran, sans vide en bas */
          @media (max-width:767px){
            .ec-tiles .ec-tile{height:clamp(84px, calc((100vh - 56px - 68px - 80px - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom) - (var(--ec-rows-m) - 1) * 12px) / var(--ec-rows-m)), 170px);height:clamp(84px, calc((100dvh - 56px - 68px - 80px - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom) - (var(--ec-rows-m) - 1) * 12px) / var(--ec-rows-m)), 170px)}
            .ec-tiles[data-onecol] .ec-row{grid-template-columns:1fr}
            .ec-tiles[data-onecol] .ec-tile{flex-direction:row;justify-content:flex-start;text-align:left;gap:16px;padding:16px 20px}
            .ec-tiles[data-onecol] .ec-label{text-align:left;font-size:16px}
            .ec-tiles[data-onecol] .ec-tile:hover{transform:scale(1.01)}
          }
          @media (min-width:768px) and (max-width:1279px){
            .ec-tiles .ec-row{grid-template-columns:1fr 1fr}
            .ec-tiles .ec-tile{height:clamp(130px, calc((100vh - 64px - 112px - 48px - (var(--ec-rows-t) - 1) * 24px) / var(--ec-rows-t)), 300px);height:clamp(130px, calc((100dvh - 64px - 112px - 48px - (var(--ec-rows-t) - 1) * 24px) / var(--ec-rows-t)), 300px);gap:14px}
            .ec-tiles .ec-label{font-size:18px}
            .ec-tiles .ec-tile svg{width:52px;height:52px}
            .ec-tiles .ec-tile:hover{transform:scale(1.02)}
          }
          /* Ordinateur : toutes les tuiles sur une rangée (4) ou deux rangées de 3, en haut de page */
          @media (min-width:1280px){
            .ec-tiles{display:grid !important;grid-template-columns:repeat(var(--ec-cols),minmax(0,1fr))}
            .ec-tiles .ec-row{display:contents}
            .ec-tiles .ec-tile{height:clamp(200px,28vh,250px);padding:24px 16px !important}
            .ec-tiles .ec-label{font-size:17px}
            .ec-tiles .ec-tile:hover{transform:translateY(-4px)}
          }
        `}</style>
        <div
          className="ec-tiles flex flex-col gap-3 sm:gap-4 lg:gap-6"
          data-onecol={user?.role !== 'admin' ? '' : undefined}
          style={{
            '--ec-cols': user?.role === 'admin' || user?.role === 'superviseur' ? 3 : 4,
            // nombre de rangées : mobile (agents/superviseurs en 1 colonne, admin en 2) et tablette (2 colonnes)
            '--ec-rows-m': user?.role === 'admin' ? 3 : user?.role === 'superviseur' ? 5 : 4,
            '--ec-rows-t': user?.role === 'admin' || user?.role === 'superviseur' ? 3 : 2,
          }}
        >

          {/* LIGNE 1 (A) : Nouvelle Collecte + Collecte par carte */}
          <div className="ec-row grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <button
              onClick={handleNewCollecte}
              className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl"
            >
              <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><CollecteIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
              <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Nouvelle Collecte</span>
            </button>
            <button onClick={() => user?.role === 'admin' ? handleAdminNav('collecteParCarte') : navigate(createEcadastrePageUrl('CollecteParCarte'))} className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl">
              <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><CarteIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
              <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Collecte par carte</span>
            </button>
          </div>

          {/* LIGNE 2 (B) : Archive + Rapport Compact */}
          <div className="ec-row grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Archive */}
            {user?.role === 'admin' ? (
              <button
                onClick={() => handleAdminNav('archive')}
                className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 border-2 border-white/50 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl"
              >
                <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><ArchiveIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
                <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Archive</span>
              </button>
            ) : (
              <Link to={createEcadastrePageUrl('MesCollectes')} className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 border-2 border-white/50 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl">
                <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><ArchiveIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
                <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Archive</span>
              </Link>
            )}

            {/* Rapport Compact */}
            <button
              onClick={() => user?.role === 'admin' ? handleAdminNav('rapportCompact') : navigate(createEcadastrePageUrl('RapportCollecteCompact'))}
              className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-green-500 hover:bg-green-400 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl"
            >
              <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><RapportIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
              <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Rapport Compact</span>
            </button>

          </div>

          {/* Dashboard Superviseur (role superviseur) */}
          {user?.role === 'superviseur' && (
            <Link to={createEcadastrePageUrl('DashboardSuperviseur')} className="ec-tile w-full flex flex-col items-center justify-center gap-2 sm:gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 transition-all duration-200 active:scale-95 hover:scale-[1.02] hover:shadow-2xl">
              <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><SuperviseurIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
              <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Tableau de bord superviseur</span>
            </Link>
          )}

          {/* Admin : Superviseur + Administration (utilisateurs, communes, couches) */}
          {user?.role === 'admin' && (
            <div className="ec-row grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <button onClick={() => handleAdminNav('dashboardSuperviseur')} className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl">
                <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><SuperviseurIcon className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" /></span>
                <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Superviseur</span>
              </button>
              <Link to={createEcadastrePageUrl('AdminOrganisations')} className="ec-tile flex flex-col items-center justify-center gap-2 sm:gap-3 bg-purple-500 hover:bg-purple-400 text-white rounded-2xl shadow-xl px-3 py-3.5 sm:p-6 lg:p-10 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-2xl">
                <span className="inline-flex items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 p-2 sm:p-2.5"><Settings className="w-7 h-7 sm:w-10 sm:h-10 lg:w-12 lg:h-12" strokeWidth={1.7} /></span>
                <span className="text-xs sm:text-base lg:text-lg font-bold text-center leading-tight ec-label">Administration</span>
              </Link>
            </div>
          )}
        </div>

        <AgentNameModal 
          isOpen={isAgentModalOpen}
          onClose={() => setIsAgentModalOpen(false)}
          onSubmit={handleAgentNameSubmit}
        />
      </div>
      </div>
      </div>
  );
}