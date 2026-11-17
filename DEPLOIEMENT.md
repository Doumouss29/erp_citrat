# PortalManager — socle autonome SQLite (prototype technique)

**Statut : non prêt pour la production.** Application source React copiée; SDK Base44 remplacé par un adaptateur local minimal. CRUD générique sur les entités du ZIP et authentification administrateur implémentés. Ce n'est **pas** une migration fonctionnelle complète.

## Installation de développement / recette sur VPS

```bash
cp .env.example .env
# Modifier ADMIN_EMAIL, ADMIN_PASSWORD et SESSION_SECRET (openssl rand -hex 32)
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1:8088/api/health
```

L'interface est uniquement accessible sur `127.0.0.1:8088` ; mettre un reverse-proxy HTTPS (Traefik/Caddy/Nginx) devant le port **avant** d'ouvrir au public. Ne pas changer COOKIE_SECURE en false pour exposer l'app sur HTTP public. En local HTTP sans HTTPS, la connexion cookie ne fonctionne pas avec COOKIE_SECURE=true.

## Modèles
Les schémas Base44 (`backend/schemas`) servent actuellement de **liste blanche d'entités**. Les documents sont stockés dans SQLite en JSON et **ne sont pas encore validés par ces schémas**. Les relations, contraintes, index, calculs métier et permissions doivent être implémentés avant production.

## Périmètre implémenté
- Endpoint `/api/health`
- Création de l'administrateur initial sur base vide uniquement
- Connexion avec mot de passe PBKDF2, cookie de session HttpOnly/SameSite Strict
- CRUD et filtres simples sur des documents SQLite
- Conteneurs API Python et interface React séparés
- Persistance SQLite dans un volume Docker par instance

## Fonctionnalités NON migrées / blocantes
- 46 fonctions backend métier, automatisations et traitements serveur (renvoient HTTP 501)
- Services `Core`: fichiers, e-mail, IA, documents, etc.
- Gestion multi-utilisateur, rôles, permissions granulaires; pour éviter une fuite de données, seul le rôle admin peut accéder au CRUD
- Inscription, invitation et récupération de mot de passe
- Realtime, agrégations et opérateurs de filtre avancés
- Validation des contraintes des modèles et transactions métier
- Sauvegardes restaurables et tests métier
- Compatibilité finale de toutes les pages : non validée

## Sauvegarde SQLite
Avant copie, utiliser l'API SQLite de sauvegarde et ne pas copier uniquement le fichier pendant des écritures WAL:
`sqlite3.Connection.backup()` en Python. Tester les restaurations régulièrement. Conserver sauvegardes chiffrées hors VPS.

## Plusieurs clients
Dupliquer ce dossier par client, avec `.env`, port local, volume SQLite, domaine, secrets et déploiement distincts. **Ne jamais partager le volume SQLite ou les secrets** entre clients. Pour plus de charge ou forte concurrence, migrer vers PostgreSQL via une couche de stockage et des migrations versionnées.

## Sécurité et production
Le code est un **prototype de migration** : pas de validation complète des modèles, pas de contrôle utilisateur métier, pas de rate limiting / anti-bruteforce, ni tests de régression. Ne pas le considérer comme une application sécurisée pour clients réels. Cette première livraison sert de base au portage et aux tests.
