import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, FolderOpen, Building2, Eye, CheckCircle2, Clock } from 'lucide-react';
import PageHeader from "@/components/board/layout/PageHeader";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import DossiersList from "@/components/board/dossiers/DossiersList";
import DossierForm from "@/components/board/dossiers/DossierForm";
import DossierDetail from "@/components/board/dossiers/DossierDetail";
import ChangePasswordModal from "@/components/board/auth/ChangePasswordModal";

import { isBoardDirection, scopeToUserBureaux } from '@/lib/boardScope';
export default function MesDossiers() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const { data: bureaux } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => base44.entities.Bureau.list()
  });

  const { data: activites } = useQuery({
    queryKey: ['activites'],
    queryFn: () => base44.entities.Activite.list()
  });

  const { data: statuts } = useQuery({
    queryKey: ['statuts'],
    queryFn: () => base44.entities.Statut.list()
  });

  const { data: dossiers, isLoading } = useQuery({
    queryKey: ['dossiers', user?.bureau_id, user?.role, user?.email],
    queryFn: async () => {
      if (isBoardDirection(user)) {
        return base44.entities.Dossier.list('-created_date');
      }
      const bureauId = user?.bureau_id;
      if (bureauId) {
        return scopeToUserBureaux(await base44.entities.Dossier.filter({ bureau_id: bureauId }, '-created_date'), user);
      }
      return [];
    },
    enabled: !!user && !!bureaux
  });

  const userBureau = bureaux?.find(b => b.id === user?.bureau_id);
  const isAdmin = isBoardDirection(user);

  const handleEdit = (dossier) => {
    setSelectedDossier(dossier);
    setShowForm(true);
  };

  const handleView = (dossier) => {
    setSelectedDossier(dossier);
    setShowDetail(true);
  };

  const handleDelete = async () => {
    if (!selectedDossier) return;
    try {
      await base44.entities.JournalAudit.create({
        dossier_id: selectedDossier.id,
        dossier_reference: selectedDossier.reference_auto,
        user_email: user.email,
        type_action: 'suppression',
        bureau_id: selectedDossier.bureau_id
      });
      await base44.entities.Dossier.delete(selectedDossier.id);
      toast.success("Dossier supprimé");
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      setShowDeleteDialog(false);
      setSelectedDossier(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    setShowForm(false);
    setSelectedDossier(null);
  };

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

  if (!isAdmin && !userBureau) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Aucun bureau assigné</h2>
          <p className="text-slate-500">
            Vous n'êtes pas encore rattaché à un bureau. 
            Veuillez contacter l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  // Stats par bureau pour admin
  const bureauxStats = (bureaux?.map(bureau => {
    const dossiersBureau = dossiers?.filter(d => d.bureau_id === bureau.id) || [];
    const statutFinal = statuts?.find(s => s.est_final);
    const realises = dossiersBureau.filter(d => d.statut_id === statutFinal?.id).length;
    const enCours = dossiersBureau.filter(d => d.statut_id !== statutFinal?.id).length;

    return {
      bureau,
      total: dossiersBureau.length,
      realises,
      enCours
    };
  }) || []).sort((a, b) => a.bureau.nom.localeCompare(b.bureau.nom, 'fr', { sensitivity: 'base' }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ChangePasswordModal 
        open={showChangePassword} 
        onSuccess={handlePasswordChanged}
        user={user}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {isAdmin ? (
          <div className="mb-8" />
        ) : (
          <PageHeader 
            title="Mes dossiers"
            action={userBureau ? {
              icon: Plus,
              label: "Nouveau dossier",
              tooltip: "Créer un nouveau dossier",
              onClick: () => { setSelectedDossier(null); setShowForm(true); }
            } : null}
          />
        )}

        {isAdmin ? (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Détails par Bureau</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {bureauxStats.map(({ bureau, total, realises, enCours }) => (
                <Card key={bureau.id} className="group overflow-hidden border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white">{bureau.nom}</h3>
                        </div>
                        <Link to={createPageUrl('BureauDossiers') + `?bureau=${bureau.id}`}>
                          <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-10 px-5">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="p-5 space-y-3 bg-white">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <FolderOpen className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Total</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-700">{total}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Réalisés</span>
                        </div>
                        <span className="text-2xl font-bold text-emerald-700">{realises}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500 rounded-lg">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">En cours</span>
                        </div>
                        <span className="text-2xl font-bold text-amber-700">{enCours}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <DossiersList
            dossiers={dossiers}
            activites={activites}
            statuts={statuts}
            bureaux={bureaux}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={(d) => { setSelectedDossier(d); setShowDeleteDialog(true); }}
            loading={isLoading}
            userRole={user?.role}
          />
        )}

        {/* Formulaire */}
        <DossierForm
          open={showForm}
          onOpenChange={setShowForm}
          dossier={selectedDossier}
          activites={activites}
          statuts={statuts}
          bureau={isAdmin ? bureaux?.find(b => b.id === selectedDossier?.bureau_id) : userBureau}
          onSuccess={handleSuccess}
        />

        {/* Détail */}
        <DossierDetail
          open={showDetail}
          onOpenChange={setShowDetail}
          dossier={selectedDossier}
          activites={activites}
          statuts={statuts}
          bureaux={bureaux}
        />

        {/* Confirmation suppression */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de supprimer le dossier <strong>{selectedDossier?.reference_auto}</strong>.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}