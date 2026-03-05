/**
 * @file useLegacyItemDetails.ts
 * @description [LEGACY V1] Hook for fetching detailed metadata for a specific media item.
 * Uses SWR for caching and automatic revalidation.
 */

'use client';

import useSWR from 'swr';

import { swrFetcher } from '@/lib/api/fetcher';
import { itemTypeRegistry } from '@/v1/lib/item-types';
import { ItemType, LegacyItemDetails } from '@/lib/types';

/**
 * Custom hook to fetch detailed information for a specific media item.
 * Automatically derives the board category from the media type.
 * @param id - The ID of the media item to fetch.
 * @param type - The type of the media item.
 * @param serviceId
 * @param fallbackData - Optional fallback data.
 * @returns An object containing the fetched media details, loading state, and error.
 */
export function useLegacyItemDetails(
  id: string | null,
  type: ItemType | null,
  serviceId?: string | null,
  fallbackData?: LegacyItemDetails,
) {
  // Derive the category from the media type via the registry
  const category =
    type && itemTypeRegistry.has(type) ? itemTypeRegistry.get(type).category : null;

  const { data, isLoading, error, isValidating } = useSWR<LegacyItemDetails>(
    id && type && category
      ? `/api/details?id=${id}&type=${type}&category=${category}${serviceId ? `&service=${serviceId}` : ''}`
      : null,
    swrFetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      revalidateIfStale: true,
    },
  );

  return {
    details: data,
    isLoading: isLoading || (isValidating && !data),
    isFetching: isValidating,
    error,
  };
}
