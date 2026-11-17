import React from "react";
import { Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// Écran affiché à la place du portail lorsqu'un compte est suspendu.
export default function AccountSuspended() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-slate-600" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Votre compte est suspendu</h1>
        <p className="text-sm text-slate-600 mb-6">
          Vous n'avez plus accès au portail. Si vous pensez qu'il s'agit d'une erreur, contactez le service RH.
        </p>
        <Button variant="outline" className="rounded-xl" onClick={() => base44.auth.logout("/connexion")}>
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
