import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, FolderOpen } from 'lucide-react';
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import DossiersList from "@/components/board/dossiers/DossiersList";
import DossierForm from "@/components/board/dossiers/DossierForm";
import DossierDetail from "@/components/board/dossiers/DossierDetail";

import { isBoardDirection, canSeeBureau } from '@/lib/boardScope';
export default function BureauDossiers() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Récupérer l'ID du bureau depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const bureauId = urlParams.get('bureau');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
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
    queryKey: ['dossiers-bureau', bureauId, user?.id],
    queryFn: async () => {
      // Un bureau ne peut consulter que ses propres dossiers
      if (!bureauId || !canSeeBureau(user, bureauId)) return [];
      return base44.entities.Dossier.filter({ bureau_id: bureauId }, '-created_date');
    },
    enabled: !!bureauId && !!user
  });

  const bureau = bureaux?.find(b => b.id === bureauId);
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
      queryClient.invalidateQueries({ queryKey: ['dossiers-bureau'] });
      setShowDeleteDialog(false);
      setSelectedDossier(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dossiers-bureau'] });
    setShowForm(false);
    setSelectedDossier(null);
  };

  if (user && bureauId && !canSeeBureau(user, bureauId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Accès réservé</h2>
          <p className="text-slate-500 mb-4">Vous ne pouvez consulter que les dossiers de votre bureau.</p>
          <Link to={createPageUrl('MesDossiers')}><Button variant="outline">Retour à mes dossiers</Button></Link>
        </div>
      </div>
    );
  }

  if (!user || !bureau) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('MesDossiers')}>
            <Button variant="outline" size="icon" className="flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{bureau.nom}</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => { setSelectedDossier(null); setShowForm(true); }} className="flex-shrink-0">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouveau dossier</span>
            </Button>
          )}
        </div>

        {/* Liste */}
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

        {/* Formulaire */}
        <DossierForm
          open={showForm}
          onOpenChange={setShowForm}
          dossier={selectedDossier}
          activites={activites}
          statuts={statuts}
          bureau={bureau}
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