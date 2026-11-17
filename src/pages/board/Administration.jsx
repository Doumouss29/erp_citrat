import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, FileText, CircleDot, Settings, Shield } from 'lucide-react';
import ActivitesManager from "@/components/board/admin/ActivitesManager";
import StatutsManager from "@/components/board/admin/StatutsManager";
import ParametresManager from "@/components/board/admin/ParametresManager";
import ChangePasswordModal from "@/components/board/auth/ChangePasswordModal";

export default function Administration() {
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser?.must_change_password) {
        setShowChangePassword(true);
      }
    };
    loadUser();
  }, []);

  const { data: bureaux, refetch: refetchBureaux } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => base44.entities.Bureau.list()
  });

  const { data: activites, refetch: refetchActivites } = useQuery({
    queryKey: ['activites'],
    queryFn: () => base44.entities.Activite.list()
  });

  const { data: statuts, refetch: refetchStatuts } = useQuery({
    queryKey: ['statuts'],
    queryFn: () => base44.entities.Statut.list()
  });

  const { data: parametres, refetch: refetchParametres } = useQuery({
    queryKey: ['parametres'],
    queryFn: () => base44.entities.Parametre.list()
  });

  const handlePasswordChanged = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setShowChangePassword(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Accès réservé</h2>
          <p className="text-slate-500">
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ChangePasswordModal 
        open={showChangePassword} 
        onSuccess={handlePasswordChanged}
        user={user}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
          <p className="text-slate-500">Gérez les paramètres de l'application</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bureaux" className="space-y-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 w-full p-2 h-auto gap-2 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 shadow-sm rounded-2xl">
            <TabsTrigger value="activites" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-emerald-50 data-[state=inactive]:border data-[state=inactive]:border-slate-200 gap-2 px-4 py-3 rounded-xl transition-all h-auto">
              <FileText className="w-4 h-4" />
              Activités
            </TabsTrigger>
            <TabsTrigger value="statuts" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-amber-50 data-[state=inactive]:border data-[state=inactive]:border-slate-200 gap-2 px-4 py-3 rounded-xl transition-all h-auto">
              <CircleDot className="w-4 h-4" />
              Statuts
            </TabsTrigger>
            <TabsTrigger value="parametres" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-rose-50 data-[state=inactive]:border data-[state=inactive]:border-slate-200 gap-2 px-4 py-3 rounded-xl transition-all h-auto">
              <Settings className="w-4 h-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <TabsContent value="activites" className="m-0">
              <ActivitesManager 
                activites={activites}
                onRefresh={refetchActivites}
              />
            </TabsContent>

            <TabsContent value="statuts" className="m-0">
              <StatutsManager 
                statuts={statuts}
                onRefresh={refetchStatuts}
              />
            </TabsContent>

            <TabsContent value="parametres" className="m-0">
              <ParametresManager 
                parametres={parametres}
                onRefresh={refetchParametres}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}