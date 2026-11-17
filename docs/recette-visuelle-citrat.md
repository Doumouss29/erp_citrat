# Recette visuelle CITRAT

Date : 17 novembre 2026. Audit de code et correctifs sur le dépôt ; **la recette navigateur de toutes les routes n'est pas encore réalisée**.

## Socle de charte
- Bleu principal : `#081F69`
- Bleu interface : `#0C3D85`
- Cyan secondaire : `#0A95C7`
- Turquoise d'accompagnement : `#1A8992`
- Fond clair : `#F3F8FC`
- Accents ponctuels : `#F4C77D`
- Logo par défaut : `/logo-citrat.svg`
- Sous-titre : `DAGNOKO HAMED`

## Pages d'authentification revues
- `/bienvenue`
- `/connexion`
- `/inscription` : ancien dégradé vert corrigé, logo et titre ajoutés
- `/mot-de-passe-oublie` : ancienne couleur corrigée
- Pages utilisant `AuthLayout` (par exemple la réinitialisation) : thème bleu commun
- Page de chargement `Landing` : ancien dégradé vert corrigé

## Modules concernés par l'unification des variables de thème
Portail, RH, Board, E-Cadastre, E-Guide, Assistance, CSST, HSE, Coprociv, dans la mesure où ils utilisent les variables de thème communes. Les couleurs de statut (vert succès, rouge erreur, orange alerte) conservent leur sens.

Plusieurs composants utilisent encore des styles locaux (couleurs propres aux cartes, graphiques, cartographies). Leur recette visuelle complète doit être effectuée après compilation, en desktop et mobile.

## Vérifications après déploiement
1. Recompiler : `sudo docker compose -p erp_citrat build web --progress=plain`.
2. Si OK : `sudo docker compose -p erp_citrat up -d --no-build`.
3. Rafraîchir avec Ctrl+F5.
4. Contrôler sur mobile et bureau : accueil, connexion, inscription, mot de passe oublié, portail, navigation des modules, tableaux et modales.
5. Ne pas confondre la cohérence visuelle avec les fonctionnalités : inscription, e-mails et certaines fonctions backend Base44 restent non migrées.
