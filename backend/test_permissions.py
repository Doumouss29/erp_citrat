"""RBAC regression tests, using a dedicated disposable SQLite file in CI."""
import os
import uuid
import unittest
from fastapi.testclient import TestClient
from backend.main import app, db, hash_pw

class PermissionTests(unittest.TestCase):
    def test_denial_by_default_and_office_isolation(self):
        suffix=uuid.uuid4().hex[:9]
        profile_id="limited_"+suffix
        email="restricted-"+suffix+"@example.invalid"
        pw="StrongAccessPassword2026!"
        with TestClient(app,base_url="https://testserver") as admin, TestClient(app,base_url="https://testserver") as staff:
            signin=admin.post("/api/auth/login",json={"email":os.environ["ADMIN_EMAIL"],"password":os.environ["ADMIN_PASSWORD"]})
            self.assertEqual(signin.status_code,200,signin.text)
            rule={"view":True,"create":True,"edit":False,"delete":False,"export":False,"approve":False,"scope":"office"}
            p=admin.post("/api/entities/AccessProfile",json={
                "profile_id":profile_id,"name":"Profil limité",
                "apps":["rhcgesn"],"permissions":{"rhcgesn":{"employees":rule}}})
            self.assertEqual(p.status_code,200,p.text)
            pid=p.json()["id"]
            ab=admin.post("/api/entities/Employee",json={"name":"Equipe ABJ","office":"ABIDJAN"})
            bk=admin.post("/api/entities/Employee",json={"name":"Equipe BKE","office":"BOUAKE"})
            self.assertEqual(ab.status_code,200,ab.text)
            self.assertEqual(bk.status_code,200,bk.text)
            uid=str(uuid.uuid4())
            with db() as c:
                c.execute("""INSERT INTO users(id,email,name,password_hash,role,profile_json,account_status)
                             VALUES (?,?,?,?,?,?,?)""",
                    (uid,email,"Compte limité",hash_pw(pw),"user",
                     '{"grade":"'+profile_id+'","office":"ABIDJAN"}',"active"))
            self.assertEqual(staff.post("/api/auth/login",json={"email":email,"password":pw}).status_code,200)
            listing=staff.get("/api/entities/Employee")
            self.assertEqual(listing.status_code,200,listing.text)
            self.assertIn(ab.json()["id"],[x["id"] for x in listing.json()])
            self.assertNotIn(bk.json()["id"],[x["id"] for x in listing.json()])
            filtering=staff.post("/api/entities/Employee/filter",json={"query":{},"limit":100})
            self.assertEqual(filtering.status_code,200,filtering.text)
            self.assertEqual(len(filtering.json()),1)
            self.assertEqual(staff.get("/api/entities/Employee/"+bk.json()["id"]).status_code,403)
            self.assertEqual(staff.get("/api/entities/Employee/export").status_code,403)
            self.assertEqual(staff.patch("/api/entities/Employee/"+ab.json()["id"],json={"name":"Hack"}).status_code,403)
            self.assertEqual(staff.delete("/api/entities/Employee/"+ab.json()["id"]).status_code,403)
            self.assertEqual(staff.post("/api/entities/Employee",json={"name":"BKE","office":"BOUAKE"}).status_code,403)
            self.assertEqual(staff.post("/api/entities/Employee/bulk",json=[
                {"name":"ABJ","office":"ABIDJAN"},{"name":"BKE","office":"BOUAKE"}
            ]).status_code,403)
            good=staff.post("/api/entities/Employee",json={"name":"New ABJ","office":"ABIDJAN"})
            self.assertEqual(good.status_code,200,good.text)
            self.assertEqual(staff.get("/api/entities/Absence").status_code,403)
            self.assertEqual(staff.get("/api/entities/OfficeTerminal").status_code,403)
            self.assertEqual(staff.patch("/api/admin/users/"+uid,json={"role":"admin"}).status_code,403)
            p_read=staff.get("/api/entities/AccessProfile")
            self.assertEqual(p_read.status_code,200,p_read.text)
            self.assertNotIn("permissions",p_read.json()[0])
            denied=admin.patch("/api/admin/users/"+uid,json={
                "permission_denials":{"rhcgesn":{"employees":["view"]}}})
            self.assertEqual(denied.status_code,200,denied.text)
            self.assertEqual(staff.get("/api/entities/Employee").status_code,403)
            self.assertEqual(staff.get("/api/permissions/me").status_code,200)
            self.assertFalse(staff.get("/api/permissions/me").json()["rhcgesn"]["employees"]["view"])
            bad=admin.patch("/api/entities/AccessProfile/"+pid,
               json={"permissions":{"rhcgesn":{"employees":{"scope":"unlimited"}}}})
            self.assertEqual(bad.status_code,422,bad.text)
            self.assertEqual(staff.get("/api/admin/access-events").status_code,403)

if __name__=="__main__":
    unittest.main()
