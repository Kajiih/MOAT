import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR, { preload } from 'swr';
import { getSearchUrl } from '@/lib/api';
import { MediaType, MediaItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseMediaSearchConfig {
  fuzzy?: boolean;
  wildcard?: boolean;
}

/**
 * Custom hook to manage the state and data fetching for media searches.
 * 
 * Handles:
 * - Local state for query params (text, year range, artist filter).
 * - Debouncing of inputs to prevent excessive API calls.
 * - SWR integration for data fetching, caching, and revalidation.
 * - Automatic prefetching of the next page of results.
 * 
 * @param type - The type of media to search for ('album', 'artist', 'song').
 * @param config - Optional configuration overrides for search settings.
 */
export function useMediaSearch(type: MediaType, config?: UseMediaSearchConfig) {
  const [query, setQuery] = useState('');
  const [artistId, setArtistId] = useState<string | undefined>(undefined);
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [page, setPage] = useState(1);
  
  // Internal State (used if no config provided)
  const [internalFuzzy, setInternalFuzzy] = useState(true);
  const [internalWildcard, setInternalWildcard] = useState(true);

  // Determine effective values
  const isFuzzy = config?.fuzzy ?? internalFuzzy;
  const isWildcard = config?.wildcard ?? internalWildcard;

  // Debounce text inputs to avoid excessive API calls
  const [debouncedQuery] = useDebounce(query, 500);
  const [debouncedMinYear] = useDebounce(minYear, 500);
  const [debouncedMaxYear] = useDebounce(maxYear, 500);
  
  // Wrappers to reset page on filter change
  const handleSetQuery = (val: string) => { setQuery(val); setPage(1); };
  const handleSetArtistId = (val: string | undefined) => { setArtistId(val); setPage(1); };
  const handleSetMinYear = (val: string) => { setMinYear(val); setPage(1); };
  const handleSetMaxYear = (val: string) => { setMaxYear(val); setPage(1); };

  const reset = () => {
    setQuery('');
    setArtistId(undefined);
    setMinYear('');
    setMaxYear('');
    setPage(1);
  };

  const searchUrl = useMemo(() => {
    const hasFilters = debouncedQuery || artistId || debouncedMinYear || debouncedMaxYear;
    if (!hasFilters) return null;

    return getSearchUrl({
      type,
      page,
      query: debouncedQuery,
      artistId,
      minYear: debouncedMinYear,
      maxYear: debouncedMaxYear,
      fuzzy: isFuzzy,
      wildcard: isWildcard
    });
  }, [type, page, debouncedQuery, artistId, debouncedMinYear, debouncedMaxYear, isFuzzy, isWildcard]);

  const { data, isLoading, isValidating } = useSWR<{ results: MediaItem[], page: number, totalPages: number }>(
    searchUrl,
    fetcher,
    { keepPreviousData: true }
  );
  
  // Pagination Prefetching
  useEffect(() => {
      if (data && page < data.totalPages) {
          const nextUrl = getSearchUrl({
            type,
            page: page + 1,
            query: debouncedQuery,
            artistId,
            minYear: debouncedMinYear,
            maxYear: debouncedMaxYear,
            fuzzy: isFuzzy,
            wildcard: isWildcard
          });
          preload(nextUrl, fetcher);
      }
  }, [data, page, type, debouncedQuery, artistId, debouncedMinYear, debouncedMaxYear, isFuzzy, isWildcard]);

  return {
    // State
    query, setQuery: handleSetQuery,
    artistId, setArtistId: handleSetArtistId,
    minYear, setMinYear: handleSetMinYear,
    maxYear, setMaxYear: handleSetMaxYear,
    page, setPage,
    // Setters update internal state (which acts as fallback/default)
    fuzzy: isFuzzy, setFuzzy: setInternalFuzzy,
    wildcard: isWildcard, setWildcard: setInternalWildcard,
    reset,
    
    // Data
    results: data?.results || [],
    totalPages: data?.totalPages || 0,
    isLoading,
    isValidating
  };
}
