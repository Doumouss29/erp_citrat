// Module RH-CITRAT : toutes ses pages sont servies sous /rh (comme /board, /ecadastre…),
// pour les distinguer des pages du portail (/portail, /administration…).
// Les autres modules ont leur propre fonction (createBoardPageUrl, createEguidePageUrl…).
export const RH_BASE_PATH = '/rh';

export function createPageUrl(pageName: string) {
    return RH_BASE_PATH + '/' + pageName.replace(/ /g, '-');
}
