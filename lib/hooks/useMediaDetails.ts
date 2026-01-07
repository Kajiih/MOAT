import useSWR from 'swr';
import { MediaType, MediaDetails } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Custom hook to fetch detailed information for a specific media item.
 */
export function useMediaDetails(id: string | null, type: MediaType | null) {
  const { data, isLoading, error } = useSWR<MediaDetails>(
    id && type ? `/api/details?id=${id}&type=${type}` : null,
    fetcher
  );

  return {
    details: data,
    isLoading,
    error
  };
}
