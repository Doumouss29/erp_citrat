import React from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Images, Globe2, FileText } from 'lucide-react';
import useHseRapportPerms from '@/hooks/useHseRapportPerms';
import AppShell from '@/components/cgesn/AppShell';
import { Toaster } from 'sonner';
import NotificationBell from '@/components/notifications/NotificationBell';

// HSE-PRESFOR : coquille commune du portail.
const ITEMS = [
  { title: 'Registre HSE', short: 'Registre', url: '/hse', icon: ClipboardList },
  { title: 'Photos', url: '/hse/photos', icon: Images },
  { title: 'Indicateurs Banque Mondiale', short: 'Indicateurs', url: '/hse/observations', icon: Globe2 },
];

export default function HseLayoutRoute() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  // « Rapports trimestriels » : Référent HSE, Coordinateur HSE, Chef de projet HSE et administrateurs
  const { data: rapportPerms } = useHseRapportPerms();
  const items = rapportPerms?.canView
    ? [...ITEMS, { title: 'Rapports trimestriels', short: 'Rapports', url: '/hse/rapports', icon: FileText }]
    : ITEMS;
  return (
    <AppShell
      appId="hse"
      app={{ code: 'HSE' }}
      items={items}
      tabs={['/hse', '/hse/photos', '/hse/observations']}
      user={user ? { name: user.full_name, email: user.email } : undefined}
      actions={user && <NotificationBell userEmail={user.email} buttonClassName="text-white hover:bg-white/10 hover:text-white h-10 w-10" />}
    >
      <Outlet />
      {/* Messages de HSE-PRESFOR, affichés dans le portail et non par le navigateur */}
      <Toaster position="top-center" richColors closeButton />
    </AppShell>
  );
}
