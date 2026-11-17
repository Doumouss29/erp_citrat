import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ensureUserBureauSynced } from '@/lib/autoSyncBureau';
import { isBoardDirection, scopeToUserBureaux, visibleBureaux } from '@/lib/boardScope';

export default function useCaisseModule() {
  const [user, setUser] = useState(undefined);
  const queryClient = useQueryClient();

  // Temps réel : toute saisie (ici ou dans un autre bureau) met à jour opérations et rapports
  useEffect(() => {
    const subs = [
      ['OperationCaisse', 'caisse-operations'],
      ['CommentaireOperationCaisse', 'caisse-comments'],
    ].map(([entity, key]) => {
      try {
        return base44.entities[entity].subscribe(() => queryClient.invalidateQueries({ queryKey: [key], exact: false }));
      } catch {
        return null;
      }
    });
    return () => subs.forEach((u) => { try { u?.(); } catch { /* ignore */ } });
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer;
    const loadUser = () => {
      base44.auth.me().then(ensureUserBureauSynced).then((u) => {
        if (!cancelled) setUser(u);
      }).catch((error) => {
        // Coupure réseau passagère : on réessaie quelques secondes plus tard
        if (error?.response || error?.status) throw error;
        if (!cancelled) retryTimer = setTimeout(loadUser, 3000);
      });
    };
    loadUser();
    return () => { cancelled = true; clearTimeout(retryTimer); };
  }, []);

  const { data: allBureaux = [], isLoading: isLoadingBureaux } = useQuery({
    queryKey: ['caisse-bureaux'],
    queryFn: () => base44.entities.Bureau.list(),
    initialData: []
  });

  const isAdmin = isBoardDirection(user);
  // Un bureau ne voit que ses propres bureaux ; la Direction voit tout
  const bureaux = useMemo(() => (user ? visibleBureaux(allBureaux, user) : []), [allBureaux, user]);

  const userBureau = useMemo(() => {
    if (!user) return null;
    const primaryId = user?.data?.bureau_id || user?.bureau_id;
    return bureaux.find((bureau) => bureau.id === primaryId)
      || bureaux[0]
      || null;
  }, [user, bureaux]);

  const bureauId = userBureau?.id || null;

  const { data: rawOperations = [], isLoading: isLoadingOperations } = useQuery({
    queryKey: ['caisse-operations', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      // RLS filtre côté serveur : admin voit tout, secrétaire/responsable voit ses bureaux
      return base44.entities.OperationCaisse.list('-date_operation');
    },
    enabled: user !== undefined && !isLoadingBureaux,
    initialData: [],
    refetchOnWindowFocus: true,
    refetchInterval: 60_000
  });
  const scopedOperations = useMemo(() => scopeToUserBureaux(rawOperations, user), [rawOperations, user]);
  // Les bons annulés ne comptent dans aucun solde ni rapport : ils sont listés à part
  const operations = useMemo(() => scopedOperations.filter((o) => o.statut !== 'annule'), [scopedOperations]);
  const cancelledOperations = useMemo(() => scopedOperations.filter((o) => o.statut === 'annule'), [scopedOperations]);

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['caisse-comments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.CommentaireOperationCaisse.list('-created_date');
    },
    enabled: user !== undefined && !isLoadingBureaux,
    initialData: []
  });

  const { data: secretaires = [], isLoading: isLoadingSecretaires } = useQuery({
    queryKey: ['caisse-secretaires'],
    queryFn: () => base44.entities.SecretaireBureau.list('-updated_date', 100),
    initialData: []
  });

  const metrics = useMemo(() => {
    const soldeDepart = operations
      .filter((operation) => operation.type_operation === 'solde_depart')
      .reduce((sum, operation) => sum + (operation.montant || 0), 0);

    const totalEntrees = operations
      .filter((operation) => operation.type_operation === 'entree')
      .reduce((sum, operation) => sum + (operation.montant || 0), 0);

    const totalSorties = operations
      .filter((operation) => operation.type_operation === 'sortie')
      .reduce((sum, operation) => sum + (operation.montant || 0), 0);

    return {
      soldeDepart,
      totalEntrees,
      totalSorties,
      solde: soldeDepart + totalEntrees - totalSorties,
      totalOperations: operations.length
    };
  }, [operations]);

  return {
    user,
    bureaux,
    allBureaux,
    userBureau,
    bureauId,
    isAdmin,
    hasAssignedBureau: Boolean(bureauId),
    operations,
    cancelledOperations,
    comments,
    secretaires,
    metrics,
    isLoading: user === undefined || isLoadingBureaux || isLoadingOperations || isLoadingComments || isLoadingSecretaires
  };
}