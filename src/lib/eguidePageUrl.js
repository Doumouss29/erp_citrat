// Helper de navigation interne pour le module E-GUIDE.
// Toutes les pages du module sont montées sous le préfixe /eguide.
export function createEguidePageUrl(pageName) {
  return '/eguide/' + pageName.replace(/ /g, '-');
}