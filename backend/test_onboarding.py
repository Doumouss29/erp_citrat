"""Smoke tests for standalone account onboarding, with SMTP stubbed only inside tests."""
import os
import re
import unittest
import uuid
from fastapi.testclient import TestClient

from backend import account_workflow
from backend.main import app

class OnboardingTests(unittest.TestCase):
    def test_approval_lifecycle_and_reset(self):
        messages=[]
        old_ready, old_send = account_workflow.mail_ready, account_workflow.send_mail
        account_workflow.mail_ready=lambda: True
        account_workflow.send_mail=lambda to,subject,body: messages.append((to,subject,body))
        try:
            suffix=str(uuid.uuid4())[:8]
            em=f"signup-{suffix}@example.invalid"
            with TestClient(app,base_url="https://testserver") as admin, TestClient(app,base_url="https://testserver") as client:
                result=admin.post("/api/auth/login",json={
                    "email":os.environ["ADMIN_EMAIL"],
                    "password":os.environ["ADMIN_PASSWORD"]})
                self.assertEqual(result.status_code,200,result.text)
                self.assertEqual(client.get("/api/admin/registrations").status_code,401)
                self.assertEqual(client.get("/api/public/auth-config").status_code,200)
                self.assertEqual(admin.post("/api/entities/AccessProfile",json={
                    "name":"Test "+suffix,"profile_id":"test_"+suffix,"apps":["cgesnboard"]}).status_code,200)
                self.assertEqual(admin.post("/api/entities/OfficeTerminal",json={
                    "office_name":"OFFICE_"+suffix,"email":"office-"+suffix+"@example.invalid"}).status_code,200)
                invitation=admin.post("/api/admin/invitations",json={"email":em})
                self.assertEqual(invitation.status_code,200,invitation.text)
                self.assertIn("/inscription",messages[-1][2])
                created=client.post("/api/public/signup",json={
                    "email":em,"password":"StrongSignupSecret2026!",
                    "first_name":"Prénom","last_name":"Nom","telephone":"+225 0700000000"})
                self.assertEqual(created.status_code,200,created.text)
                self.assertEqual(client.post("/api/auth/login",json={
                    "email":em,"password":"StrongSignupSecret2026!"}).status_code,401)
                code=re.search(r"\b\d{6}\b",messages[-1][2]).group(0)
                verified=client.post("/api/public/signup/verify",json={"email":em,"otp":code})
                self.assertEqual(verified.status_code,200,verified.text)
                requests=admin.get("/api/admin/registrations").json()
                item=next(x for x in requests if x["email"]==em)
                self.assertEqual(item["status"],"pending")
                self.assertNotIn("password_hash",str(item))
                rejected=client.post("/api/admin/registrations/"+item["id"]+"/decision",json={"action":"approve"})
                self.assertEqual(rejected.status_code,401)
                approved=admin.post("/api/admin/registrations/"+item["id"]+"/decision",json={
                    "action":"approve","grade":"test_"+suffix,"office":"OFFICE_"+suffix})
                self.assertEqual(approved.status_code,200,approved.text)
                logged=client.post("/api/auth/login",json={
                    "email":em,"password":"StrongSignupSecret2026!"})
                self.assertEqual(logged.status_code,200,logged.text)
                self.assertFalse(logged.json()["super_admin"])
                me=client.get("/api/auth/me")
                self.assertEqual(me.status_code,200,me.text)
                self.assertEqual(me.json()["grade"],"test_"+suffix)
                self.assertEqual(client.get("/api/admin/users").status_code,403)
                self.assertEqual(client.patch("/api/admin/users/"+me.json()["id"],json={"role":"admin"}).status_code,403)
                own_profiles=client.get("/api/entities/AccessProfile")
                self.assertEqual(own_profiles.status_code,200,own_profiles.text)
                self.assertEqual(len(own_profiles.json()),1)

                self.assertEqual(client.get("/api/entities/Employee").status_code,403)
                consent=client.post("/api/auth/consent",json={"version":"1"})
                self.assertEqual(consent.status_code,200,consent.text)
                forgot=client.post("/api/public/password/forgot",json={"email":em})
                self.assertEqual(forgot.status_code,200,forgot.text)
                token=re.search(r"token=([\w-]+)",messages[-1][2]).group(1)
                reset=client.post("/api/public/password/reset",json={
                    "resetToken":token,"newPassword":"AnotherStrongSecret2026!"})
                self.assertEqual(reset.status_code,200,reset.text)
                self.assertEqual(client.get("/api/auth/me").status_code,401)
                self.assertEqual(client.post("/api/auth/login",json={"email":em,"password":"AnotherStrongSecret2026!"}).status_code,200)
                uid=client.get("/api/auth/me").json()["id"]
                pause=admin.patch("/api/admin/accounts/"+uid+"/status",json={"status":"suspended"})
                self.assertEqual(pause.status_code,200,pause.text)
                self.assertEqual(client.get("/api/auth/me").status_code,401)
                self.assertEqual(client.post("/api/auth/login",json={
                    "email":em,"password":"AnotherStrongSecret2026!"}).status_code,403)
                self.assertEqual(admin.patch("/api/admin/accounts/"+uid+"/status",json={"status":"active"}).status_code,200)
        finally:
            account_workflow.mail_ready=old_ready
            account_workflow.send_mail=old_send

if __name__=="__main__":
    unittest.main()
