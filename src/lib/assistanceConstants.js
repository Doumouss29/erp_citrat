export const APPLICATIONS = [
  { id: "cgesn.com", label: "cgesn.com", description: "Site internet officiel", portalId: "cgesncom" },
  { id: "rh-cgesn", label: "rh-cgesn", description: "Système intégré de gestion du personnel", portalId: "rhcgesn" },
  { id: "cgesn-board", label: "cgesn-board", description: "Gestion des activités des bureaux", portalId: "cgesnboard" },
  { id: "e-cadastre", label: "e-cadastre", description: "Projet e-cadastre", portalId: "ecadastre" },
  { id: "e-guide", label: "e-guide", description: "Guide et documentation numérique", portalId: "lotissement" },
  { id: "assistance", label: "assistance", description: "Assistance numérique", portalId: "assistancenum" },
  { id: "csst", label: "csst", description: "Comité de Sécurité et Santé au Travail", portalId: "csst" },
  { id: "messagerie", label: "messagerie", description: "Messagerie professionnelle", portalId: "messagerie" },
  { id: "hse", label: "hse-presfor", description: "HSE-PRESFOR (Hygiène, Sécurité, Environnement)", portalId: "hse" },
];

export const REQUEST_TYPES = [
  { id: "bug", label: "Bug", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "amelioration", label: "Amélioration", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "assistance", label: "Assistance", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "acces_utilisateur", label: "Accès utilisateur", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "incident", label: "Incident", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "autre", label: "Autre", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

export const PRIORITIES = [
  { id: "faible", label: "Faible", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { id: "moyenne", label: "Moyenne", color: "bg-blue-100 text-blue-600 border-blue-200" },
  { id: "elevee", label: "Élevée", color: "bg-orange-100 text-orange-600 border-orange-200" },
  { id: "urgente", label: "Urgente", color: "bg-red-100 text-red-600 border-red-200" },
];

export const STATUSES = [
  { id: "nouveau", label: "Nouveau", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "en_attente", label: "En attente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "en_cours", label: "En cours", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "resolu", label: "Résolu", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "ferme", label: "Fermé", color: "bg-gray-100 text-gray-600 border-gray-200" },
];

export const NOTIFICATION_TYPES = {
  nouveau_ticket: { label: "Nouveau ticket", icon: "Plus" },
  ticket_assigne: { label: "Ticket assigné", icon: "UserCheck" },
  changement_statut: { label: "Changement de statut", icon: "RefreshCw" },
  nouveau_commentaire: { label: "Nouveau commentaire", icon: "MessageSquare" },
  ticket_resolu: { label: "Ticket résolu", icon: "CheckCircle" },
};

export const getStatusInfo = (id) => STATUSES.find(s => s.id === id) || STATUSES[0];
export const getPriorityInfo = (id) => PRIORITIES.find(p => p.id === id) || PRIORITIES[1];
export const getRequestTypeInfo = (id) => REQUEST_TYPES.find(r => r.id === id) || REQUEST_TYPES[5];
export const getApplicationInfo = (id) => APPLICATIONS.find(a => a.id === id);

export const generateTicketNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `TK-${year}${month}-${random}`;
};