/**
 * @file useMediaDetails.ts
 * @description Hook for fetching detailed metadata for a specific media item.
 * Uses SWR for caching and automatic revalidation.
 * @module useMediaDetails
 */

import useSWR, { preload } from 'swr';

import { swrFetcher } from '@/lib/api/fetcher';
import { MediaDetails, MediaType } from '@/lib/types';

export function preloadMediaDetails(id: string, type: MediaType) {
  preload(`/api/details?id=${id}&type=${type}`, swrFetcher);
}

/**
 * Custom hook to fetch detailed information for a specific media item.
 * @param id - The ID of the media item to fetch.
 * @param type - The type of the media item.
 * @param fallbackData - Optional fallback data.
 * @returns An object containing the fetched media details, loading state, and error.
 */
export function useMediaDetails(
  id: string | null,
  type: MediaType | null,
  fallbackData?: MediaDetails,
) {
  const { data, isLoading, error, isValidating } = useSWR<MediaDetails>(
    id && type ? `/api/details?id=${id}&type=${type}` : null,
    swrFetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      revalidateIfStale: true, // We want to refresh if the user viewing it
    },
  );

  return {
    details: data,
    isLoading: isLoading || (isValidating && !data),
    isFetching: isValidating,
    error,
  };
}
