/**
 * @file Item Details Hook
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
  * @param key - The SWR cache key tuple [prefix, providerId, entityId, providerItemId].
  * @param options - Options configuration.
  * @param options.signal - AbortSignal to cancel the fetch.
  * @returns A Promise for the resolved item details.
  */
export const fetchItemDetails = async (
  key: unknown[],
  { signal }: { signal?: AbortSignal } = {},
): Promise<ItemDetails> => {
  const [, providerId, entityId, providerItemId] = key as [string, string | undefined, string | undefined, string | undefined];
  
  if (!providerId || !entityId || !providerItemId) {
    throw new Error('Provider ID, Entity ID, and Provider Item ID are required');
  }

  const searchParams = new URLSearchParams({
    providerId,
    entityId,
    providerItemId,
  });

  const res = await fetch(`/api/details?${searchParams.toString()}`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch item details');
  }

  return res.json();
};

/**
 * Custom hook for fetching full details for a Provider Item.
 * @param providerId - The ID of the provider.
 * @param entityId - The ID of the entity within the provider.
 * @param providerItemId - The unique ID of the item within that provider.
 * @param options - Additional hook settings.
 * @returns An SWR response object containing the item details and fetching state.
 */
export function useItemDetails(
  providerId: string | undefined,
  entityId: string | undefined,
  providerItemId: string | undefined,
  options: UseItemDetailsOptions = {},
) {
  const { enabled = true } = options;

  // 1. Create a stable cache key
  const cacheKey =
    enabled && providerId && entityId && providerItemId ? ['item-details', providerId, entityId, providerItemId] : null;

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
