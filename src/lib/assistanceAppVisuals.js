import { Globe, Users, LayoutGrid, Map, BookOpen, ShieldCheck, Headset, HardHat, Mail } from 'lucide-react';

// Logos officiels des applications (alignés sur APP_DEFS du portail)
export const APP_LOGOS = {
  'cgesn.com': '/uploads/pasted-1786225046598-0.png',
  'rh-cgesn': '/logo-citrat.svg',
  'cgesn-board': '/uploads/pasted-1786225011933-0.png',
  'e-cadastre': 'https://media.base44.com/images/public/6aa96886350e13fe6882c8af/72923d3d9_image.png',
  'e-guide': '/uploads/pasted-1786225450048-0.png',
  'csst': '/uploads/CSST-2.png',
  'assistance': '/uploads/pasted-1786224972335-0.png',
  'hse': 'https://base44.app/api/apps/6aa96886350e13fe6882c8af/files/mp/public/6aa96886350e13fe6882c8af/2e88b302a_HSEPRESFOR.webp',
  'messagerie': '/uploads/zoho-mail-logo.svg',
};

export const APP_ICONS = {
  'cgesn.com': Globe,
  'rh-cgesn': Users,
  'cgesn-board': LayoutGrid,
  'e-cadastre': Map,
  'e-guide': BookOpen,
  'csst': ShieldCheck,
  'assistance': Headset,
  'hse': HardHat,
  'messagerie': Mail,
};

// Couleurs alignées sur la couleur officielle de chaque application (APP_DEFS du portail)
export const APP_COLORS = {
  'cgesn.com': 'from-rose-700 to-pink-900',
  'rh-cgesn': 'from-teal-600 to-cyan-800',
  'cgesn-board': 'from-blue-800 to-blue-950',
  'e-cadastre': 'from-emerald-600 to-emerald-800',
  'e-guide': 'from-fuchsia-600 to-fuchsia-800',
  'csst': 'from-blue-700 to-blue-900',
  'assistance': 'from-blue-600 to-blue-800',
  'hse': 'from-orange-500 to-orange-700',
  'messagerie': 'from-indigo-500 to-indigo-700',
};

export const APP_BG = {
  'cgesn.com': 'bg-rose-50 border-rose-200 hover:border-rose-400 hover:bg-rose-50',
  'rh-cgesn': 'bg-teal-50 border-teal-200 hover:border-teal-400 hover:bg-teal-50',
  'cgesn-board': 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  'e-cadastre': 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
  'e-guide': 'bg-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-400 hover:bg-fuchsia-50',
  'csst': 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  'assistance': 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  'hse': 'bg-orange-50 border-orange-200 hover:border-orange-400 hover:bg-orange-50',
  'messagerie': 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
};

export const APP_SELECTED = {
  'cgesn.com': 'border-rose-500 bg-rose-50 ring-2 ring-rose-200',
  'rh-cgesn': 'border-teal-500 bg-teal-50 ring-2 ring-teal-200',
  'cgesn-board': 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
  'e-cadastre': 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
  'e-guide': 'border-fuchsia-500 bg-fuchsia-50 ring-2 ring-fuchsia-200',
  'csst': 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
  'assistance': 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
  'hse': 'border-orange-500 bg-orange-50 ring-2 ring-orange-200',
  'messagerie': 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
};
