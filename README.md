# PortalManager — migration VPS (SQLite)

Dépôt de travail pour l'autonomisation de PortalManager depuis Base44.

## État du projet

Le **socle technique** est une adaptation de l'application React existante avec FastAPI et SQLite, mais **ce n'est pas encore une migration fonctionnelle complète**. Les traitements métier, les permissions, les intégrations e-mail/fichiers et les tests de sécurité doivent être finalisés avant tout déploiement client.

## Architecture cible

- Interface : React + Vite
- API : Python FastAPI
- Stockage initial : SQLite, un volume et une base séparés par client
- Déploiement : Docker Compose derrière un reverse-proxy HTTPS
- Évolution : possibilité de migrer vers PostgreSQL ultérieurement

## Import du code

L'archive de travail est `portalmanager_vps_sqlite_starter.zip`. Extraire **son contenu** à la racine de ce dépôt, sans créer de sous-dossier supplémentaire. Vérifier la présence de `compose.yml`, `backend/main.py`, `src/` et `backend/schemas/`.

Ne jamais committer de secrets (`.env`, tokens), de bases SQLite (`*.db`, `*.sqlite*`), de volumes ou de données clients.

## Lancement de recette (après import complet)

```bash
cp .env.example .env
# Définir ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET
docker compose up -d --build
docker compose ps
curl -f http://127.0.0.1:8088/api/health
```

L'application écoute localement sur 127.0.0.1 ; configurer un proxy HTTPS avant toute exposition. Ne pas utiliser de données réelles tant que les fonctionnalités, les permissions et la sécurité n'ont pas été validées.

Voir `DEPLOIEMENT.md` dans le paquet de départ pour les limites détaillées.

## Méthode de travail

Développer sur branches `feature/*`, ouvrir une pull request, lancer les contrôles, puis fusionner sur `main` après revue. Garder un historique des migrations SQLite et un test de restauration des sauvegardes.
