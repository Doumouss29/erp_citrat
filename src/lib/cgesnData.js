// Données et constantes partagées du Portail Digital CITRAT
// Reproduction fidèle du design importé (logique localStorage d'origine).

// Applications intégrées au portail (développées en interne) ; les autres sont des services externes
// L'ordre de ce tableau est aussi l'ordre d'affichage des applications internes sur le portail.
export const INTERNAL_APP_IDS = ['rhcgesn', 'cgesnboard', 'coprociv', 'lotissement', 'ecadastre', 'csst', 'assistancenum', 'hse'];
export const isInternalApp = (id) => INTERNAL_APP_IDS.includes(id);

// Applications définitivement retirées du portail : ignorées même si une entité PortalApp subsiste en base
export const REMOVED_APP_IDS = ['geopoints'];
export const isRemovedApp = (id) => REMOVED_APP_IDS.includes(id);

export const APP_DEFS = [
  {
    id: 'cgesncom', name: 'CITRAT.COM', href: 'https://cgesn.com',
    icon: '/uploads/pasted-1786225046598-0.png', iconBg: null,
    color: '#9d174d', badgeBg: '#fce7f0', hoverBorder: '#9d174d',
    shadow: '0 4px 10px rgba(157,23,77,0.25)', iconFit: 'cover'
  },
  {
    id: 'rhcgesn', name: 'RH-CITRAT', href: 'https://rh-cgesn.com',
    icon: '/logo-citrat.svg', iconBg: '#0d5c66',
    color: '#0d5c66', badgeBg: '#dcf1ef', hoverBorder: '#0d5c66',
    shadow: '0 4px 10px rgba(13,92,102,0.3)', iconFit: 'cover'
  },
  {
    id: 'cgesnboard', name: 'CITRAT-BOARD', href: 'https://cgesn-board.com',
    icon: '/uploads/pasted-1786225011933-0.png', iconBg: null,
    color: '#0d2b52', badgeBg: '#e1e8f3', hoverBorder: '#0d2b52',
    shadow: '0 4px 10px rgba(13,43,82,0.3)', iconFit: 'cover'
  },
  {
    id: 'ecadastre', name: 'E-CADASTRE', href: 'https://lmcollecte.com',
    icon: 'https://media.base44.com/images/public/6aa96886350e13fe6882c8af/72923d3d9_image.png', iconBg: null,
    color: '#0b5345', badgeBg: '#d8eee6', hoverBorder: '#0b5345',
    shadow: '0 4px 10px rgba(11,83,69,0.25)', iconFit: 'cover'
  },
  {
    id: 'lotissement', name: 'E-GUIDE', href: 'https://lotissement-manager.com',
    icon: '/uploads/pasted-1786225450048-0.png', iconBg: null,
    color: '#a3009d', badgeBg: '#f6def4', hoverBorder: '#a3009d',
    shadow: '0 4px 10px rgba(163,0,157,0.25)', iconFit: 'cover'
  },
  {
    id: 'assistancenum', name: 'ASSISTANCE', href: '/assistance',
    icon: '/uploads/pasted-1786224972335-0.png', iconBg: null,
    color: '#1e40af', badgeBg: '#e0e8fb', hoverBorder: '#1e40af',
    shadow: '0 4px 10px rgba(30,64,175,0.25)', iconFit: 'cover'
  },
  {
    id: 'csst', name: 'CSST', href: null,
    icon: '/uploads/CSST-2.png', iconBg: null,
    color: '#1d3f91', badgeBg: '#dfe6f7', hoverBorder: '#1d3f91',
    shadow: '0 4px 10px rgba(29,63,145,0.25)', iconFit: 'cover'
  },
  {
    // Messagerie professionnelle @cgesn.com (Zoho Mail) : ouvre la boîte mail dans un nouvel onglet
    id: 'messagerie', name: 'MESSAGERIE', href: 'https://mail.zoho.eu/zm/',
    icon: '/uploads/zoho-mail-logo.svg', iconBg: '#fff',
    color: '#2f5597', badgeBg: '#e3eaf6', hoverBorder: '#426aa7',
    shadow: '0 4px 10px rgba(66,106,167,0.25)', iconFit: 'cover'
  },
  {
    id: 'hse', name: 'HSE-PRESFOR', href: null,
    icon: 'https://base44.app/api/apps/6aa96886350e13fe6882c8af/files/mp/public/6aa96886350e13fe6882c8af/2e88b302a_HSEPRESFOR.webp', iconBg: null,
    color: '#c2580c', badgeBg: '#ffedd5', hoverBorder: '#c2580c',
    shadow: '0 4px 10px rgba(194,88,12,0.25)', iconFit: 'cover'
  },
  {
    // Gestion de copropriétés (loi n° 2019-576) : état descriptif de division, tantièmes, règlement, syndic
    id: 'coprociv', name: 'COPROCIV', href: '/coprociv',
    icon: '/coprociv/icon-marine.png', iconBg: '#0F1D3D',
    color: '#0F1D3D', badgeBg: '#e3e7f0', hoverBorder: '#0F1D3D',
    shadow: '0 4px 10px rgba(15,29,61,0.28)', iconFit: 'contain'
  }
];

export const DEFAULT_APPS = [
  { id: 'cgesncom', name: 'CITRAT.COM', href: 'https://cgesn.com', status: 'ok' },
  { id: 'rhcgesn', name: 'RH-CITRAT', href: 'https://rh-cgesn.com', status: 'ok' },
  { id: 'cgesnboard', name: 'CITRAT-BOARD', href: 'https://cgesn-board.com', status: 'ok' },
  { id: 'ecadastre', name: 'E-CADASTRE', href: 'https://lmcollecte.com', status: 'ok' },
  { id: 'lotissement', name: 'E-GUIDE', href: 'https://lotissement-manager.com', status: 'ok' },
  { id: 'assistancenum', name: 'ASSISTANCE', href: '/assistance', status: 'ok' },
  { id: 'csst', name: 'CSST', href: '', status: 'off' },
  { id: 'hse', name: 'HSE-PRESFOR', href: '', status: 'ok' },
  { id: 'messagerie', name: 'MESSAGERIE', href: 'https://mail.zoho.eu/zm/', status: 'ok' },
  { id: 'coprociv', name: 'COPROCIV', href: '/coprociv', status: 'ok' }
];

export const KEYS = {
  darkMode: 'cgesn_dark_mode',
  loggedIn: 'cgesn_logged_in',
  apps: 'cgesn_admin_apps_v2',
  users: 'cgesn_admin_users_v2',
  admin: 'cgesn_is_admin'
};

export function getAdminApps() {
  try {
    const a = JSON.parse(localStorage.getItem(KEYS.apps) || 'null');
    return Array.isArray(a) ? a : DEFAULT_APPS;
  } catch (e) {
    return DEFAULT_APPS;
  }
}

export function getAdminUsers() {
  try {
    const u = JSON.parse(localStorage.getItem(KEYS.users) || 'null');
    return Array.isArray(u) ? u : [];
  } catch (e) {
    return [];
  }
}

export function saveAdminApps(apps) {
  localStorage.setItem(KEYS.apps, JSON.stringify(apps));
}

export function saveAdminUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}