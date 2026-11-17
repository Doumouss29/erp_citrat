// Helper de navigation interne pour le module ASSISTANCE (Support SI).
// Toutes les pages du module sont montées sous le préfixe /assistance.
export function createAssistancePageUrl(pageName) {
  return '/assistance/' + pageName.replace(/ /g, '-');
}