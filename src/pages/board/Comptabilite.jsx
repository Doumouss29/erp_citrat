import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CaisseOperationsKpis from '@/components/board/comptabilite/CaisseOperationsKpis';
import SimpleOperationForm from '@/components/board/comptabilite/SimpleOperationForm';
import SoldeDepartFormDialog from '@/components/board/comptabilite/SoldeDepartFormDialog';
import OperationsByBureau, { weekMetrics } from '@/components/board/comptabilite/OperationsByBureau';
import { getAccountingWeek, todayString } from '@/components/board/comptabilite/caisseUtils';
import useCaisseModule from '@/hooks/useCaisseModule';
import { buildBonCaissePrintHtml } from '@/components/board/comptabilite/BonsCaissePrintTemplate';
import { createOperationCaisse, updateOperationCaisse, cancelOperationCaisse } from '@/lib/caisseApi';
import CancelOperationDialog from '@/components/board/comptabilite/CancelOperationDialog';
import OperationHistoryDialog from '@/components/board/comptabilite/OperationHistoryDialog';

export default function Comptabilite() {
  const queryClient = useQueryClient();
  const { user, bureaux, allBureaux, userBureau, operations, cancelledOperations, secretaires, isAdmin, hasAssignedBureau, isLoading } = useCaisseModule();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedType, setSelectedType] = useState('entree');
  const [isSoldeFormOpen, setIsSoldeFormOpen] = useState(false);
  const [selectedSolde, setSelectedSolde] = useState(null);
  const [formSnapshot, setFormSnapshot] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);
  const [selectedBureau, setSelectedBureau] = useState(null);
  // Semaine comptable affichée : du vendredi au jeudi (par défaut la semaine en cours)
  const [weekRef, setWeekRef] = useState(todayString());
  const weekRange = useMemo(() => getAccountingWeek(weekRef), [weekRef]);
  // Vue d'ensemble : toujours la semaine comptable en cours (le sélecteur n'est que dans la vue d'un bureau)
  const currentWeek = useMemo(() => getAccountingWeek(todayString()), []);
  const weekKpis = useMemo(() => weekMetrics(operations, currentWeek), [operations, currentWeek]);

  const canCreate = isAdmin || hasAssignedBureau;

  // Un compte de bureau arrive directement sur la caisse de son bureau (synthèse + opérations)
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || isLoading || !user) return;
    if (!isAdmin && userBureau) setSelectedBureau(userBureau);
    setAutoOpened(true);
  }, [autoOpened, isLoading, user, isAdmin, userBureau]);

  const filteredOperations = useMemo(() => {
    return [...operations].sort((a, b) => new Date(b.date_operation) - new Date(a.date_operation));
  }, [operations]);

  const saveOperationMutation = useMutation({
    mutationFn: async ({ values, file, currentOperation }) => {
      const bureau = bureaux.find((item) => item.id === values.bureau_id) || userBureau;
      const upload = file ? await base44.integrations.Core.UploadFile({ file }) : null;

      // Le n° de bon, l'auteur et le journal sont gérés côté serveur (fonction caisseOperation)
      const payload = {
        ...values,
        bureau_id: bureau?.id || values.bureau_id,
        justificatif_url: upload?.file_url || currentOperation?.justificatif_url || '',
        justificatif_nom: file?.name || currentOperation?.justificatif_nom || ''
      };

      if (currentOperation) return updateOperationCaisse(currentOperation.id, payload);
      return createOperationCaisse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisse-operations'], exact: false });
      setIsFormOpen(false);
      setIsSoldeFormOpen(false);
      setSelectedOperation(null);
      toast.success('Opération enregistrée');
    },
    onError: (error) => {
      toast.error(error?.message || "Impossible d'enregistrer l'opération");
    }
  });

  // Bureau pré-sélectionné dans le formulaire : celui ouvert (vue détail) sinon le bureau de l'utilisateur
  const formBureau = (selectedBureau && bureaux.find((b) => b.id === selectedBureau.id)) || userBureau;

  const openCreateForm = () => {
    setSelectedOperation(null);
    setIsTypeDialogOpen(true);
  };

  const openEditForm = (operation) => {
    if (operation.type_operation === 'solde_depart') {
      setSelectedSolde(operation);
      setIsSoldeFormOpen(true);
    } else {
      setSelectedOperation(operation);
      setIsFormOpen(true);
    }
  };

  const openComments = (operation) => {
    setSelectedOperation(operation);
    setSelectedType(operation.type_operation || 'entree');
    setIsFormOpen(true);
  };

  // Un bon n'est jamais effacé : il est annulé avec un motif (tracé dans le journal)
  const [operationToCancel, setOperationToCancel] = useState(null);
  const [historyOperation, setHistoryOperation] = useState(null);
  const cancelOperationMutation = useMutation({
    mutationFn: ({ operation, motif }) => cancelOperationCaisse(operation.id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisse-operations'], exact: false });
      setOperationToCancel(null);
      toast.success('Bon annulé');
    },
    onError: (error) => {
      toast.error(error?.message || "Impossible d'annuler le bon");
    }
  });

  const handleDelete = (operation) => setOperationToCancel(operation);

  const handlePrint = (operation) => {
    const bureau = bureaux.find((item) => item.id === operation.bureau_id);
    const secretaire = secretaires.find((item) => Array.isArray(item.bureau_ids) && item.bureau_ids.includes(operation.bureau_id));
    
    const enrichedOperation = {
      ...operation,
      bureau_nom: bureau?.nom || operation.bureau_nom || '',
      beneficiaire: operation.beneficiaire || operation.cree_par_email || '',
      secretaire_nom: secretaire?.nom_complet || '',
      observation: operation.observation || bureau?.nom || '',
      numero_bon: operation.numero_bon || ''
    };

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.write(buildBonCaissePrintHtml(enrichedOperation, bureau?.nom || ''));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">

        {/* Header + KPIs globaux : masqués quand un bureau est sélectionné */}
        {!selectedBureau && (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-3xl font-bold text-slate-900">Opérations de caisse</h1>
              <Button onClick={openCreateForm} disabled={!canCreate} className="rounded-2xl bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                Nouvelle opération
              </Button>
            </div>

            {!isAdmin && !hasAssignedBureau && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Aucun bureau assigné</p>
                    <p className="mt-1 text-sm">Vous pouvez consulter le module, mais la saisie sera disponible après attribution d'un bureau.</p>
                  </div>
                </div>
              </div>
            )}

            <CaisseOperationsKpis metrics={weekKpis} />
          </>
        )}

        <OperationsByBureau
          operations={filteredOperations}
          bureaux={allBureaux}
          allowedBureauIds={bureaux.map((b) => b.id)}
          user={user}
          isAdmin={isAdmin}
          onEdit={openEditForm}
          onCreate={openCreateForm}
          onPrint={handlePrint}
          onDelete={handleDelete}
          onHistory={setHistoryOperation}
          cancelledOperations={cancelledOperations}
          canCreate={canCreate}
          selectedBureau={selectedBureau}
          onSelectBureau={(b) => { setSelectedBureau(b); if (!b) setWeekRef(todayString()); }}
          range={selectedBureau ? weekRange : currentWeek}
          onRangeChange={setWeekRef}
        />
      </div>

      <SimpleOperationForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        operation={selectedOperation}
        initialType={selectedType}
        bureaux={bureaux}
        defaultBureau={formBureau}
        isAdmin={isAdmin}
        operations={[...operations, ...cancelledOperations]}
        isSubmitting={saveOperationMutation.isPending}
        onSubmit={(payload) => {
          setLastFormData(payload.values);
          saveOperationMutation.mutate(payload);
        }}
        key={`${isFormOpen}-${selectedOperation?.id}`}
      />

      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Choisir le type d'opération</DialogTitle>
            <DialogDescription>Sélectionnez une entrée ou une sortie. Le solde de départ de chaque semaine (vendredi → jeudi) est repris automatiquement du solde de la semaine précédente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-2">
            <Button type="button" className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={() => { setSelectedType('entree'); setIsTypeDialogOpen(false); setIsFormOpen(true); }}>
              Entrée de caisse
            </Button>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => { setSelectedType('sortie'); setIsTypeDialogOpen(false); setIsFormOpen(true); }}>
              Sortie de caisse
            </Button>
            {canCreate && (
              <Button type="button" variant="outline" className="rounded-2xl text-slate-500" onClick={() => { setIsTypeDialogOpen(false); setIsSoldeFormOpen(true); }} title="À utiliser une seule fois, à l'ouverture de la caisse d'un bureau">
                Solde initial (ouverture de caisse)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CancelOperationDialog
        operation={operationToCancel}
        onOpenChange={(open) => { if (!open) setOperationToCancel(null); }}
        isSubmitting={cancelOperationMutation.isPending}
        onConfirm={(motif) => cancelOperationMutation.mutate({ operation: operationToCancel, motif })}
      />

      <OperationHistoryDialog
        operation={historyOperation}
        onOpenChange={(open) => { if (!open) setHistoryOperation(null); }}
      />

      <SoldeDepartFormDialog
        open={isSoldeFormOpen}
        onOpenChange={(open) => {
          setIsSoldeFormOpen(open);
          if (!open) setSelectedSolde(null);
        }}
        solde={selectedSolde}
        bureaux={bureaux}
        defaultBureau={formBureau}
        isAdmin={isAdmin}
        isSubmitting={saveOperationMutation.isPending}
        onSubmit={(payload) => {
          saveOperationMutation.mutate(payload);
          setSelectedSolde(null);
        }}
      />
    </div>
  );
}