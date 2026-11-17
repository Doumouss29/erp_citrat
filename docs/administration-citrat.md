# ERP CITRAT — Administration autonome / SQLite

## Périmètre de cette livraison

Les anciens bureaux fictifs (Abidjan, Yamoussoukro, Daloa, etc.) et comptes mails CGESN ne sont plus utilisés comme sources de vérité. Aucun service ou profil n'est créé par défaut. Chaque client commence avec une base métier vide et un compte administrateur préexistant.

| Module | Source | État |
| --- | --- | --- |
| Applications | `PortalApp` + modules internes du code | Paramétrage basique conservé ; upload de fichiers et appels externes encore à migrer |
| Profils | `AccessProfile` (SQLite) | Création manuelle et attribution des modules |
| Utilisateurs | Table réelle `users` (SQLite) | Liste, mises à jour d'attributs et suppression contrôlée ; création/invitation e-mail non migrée |
| CITRAT-Board | `OfficeTerminal`, `AnnuaireAttente`, profils | Les bureaux configurés par CITRAT s'affichent ; d'autres fonctions Board restent à migrer |
| Bureaux | `OfficeTerminal` (SQLite) | CRUD des bureaux et gestionnaires |
| Départements | `Department` (SQLite) | Nouveau CRUD, aucune donnée initiale |
| Validateur RH | `ConfigurationApp` (SQLite) + bureaux/départements configurés | Paramétrage des validateurs ; automatisations RH non migrées |
| Alertes HSE | `ResponsableHSE` (SQLite) | CRUD ; envoi effectif des notifications à migrer |
| Consentements | Table `users`, `consent_events` et `ConsentementDonnees` | Suivi des décisions enregistrées ; export et e-mails à valider |

**Ne pas annoncer une mise en production** avant les tests complets des fonctions métier et de l'autorisation des utilisateurs non administrateurs.

## Déploiement sur VPS de recette

```bash
cd /opt/apps/erp_citrat
git pull origin main
sudo docker compose -p erp_citrat up -d --build
sudo docker compose -p erp_citrat ps
curl -f http://127.0.0.1:8088/api/health
```

## Remise à zéro de l'environnement CITRAT

**Attention : destructif sur les données CITRAT uniquement.** Ne jamais utiliser `docker compose down -v` et ne jamais exécuter de commandes dans le dossier Merifield.

Le script `backend/reset_demo.py` sauvegarde d'abord SQLite dans `/data/backups`, puis supprime **toutes les données métier, les comptes ordinaires, les sessions et les journaux de consentement**. Les comptes administrateurs et leurs mots de passe sont conservés. Il requiert explicitement une variable de confirmation.

**Commande, après déploiement de la nouvelle image backend :**

```bash
sudo docker compose -p erp_citrat exec -T -e ERP_RESET_CONFIRM=RESET_ERP_CITRAT api python -m backend.reset_demo
```

L'application déconnecte alors les sessions existantes ; reconnectez-vous avec le compte administrateur et acceptez de nouveau la notice. Vérifiez le journal de sortie : il affiche le chemin de la sauvegarde.

Les sauvegardes restent dans le volume SQLite : elles doivent être copiées en dehors du VPS avant toute suppression de volume ou de serveur.

## Vérifications

- Vérifier que les onglets Bureaux, Départements, Profils et Utilisateurs montrent des données vierges (sauf compte administrateur).
- Créer un bureau de test, un département de test et un profil ; recharger le navigateur et vérifier la persistance.
- Valider le journal de consentement après reconnexion.
- Vérifier les accès du compte administrateur et la non-exposition d'endpoints aux visiteurs non connectés.
- Tester les autres onglets et les fonctions backend au fur et à mesure de leur migration.

La CI GitHub compile React et réalise des tests API SQLite.
