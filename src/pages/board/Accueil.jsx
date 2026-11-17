import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { ensureUserBureauSynced } from "@/lib/autoSyncBureau";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/board/layout/PageHeader";
import { 
  FolderOpen, 
  Plus, 
  BarChart3, 
  ArrowRight, 
  Building2, 
  FileText,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import KPISection from "@/components/board/dashboard/KPISection";
import ChartSection from "@/components/board/dashboard/ChartSection";
import ChangePasswordModal from "@/components/board/auth/ChangePasswordModal";
import DossierDetail from "@/components/board/dossiers/DossierDetail";
import DossierForm from "@/components/board/dossiers/DossierForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isBoardDirection, userBureauIds, scopeToUserBureaux, canSeeBureau } from '@/lib/boardScope';
export default function Accueil() {
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showRetardsDialog, setShowRetardsDialog] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await ensureUserBureauSynced(await base44.auth.me());
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

  const isAdmin = isBoardDirection(user);
  const myBureauIds = userBureauIds(user);
  const userBureauId = user?.data?.bureau_id || user?.bureau_id || myBureauIds[0];

  // Chaque bureau ne voit que ses propres projets et dossiers ; la Direction voit tout
  const { data: projets } = useQuery({
    queryKey: ['projets-accueil', user?.id, isAdmin, myBureauIds.join(',')],
    queryFn: async () => {
      if (isAdmin) return base44.entities.Projet.list();
      if (!myBureauIds.length) return [];
      return scopeToUserBureaux(await base44.entities.Projet.filter({ bureau_id: { $in: myBureauIds } }), user);
    },
    enabled: !!user && !!bureaux
  });

  const { data: dossiers } = useQuery({
    queryKey: ['dossiers', user?.id, isAdmin, myBureauIds.join(',')],
    queryFn: async () => {
      if (isAdmin) return base44.entities.Dossier.list();
      if (!myBureauIds.length) return [];
      return scopeToUserBureaux(await base44.entities.Dossier.filter({ bureau_id: { $in: myBureauIds } }), user);
    },
    enabled: !!user && !!bureaux
  });

  const userBureau = bureaux?.find(b => b.id === userBureauId)
    || bureaux?.find(b => myBureauIds.includes(b.id));

  const handleVoirDossier = (dossier) => {
    // Si admin ou même bureau, ouvrir le détail directement
    if (isAdmin || canSeeBureau(user, dossier.bureau_id)) {
      setSelectedDossier(dossier);
      setShowDetail(true);
    } else if (isAdmin) {
      // Bureau différent: naviguer vers BureauDossiers avec alerte
      const bureau = bureaux?.find(b => b.id === dossier.bureau_id);
      if (window.confirm(`Ce dossier appartient au bureau "${bureau?.nom || dossier.bureau_code}". Voulez-vous y accéder ?`)) {
        navigate(createPageUrl('BureauDossiers') + `?bureau=${dossier.bureau_id}`);
      }
    }
    setShowRetardsDialog(false);
  };

  const handleEditDossier = (dossier) => {
    setSelectedDossier(dossier);
    setShowRetardsDialog(false);
    setShowForm(true);
  };

  const handleDeleteDossier = async () => {
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

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    setShowForm(false);
    setSelectedDossier(null);
  };

  // Dossiers en retard
  const dossiersEnRetard = dossiers?.filter(d => {
    if (!d.date_echeance) return false;
    const statut = statuts?.find(s => s.id === d.statut_id);
    if (statut?.est_final) return false;
    return new Date(d.date_echeance) < new Date();
  }) || [];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ChangePasswordModal 
        open={showChangePassword} 
        onSuccess={handlePasswordChanged}
        user={user}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <PageHeader 
          title={isAdmin ? 'Bienvenue sur le BOARD' : `Bureau de ${userBureau?.nom || user.full_name}`}
          align={isAdmin ? 'left' : 'center'}
          action={!isAdmin && userBureau ? {
            icon: Plus,
            label: "Nouveau dossier",
            tooltip: "Créer un nouveau dossier",
            onClick: () => navigate(createPageUrl('MesDossiers'))
          } : null}
        />

        {/* Alerte retards */}
        {dossiersEnRetard.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">
                {dossiersEnRetard.length} dossier(s) en retard
              </p>
              <p className="hidden sm:block text-sm text-red-600">
                Des dossiers ont dépassé leur date d'échéance
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 border-red-300 hover:bg-red-100"
              onClick={() => setShowRetardsDialog(true)}
            >
              Voir
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Dialog liste des dossiers en retard */}
        <Dialog open={showRetardsDialog} onOpenChange={setShowRetardsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Dossiers en retard ({dossiersEnRetard.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {dossiersEnRetard.map(dossier => {
                const bureau = bureaux?.find(b => b.id === dossier.bureau_id);
                const activite = activites?.find(a => a.id === dossier.activite_id);
                const isDifferentBureau = !isAdmin && dossier.bureau_id !== userBureauId;
                return (
                  <div 
                    key={dossier.id}
                    className="flex items-center justify-between p-3 bg-white border border-red-100 rounded-lg hover:border-red-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {dossier.reference_auto || dossier.id.slice(0,8)}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {dossier.client_nom} {dossier.client_prenom} • {activite?.libelle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{bureau?.code || dossier.bureau_code}</Badge>
                        {isDifferentBureau && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Autre bureau</Badge>
                        )}
                        <span className="text-xs text-red-600">
                          Échéance: {new Date(dossier.date_echeance).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleVoirDossier(dossier)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ouvrir
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleEditDossier(dossier)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { setSelectedDossier(dossier); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Détail dossier */}
        <DossierDetail
          open={showDetail}
          onOpenChange={setShowDetail}
          dossier={selectedDossier}
          activites={activites}
          statuts={statuts}
          bureaux={bureaux}
        />

        {/* Formulaire édition (admin) */}
        <DossierForm
          open={showForm}
          onOpenChange={setShowForm}
          dossier={selectedDossier}
          activites={activites}
          statuts={statuts}
          bureau={bureaux?.find(b => b.id === selectedDossier?.bureau_id)}
          onSuccess={handleFormSuccess}
        />

        {/* Confirmation suppression (admin) */}
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
              <AlertDialogAction onClick={handleDeleteDossier} className="bg-red-600 hover:bg-red-700">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* KPIs */}
        <div className="mb-8">
          <KPISection dossiers={dossiers} statuts={statuts} projets={projets} isAdmin={isAdmin} />
        </div>

        {/* Graphiques */}
        <div className="mb-8">
          <ChartSection 
            dossiers={dossiers} 
            activites={activites} 
            statuts={statuts}
            bureaux={bureaux}
            showBureaux={isAdmin}
            isAdmin={isAdmin}
          />
        </div>


      </div>
    </div>
  );
}