"""CITRAT account onboarding. No plaintext OTPs or passwords are persisted."""
import os
import re
import hmac
import ssl
import json
import time
import uuid
import hashlib
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone
from urllib.parse import quote
from fastapi import Body, Depends, HTTPException, Request

EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")
PHONE_RE = re.compile(r"^[+0-9(). -]{8,24}$")
PUBLIC_URL = os.getenv("PUBLIC_URL", "").rstrip("/")
MAIL_HOST = os.getenv("SMTP_HOST", "").strip()
MAIL_FROM = os.getenv("SMTP_FROM", "").strip()
MAIL_PORT = int(os.getenv("SMTP_PORT", "587"))
MAIL_USER = os.getenv("SMTP_USER", "")
MAIL_PASSWORD = os.getenv("SMTP_PASSWORD", "")
MAIL_SECURITY = os.getenv("SMTP_SECURITY", "starttls").lower()

def mail_ready():
    return bool(MAIL_HOST and MAIL_FROM and PUBLIC_URL.startswith("https://")
                and MAIL_SECURITY in ("starttls", "ssl"))

def send_mail(recipient, subject, text):
    if not mail_ready():
        raise HTTPException(503, "Messagerie non configurée. Contactez l'administrateur.")
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = MAIL_FROM, recipient, subject
    msg.set_content(text)
    try:
        if MAIL_SECURITY == "ssl":
            smtp = smtplib.SMTP_SSL(MAIL_HOST, MAIL_PORT, timeout=12,
                                   context=ssl.create_default_context())
        else:
            smtp = smtplib.SMTP(MAIL_HOST, MAIL_PORT, timeout=12)
        with smtp:
            if MAIL_SECURITY == "starttls":
                smtp.starttls(context=ssl.create_default_context())
            if MAIL_USER:
                smtp.login(MAIL_USER, MAIL_PASSWORD)
            smtp.send_message(msg)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(503, "Envoi de l'e-mail indisponible.") from exc

def now():
    return datetime.now(timezone.utc).isoformat()

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def code_hash(secret, request_id, code):
    return hmac.new(secret.encode(), (request_id + ":" + code).encode(),
                    hashlib.sha256).hexdigest()

def email(value):
    value = str(value or "").strip().lower()
    if not EMAIL_RE.fullmatch(value) or len(value) > 254:
        raise HTTPException(422, "Adresse e-mail invalide")
    return value

def require_admin(current):
    if current["role"] != "admin":
        raise HTTPException(403, "Accès administrateur requis")

def install(app, db, hash_pw, verify_pw, secret):
    # Created after the legacy users/sessions tables.
    with db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS signup_requests(
            id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL,
            last_name TEXT NOT NULL, telephone TEXT NOT NULL, password_hash TEXT NOT NULL,
            status TEXT NOT NULL, otp_hash TEXT, otp_expires INTEGER,
            otp_attempts INTEGER NOT NULL DEFAULT 0, last_sent INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL, verified_at TEXT, reviewed_at TEXT, reviewed_by TEXT,
            decision_note TEXT
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS password_reset_tokens(
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
            expires INTEGER NOT NULL, created_at TEXT NOT NULL
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS auth_events(
            id TEXT PRIMARY KEY, actor_id TEXT, subject_email TEXT, action TEXT NOT NULL,
            occurred_at TEXT NOT NULL
        )""")
        if "account_status" not in {r["name"] for r in c.execute("PRAGMA table_info(users)")}:
            c.execute("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'")

    def session_user(request: Request):
        cookie = request.cookies.get("pm_session", "")
        if not cookie:
            raise HTTPException(401, "Authentification requise")
        with db() as c:
            row = c.execute("""SELECT u.id,u.email,u.name,u.role,u.profile_json,u.account_status
                FROM sessions s JOIN users u ON u.id=s.user_id
                WHERE s.token_hash=? AND s.expires>?""",
                (digest(cookie), int(time.time()))).fetchone()
        if not row:
            raise HTTPException(401, "Session expirée")
        if row["account_status"] != "active":
            raise HTTPException(403, "Compte suspendu")
        p = json.loads(row["profile_json"] or "{}")
        return {**p, "id": row["id"], "email": row["email"], "name": row["name"],
                "role": row["role"], "super_admin": row["role"] == "admin",
                "account_status": row["account_status"]}

    def admin_user(current=Depends(session_user)):
        require_admin(current)
        return current

    @app.get("/api/public/auth-config")
    def auth_config():
        return {"registration_enabled": mail_ready(), "verification_required": True}

    @app.post("/api/public/signup")
    def signup(data: dict = Body(...)):
        if not mail_ready():
            raise HTTPException(503, "Inscriptions indisponibles : service e-mail non configuré")
        em = email(data.get("email"))
        first = str(data.get("first_name") or "").strip()
        last = str(data.get("last_name") or "").strip()
        tel = str(data.get("telephone") or "").strip()
        password = data.get("password")
        if not first or not last or len(first)>100 or len(last)>100:
            raise HTTPException(422, "Nom et prénom requis")
        if not PHONE_RE.fullmatch(tel):
            raise HTTPException(422, "Numéro de téléphone invalide")
        if not isinstance(password, str) or not 14 <= len(password) <= 256:
            raise HTTPException(422, "Mot de passe : 14 caractères minimum")
        current_time = int(time.time())
        req_id = str(uuid.uuid4())
        otp = f"{secrets.randbelow(1000000):06d}"
        pw_hash = hash_pw(password)
        with db() as c:
            c.execute("BEGIN IMMEDIATE")
            if c.execute("SELECT 1 FROM users WHERE email=?", (em,)).fetchone():
                c.execute("ROLLBACK")
                raise HTTPException(409, "Adresse déjà utilisée")
            older = c.execute("SELECT * FROM signup_requests WHERE email=?", (em,)).fetchone()
            if older and older["status"] in ("pending", "approved"):
                c.execute("ROLLBACK")
                raise HTTPException(409, "Une demande est déjà en attente")
            if older and current_time-older["last_sent"] < 120:
                c.execute("ROLLBACK")
                raise HTTPException(429, "Réessayez dans deux minutes")
            if older:
                c.execute("DELETE FROM signup_requests WHERE email=?", (em,))
            c.execute("""INSERT INTO signup_requests(
                id,email,first_name,last_name,telephone,password_hash,status,
                otp_hash,otp_expires,otp_attempts,last_sent,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (req_id, em, first, last, tel, pw_hash, "unverified",
                 code_hash(secret, req_id, otp), current_time+900, 0,
                 current_time, now()))
            c.commit()
        # Account remains unverified if SMTP delivery fails; retry is rate-limited.
        send_mail(em, "ERP CITRAT — Vérification de votre adresse",
                  "Votre code de confirmation est : " + otp +
                  "\nIl expire dans 15 minutes. Ne le partagez pas.")
        return {"success": True, "message": "Code de vérification envoyé"}

    @app.post("/api/public/signup/verify")
    def verify_signup(data: dict = Body(...)):
        em = email(data.get("email"))
        otp = str(data.get("otp") or data.get("otpCode") or "").strip()
        if not re.fullmatch(r"\d{6}", otp):
            raise HTTPException(422, "Code invalide")
        with db() as c:
            c.execute("BEGIN IMMEDIATE")
            req = c.execute("SELECT * FROM signup_requests WHERE email=?", (em,)).fetchone()
            if not req or req["status"] != "unverified":
                c.execute("ROLLBACK")
                raise HTTPException(400, "Demande introuvable ou déjà vérifiée")
            if req["otp_attempts"] >= 5:
                c.execute("ROLLBACK")
                raise HTTPException(429, "Trop de tentatives. Demandez un nouveau code.")
            c.execute("UPDATE signup_requests SET otp_attempts=otp_attempts+1 WHERE id=?", (req["id"],))
            if int(time.time())>req["otp_expires"] or not hmac.compare_digest(
                    code_hash(secret, req["id"], otp), req["otp_hash"]):
                c.commit()
                raise HTTPException(400, "Code incorrect ou expiré")
            c.execute("UPDATE signup_requests SET status='pending',verified_at=?,otp_hash=NULL WHERE id=?",
                      (now(), req["id"]))
            c.execute("INSERT INTO auth_events VALUES (?,?,?,?,?)",
                      (str(uuid.uuid4()), None, em, "email_verified", now()))
            c.commit()
        # Notification admin is best-effort; the verified request stays pending.
        try:
            admin_address = os.getenv("ADMIN_EMAIL", "").strip()
            if admin_address:
                send_mail(admin_address, "ERP CITRAT — Demande à approuver",
                          "Une nouvelle inscription vérifiée attend votre décision : " + em +
                          "\n" + PUBLIC_URL + "/administration?tab=registrations")
        except HTTPException:
            pass
        return {"success": True, "status": "pending",
                "message": "Adresse vérifiée. En attente de validation par l'administrateur."}

    @app.post("/api/public/signup/resend")
    def resend_signup(data: dict = Body(...)):
        em = email(data.get("email"))
        if not mail_ready():
            raise HTTPException(503, "Messagerie non configurée")
        with db() as c:
            c.execute("BEGIN IMMEDIATE")
            req = c.execute("SELECT * FROM signup_requests WHERE email=?", (em,)).fetchone()
            if not req or req["status"] != "unverified":
                c.execute("ROLLBACK")
                return {"success": True}
            if int(time.time())-req["last_sent"] < 120:
                c.execute("ROLLBACK")
                raise HTTPException(429, "Réessayez dans deux minutes")
            otp = f"{secrets.randbelow(1000000):06d}"
            c.execute("""UPDATE signup_requests SET otp_hash=?,otp_expires=?,
                         otp_attempts=0,last_sent=? WHERE id=?""",
                      (code_hash(secret,req["id"],otp),int(time.time())+900,
                       int(time.time()),req["id"]))
            c.commit()
        send_mail(em,"ERP CITRAT — Nouveau code",
                  "Code de confirmation : "+otp+"\nValable 15 minutes.")
        return {"success":True}

    @app.get("/api/admin/registrations")
    def registrations(current=Depends(admin_user)):
        with db() as c:
            rows=c.execute("""SELECT id,email,first_name,last_name,telephone,status,
                        created_at,verified_at,reviewed_at,decision_note
                        FROM signup_requests ORDER BY created_at DESC""").fetchall()
        return [dict(x) for x in rows]

    @app.post("/api/admin/registrations/{rid}/decision")
    def decision(rid: str, data: dict = Body(...), current=Depends(admin_user)):
        action = data.get("action")
        if action not in ("approve", "reject"):
            raise HTTPException(422, "Action invalide")
        grade = str(data.get("grade") or "").strip()
        office = str(data.get("office") or "").strip()
        department = str(data.get("department") or "").strip()
        if action=="approve" and (not grade or not office):
            raise HTTPException(422, "Le profil et le bureau sont obligatoires")
        with db() as c:
            c.execute("BEGIN IMMEDIATE")
            req=c.execute("SELECT * FROM signup_requests WHERE id=?", (rid,)).fetchone()
            if not req or req["status"]!="pending":
                c.execute("ROLLBACK")
                raise HTTPException(409, "Demande déjà traitée ou non vérifiée")
            if action=="approve":
                profile=c.execute("SELECT 1 FROM records WHERE entity='AccessProfile' AND json_extract(payload,'$.profile_id')=?",(grade,)).fetchone()
                bureau=c.execute("SELECT 1 FROM records WHERE entity='OfficeTerminal' AND json_extract(payload,'$.office_name')=?",(office,)).fetchone()
                if not profile or not bureau:
                    c.execute("ROLLBACK")
                    raise HTTPException(422, "Profil ou bureau inexistant")
                if department:
                    dep=c.execute("SELECT 1 FROM records WHERE entity='Department' AND json_extract(payload,'$.value')=?",(department,)).fetchone()
                    if not dep:
                        c.execute("ROLLBACK")
                        raise HTTPException(422, "Département inexistant")
                if c.execute("SELECT 1 FROM users WHERE email=?",(req["email"],)).fetchone():
                    c.execute("ROLLBACK")
                    raise HTTPException(409,"Compte déjà existant")
                uid=str(uuid.uuid4())
                name=req["last_name"]+" "+req["first_name"]
                profile_json={"first_name":req["first_name"],"last_name":req["last_name"],
                              "telephone":req["telephone"],"grade":grade,"office":office,
                              "department":department,"access":[]}
                c.execute("""INSERT INTO users(id,email,name,password_hash,role,profile_json,account_status)
                    VALUES (?,?,?,?,?,?,?)""",
                    (uid,req["email"],name,req["password_hash"],"user",
                     json.dumps(profile_json,ensure_ascii=False),"active"))
            c.execute("""UPDATE signup_requests SET status=?,password_hash='',
                        reviewed_at=?,reviewed_by=?,decision_note=? WHERE id=?""",
                      ("approved" if action=="approve" else "rejected",now(),
                       current["id"],str(data.get("note") or "")[:500],rid))
            c.execute("INSERT INTO auth_events VALUES (?,?,?,?,?)",
                      (str(uuid.uuid4()),current["id"],req["email"],action,now()))
            c.commit()
        try:
            send_mail(req["email"],"ERP CITRAT — Décision sur votre demande",
                      "Votre compte a été approuvé. Vous pouvez vous connecter : "
                      +PUBLIC_URL+"/connexion" if action=="approve"
                      else "Votre demande d'accès au portail CITRAT n'a pas été acceptée.")
        except HTTPException:
            # Committed decisions must not be repeated because of an SMTP failure.
            return {"success":True,"status":"approved" if action=="approve" else "rejected",
                    "mail_delivered":False}
        return {"success":True,"status":"approved" if action=="approve" else "rejected",
                "mail_delivered":True}

    @app.patch("/api/admin/accounts/{uid}/status")
    def account_status(uid: str,data: dict = Body(...),current=Depends(admin_user)):
        status=data.get("status")
        if status not in ("active","suspended"):
            raise HTTPException(422,"Statut invalide")
        if uid==current["id"]:
            raise HTTPException(409,"Vous ne pouvez pas suspendre votre compte")
        with db() as c:
            c.execute("BEGIN IMMEDIATE")
            row=c.execute("SELECT role,email FROM users WHERE id=?",(uid,)).fetchone()
            if not row: raise HTTPException(404,"Compte introuvable")
            if row["role"]=="admin": raise HTTPException(403,"Impossible de suspendre un administrateur")
            c.execute("UPDATE users SET account_status=? WHERE id=?",(status,uid))
            if status=="suspended":
                c.execute("DELETE FROM sessions WHERE user_id=?",(uid,))
            c.execute("INSERT INTO auth_events VALUES (?,?,?,?,?)",
                      (str(uuid.uuid4()),current["id"],row["email"],status,now()))
            c.commit()
        return {"success":True,"status":status}

    @app.post("/api/public/password/forgot")
    def forgot_password(data: dict = Body(...)):
        em=email(data.get("email"))
        # Generic response regardless of account existence.
        result={"success":True,"message":"Si cette adresse existe, un lien vous sera envoyé."}
        if not mail_ready():
            raise HTTPException(503,"Récupération indisponible : service e-mail non configuré")
        with db() as c:
            row=c.execute("SELECT id FROM users WHERE email=?",(em,)).fetchone()
            last=c.execute("SELECT MAX(created_at) FROM auth_events WHERE subject_email=? AND action='password_reset_requested'",(em,)).fetchone()[0]
            if last:
                try:
                    if (datetime.now(timezone.utc)-datetime.fromisoformat(last)).total_seconds()<120:
                        return result
                except ValueError:
                    pass
            if not row: return result
            token=secrets.token_urlsafe(40)
            c.execute("DELETE FROM password_reset_tokens WHERE user_id=?",(row["id"],))
            c.execute("INSERT INTO password_reset_tokens VALUES (?,?,?,?)",
                      (digest(token),row["id"],int(time.time())+1800,now()))
            c.execute("INSERT INTO auth_events VALUES (?,?,?,?,?)",
                      (str(uuid.uuid4()),None,em,"password_reset_requested",now()))
        # Don't reveal whether the account exists on delivery failure.
        try:
            send_mail(em,"ERP CITRAT — Réinitialisation du mot de passe",
                      "Pour définir un nouveau mot de passe, ouvrez ce lien valable 30 minutes :\n"
                      +PUBLIC_URL+"/reset-password?token="+quote(token))
        except HTTPException:
            pass
        return result

    @app.post("/api/public/password/reset")
    def reset_password(data: dict = Body(...)):
        token=str(data.get("resetToken") or "")
        new_password=data.get("newPassword")
        if not isinstance(new_password,str) or not 14<=len(new_password)<=256:
            raise HTTPException(422,"Mot de passe : 14 caractères minimum")
        with db() as c:
            c.execute("BEGIN IMMEDIATE")
            row=c.execute("SELECT user_id,expires FROM password_reset_tokens WHERE token_hash=?",
                          (digest(token),)).fetchone()
            if not row or row["expires"]<int(time.time()):
                c.execute("ROLLBACK")
                raise HTTPException(400,"Lien invalide ou expiré")
            c.execute("UPDATE users SET password_hash=? WHERE id=?",
                      (hash_pw(new_password),row["user_id"]))
            c.execute("DELETE FROM password_reset_tokens WHERE user_id=?",(row["user_id"],))
            c.execute("DELETE FROM sessions WHERE user_id=?",(row["user_id"],))
            c.execute("INSERT INTO auth_events VALUES (?,?,?,?,?)",
                      (str(uuid.uuid4()),row["user_id"],None,"password_changed",now()))
            c.commit()
        return {"success":True}

    return session_user
