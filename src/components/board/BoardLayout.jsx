import PageSuspense from "@/components/PageSuspense";
import React, { useState, useEffect } from 'react';
import usePortalAppIcon from '@/hooks/usePortalAppIcon';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { createBoardPageUrl } from "@/lib/boardPageUrl";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AppShell from "@/components/cgesn/AppShell";
import { MenuButton, MenuDrawer, MenuItem, MenuSection, MenuPortalLink } from "@/components/cgesn/PortalMenu";
import {
  Settings,
  LogOut,
  Menu,
  Building2,
  ChevronDown,
  User,
  ClipboardList,
  Wallet,
  FileBarChart,
  LayoutGrid,
  Map, ScrollText } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function BoardLayout() {
  const appLogo = usePortalAppIcon('cgesnboard', "https://media.base44.com/images/public/696fe5195586fd61f32bcb08/0e64d1628_BOARD.png");
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        // Non connecté
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isDirection = user?.fonction === 'admin';
  const isTransversal = isAdmin || isDirection;
  const currentPath = location.pathname.toLowerCase();
  const isStandaloneModulePage = currentPath === '/board/comptabilite' || currentPath.startsWith('/board/comptabilite/');
  const isHomePage = currentPath === '/board' || currentPath === '/board/moduleshome';
  const moduleNavigation = [
    { name: 'Opérations', href: '/board/comptabilite/operations' },
    { name: 'Rapports', href: '/board/comptabilite/rapports' },
    { name: 'Journal', href: '/board/comptabilite/journal' }
  ];

  const navigation = [
    isTransversal
      ? { name: 'Bureaux', href: 'MesDossiers', icon: Building2 }
      : { name: 'Mes dossiers', href: 'MesDossiers', icon: Building2 },
    { name: 'Activités', href: 'SuiviActivites', icon: ClipboardList },
  ];

  const adminSubNav = [
    { name: 'Paramètres', href: 'Administration', icon: Settings },
  ];

  const isActive = (href) => {
    if (href === 'ModulesHome') {
      return location.pathname === '/board' || location.pathname === '/board/ModulesHome';
    }
    return location.pathname.includes(href);
  };

  const isModuleActive = (href) => {
    if (href === '/board/comptabilite/operations') {
      return currentPath === '/board/comptabilite' || currentPath === href;
    }
    return currentPath === href;
  };

  // Entrées du menu officiel (coquille commune du portail)
  const items = isStandaloneModulePage
    ? moduleNavigation.map((item) => ({
        title: item.name,
        url: item.href,
        icon: item.name === 'Opérations' ? Wallet : item.name === 'Rapports' ? FileBarChart : ScrollText,
        section: 'Comptabilité',
        match: item.href === '/board/comptabilite/operations' ? ['/board/comptabilite/operations'] : undefined,
      }))
    : [
        { title: 'Accueil', url: '/board', icon: LayoutGrid },
        ...navigation.map((item) => ({
          title: item.name,
          short: item.href === 'MesDossiers' ? (isTransversal ? 'Bureaux' : 'Dossiers') : 'Activités',
          url: createBoardPageUrl(item.href),
          icon: item.icon,
          match: item.href === 'MesDossiers'
            ? [createBoardPageUrl('BureauDossiers'), createBoardPageUrl('ProjetDetailPage'), createBoardPageUrl('SuiviProjets')]
            : [createBoardPageUrl('RapportMensuel'), createBoardPageUrl('ActivitesPDF')],
        })),
        { title: 'Lotissements', short: 'Lotiss.', url: createBoardPageUrl('LotissementsList'), icon: Map,
          match: [createBoardPageUrl('LotissementDetail')] },
        { title: 'Comptabilité', short: 'Compta', url: '/board/Comptabilite/operations', icon: Wallet },
        ...(isAdmin
          ? adminSubNav.map((sub) => ({ title: sub.name, url: createBoardPageUrl(sub.href), icon: sub.icon, section: 'Administration' }))
          : []),
      ];
  const tabs = isStandaloneModulePage
    ? moduleNavigation.map((m) => m.href)
    : ['/board', createBoardPageUrl('MesDossiers'), createBoardPageUrl('SuiviActivites')];

  return (
    <AppShell
      appId="cgesnboard"
      app={{ code: 'BD' }}
      homeUrl="/board"
      items={items}
      tabs={tabs}
      user={user ? { name: user.full_name, email: user.email } : undefined}
    >
      <div className="min-h-full flex flex-col [&>*]:w-full">
        <PageSuspense><Outlet /></PageSuspense>
      </div>
    </AppShell>
  );
}
