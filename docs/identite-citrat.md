# Identité visuelle ERP CITRAT

## Source du logo

Le logo CITRAT fourni par le client est intégré dans `public/logo-citrat.svg` (conteneur SVG autonome avec image intégrée). Il sert de logo par défaut aux pages de connexion et de bienvenue, à l'en-tête, au favicon, au manifeste PWA et aux principaux documents imprimables.

## Palette

| Usage | Couleur |
| --- | --- |
| Bleu principal | `#081F69` |
| Bleu interface | `#0C3D85` |
| Cyan / cartographie | `#0A95C7` |
| Turquoise secondaire | `#1A8992` |
| Sable (accents discrets) | `#F4C77D` |
| Fond clair | `#F3F8FC` |

## Compatibilité

Les chemins et identifiants techniques historiques `cgesn` (par exemple `src/components/cgesn`, les ID d'applications et les clés localStorage) sont volontairement conservés pour éviter les ruptures de navigation et de données. Les libellés visibles ont été modifiés en CITRAT.

Les anciennes URL externes propres à CGESN ont été neutralisées dans les cartes CITRAT : il faudra configurer les destinations officielles lors de la mise en service. Les logos d'autres applications intégrées peuvent rester propres à leurs modules.

Les exports PDF et les installations PWA doivent être vérifiés avec la nouvelle ressource SVG (certains générateurs PDF et certaines plateformes PWA demandent une image PNG). Les modules d'e-mail/backend ne sont pas encore entièrement migrés, donc leurs fonctionnalités ne sont pas validées.

## Recette après déploiement

1. `git pull origin main`
2. `sudo docker compose -p erp_citrat build web --progress=plain`
3. Si compilation réussie, `sudo docker compose -p erp_citrat up -d --no-build`
4. Vérifier /bienvenue, /connexion, /portail, RH et documents imprimés.
5. Vérifier le logo, le titre d'onglet, les boutons et les contrastes en grand écran et sur mobile.
6. Contrôler les liens des cartes externes et ne pas activer la production tant que les fonctions métier et les droits d'accès restent incomplets.

Ne jamais exécuter `docker compose down -v` pendant ces tests : le volume SQLite doit être préservé.
