import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ensureUserBureauSynced } from '@/lib/autoSyncBureau';
import { isBoardDirection, scopeToUserBureaux, userBureauIds } from '@/lib/boardScope';

// Les chiffres de l'accueil se mettent à jour dès qu'une saisie est faite (temps réel),
// au retour sur l'onglet, et toutes les minutes en secours.
const LIVE = { refetchOnWindowFocus: true, refetchInterval: 60_000, staleTime: 0 };

export default function useModuleMetrics() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    const watch = [
      ['Dossier', 'module-dossiers'],
      ['OperationCaisse', 'module-caisse-operations'],
      ['Lotissement', 'module-lotissements'],
    ];
    const unsubs = watch.map(([entity, key]) => {
      try {
        return base44.entities[entity].subscribe(() => {
          queryClient.invalidateQueries({ queryKey: [key], exact: false });
        });
      } catch {
        return null;
      }
    });
    return () => unsubs.forEach((u) => { try { u?.(); } catch { /* ignore */ } });
  }, [queryClient]);

  useEffect(() => {
    base44.auth.me()
      .then(ensureUserBureauSynced)
      .then(setUser)
      .catch(() => {})
      .finally(() => setUserLoaded(true));
  }, []);

  const { data: bureaux = [], isLoading: isLoadingBureaux } = useQuery({
    queryKey: ['module-bureaux'],
    queryFn: () => base44.entities.Bureau.list(),
    initialData: []
  });

  const isAdmin = isBoardDirection(user);
  const myBureauIds = userBureauIds(user);

  const { data: dossiers = [], isLoading: isLoadingDossiers } = useQuery({
    queryKey: ['module-dossiers', user?.id, isAdmin, myBureauIds.join(',')],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) return base44.entities.Dossier.list();
      if (!myBureauIds.length) return [];
      return base44.entities.Dossier.filter({ bureau_id: { $in: myBureauIds } });
    },
    enabled: userLoaded && !!user && !isLoadingBureaux,
    initialData: [],
    ...LIVE
  });

  const { data: rawOperations = [], isLoading: isLoadingOperations } = useQuery({
    queryKey: ['module-caisse-operations', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      // RLS filtre côté serveur selon les bureaux de l'utilisateur
      return base44.entities.OperationCaisse.list();
    },
    enabled: userLoaded && !!user && !isLoadingBureaux,
    initialData: [],
    ...LIVE
  });
  // Les bons annulés ne comptent pas dans les indicateurs
  const operations = useMemo(() => scopeToUserBureaux(rawOperations, user).filter((o) => o.statut !== 'annule'), [rawOperations, user]);

  const { data: lotissements = [], isLoading: isLoadingLotissements } = useQuery({
    queryKey: ['module-lotissements'],
    queryFn: () => base44.entities.Lotissement.list(),
    enabled: userLoaded && !!user,
    initialData: [],
    ...LIVE
  });

  const userBureau = useMemo(() => {
    if (!user) return null;
    const primaryId = user?.data?.bureau_id || user?.bureau_id;
    return bureaux.find((bureau) => bureau.id === primaryId) || bureaux.find((bureau) => myBureauIds.includes(bureau.id)) || null;
  }, [user, bureaux]);

  const metrics = useMemo(() => {
    const totalDossiers = dossiers.length;
    const totalEncaisse = dossiers.reduce((sum, dossier) => sum + (dossier.montant_paye || 0), 0);
    const resteAEncaisser = dossiers.reduce((sum, dossier) => {
      const restant = (dossier.cout_estime || 0) - (dossier.montant_paye || 0);
      return sum + Math.max(restant, 0);
    }, 0);
    // Même calcul que le module Caisse : solde de départ + entrées - sorties (montants réellement reçus / payés)
    const recu = (op) => (op.montant_recu == null ? Number(op.montant) || 0 : Number(op.montant_recu) || 0);
    const totalSoldesDepart = operations.reduce((sum, op) => sum + (op.type_operation === 'solde_depart' ? Number(op.montant) || 0 : 0), 0);
    const totalEntreesCaisse = operations.reduce((sum, op) => sum + (op.type_operation === 'entree' ? recu(op) : 0), 0);
    const totalSortiesCaisse = operations.reduce((sum, op) => sum + (op.type_operation === 'sortie' ? recu(op) : 0), 0);
    const soldeCaisse = totalSoldesDepart + totalEntreesCaisse - totalSortiesCaisse;
    const lotissementsEnCours = lotissements.filter((l) => l.statut === "En cours").length;

    return {
      totalDossiers,
      totalEncaisse,
      resteAEncaisser,
      totalEntreesCaisse,
      totalSortiesCaisse,
      soldeCaisse,
      lotissementsEnCours,
      tauxEncaissement: totalEncaisse + resteAEncaisser > 0
        ? Math.round((totalEncaisse / (totalEncaisse + resteAEncaisser)) * 100)
        : 0
    };
  }, [dossiers, operations, lotissements]);

  return {
    user,
    bureaux,
    dossiers,
    operations,
    userBureau,
    isAdmin,
    isLoading: !userLoaded || isLoadingBureaux || (!!user && (isLoadingDossiers || isLoadingOperations || isLoadingLotissements)),
    metrics
  };
}