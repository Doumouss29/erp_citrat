import PageSuspense from "@/components/PageSuspense";
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Kanban, Bell, Users, BarChart3 } from 'lucide-react';
import useAppThemeClass from '@/hooks/useAppThemeClass';
import AppShell from '@/components/cgesn/AppShell';

// Entrées du module ASSISTANCE (adminOnly = réservé aux administrateurs SI)
const NAV_ITEMS = [
  { url: '/assistance', icon: LayoutGrid, title: 'Tableau de bord', short: 'Accueil', match: ['/assistance/tickets', '/assistance/ticket/', '/assistance/create-ticket'] },
  { url: '/assistance/si-workspace', icon: Kanban, title: 'Espace de travail SI', short: 'Espace SI', adminOnly: true },
  { url: '/assistance/notifications', icon: Bell, title: 'Notifications', short: 'Alertes' },
  { url: '/assistance/users', icon: Users, title: 'Utilisateurs', adminOnly: true },
  { url: '/assistance/statistics', icon: BarChart3, title: 'Statistiques', short: 'Stats', adminOnly: true },
];

export default function AppLayout() {
  useAppThemeClass('assistance-theme');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['si-notifications-unread', user?.email],
    queryFn: () => base44.entities.SiNotification.filter({ user_email: user?.email, is_read: false }),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const isAdmin = user?.role === 'admin';
  const unread = notifications.length;
  const items = NAV_ITEMS
    .filter((item) => !item.adminOnly || isAdmin)
    .map((item) => ({
      ...item,
      badge: item.url === '/assistance/notifications' && unread > 0 ? String(unread) : undefined,
    }));
  const tabs = isAdmin
    ? ['/assistance', '/assistance/si-workspace', '/assistance/notifications']
    : ['/assistance', '/assistance/notifications'];

  return (
    <AppShell
      appId="assistancenum"
      app={{ code: 'SI' }}
      items={items}
      tabs={tabs}
      user={user ? { name: user.full_name, email: user.email } : undefined}
    >
      <div className="p-4 md:p-6 xl:p-8 text-foreground">
        <PageSuspense><Outlet context={{ user }} /></PageSuspense>
      </div>
    </AppShell>
  );
}
