import useSWR from 'swr';

import { registry } from '../registry';
import { StandardDetails } from '../types';

/**
 * Hook configuration options.
 */
interface UseDatabaseDetailsOptions {
  /** If false, the fetch will not be executed. */
  enabled?: boolean;
}

/**
 * Custom hook for fetching full details for a V2 Database Item.
 * 
 * @param providerId - The ID of the database provider.
 * @param entityId - The ID of the entity within the provider.
 * @param dbId - The unique ID of the item within that database.
 * @param options - Additional hook settings.
 */
export function useDatabaseDetails(
  providerId: string | undefined,
  entityId: string | undefined,
  dbId: string | undefined,
  options: UseDatabaseDetailsOptions = {}
) {
  const { enabled = true } = options;

  // 1. Create a stable cache key
  const cacheKey = enabled && providerId && entityId && dbId 
    ? ['db-details', providerId, entityId, dbId] 
    : null;

  // 2. Define the fetcher
  const fetcher = async (_key: any[], { signal }: { signal: AbortSignal }): Promise<StandardDetails> => {
    if (!providerId || !entityId || !dbId) {
      throw new Error('Provider ID, Entity ID, and Database ID are required');
    }

    const entity = registry.getEntity(providerId, entityId);
    if (!entity) {
      throw new Error(`Entity "${entityId}" not found in provider "${providerId}"`);
    }

    return entity.getDetails(dbId, { signal });
  };

  // 3. Use SWR for fetching and caching
  const { data, error, isLoading, isValidating, mutate } = useSWR<StandardDetails>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    details: data,
    isLoading,
    isValidating,
    error: error as Error | null,
    mutate,
  };
}
