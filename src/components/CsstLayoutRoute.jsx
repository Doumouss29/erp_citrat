import React from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { HardHat, ShieldCheck, CalendarCheck, Award, Phone, Users, ListChecks } from 'lucide-react';
import AppShell from '@/components/cgesn/AppShell';

// Icône en pastille de couleur : propre au CSST, sans modifier le menu commun aux autres modules.
const tile = (Icon, background, color) => function CsstMenuIcon() {
  return (
    <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, background, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Icon size={17} strokeWidth={2.2} />
    </span>
  );
};

// CSST : coquille commune du portail ; les 7 onglets de la page sont les entrées du menu, classées par usage.
const TERRAIN = 'Sur le terrain';
const FORMER = 'Se former';
const COMPRENDRE = 'Comprendre';
const ITEMS = [
  { section: COMPRENDRE, title: 'Le comité CSST', short: 'Comité', url: '/csst', icon: tile(Users, '#f3ecf8', '#6c3483'), exact: true },
  { section: COMPRENDRE, title: 'Démarche de prévention', short: 'Démarche', url: '/csst?onglet=prevention', icon: tile(ListChecks, '#d8f0f5', '#0e7490'), exact: true },
  { section: TERRAIN, title: 'Risques métiers', short: 'Risques', url: '/csst?onglet=fiches', icon: tile(HardHat, '#fff1e3', '#a84f0c'), exact: true },
  { section: TERRAIN, title: 'Consignes de sécurité', short: 'Consignes', url: '/csst?onglet=consignes', icon: tile(ShieldCheck, '#eaf7ee', '#1e8449'), exact: true },
  { section: TERRAIN, title: "Contacts d'urgence", short: 'Contacts', url: '/csst?onglet=contacts', icon: tile(Phone, '#fbebeb', '#c0392b'), exact: true },
  { section: FORMER, title: 'Préventions mensuelles', short: 'Mensuel', url: '/csst?onglet=mensuel', icon: tile(CalendarCheck, '#eaf2fa', '#2c5f82'), exact: true },
  { section: FORMER, title: 'Quiz & certificats', short: 'Quiz', url: '/csst?onglet=quiz', icon: tile(Award, '#fff4dc', '#8a5a00'), exact: true },
];

export default function CsstLayoutRoute() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  return (
    <AppShell
      appId="csst"
      app={{ code: 'CS' }}
      items={ITEMS}
      tabs={['/csst?onglet=fiches', '/csst?onglet=consignes', '/csst?onglet=contacts']}
      user={user ? { name: user.full_name, email: user.email } : undefined}
    >
      <Outlet />
    </AppShell>
  );
}
