import deepEqual from 'fast-deep-equal';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useDebounce } from 'use-debounce';

import { registry } from '../registry';
import { SearchParams, SearchResult } from '../types';

/**
 * Hook configuration options.
 */
interface UseDatabaseSearchOptions {
  /** If false, the search will not be executed. */
  enabled?: boolean;
  /** Debounce delay in milliseconds (default: 300). */
  debounceMs?: number;
  /** Keep previous data while loading new results. */
  keepPreviousData?: boolean;
}

/**
 * Custom hook for searching against a V2 Database Entity.
 * 
 * @param providerId - The ID of the database provider.
 * @param entityId - The ID of the entity within the provider.
 * @param params - The search parameters (query, filters, sort, etc.).
 * @param options - Additional hook settings.
 */
export function useDatabaseSearch(
  providerId: string | undefined,
  entityId: string | undefined,
  params: Partial<SearchParams>,
  options: UseDatabaseSearchOptions = {}
) {
  const { enabled = true, debounceMs = 300, keepPreviousData = true } = options;

  // 1. Debounce params to avoid over-fetching
  // We use deepEqual to ensure the timer only resets if the CONTENT changes,
  // not just the object reference.
  const [debouncedParams] = useDebounce(params, debounceMs, {
    equalityFn: (a, b) => deepEqual(a, b),
  });

  // 2. Create a stable cache key
  const cacheKey = useMemo(() => {
    if (!enabled || !providerId || !entityId) return null;
    
    // We include all relevant params in the key for SWR
    return [
      'db-search',
      providerId,
      entityId,
      debouncedParams.query || '',
      JSON.stringify(debouncedParams.filters || {}),
      debouncedParams.sort || '',
      debouncedParams.sortDirection || '',
      debouncedParams.page || 1,
      debouncedParams.cursor || '',
    ];
  }, [enabled, providerId, entityId, debouncedParams]);

  // 3. Define the fetcher that talks to the Registry
  const fetcher = async (): Promise<SearchResult> => {
    if (!providerId || !entityId) {
      throw new Error('Provider ID and Entity ID are required');
    }

    const entity = registry.getEntity(providerId, entityId);
    if (!entity) {
      throw new Error(`Entity "${entityId}" not found in provider "${providerId}"`);
    }

    // Construct full SearchParams with defaults
    const fullParams: SearchParams = {
      query: debouncedParams.query || '',
      filters: debouncedParams.filters || {},
      sort: debouncedParams.sort,
      sortDirection: debouncedParams.sortDirection,
      page: debouncedParams.page,
      limit: debouncedParams.limit || 20,
      cursor: debouncedParams.cursor,
      offset: debouncedParams.offset,
    };

    return entity.search(fullParams);
  };

  // 4. Use SWR for fetching and caching
  const { data, error, isLoading, isValidating, mutate } = useSWR<SearchResult>(
    cacheKey,
    fetcher,
    {
      keepPreviousData,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    results: data?.items || [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error: error as Error | null,
    mutate,
  };
}
