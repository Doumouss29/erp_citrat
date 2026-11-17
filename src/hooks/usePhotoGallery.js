import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePhotoGallery() {
  const { data: photos = [], isLoading, error } = useQuery({
    queryKey: ['photos'],
    queryFn: async () => (await base44.functions.invoke('hseGalleryPhoto', { action: 'list' })).data.photos,
    refetchInterval: 45 * 60 * 1000,
  });

  return { photos, isLoading, error };
}