import React, { useState } from 'react';
import usePortalAppIcon from '@/hooks/usePortalAppIcon';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid, Kanban, Bell, Users, BarChart3,
  ChevronLeft, ChevronRight, Home
} from 'lucide-react';
import { MenuButton, MenuDrawer, MenuItem, MenuPortalLink } from '@/components/cgesn/PortalMenu';

const navItems = [
  { path: '/assistance', icon: LayoutGrid, label: 'Tableau de bord' },
  { path: '/assistance/si-workspace', icon: Kanban, label: 'Espace de travail SI', adminOnly: true },
  { path: '/assistance/notifications', icon: Bell, label: 'Notifications' },
  { path: '/assistance/users', icon: Users, label: 'Utilisateurs', adminOnly: true },
  { path: '/assistance/statistics', icon: BarChart3, label: 'Statistiques', adminOnly: true },
];

// Liseré de marque : bleu vif -> cyan (couleurs du logo)
const BRAND_LINE = 'linear-gradient(90deg,#2056c1 0%,#22b8e6 100%)';

export default function Sidebar({ user }) {
  const appLogo = usePortalAppIcon('assistancenum', "/uploads/pasted-1786224972335-0.png");
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  const Brand = ({ compact }) => (
    <div className="flex items-center gap-3 min-w-0">
      <img
        src={appLogo}
        alt="ASSISTANCE SI"
        className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow-sm ring-1 ring-white/15"
      />
      {!compact && (
        <div className="min-w-0">
          <div className="font-heading font-bold text-sm text-white tracking-wide truncate">ASSISTANCE SI</div>
          <div className="text-[11px] text-cyan-300/80 truncate">Support informatique</div>
        </div>
      )}
    </div>
  );

  const NavLinks = ({ compact, onNavigate }) => (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {filteredNav.map(item => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/20'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            } ${compact ? 'justify-center' : ''}`}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-cyan-300" />}
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const PortalLink = ({ compact, onNavigate }) => (
    <div className="p-3 border-t border-sidebar-border">
      <Link
        to="/portail"
        onClick={onNavigate}
        title={compact ? 'Retour au portail' : undefined}
        className={`flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm font-medium transition-colors ${compact ? 'justify-center px-0' : ''}`}
      >
        <Home className="w-4 h-4 flex-shrink-0" />
        {!compact && <span>Retour au portail</span>}
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile : barre du haut (logo + titre à gauche, menu à droite) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 bg-sidebar">
        <div className="h-[3px]" style={{ background: BRAND_LINE }} />
        <div className="h-[53px] px-4 flex items-center justify-between gap-3">
          <Brand />
          <MenuButton onDark open={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)} />
        </div>
      </header>

      {/* Mobile : menu officiel Portail Digital */}
      <MenuDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="lg:hidden"
        footer={<MenuPortalLink onClick={() => setMobileOpen(false)} />}
      >
        {filteredNav.map((item) => (
          <MenuItem
            key={item.path}
            to={item.path}
            icon={item.icon}
            active={location.pathname === item.path}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </MenuItem>
        ))}
      </MenuDrawer>

      {/* Ordinateur : barre latérale */}
      <aside className={`hidden lg:flex flex-col bg-sidebar transition-all duration-300 relative ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}>
        <div className="h-[3px] flex-shrink-0" style={{ background: BRAND_LINE }} />
        <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'flex justify-center' : ''}`}>
          <Brand compact={collapsed} />
        </div>
        <NavLinks compact={collapsed} />
        <PortalLink compact={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          className="absolute top-7 -right-3 w-6 h-6 bg-card text-primary border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>
    </>
  );
}