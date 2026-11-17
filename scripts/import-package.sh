#!/usr/bin/env bash
set -euo pipefail

# Import initial du paquet PortalManager dans ce dépôt.
# Utilisation : ./scripts/import-package.sh /chemin/portalmanager_vps_sqlite_starter.zip
ZIP="${1:-}"
if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  echo "Usage : $0 /chemin/portalmanager_vps_sqlite_starter.zip" >&2
  exit 1
fi
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Erreur : arbre de travail non propre. Enregistrez vos modifications avant l'import." >&2
  exit 1
fi
echo "Import du paquet dans $ROOT"
# Conserve le README, le .gitignore et le workflow propres au dépôt.
unzip -q -o "$ZIP" -d "$ROOT" -x README.md .gitignore
git add -A
echo "Fichiers prêts pour vérification :"
git status --short
echo
echo "Vérifiez qu'aucun secret ni donnée client n'est inclus."
echo "Puis exécutez :"
echo '  git commit -m "feat: import PortalManager VPS SQLite starter"'
echo '  git push origin main'
