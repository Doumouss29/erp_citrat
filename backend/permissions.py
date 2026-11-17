"""RBAC de CITRAT: permissions par application/module, droits explicites, portée des données.
Les entités non cataloguées restent réservées aux administrateurs.
"""
import json
from fastapi import HTTPException

ACTIONS = ("view", "create", "edit", "delete", "export", "approve")
SCOPES = ("own", "office", "department", "all")

# Chaque entité métier n'appartient qu'à un module vérifié.
CATALOG = {
    "rhcgesn": {
        "employees": {"label":"Employés", "entities":["Employee"]},
        "leave": {"label":"Congés et absences", "entities":["LeaveRequest","Absence","LeavePolicy"]},
        "time": {"label":"Pointage et temps", "entities":["TimeEntry","DailyWorkLog"]},
        "reports": {"label":"Rapports RH", "entities":["ActivityReport","RapportMensuel"]},
        "documents": {"label":"Documents RH", "entities":["Attestation","Document"]},
    },
    "cgesnboard": {
        "activities": {"label":"Activités et dossiers", "entities":["Activite","SuiviActiviteSemaine","ObservationBM","AgentImpliqueBM","TiersImpacteBM"]},
        "projects": {"label":"Projets", "entities":["Projet","EtapeProjet"]},
        "finance": {"label":"Comptabilité", "entities":["OperationCaisse","CommentaireOperationCaisse","JournalCaisse"]},
    },
    "ecadastre": {
        "parcels": {"label":"Parcelles et cadastre", "entities":["Parcel","ParcelleOverride","CadastreCommunal","Collecte"]},
        "surveys": {"label":"Dossiers et terrain", "entities":["Dossier","Chantier","Attributaire","ConvocationParcelle"]},
        "mapping": {"label":"Données cartographiques", "entities":["Point","Photo","Ilot","Troncon"]},
    },
    "lotissement": {
        "projects": {"label":"Lotissements et lots", "entities":["Lotissement","LotissementEguide","LotissementSuivi","Lot","HistoriqueAttribution"]},
        "pricing": {"label":"Tarifs et référentiels", "entities":["TarifReference"]},
    },
    "coprociv": {
        "cases": {"label":"Dossiers de copropriété", "entities":["CoproDossier"]},
    },
    "csst": {
        "training": {"label":"Sensibilisation", "entities":["CsstProgress"]},
    },
    "hse": {
        "events": {"label":"Événements HSE", "entities":["HSEEvent"]},
    },
    "assistancenum": {
        "tickets": {"label":"Tickets d'assistance", "entities":["SiTicket","SiComment","SiRequester"]},
    },
}
ENTITY_MODULE = {}
for app, modules in CATALOG.items():
    for module, spec in modules.items():
        for entity in spec["entities"]:
            if entity in ENTITY_MODULE:
                raise RuntimeError("Entité RBAC déclarée plusieurs fois: " + entity)
            ENTITY_MODULE[entity] = (app, module)

def public_catalog():
    return {app: {module: spec["label"] for module, spec in mods.items()}
            for app, mods in CATALOG.items()}

def validate_permissions(value):
    """Parse and strictly validate an entire permissions matrix."""
    if not isinstance(value, dict) or len(value)>20:
        raise HTTPException(422, "Matrice de permissions invalide")
    result = {}
    for app, modules in value.items():
        if app not in CATALOG or not isinstance(modules,dict):
            raise HTTPException(422, "Application de permissions inconnue")
        if len(modules)>40: raise HTTPException(422, "Trop de modules")
        normalized={}
        for module, rules in modules.items():
            if module not in CATALOG[app] or not isinstance(rules,dict):
                raise HTTPException(422,"Module de permissions inconnu")
            if set(rules)-set(ACTIONS)-{"scope"}:
                raise HTTPException(422,"Action de permissions inconnue")
            if not all(type(rules[k]) is bool for k in ACTIONS if k in rules):
                raise HTTPException(422,"Les droits doivent être des booléens")
            scope=rules.get("scope","own")
            if scope not in SCOPES: raise HTTPException(422,"Périmètre invalide")
            normalized[module]={k:rules.get(k,False) for k in ACTIONS}
            normalized[module]["scope"]=scope
        result[app]=normalized
    return result

def resolve_rule(current, db, app, module):
    """The profile is read from SQLite for each request, never from client claims."""
    if current["role"]=="admin":
        return {**{a:True for a in ACTIONS},"scope":"all"}
    grade=current.get("grade")
    if not grade: return None
    with db() as c:
        profiles=c.execute("SELECT payload FROM records WHERE entity='AccessProfile'").fetchall()
    chosen=None
    for row in profiles:
        p=json.loads(row["payload"])
        if p.get("profile_id")==grade:
            chosen=p
            break
    if chosen is None or app not in (chosen.get("apps") or []): return None
    permissions=chosen.get("permissions") or {}
    rule=((permissions.get(app) or {}).get(module))
    if not isinstance(rule,dict): return None
    # Individual overrides may only reduce a permission or scope; never escalate
    # above profile rights. More permissive overrides must be introduced through
    # a reviewed admin workflow with explicit delegation rules.
    try:
        rules=validate_permissions({app:{module:rule}})
    except HTTPException:
        return None
    return rules[app][module]

def may(current, db, entity, action):
    if current["role"]=="admin": return {"scope":"all"}
    module=ENTITY_MODULE.get(entity)
    if not module: raise HTTPException(403,"Entité réservée à l'administration")
    app, section=module
    rule=resolve_rule(current,db,app,section)
    if not rule or not rule.get(action,False):
        raise HTTPException(403, f"Permission {app}/{section}/{action} refusée")
    return rule

def within_scope(current, record, scope):
    if scope=="all": return True
    if not isinstance(record,dict): return False
    # Each record must carry explicit ownership metadata. Unknown format => deny.
    if scope=="own":
        ids={str(current.get("id") or "")}
        email=(current.get("email") or "").lower()
        owned=[record.get(k) for k in ("owner_id","user_id","created_by_id","employee_user_id")]
        by_mail=[str(record.get(k) or "").lower() for k in ("owner_email","user_email","created_by")]
        return any(x is not None and str(x) in ids for x in owned) or email in [x for x in by_mail if x]
    if scope=="office":
        allowed={str(x) for x in [current.get("bureau_id"),current.get("bureau_code"),current.get("office")] if x}
        allowed.update(str(x) for x in current.get("bureau_ids",[]) if x)
        keys=("bureau_id","bureau_code","office","office_name")
        present=[str(record[k]) for k in keys if record.get(k) not in ("",None)]
        return bool(present) and bool(allowed) and all(x in allowed for x in present)
    if scope=="department":
        department=current.get("department")
        present=[str(record[k]) for k in ("department","department_id") if record.get(k) not in ("",None)]
        return bool(department) and bool(present) and all(x==str(department) for x in present)
    return False

def require_record(current,db,entity,action,record):
    rule=may(current,db,entity,action)
    if not within_scope(current, record, rule["scope"]):
        raise HTTPException(403,"Données hors de votre périmètre")
    return rule

def can_view(current,db,entity,record):
    try:
        return within_scope(current,record,may(current,db,entity,"view")["scope"])
    except HTTPException:
        return False
