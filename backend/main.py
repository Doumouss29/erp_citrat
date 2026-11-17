import os, json, sqlite3, secrets, hashlib, hmac, uuid, re, time
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from fastapi import FastAPI, Request, Response, HTTPException, Depends, Body
from fastapi.responses import JSONResponse

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
    if not c.execute('SELECT 1 FROM users').fetchone():
        c.execute('INSERT INTO users VALUES (?,?,?,?,?)', (str(uuid.uuid4()),ADMIN_EMAIL,'Administrateur',hash_pw(ADMIN_PASSWORD),'admin'))
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
    return {**account, **profile}

def require_entity(name):
    if name not in SCHEMA_NAMES: raise HTTPException(404,'Unknown entity')

def decorate(row):
    return {**json.loads(row['payload']), 'id':row['id'],'created_date':row['created_date'],'updated_date':row['updated_date']}

def select(name, q=None, sort='-created_date', limit=100, skip=0):
    require_entity(name)
    if not (0 <= skip <= 100000 and 1 <= limit <= 500): raise HTTPException(422,'Invalid pagination')
    with db() as c:
        rows=[decorate(r) for r in c.execute('SELECT * FROM records WHERE entity=?',(name,))]
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
    rows=[r for r in rows if matches(r,q)]
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
        token=secrets.token_urlsafe(48)
        c.execute('INSERT INTO sessions VALUES (?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),row['id'],int(time.time())+43200))
    response.set_cookie('pm_session',token,max_age=43200,httponly=True,secure=os.environ.get('COOKIE_SECURE','true')=='true',samesite='strict',path='/')
    return {'id':row['id'],'email':row['email'],'name':row['name'],'role':row['role']}

@app.get('/api/auth/me')
def me(current=Depends(user)): return current

@app.patch('/api/auth/me')
def update_me(data:dict=Body(...),current=Depends(user)):
    # Profil local associé au compte ; conservation des champs sur le volume SQLite.
    allowed_fields = {'first_name', 'last_name', 'date_naissance', 'telephone',
                      'consentement_version', 'consentement_date'}
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
def accept_consent(data:dict=Body(...), current=Depends(user)):
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

@app.get('/api/entities/{name}')
def list_records(name:str,sort:str='-created_date',limit:int=100,skip:int=0,current=Depends(user)):
    return select(name,sort=sort,limit=limit,skip=skip)

@app.post('/api/entities/{name}/filter')
def filter_records(name:str,data:dict=Body(...),current=Depends(user)):
    return select(name,data.get('query',{}),data.get('sort','-created_date'),data.get('limit',100),data.get('skip',0))

@app.get('/api/entities/{name}/{record_id}')
def get_record(name:str,record_id:str,current=Depends(user)):
    require_entity(name)
    with db() as c: row=c.execute('SELECT * FROM records WHERE entity=? AND id=?',(name,record_id)).fetchone()
    if not row: raise HTTPException(404,'Record not found')
    return decorate(row)

def create_one(name,data):
    require_entity(name)
    if not isinstance(data,dict): raise HTTPException(422,'Record must be object')
    if len(json.dumps(data))>200000: raise HTTPException(413,'Record too large')
    now=datetime.now(timezone.utc).isoformat(); record_id=str(uuid.uuid4())
    payload={k:v for k,v in data.items() if k not in ('id','created_date','updated_date')}
    with db() as c: c.execute('INSERT INTO records VALUES (?,?,?,?,?)',(name,record_id,json.dumps(payload,ensure_ascii=False),now,now))
    return {**payload,'id':record_id,'created_date':now,'updated_date':now}

@app.post('/api/entities/{name}')
def create_record(name:str,data:dict=Body(...),current=Depends(user)): return create_one(name,data)

@app.post('/api/entities/{name}/bulk')
def bulk(name:str, data:list=Body(...),current=Depends(user)):
    if len(data)>100: raise HTTPException(422,'Batch maximum 100')
    return [create_one(name,x) for x in data]

@app.patch('/api/entities/{name}/{record_id}')
def update_record(name:str,record_id:str,data:dict=Body(...),current=Depends(user)):
    require_entity(name)
    with db() as c:
        row=c.execute('SELECT * FROM records WHERE entity=? AND id=?',(name,record_id)).fetchone()
        if not row: raise HTTPException(404,'Record not found')
        old=json.loads(row['payload']); old.update({k:v for k,v in data.items() if k not in ('id','created_date','updated_date')})
        now=datetime.now(timezone.utc).isoformat()
        c.execute('UPDATE records SET payload=?,updated_date=? WHERE entity=? AND id=?',(json.dumps(old,ensure_ascii=False),now,name,record_id))
    return {**old,'id':record_id,'created_date':row['created_date'],'updated_date':now}

@app.delete('/api/entities/{name}/{record_id}')
def delete_record(name:str,record_id:str,current=Depends(user)):
    require_entity(name)
    with db() as c:
        count=c.execute('DELETE FROM records WHERE entity=? AND id=?',(name,record_id)).rowcount
    if not count: raise HTTPException(404,'Record not found')
    return {'success':True}

@app.post('/api/functions/{name}')
def function_placeholder(name:str,current=Depends(user)):
    raise HTTPException(501,f'Backend function {name} has not been migrated')
