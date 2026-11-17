import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createEguidePageUrl as createPageUrl } from "@/lib/eguidePageUrl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Trash2 } from "lucide-react";

export default function Parametres() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to={createPageUrl("Accueil")} className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Paramètres</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compte</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-1">
            <div><span className="text-slate-500">Email</span><div>{user?.email || "—"}</div></div>
            <div><span className="text-slate-500">Rôle</span><div className="capitalize">{user?.role || "—"}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" className="w-full" onClick={() => alert("Pour supprimer votre compte, veuillez contacter l'administrateur.") }>
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer le compte
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}