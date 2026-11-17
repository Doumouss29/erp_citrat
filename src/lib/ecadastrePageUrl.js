// Helper de navigation interne pour le module E-CADASTRE.
// Toutes les pages du module sont montées sous le préfixe /ecadastre.
export function createEcadastrePageUrl(pageName) {
  return '/ecadastre/' + pageName.replace(/ /g, '-');
}