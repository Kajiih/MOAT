/**
 * @file useMediaDetails.ts
 * @description Hook for fetching detailed metadata for a specific media item.
 * Uses SWR for caching and automatic revalidation.
 * @module useMediaDetails
 */

import useSWR from 'swr';

import { swrFetcher } from '@/lib/api/fetcher';
import { mediaTypeRegistry } from '@/lib/media-types';
import { MediaDetails, MediaType } from '@/lib/types';

/**
 * Custom hook to fetch detailed information for a specific media item.
 * Automatically derives the board category from the media type.
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
  // Derive the category from the media type via the registry
  const category =
    type && mediaTypeRegistry.has(type) ? mediaTypeRegistry.get(type).category : null;

  const { data, isLoading, error, isValidating } = useSWR<MediaDetails>(
    id && type && category ? `/api/details?id=${id}&type=${type}&category=${category}` : null,
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
