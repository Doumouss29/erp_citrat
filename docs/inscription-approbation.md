# Comptes utilisateurs — ERP CITRAT (SQLite)

## Parcours implémenté

1. Inscription publique `/inscription` avec nom, prénom, e-mail, téléphone et mot de passe (14 caractères minimum).
2. E-mail contenant un code unique à 6 chiffres, valable 15 minutes, avec 5 tentatives au maximum et délai de renvoi de 120 secondes.
3. Validation de l'e-mail : passage en `pending`. Aucun compte actif ni session n'est créé automatiquement.
4. Administration → **Inscriptions** : validation manuelle avec profil d'accès et bureau **déjà créés dans SQLite** ; département facultatif.
5. Approbation : compte utilisateur activé et mot de passe haché. Refus : aucune activation. Notification e-mail si le SMTP répond.
6. Connexion uniquement pour les comptes actifs. Suspension : toutes les sessions de ce compte sont supprimées.
7. Invitation par l'administrateur : e-mail contenant un lien d'inscription, suivi des mêmes étapes de vérification et d'approbation.
8. Mot de passe oublié : lien à usage unique, valable 30 minutes, et invalidation de toutes les anciennes sessions après réinitialisation.
9. Consentement personnel à la première connexion après approbation.

Les comptes ordinaires reçoivent toujours le rôle système `user`. Le profil métier et le bureau sont attribués par l'administrateur : l'inscription publique ne permet **jamais** de devenir administrateur.

## SMTP obligatoire pour les inscriptions publiques

Le système est **fail closed** : pas de SMTP, pas d'inscription ni de réinitialisation de mot de passe. L'administrateur initial continue de pouvoir se connecter.

Ajouter dans le `.env` du VPS :

```dotenv
PUBLIC_URL=https://erp-citrat.158-69-201-110.sslip.io
SMTP_HOST=smtp.votre-prestataire.tld
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=compte-d-envoi
SMTP_PASSWORD=mot-de-passe-application
SMTP_FROM=ERP CITRAT <no-reply@votre-domaine.tld>
```

L'adresse `SMTP_FROM` et le domaine doivent être autorisés par votre fournisseur SMTP. Vérifier SPF, DKIM et DMARC pour les envois réels. Ne jamais partager ces identifiants ni les committer dans GitHub.

Après configuration et **avant** d'autoriser les inscriptions réelles, vérifier la délivrabilité avec une adresse de test et les journaux du conteneur API.

```bash
cd /opt/apps/erp_citrat
git pull origin main
sudo docker compose -p erp_citrat up -d --build
sudo docker compose -p erp_citrat ps
curl -fsS https://erp-citrat.158-69-201-110.sslip.io/api/public/auth-config
```

Une réponse `registration_enabled: true` signifie uniquement que les paramètres obligatoires semblent présents, **pas** que le SMTP délivre correctement.

## Sécurité et limites

- Les codes OTP et liens de réinitialisation sont hachés dans SQLite. Les secrets SMTP restent uniquement dans `.env`.
- Les statuts sont contrôlés dans le backend ; aucune approbation n'est possible sans adresse vérifiée.
- Le compte administrateur ne peut pas être suspendu par l'interface d'approbation.
- Les mots de passe ne sont jamais renvoyés par les API utilisateurs ou d'administration.
- Les opérations de lecture/écriture des entités métiers restent **réservées aux administrateurs** jusqu'à la migration de permissions fines par module et bureau. Un compte nouvellement activé peut se connecter, mais ses applications métiers ne sont pas encore pleinement utilisables : ne pas ouvrir globalement les entités pour contourner ce contrôle.
- Le suivi des envois est rudimentaire : les notifications administrateur et d'approbation sont directes, sans file ni relance.
- Les limites de débit d'inscription utilisent le délai par adresse e-mail ; avant une exposition importante, ajouter un anti-abus au niveau Traefik et des limites par IP ainsi qu'une supervision SMTP.
- Les comptes déjà existants restent actifs par défaut à la migration de la colonne `account_status`.

## Tests

La CI exécute `backend.test_onboarding` : vérification e-mail simulée, attente de validation, refus de l'approbation sans droits, attribution d'un profil/bureau réels, connexion, contrôle d'accès, consentement, réinitialisation du mot de passe et suspension.
Les e-mails sont **simulés uniquement dans les tests CI**, jamais dans le serveur de production.
