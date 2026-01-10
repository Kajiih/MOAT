import useSWR, { preload } from 'swr';
import { MediaType, MediaDetails } from '@/lib/types';

const fetcher = async (url: string, retryCount = 0): Promise<MediaDetails> => {
  const res = await fetch(url);
  
  if (res.status === 503 && retryCount < 2) {
    // Wait for 2 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    return fetcher(url, retryCount + 1);
  }

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function preloadMediaDetails(id: string, type: MediaType) {
  preload(`/api/details?id=${id}&type=${type}`, fetcher);
}

/**
 * Custom hook to fetch detailed information for a specific media item.
 */
export function useMediaDetails(id: string | null, type: MediaType | null, fallbackData?: MediaDetails) {
  const { data, isLoading, error, isValidating } = useSWR<MediaDetails>(
    id && type ? `/api/details?id=${id}&type=${type}` : null,
    fetcher,
    {
        fallbackData,
        revalidateOnFocus: false,
        revalidateIfStale: true // We want to refresh if the user viewing it
    }
  );

  return {
    details: data,
    isLoading: isLoading || (isValidating && !data),
    isFetching: isValidating,
    error
  };
}
