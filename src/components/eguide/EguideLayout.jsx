import PageSuspense from "@/components/PageSuspense";
import React, { useState, useMemo } from 'react';
import { MenuButton, MenuDrawer, MenuItem, MenuPortalLink } from "@/components/cgesn/PortalMenu";
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { createEguidePageUrl } from "@/lib/eguidePageUrl";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Map, LayoutDashboard, Building, Users, History,
  Settings, ChevronDown, Menu, X, FileText
} from 'lucide-react';
import { cn } from "@/lib/utils";
import AppShell from '@/components/cgesn/AppShell';
import useAppTheme from '@/hooks/useAppTheme';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
  { name: 'Carte', icon: Map, path: 'Carte' },
  { name: 'Lotissements', icon: Building, path: 'Lotissements' },
  { name: 'Attributaires', icon: Users, path: 'Attributaires' },
  { name: 'Historique', icon: History, path: 'Historique' },
  { name: 'Guide', icon: FileText, path: 'GenererGuide' },
  { name: 'Administration', icon: Settings, path: 'Admin', adminOnly: true }
];

const FULLSCREEN_PAGES = ['Carte', 'Verify', 'Accueil'];

export default function EguideLayout() {
  useAppTheme('lotissement'); // aussi pour les pages plein écran (carte)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Derive current page name from URL path (/eguide/Dashboard → Dashboard)
  const pathSegment = location.pathname.replace(/^\/eguide\/?/, '');
  const currentPageName = pathSegment ? pathSegment.split('/')[0] : 'Dashboard';

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: themeConfigs = [] } = useQuery({
    queryKey: ['config-theme'],
    queryFn: async () => {
      const page = await base44.entities.ConfigurationApp.filter({ cle: 'theme' });
      return Array.isArray(page) ? page : page.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  const theme = useMemo(() => {
    const defaultTheme = {
      primaryColor: '#a3009d',
      primaryTextColor: '#a3009d',
      navbarBgColor: '#ffffff',
      appNameColor: '#0f172a',
      appSubtitleColor: '#64748b',
      navLinkColor: '#475569',
      navLinkHoverBgColor: '#f1f5f9',
      importButtonBgColor: '#1e293b',
      importButtonTextColor: '#ffffff',
      fontSize: 'base',
      appName: 'e-Guide'
    };
    return themeConfigs.length > 0 && themeConfigs[0].valeur
      ? { ...defaultTheme, ...themeConfigs[0].valeur }
      : defaultTheme;
  }, [themeConfigs]);

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (user?.role === 'viewer' && item.path !== 'Carte') return false;
    return true;
  });

  // Full screen pages without layout
  if (FULLSCREEN_PAGES.includes(currentPageName)) {
    return <PageSuspense><Outlet /></PageSuspense>;
  }

  // Coquille commune du portail : même barre verte et même menu que les autres applications.
  // (Le thème de couleurs e-Guide reste disponible pour les documents générés.)
  const items = filteredNavItems.map((item) => ({
    title: item.name === 'Guide' ? 'Générer un guide' : item.name,
    short: item.name === 'Dashboard' ? 'Accueil' : item.name === 'Attributaires' ? 'Attribut.' : item.name,
    url: createEguidePageUrl(item.path),
    icon: item.icon,
    section: item.adminOnly ? 'Administration' : undefined,
    match: item.path === 'Admin' ? [createEguidePageUrl('Parametres'), createEguidePageUrl('ImportData')] : undefined,
  }));
  const tabs = ['Dashboard', 'Lotissements', 'Attributaires'].map((p) => createEguidePageUrl(p));

  return (
    <AppShell
      appId="lotissement"
      app={{ code: 'EG' }}
      items={items}
      tabs={tabs}
      user={user ? { name: user.full_name, email: user.email } : undefined}
    >
      <PageSuspense><Outlet /></PageSuspense>
    </AppShell>
  );
}
