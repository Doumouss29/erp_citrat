import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useHSEEvents() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['hse-events'],
    queryFn: () => base44.entities.HSEEvent.list('-date_event'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HSEEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hse-events'] });
      toast.success('Fiche créée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HSEEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hse-events'] });
      toast.success('Fiche modifiée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HSEEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hse-events'] });
      toast.success('Fiche supprimée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  return {
    events,
    isLoading,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}