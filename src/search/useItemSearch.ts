/**
 * @file useItemSearch.ts
 * @description Hook for executing generic searches against Database Entities.
 */
import deepEqual from 'fast-deep-equal';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useDebounce } from 'use-debounce';

import { SearchParams, SearchResult } from '@/search/search-schemas';

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
 * Custom hook for searching against an Entity.
 * @param providerId - The ID of the provider.
 * @param entityId - The ID of the entity within the provider.
 * @param params - The search parameters (query, filters, sort, etc.).
 * @param options - Additional hook settings.
 * @returns An object containing search results, pagination info, and status flags.
 */
export function useItemSearch(
  providerId: string | undefined,
  entityId: string | undefined,
  params: SearchParams,
  options: UseDatabaseSearchOptions = {}
) {
  const { enabled = true, debounceMs = 300, keepPreviousData = true } = options;

  // 1. Debounce params to avoid over-fetching
  const [debouncedParams] = useDebounce(params, debounceMs, {
    equalityFn: (a, b) => deepEqual(a, b),
  });

  // 2. Create a stable cache key
  const cacheKey = useMemo(() => {
    if (!enabled || !providerId || !entityId) return null;
    
    // We include all relevant params in the key for SWR
    // Strategy-blind: we just stringify the relevant parts of debouncedParams
    const { signal: _signal, ...serializableParams } = debouncedParams;
    return [
      'db-search',
      providerId,
      entityId,
      JSON.stringify(serializableParams)
    ];
  }, [enabled, providerId, entityId, debouncedParams]);

  // 3. Define the fetcher that correctly delegates to our API Proxy
  const fetcher = async ([_cacheKey, providerId, entityId, serializedParams]: string[], { signal }: { signal?: AbortSignal } = {}) => {
    if (!providerId || !entityId) {
      throw new Error('Provider ID and Entity ID are required');
    }
    
    const searchParams = new URLSearchParams();
    searchParams.set('providerId', providerId);
    searchParams.set('entityId', entityId);
    
    const parsedParams = JSON.parse(serializedParams) as SearchParams;

    if (parsedParams.query) searchParams.set('query', parsedParams.query);
    if (parsedParams.sort) searchParams.set('sort', parsedParams.sort);
    if (parsedParams.sortDirection) searchParams.set('sortDirection', parsedParams.sortDirection);
    if (parsedParams.limit) searchParams.set('limit', parsedParams.limit.toString());
    
    if ('page' in parsedParams && parsedParams.page) {
      searchParams.set('page', parsedParams.page.toString());
    }
    if ('cursor' in parsedParams && parsedParams.cursor) {
      searchParams.set('cursor', parsedParams.cursor);
    }
    if ('offset' in parsedParams && parsedParams.offset !== undefined) {
      searchParams.set('offset', parsedParams.offset.toString());
    }
    
    if (parsedParams.filters && Object.keys(parsedParams.filters).length > 0) {
      searchParams.set('filters', JSON.stringify(parsedParams.filters));
    }
    
    const res = await fetch(`/api/search?${searchParams.toString()}`, { signal });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch search results');
    }

    return res.json();
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
