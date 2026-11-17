"""Réinitialisation EXPLICITE des données de recette ERP CITRAT.
Usage dans le conteneur API:
 ERP_RESET_CONFIRM=RESET_ERP_CITRAT python -m backend.reset_demo

- Sauvegarde horodatée SQLite dans /data/backups avant toute suppression
- Conserve les comptes administrateurs et leurs mots de passe
- Vide les données métier, comptes ordinaires, sessions et journaux de consentement
- N'affecte pas Merifield ni ses volumes
"""
import os
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(os.environ.get("DATA_DIR", "/data"))
DB = DATA / "portalmanager.sqlite3"
TOKEN = "RESET_ERP_CITRAT"

def main():
    if os.environ.get("ERP_RESET_CONFIRM") != TOKEN:
        raise SystemExit("Opération refusée : variable ERP_RESET_CONFIRM manquante.")
    if not DB.is_file():
        raise SystemExit("Base absente, rien à réinitialiser.")
    backups = DATA / "backups"
    backups.mkdir(mode=0o700, parents=True, exist_ok=True)
    backup_path = backups / ("citrat-before-reset-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + ".sqlite3")
    with sqlite3.connect(DB, timeout=30) as source:
        with sqlite3.connect(backup_path) as target:
            source.backup(target)
    backup_path.chmod(0o600)
    print("Sauvegarde créée :", backup_path)
    with sqlite3.connect(DB, timeout=30) as c:
        c.execute("PRAGMA foreign_keys=ON")
        c.execute("BEGIN IMMEDIATE")
        try:
            admin_count = c.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
            if admin_count < 1:
                raise RuntimeError("Aucun administrateur à conserver : abandon.")
            records_count = c.execute("SELECT COUNT(*) FROM records").fetchone()[0]
            users_count = c.execute("SELECT COUNT(*) FROM users WHERE role!='admin'").fetchone()[0]
            # Les tables du nouveau parcours d'inscription sont également réinitialisées.
            for table in ("signup_requests", "password_reset_tokens", "auth_events"):
                if c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone():
                    c.execute('DELETE FROM "' + table + '"')
            c.execute("DELETE FROM sessions")
            c.execute("DELETE FROM consent_events")
            c.execute("DELETE FROM records")
            c.execute("DELETE FROM users WHERE role!='admin'")
            for uid, payload in c.execute("SELECT id,profile_json FROM users WHERE role='admin'").fetchall():
                profile = json.loads(payload or "{}")
                profile.pop("consentement_version", None)
                profile.pop("consentement_date", None)
                c.execute("UPDATE users SET profile_json=? WHERE id=?",
                          (json.dumps(profile, ensure_ascii=False), uid))
            c.commit()
            print(f"Réinitialisation terminée : {records_count} enregistrements et {users_count} comptes ordinaires supprimés.")
            print(f"{admin_count} compte(s) administrateur(s) conservé(s). Reconnexion et nouveau consentement nécessaires.")
        except Exception:
            c.rollback()
            raise

if __name__ == "__main__":
    main()
