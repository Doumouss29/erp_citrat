import os, json, sqlite3, secrets, hashlib, hmac, uuid, re, time
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from fastapi import FastAPI, Request, Response, HTTPException, Depends, Body
from fastapi.responses import JSONResponse
from backend.permissions import public_catalog, validate_permissions, validate_denials, may, require_record, within_scope, ENTITY_MODULE, resolve_rule

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('DATA_DIR', '/data'))
DB = DATA / 'portalmanager.sqlite3'
SCHEMAS = ROOT / 'schemas'
DATA.mkdir(parents=True, exist_ok=True)
SCHEMA_NAMES = {p.stem for p in SCHEMAS.glob('*.jsonc')} | {p.stem for p in SCHEMAS.glob('*.json')}
SCHEMA_NAMES.discard('User')
SECRET = os.environ.get('SESSION_SECRET', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '').strip().lower()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
if len(SECRET) < 32 or not ADMIN_EMAIL or len(ADMIN_PASSWORD) < 14:
    raise RuntimeError('Configure SESSION_SECRET (32+ chars), ADMIN_EMAIL, ADMIN_PASSWORD (14+ chars)')

@contextmanager
def db():
    c = sqlite3.connect(DB, timeout=30, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA busy_timeout=30000')
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA foreign_keys=ON')
    try: yield c
    finally: c.close()

def hash_pw(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    value = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 450000)
    return salt.hex() + ':' + value.hex()

def verify_pw(password, stored):
    salt, digest = stored.split(':')
    return hmac.compare_digest(hash_pw(password, bytes.fromhex(salt)).split(':')[1],digest)

with db() as c:
    c.execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL)')
    if 'profile_json' not in {r['name'] for r in c.execute('PRAGMA table_info(users)')}:
        c.execute("ALTER TABLE users ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}'")
    c.execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS records (entity TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, created_date TEXT NOT NULL, updated_date TEXT NOT NULL, PRIMARY KEY(entity,id))')
    c.execute('CREATE TABLE IF NOT EXISTS consent_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), version TEXT NOT NULL, decision TEXT NOT NULL, recorded_at TEXT NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS access_events (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, subject TEXT NOT NULL, action TEXT NOT NULL, recorded_at TEXT NOT NULL)')
    if not c.execute('SELECT 1 FROM users').fetchone():
        c.execute('INSERT INTO users (id,email,name,password_hash,role) VALUES (?,?,?,?,?)', (str(uuid.uuid4()),ADMIN_EMAIL,'Administrateur',hash_pw(ADMIN_PASSWORD),'admin'))
    # Later boots do not reset credentials; use a dedicated admin password reset procedure.

app = FastAPI(title='PortalManager local API', docs_url=None, redoc_url=None)

@app.middleware('http')
async def csrf_origin(request: Request, call_next):
    if request.method not in ('GET','HEAD','OPTIONS'):
        origin = request.headers.get('origin')
        host = request.headers.get('host','')
        if origin and origin not in ('https://'+host,'http://'+host):
            return JSONResponse({'detail':'Origin rejected'},status_code=403)
    return await call_next(request)

def user(request: Request):
    token = request.cookies.get('pm_session','')
    if not token: raise HTTPException(401,'Authentication required')
    token_hash=hashlib.sha256(token.encode()).hexdigest()
    with db() as c:
        row=c.execute('SELECT u.id,u.email,u.name,u.role,u.profile_json FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',(token_hash,int(time.time()))).fetchone()
    if not row or row['role'] != 'admin': raise HTTPException(403,'Admin only (role policies not migrated)')
    account = dict(row)
    profile = json.loads(account.pop('profile_json') or '{}')
    # L'administrateur initial a ses droits garantis par la base SQLite, pas par le client.
    return {**account, **profile, 'super_admin': account['role'] == 'admin'}

# Nouveau parcours d'authentification pour les comptes validés.
from backend.account_workflow import install as install_account_workflow
account_user = install_account_workflow(app, db, hash_pw, verify_pw, SECRET)

def require_entity(name):
    if name not in SCHEMA_NAMES: raise HTTPException(404,'Unknown entity')

def decorate(row):
    return {**json.loads(row['payload']), 'id':row['id'],'created_date':row['created_date'],'updated_date':row['updated_date']}

def select(name, q=None, sort='-created_date', limit=100, skip=0, predicate=None):
    require_entity(name)
    if not (0 <= skip <= 100000 and 1 <= limit <= 5000): raise HTTPException(422,'Invalid pagination')
    with db() as c:
        rows=[decorate(r) for r in c.execute('SELECT * FROM records WHERE entity=?',(name,))]
        if name == 'ConsentementDonnees':
            for e in c.execute('SELECT e.id,e.version,e.decision,e.recorded_at,u.email,u.name,u.profile_json FROM consent_events e JOIN users u ON u.id=e.user_id'):
                p=json.loads(e['profile_json'] or '{}')
                rows.append({'id':e['id'], 'version':e['version'], 'decision':e['decision'],
                             'user_email':e['email'], 'user_name':e['name'],
                             'nom':p.get('last_name',''), 'prenom':p.get('first_name',''),
                             'telephone':p.get('telephone',''),
                             'created_date':e['recorded_at'], 'updated_date':e['recorded_at']})
    q=q or {}
    def matches(record, flt):
        if not isinstance(flt,dict): return False
        for key,value in flt.items():
            if key=='$and':
                if not isinstance(value,list) or not all(matches(record,x) for x in value): return False
            elif key=='$or':
                if not isinstance(value,list) or not any(matches(record,x) for x in value): return False
            elif isinstance(value,dict):
                val=record.get(key)
                for op,v in value.items():
                    if op=='$in' and val not in v: return False
                    elif op=='$ne' and val==v: return False
                    elif op=='$gte' and (val is None or val < v): return False
                    elif op=='$lte' and (val is None or val > v): return False
                    elif op not in ('$in','$ne','$gte','$lte'): raise HTTPException(422,f'Unsupported query operator {op}')
            elif record.get(key)!=value: return False
        return True
    rows=[r for r in rows if matches(r,q) and (predicate is None or predicate(r))]
    key=sort.lstrip('-')
    rows.sort(key=lambda r: (r.get(key) is None,str(r.get(key,''))),reverse=sort.startswith('-'))
    return rows[skip:skip+limit]

@app.get('/api/health')
def health(): return {'status':'ok','storage':'sqlite','schema_count':len(SCHEMA_NAMES)}

@app.get('/api/public-settings')
def settings(): return {'id':'local','public_settings':{'app_name':'PortalManager','auth_required':True}}

@app.post('/api/auth/login')
def login(response:Response, data:dict=Body(...)):
    email=str(data.get('email','')).strip().lower()
    password=str(data.get('password',''))
    with db() as c:
        row=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        # Compare with fixed dummy hash too to reduce timing differences.
        valid=verify_pw(password,row['password_hash'] if row else hash_pw('dummy password', b'0'*16))
        if not row or not valid: raise HTTPException(401,'Identifiants invalides')
        if row['account_status'] != 'active': raise HTTPException(403,'Compte en attente ou suspendu')
        token=secrets.token_urlsafe(48)
        c.execute('INSERT INTO sessions VALUES (?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),row['id'],int(time.time())+43200))
    response.set_cookie('pm_session',token,max_age=43200,httponly=True,secure=os.environ.get('COOKIE_SECURE','true')=='true',samesite='strict',path='/')
    return {'id':row['id'],'email':row['email'],'name':row['name'],'role':row['role'], 'super_admin': row['role'] == 'admin'}

@app.get('/api/auth/me')
def me(current=Depends(account_user)): return current

@app.patch('/api/auth/me')
def update_me(data:dict=Body(...),current=Depends(account_user)):
    # Profil local associé au compte ; conservation des champs sur le volume SQLite.
    allowed_fields = {'first_name', 'last_name', 'date_naissance', 'telephone'}
    profile = {}
    for key in allowed_fields:
        if key in data:
            val = data[key]
            if not isinstance(val, str) or len(val) > 160:
                raise HTTPException(422, f'Invalid {key}')
            profile[key] = val.strip()
    if 'telephone' in profile and profile['telephone'] and not re.fullmatch(r'[+0-9() .-]{8,24}',profile['telephone']):
        raise HTTPException(422, 'Invalid telephone')
    if 'date_naissance' in profile and profile['date_naissance']:
        try:
            datetime.strptime(profile['date_naissance'], '%Y-%m-%d')
        except ValueError:
            raise HTTPException(422, 'Invalid date_naissance')
    name = data.get('name')
    if name is not None and (not isinstance(name,str) or not (1 <= len(name.strip()) <= 160)):
        raise HTTPException(422, 'Invalid name')
    with db() as c:
        row=c.execute('SELECT profile_json,name FROM users WHERE id=?',(current['id'],)).fetchone()
        if not row: raise HTTPException(404, 'Account not found')
        merged = {**json.loads(row['profile_json'] or '{}'), **profile}
        c.execute('UPDATE users SET name=?,profile_json=? WHERE id=?',
                  (name.strip() if name is not None else row['name'],json.dumps(merged,ensure_ascii=False),current['id']))
    return {**current,**merged,'name':name.strip() if name is not None else row['name']}

@app.post('/api/auth/consent')
def accept_consent(data:dict=Body(...), current=Depends(account_user)):
    # Version de la notice pilotée côté serveur, jamais modifiable par le client.
    version = '1'
    if data.get('version') != version:
        raise HTTPException(409, 'La notice a changé, rechargez la page.')
    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        try:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('SELECT profile_json FROM users WHERE id=?',(current['id'],)).fetchone()
            if not row:
                raise HTTPException(404,'Account not found')
            profile = json.loads(row['profile_json'] or '{}')
            profile.update({'consentement_version': version, 'consentement_date': now})
            c.execute('UPDATE users SET profile_json=? WHERE id=?',
                      (json.dumps(profile,ensure_ascii=False),current['id']))
            c.execute('INSERT INTO consent_events VALUES (?,?,?,?,?)',
                      (str(uuid.uuid4()),current['id'],version,'accepte',now))
            c.execute('COMMIT')
        except Exception:
            c.execute('ROLLBACK')
            raise
    return {'success': True, 'consentement_version': version, 'consentement_date': now}

@app.post('/api/auth/logout')
def logout(request:Request,response:Response):
    token=request.cookies.get('pm_session','')
    if token:
        with db() as c: c.execute('DELETE FROM sessions WHERE token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),))
    response.delete_cookie('pm_session',path='/'); return {'ok':True}

# Les comptes réels ne sont pas une entité métier dans la table records.
# API administrateur spécifique : aucune donnée d'authentification sensible n'est exposée.
@app.get('/api/admin/users')
def admin_users(current=Depends(user)):
    if current['role'] != 'admin': raise HTTPException(403, 'Accès administrateur requis')
    with db() as c:
        rows=c.execute('SELECT id,email,name,role,profile_json,account_status FROM users ORDER BY email').fetchall()
    result=[]
    for row in rows:
        profile=json.loads(row['profile_json'] or '{}')
        result.append({'id':row['id'],'email':row['email'],'name':row['name'],
                       'full_name':row['name'],'role':row['role'],'account_status':row['account_status'],
                       **profile,'super_admin':row['role']=='admin'})
    return result

@app.patch('/api/admin/users/{uid}')
def admin_update_user(uid:str, changes:dict=Body(...),current=Depends(user)):
    if current['role'] != 'admin': raise HTTPException(403, 'Accès administrateur requis')
    allowed={'name','role','first_name','last_name','telephone','office','department','grade','access','fonction','bureau_ids','permission_denials'}
    if not set(changes).issubset(allowed): raise HTTPException(422,'Unsupported user property')
    if 'permission_denials' in changes:
        changes={**changes, 'permission_denials':validate_denials(changes['permission_denials'])}
    if 'access' in changes and (not isinstance(changes['access'],list) or len(changes['access'])>100 or not all(isinstance(v,str) for v in changes['access'])):
        raise HTTPException(422,'Invalid access list')
    if 'bureau_ids' in changes and (not isinstance(changes['bureau_ids'],list) or len(changes['bureau_ids'])>100 or not all(isinstance(v,str) for v in changes['bureau_ids'])):
        raise HTTPException(422,'Invalid bureau list')
    for k,v in changes.items():
        if k not in ('access','bureau_ids','permission_denials') and (not isinstance(v,str) or len(v)>160):
            raise HTTPException(422,'Invalid '+k)
    with db() as c:
        row=c.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
        if not row: raise HTTPException(404,'Utilisateur introuvable')
        profile=json.loads(row['profile_json'] or '{}')
        new_role=changes.get('role',row['role'])
        if new_role not in ('admin','user'):
            raise HTTPException(422,'Rôle système inconnu')
        if uid==current['id'] and new_role!='admin':
            raise HTTPException(409,'Vous ne pouvez pas retirer vos privilèges administrateur')
        if row['role']=='admin' and new_role!='admin':
            admin_count=c.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
            if admin_count <= 1:
                raise HTTPException(409,'Dernier administrateur : modification interdite')
        profile.update({k:v for k,v in changes.items() if k not in ('name','role')})
        name=changes.get('name',row['name'])
        c.execute('UPDATE users SET name=?,role=?,profile_json=? WHERE id=?',
                  (name,new_role,json.dumps(profile,ensure_ascii=False),uid))
        if new_role!=row['role']:
            c.execute('DELETE FROM sessions WHERE user_id=?',(uid,))
        if 'role' in changes or 'grade' in changes or 'access' in changes or 'permission_denials' in changes:
            audit_access(c,current['id'],uid,'user_access_changed')
    return {'id':uid,'email':row['email'],'name':name,'full_name':name,'role':new_role,**profile,'super_admin':new_role=='admin'}

@app.delete('/api/admin/users/{uid}')
def admin_delete_user(uid:str,current=Depends(user)):
    if current['role'] != 'admin': raise HTTPException(403, 'Accès administrateur requis')
    if uid==current['id']: raise HTTPException(409,'Impossible de supprimer votre compte')
    with db() as c:
        row=c.execute('SELECT role FROM users WHERE id=?',(uid,)).fetchone()
        if not row: raise HTTPException(404,'Utilisateur introuvable')
        if row['role']=='admin': raise HTTPException(403,'Suppression des administrateurs désactivée')
        c.execute('DELETE FROM sessions WHERE user_id=?',(uid,))
        c.execute('DELETE FROM consent_events WHERE user_id=?',(uid,))
        c.execute('DELETE FROM users WHERE id=?',(uid,))
    return {'success':True}


def audit_access(c, actor, subject, action):
    c.execute("INSERT INTO access_events VALUES (?,?,?,?,?)",
              (str(uuid.uuid4()),actor,subject,action,datetime.now(timezone.utc).isoformat()))

@app.get('/api/permissions/catalog')
def permission_catalog(current=Depends(account_user)):
    return public_catalog()

@app.get('/api/permissions/me')
def my_permissions(current=Depends(account_user)):
    from backend.permissions import CATALOG
    if current['role']=='admin':
        return {app:{module:{**{action:True for action in ("view","create","edit","delete","export","approve")},"scope":"all"}
                     for module in modules} for app,modules in CATALOG.items()}
    return {app:{module:rule for module in modules
                 if (rule:=resolve_rule(current,db,app,module)) is not None}
            for app,modules in CATALOG.items()}

def scoped_list(name,current,query=None,sort='-created_date',limit=100,skip=0):
    if current['role']=='admin':
        return select(name,query,sort,limit,skip)
    if name=='AccessProfile':
        grade=current.get('grade','')
        if not grade: return []
        rows=select(name,{'profile_id':grade},sort,limit,skip)
        # Do not expose the detailed rule matrix to ordinary users.
        return [{k:v for k,v in r.items() if k!='permissions'} for r in rows]
    if name=='PortalApp':
        allowed=set(current.get('access') or [])
        grade=current.get('grade')
        if grade:
            with db() as c:
                for p in c.execute("SELECT payload FROM records WHERE entity='AccessProfile'"):
                    record=json.loads(p['payload'])
                    if record.get('profile_id')==grade:
                        allowed.update(record.get('apps') or [])
        return [r for r in select(name,query,sort,limit,skip) if r.get('app_id') in allowed]
    rule=may(current,db,name,"view")
    return select(name,query,sort,limit,skip,
                  predicate=lambda row: within_scope(current,row,rule['scope']))

def validated_payload(name,data,existing=None):
    if not isinstance(data,dict): raise HTTPException(422,"Objet JSON attendu")
    if name=='AccessProfile' and 'permissions' in data:
        data={**data,'permissions':validate_permissions(data['permissions'])}
    if name=='AccessProfile' and 'apps' in data:
        if not isinstance(data['apps'],list) or len(data['apps'])>32 or not all(isinstance(x,str) and len(x)<=64 for x in data['apps']):
            raise HTTPException(422,"Liste d'applications invalide")
        if 'permissions' in data:
            if not set(data['permissions']).issubset(set(data['apps'])):
                raise HTTPException(422,"Configurez seulement les applications attribuées")
    return data

@app.get('/api/entities/{name}')
def list_records(name:str,sort:str='-created_date',limit:int=100,skip:int=0,current=Depends(account_user)):
    return scoped_list(name,current,sort=sort,limit=limit,skip=skip)

@app.post('/api/entities/{name}/filter')
def filter_records(name:str,data:dict=Body(...),current=Depends(account_user)):
    return scoped_list(name,current,data.get('query',{}),data.get('sort','-created_date'),
                       data.get('limit',100),data.get('skip',0))

@app.get('/api/entities/{name}/export')
def export_records(name:str,current=Depends(account_user)):
    if current['role']!='admin':
        may(current,db,name,'export')
        may(current,db,name,'view')
    # JSON export plafonné à 5000 lignes, filtré sur le même périmètre que la lecture.
    return scoped_list(name,current,limit=5000)

@app.get('/api/admin/access-events')
def list_access_events(current=Depends(user)):
    with db() as c:
        return [dict(r) for r in c.execute('SELECT * FROM access_events ORDER BY recorded_at DESC LIMIT 500')]

@app.get('/api/entities/{name}/{record_id}')
def get_record(name:str,record_id:str,current=Depends(account_user)):
    require_entity(name)
    with db() as c:
        row=c.execute('SELECT * FROM records WHERE entity=? AND id=?',(name,record_id)).fetchone()
    if not row: raise HTTPException(404,'Record not found')
    item=decorate(row)
    if current['role']!='admin':
        if name=='AccessProfile':
            if item.get('profile_id')!=current.get('grade'): raise HTTPException(403,'Profil non autorisé')
            return {k:v for k,v in item.items() if k!='permissions'}
        if name=='PortalApp':
            if not any(x.get('id')==record_id for x in scoped_list('PortalApp',current,limit=5000)):
                raise HTTPException(403,'Application non attribuée')
            return item
        require_record(current,db,name,'view',item)
    return item

def create_one(name,data,current):
    require_entity(name)
    data=validated_payload(name,data)
    if len(json.dumps(data))>200000: raise HTTPException(413,'Record too large')
    if current['role']!='admin':
        require_record(current,db,name,'create',data)
    now=datetime.now(timezone.utc).isoformat(); record_id=str(uuid.uuid4())
    payload={k:v for k,v in data.items() if k not in ('id','created_date','updated_date')}
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        c.execute('INSERT INTO records VALUES (?,?,?,?,?)',(name,record_id,json.dumps(payload,ensure_ascii=False),now,now))
        if name=='AccessProfile':
            audit_access(c,current['id'],record_id,'profile_created')
        c.execute('COMMIT')
    return {**payload,'id':record_id,'created_date':now,'updated_date':now}

@app.post('/api/entities/{name}')
def create_record(name:str,data:dict=Body(...),current=Depends(account_user)):
    return create_one(name,data,current)

@app.post('/api/entities/{name}/bulk')
def bulk(name:str,data:list=Body(...),current=Depends(account_user)):
    if len(data)>100: raise HTTPException(422,'Batch maximum 100')
    require_entity(name)
    # Check all records before any insertion; no partial authorization.
    clean=[validated_payload(name,x) for x in data]
    if current['role']!='admin':
        for item in clean: require_record(current,db,name,'create',item)
    return [create_one(name,x,current) for x in clean]

@app.patch('/api/entities/{name}/{record_id}')
def update_record(name:str,record_id:str,data:dict=Body(...),current=Depends(account_user)):
    require_entity(name)
    data=validated_payload(name,data)
    with db() as c:
        row=c.execute('SELECT * FROM records WHERE entity=? AND id=?',(name,record_id)).fetchone()
        if not row: raise HTTPException(404,'Record not found')
        old=json.loads(row['payload'])
        updated={**old,**{k:v for k,v in data.items() if k not in ('id','created_date','updated_date')}}
        if name=='AccessProfile':
            validated_payload(name,{'permissions':updated.get('permissions') or {},
                                   'apps':updated.get('apps') or []})
        if current['role']!='admin':
            require_record(current,db,name,'edit',old)
            require_record(current,db,name,'edit',updated)
        now=datetime.now(timezone.utc).isoformat()
        c.execute('UPDATE records SET payload=?,updated_date=? WHERE entity=? AND id=?',
                  (json.dumps(updated,ensure_ascii=False),now,name,record_id))
        if name=='AccessProfile':
            audit_access(c,current['id'],record_id,'profile_updated')
    return {**updated,'id':record_id,'created_date':row['created_date'],'updated_date':now}

@app.delete('/api/entities/{name}/{record_id}')
def delete_record(name:str,record_id:str,current=Depends(account_user)):
    require_entity(name)
    with db() as c:
        row=c.execute('SELECT * FROM records WHERE entity=? AND id=?',(name,record_id)).fetchone()
        if not row: raise HTTPException(404,'Record not found')
        if current['role']!='admin':
            require_record(current,db,name,'delete',decorate(row))
        c.execute('DELETE FROM records WHERE entity=? AND id=?',(name,record_id))
        if name=='AccessProfile':
            audit_access(c,current['id'],record_id,'profile_deleted')
    return {'success':True}

@app.post('/api/functions/{name}')
def function_placeholder(name:str, data:dict=Body(default={}), current=Depends(user)):
    # Actions d'administration déjà migrées. Les autres fonctions ne sont pas simulées.
    if name == 'updateUserAccess':
        if current['role'] != 'admin': raise HTTPException(403, 'Accès administrateur requis')
        uid=data.get('user_id')
        if not isinstance(uid,str) or not uid:
            raise HTTPException(422,'Identifiant utilisateur manquant')
        allowed={'grade','access','office','department','fonction','bureau_ids','bureau_id','bureau_code'}
        changes={k:v for k,v in data.items() if k in allowed}
        if not changes:
            raise HTTPException(422,'Aucune modification')
        if any(k not in allowed and k!='user_id' for k in data):
            raise HTTPException(422,'Champ non autorisé')
        for key,value in changes.items():
            if key in ('access','bureau_ids'):
                if not isinstance(value,list) or len(value)>100 or not all(isinstance(x,str) and len(x)<100 for x in value):
                    raise HTTPException(422,'Liste invalide : '+key)
            elif not isinstance(value,str) or len(value)>160:
                raise HTTPException(422,'Valeur invalide : '+key)
        with db() as c:
            row=c.execute('SELECT profile_json FROM users WHERE id=?',(uid,)).fetchone()
            if not row: raise HTTPException(404,'Utilisateur introuvable')
            profile=json.loads(row['profile_json'] or '{}')
            profile.update(changes)
            c.execute('UPDATE users SET profile_json=? WHERE id=?',
                      (json.dumps(profile,ensure_ascii=False),uid))
        return {'data':{'updated':True,'user_id':uid,**changes}}
    raise HTTPException(501,f'Backend function {name} has not been migrated')
