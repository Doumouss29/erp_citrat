import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCabinetOrg } from '@/lib/ecadastreCabinet';
import { base44 } from '@/api/base44Client';
import { createEcadastrePageUrl as u } from '@/lib/ecadastrePageUrl';
import {
  Home, Archive, FileText, PlusCircle, Map, Gauge, RefreshCw, BookOpen, Settings,
} from 'lucide-react';
import AppShell from '@/components/cgesn/AppShell';
import useAppTheme from '@/hooks/useAppTheme';

// Pages plein écran (carte) : elles gardent leur propre en-tête, sans la coquille.
const FULLSCREEN_PAGES = ['CollecteParCarte'];

// Layout du module E-CADASTRE : coquille commune du portail.
// Les entrées suivent ce que l'accueil propose selon le rôle (agent, superviseur, administrateur).
export default function EcadastreLayoutRoute() {
  useAppTheme('ecadastre'); // aussi pour la carte plein écran
  const location = useLocation();
  const page = location.pathname.replace(/^\/ecadastre\/?/, '').split('/')[0] || 'Accueil';

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Application interne : tout compte qui ouvre e-Cadastre est rattaché au cabinet,
  // sans invitation ni choix d'organisation.
  const { data: cabinet } = useCabinetOrg();
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (!user || user.organisation_id || !cabinet?.id) return;
    base44.auth.updateMe({ organisation_id: cabinet.id })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      })
      .catch(() => {});
  }, [user, cabinet, queryClient]);

  if (FULLSCREEN_PAGES.includes(page)) return <Outlet />;

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'superviseur';

  const items = isAdmin
    ? [
        // Même barre que les agents (Accueil, Collectes, Rapports, Plus) + pages d'administration dans « Plus »
        { title: 'Accueil', url: u('Accueil'), icon: Home },
        { title: 'Nouvelle collecte', short: 'Nouvelle', url: u('NouvelleCollecte'), icon: PlusCircle },
        { title: 'Collecte par carte', short: 'Carte', url: u('CollecteParCarte'), icon: Map },
        { title: 'Collectes', url: u('MesCollectes'), icon: Archive, match: [u('DetailCollecte'), u('EditerCollecte')] },
        { title: 'Rapports', url: u('RapportCollecteCompact'), icon: FileText, match: [u('RapportCollecte')] },
        { title: 'Superviseur', url: u('DashboardSuperviseur'), icon: Gauge },
        { title: 'Administration', short: 'Admin', url: u('AdminOrganisations'), icon: Settings, section: 'Administration' },
        { title: "Manuel d'utilisation", short: 'Manuel', url: u('ManuelUtilisation'), icon: BookOpen, section: 'Aide et réglages' },
      ]
    : [
        { title: 'Accueil', url: u('Accueil'), icon: Home },
        { title: 'Nouvelle collecte', short: 'Nouvelle', url: u('NouvelleCollecte'), icon: PlusCircle },
        { title: 'Collecte par carte', short: 'Carte', url: u('CollecteParCarte'), icon: Map },
        { title: 'Mes collectes', short: 'Collectes', url: u('MesCollectes'), icon: Archive, match: [u('DetailCollecte'), u('EditerCollecte')] },
        { title: 'Rapports', url: u('RapportCollecteCompact'), icon: FileText, match: [u('RapportCollecte')] },
        ...(isSupervisor ? [{ title: 'Superviseur', url: u('DashboardSuperviseur'), icon: Gauge }] : []),
        { title: 'Synchronisation hors ligne', short: 'Synchro', url: u('SyncOffline'), icon: RefreshCw, section: 'Aide et réglages' },
        { title: "Manuel d'utilisation", short: 'Manuel', url: u('ManuelUtilisation'), icon: BookOpen, section: 'Aide et réglages' },
      ];

  const tabs = isAdmin
    ? [u('Accueil'), u('MesCollectes'), u('RapportCollecteCompact')]
    : [u('Accueil'), u('MesCollectes'), u('RapportCollecteCompact')];

  return (
    <AppShell
      appId="ecadastre"
      app={{ code: 'EC' }}
      items={items}
      tabs={tabs}
      user={user ? { name: user.full_name, email: user.email } : undefined}
    >
      <Outlet />
    </AppShell>
  );
}
