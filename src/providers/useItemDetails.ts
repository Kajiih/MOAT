/**
 * @file Database Details Hook
 * @description SWR-based React hook for fetching and caching robust ItemDetails.
 */

import useSWR from 'swr';

import { ItemDetails } from '@/items/items';

/**
 * Hook configuration options.
 */
interface UseItemDetailsOptions {
  /** If false, the fetch will not be executed. */
  enabled?: boolean;
}

/**
 * Custom hook for fetching full details for a Provider Item.
 * @param providerId - The ID of the provider.
 * @param entityId - The ID of the entity within the provider.
 * @param dbId - The unique ID of the item within that database.
 * @param options - Additional hook settings.
 * @returns An SWR response object containing the item details and fetching state.
 */
export const fetchItemDetails = async (
  key: unknown[],
  options?: { signal?: AbortSignal },
): Promise<ItemDetails> => {
  const signal = options?.signal;
  const [, providerId, entityId, dbId] = key as [string, string | undefined, string | undefined, string | undefined];
  
  if (!providerId || !entityId || !dbId) {
    throw new Error('Provider ID, Entity ID, and Database ID are required');
  }

  const searchParams = new URLSearchParams({
    providerId,
    entityId,
    dbId,
  });

  const res = await fetch(`/api/details?${searchParams.toString()}`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch item details');
  }

  return res.json();
};

export function useItemDetails(
  providerId: string | undefined,
  entityId: string | undefined,
  dbId: string | undefined,
  options: UseItemDetailsOptions = {},
) {
  const { enabled = true } = options;

  // 1. Create a stable cache key
  const cacheKey =
    enabled && providerId && entityId && dbId ? ['db-details', providerId, entityId, dbId] : null;

  // 3. Use SWR for fetching and caching
  const { data, error, isLoading, isValidating, mutate } = useSWR<ItemDetails>(cacheKey, fetchItemDetails, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    details: data,
    isLoading,
    isValidating,
    error: error as Error | null,
    mutate,
  };
}
