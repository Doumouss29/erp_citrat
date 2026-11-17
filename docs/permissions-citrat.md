# ERP CITRAT — Permissions fines (RBAC)

## Modèle

`Utilisateur → Profil AccessProfile → Application → Module → Action → Périmètre des données`

Les profils créés dans **Administration → Profils** conservent leurs applications dans `apps` et contiennent maintenant une matrice `permissions` (non renseignée par défaut). Un accès à une application n'accorde pas implicitement la lecture de toutes ses données.

Un module autorise séparément : `view` (consulter), `create`, `edit`, `delete`, `export` et `approve`.

Les périmètres sont :
- `own` : propriété explicite de l'enregistrement via `owner_id`, `user_id`, `created_by_id`, `employee_user_id` ou adresse e-mail propriétaire.
- `office` : correspondance obligatoire avec les identifiants ou noms de bureaux enregistrés sur le compte.
- `department` : correspondance avec le département du compte.
- `all` : toutes les données du module, uniquement après attribution explicite.

Si le rattachement d'un enregistrement ne peut pas être prouvé, le backend refuse l'accès. Les entités non cataloguées dans `backend/permissions.py` restent réservées aux administrateurs.

## Administration

1. Créer un profil, cocher les applications souhaitées.
2. Ouvrir sa carte et développer **Permissions détaillées**.
3. Définir les actions et la portée de chaque module, puis cliquer sur **Enregistrer les droits**.
4. Dans **Administration → Inscriptions**, approuver un utilisateur avec un profil et un bureau.
5. Dans **Inscriptions → Comptes existants → Restreindre les droits**, retirer individuellement des droits déjà attribués par le profil. Une exception individuelle ne peut pas ajouter de permission.

Les droits sont lus depuis SQLite à chaque appel API, pas depuis les cases React ni le localStorage. La colonne `permission_denials` des comptes sert uniquement à **réduire** les autorisations d'un profil.

## Endpoints

- `GET /api/permissions/catalog` : modules disponibles et libellés.
- `GET /api/permissions/me` : droits effectifs de l'utilisateur connecté.
- `GET /api/entities/{name}`, `POST /api/entities/{name}/filter`, `GET /api/entities/{name}/{id}` : filtrage des lignes au serveur.
- `POST /api/entities/{name}`, `POST /api/entities/{name}/bulk`, `PATCH /api/entities/{name}/{id}`, `DELETE /api/entities/{name}/{id}` : contrôle de permission et vérification du périmètre avant écriture.
- `GET /api/entities/{name}/export` : export JSON plafonné à 5 000 lignes, exige **view** et **export** et respecte le périmètre.
- `GET /api/admin/access-events` : journal des modifications de droits (administrateurs uniquement).

Le consentement aux données personnelles reste obligatoire avant les opérations métier des comptes standards.

## Sécurité et limites actuelles

- Le rôle système `admin` conserve les droits d'administration globaux, indépendamment du profil.
- L'ancienne API des fonctions métier `/api/functions/*` reste réservée aux administrateurs tant que chaque fonction n'a pas de politique vérifiée. Il ne faut **pas** l'ouvrir globalement pour contourner un 403.
- Les permissions `approve` sont configurables, mais les workflows de validation (congés, rapports, comptabilité, etc.) doivent encore relier leurs endpoints métier à ces vérifications. La coche seule ne rend pas une validation opérationnelle.
- Les composants React hérités de Base44 peuvent encore montrer des boutons incompatibles avec les droits ; l'API rejette alors les opérations non autorisées. Le masquage/habilitation de tous les boutons de chaque module est un travail de recette séparé.
- Le filtrage par bureau/département exige un rattachement fiable dans chaque enregistrement. Les anciens enregistrements sans métadonnées d'appartenance ne deviennent pas visibles automatiquement.
- Une permission de lecture expose les données reçues dans le navigateur ; elle ne peut pas empêcher une copie manuelle. L'autorisation d'export porte sur l'endpoint serveur dédié, pas sur les outils du navigateur.
- Ce socle est une mise en place de la sécurité des **entités cataloguées**. Les intégrations externes et certains modules métiers Base44 nécessitent des travaux supplémentaires.
- En présence de multiples entreprises ou clients, chaque installation utilise un volume SQLite et une configuration propres ; le catalogue d'applications reste commun.

## Recette avant production

```bash
cd /opt/apps/erp_citrat
git pull origin main
sudo docker compose -p erp_citrat up -d --build
sudo docker compose -p erp_citrat ps
curl -fsS http://127.0.0.1:8088/api/health
```

Ne jamais exécuter `docker compose down -v`, qui effacerait les volumes du projet. Les tests CI incluent `backend.test_permissions` : refus par défaut, isolement par bureau, lecture et création, suppression/modification refusées, export protégé et exceptions individuelles.
