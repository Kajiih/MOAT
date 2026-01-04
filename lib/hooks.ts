import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR, { preload } from 'swr';
import { getSearchUrl } from '@/lib/api';
import { MediaType, MediaItem, ArtistItem, AlbumItem, SongItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseMediaSearchConfig {
  fuzzy?: boolean;
  wildcard?: boolean;
  enabled?: boolean;
}

// Map each MediaType to its specific item type
type MediaItemMap = {
  artist: ArtistItem;
  album: AlbumItem;
  song: SongItem;
};

interface UseMediaSearchResult<T extends MediaItem> {
  query: string;
  setQuery: (val: string) => void;
  artistId: string | undefined;
  setArtistId: (val: string | undefined) => void;
  minYear: string;
  setMinYear: (val: string) => void;
  maxYear: string;
  setMaxYear: (val: string) => void;
  albumPrimaryTypes: string[];
  setAlbumPrimaryTypes: (val: string[]) => void;
  albumSecondaryTypes: string[];
  setAlbumSecondaryTypes: (val: string[]) => void;
  page: number;
  setPage: (val: number | ((prev: number) => number)) => void;
  fuzzy: boolean;
  setFuzzy: (val: boolean) => void;
  wildcard: boolean;
  setWildcard: (val: boolean) => void;
  reset: () => void;
  searchNow: () => void; // Manually trigger search (flush debounce)
  results: T[];
  totalPages: number;
  isLoading: boolean;
  isValidating: boolean;
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
export function useMediaSearch<T extends MediaType>(
  type: T, 
  config?: UseMediaSearchConfig
): UseMediaSearchResult<MediaItemMap[T]> {
  const [query, setQuery] = useState('');
  const [artistId, setArtistId] = useState<string | undefined>(undefined);
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [internalAlbumPrimaryTypes, setInternalAlbumPrimaryTypes] = useState<string[]>(['Album', 'EP']);
  const [internalAlbumSecondaryTypes, setInternalAlbumSecondaryTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  
  // Internal State (used if no config provided)
  const [internalFuzzy, setInternalFuzzy] = useState(true);
  const [internalWildcard, setInternalWildcard] = useState(true);

  // Determine effective values
  const isFuzzy = config?.fuzzy ?? internalFuzzy;
  const isWildcard = config?.wildcard ?? internalWildcard;
  const isEnabled = config?.enabled ?? true;
  
  const albumPrimaryTypes = internalAlbumPrimaryTypes;
  const albumSecondaryTypes = internalAlbumSecondaryTypes;

  const debounceDelay = 300; // milliseconds

  // Debounce text inputs to avoid excessive API calls
  const [debouncedQuery, controlQuery] = useDebounce(query, debounceDelay);
  const [debouncedMinYear, controlMinYear] = useDebounce(minYear, debounceDelay);
  const [debouncedMaxYear, controlMaxYear] = useDebounce(maxYear, debounceDelay);
  
  // Explicit flush for immediate search (e.g., on Enter key)
  const searchNow = () => {
    controlQuery.flush();
    controlMinYear.flush();
    controlMaxYear.flush();
  };
  
  // Wrappers to reset page on filter change
  const handleSetQuery = (val: string) => { setQuery(val); setPage(1); };
  const handleSetArtistId = (val: string | undefined) => { setArtistId(val); setPage(1); };
  const handleSetMinYear = (val: string) => { setMinYear(val); setPage(1); };
  const handleSetMaxYear = (val: string) => { setMaxYear(val); setPage(1); };
  const handleSetAlbumPrimaryTypes = (val: string[]) => { setInternalAlbumPrimaryTypes(val); setPage(1); };
  const handleSetAlbumSecondaryTypes = (val: string[]) => { setInternalAlbumSecondaryTypes(val); setPage(1); };

  const reset = () => {
    setQuery('');
    setArtistId(undefined);
    setMinYear('');
    setMaxYear('');
    setInternalAlbumPrimaryTypes(['Album', 'EP']);
    setInternalAlbumSecondaryTypes([]);
    setPage(1);
  };

  // Determine if filters have changed to toggle keepPreviousData
  // We construct a "fingerprint" of the filters (excluding page)
  const filterKey = JSON.stringify({
    type,
    query: debouncedQuery,
    artistId,
    minYear: debouncedMinYear,
    maxYear: debouncedMaxYear,
    albumPrimaryTypes,
    albumSecondaryTypes,
    fuzzy: isFuzzy,
    wildcard: isWildcard
  });

  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  // If filters changed, we should NOT keep previous data (show loading state)
  // If filters are same (just page changed), we SHOULD keep previous data (pagination)
  const shouldKeepPreviousData = filterKey === prevFilterKey;

  // Update prevFilterKey after render when filterKey changes
  useEffect(() => {
    setPrevFilterKey(filterKey);
  }, [filterKey]);

  const searchUrl = useMemo(() => {
    if (!isEnabled) return null;

    const hasFilters = debouncedQuery || artistId || debouncedMinYear || debouncedMaxYear || albumPrimaryTypes.length > 0 || albumSecondaryTypes.length > 0;
    if (!hasFilters) return null;

    return getSearchUrl({
      type,
      page,
      query: debouncedQuery,
      artistId,
      minYear: debouncedMinYear,
      maxYear: debouncedMaxYear,
      albumPrimaryTypes,
      albumSecondaryTypes,
      fuzzy: isFuzzy,
      wildcard: isWildcard
    });
  }, [isEnabled, type, page, debouncedQuery, artistId, debouncedMinYear, debouncedMaxYear, albumPrimaryTypes, albumSecondaryTypes, isFuzzy, isWildcard]);

  const { data, isLoading, isValidating } = useSWR<{ results: MediaItem[], page: number, totalPages: number }>(
    searchUrl,
    fetcher,
    { keepPreviousData: shouldKeepPreviousData }
  );
  
  // Pagination Prefetching
  useEffect(() => {
      if (data && page < data.totalPages && isEnabled) {
          const nextUrl = getSearchUrl({
            type,
            page: page + 1,
            query: debouncedQuery,
            artistId,
            minYear: debouncedMinYear,
            maxYear: debouncedMaxYear,
            albumPrimaryTypes,
            albumSecondaryTypes,
            fuzzy: isFuzzy,
            wildcard: isWildcard
          });
          preload(nextUrl, fetcher);
      }
  }, [data, page, type, debouncedQuery, artistId, debouncedMinYear, debouncedMaxYear, albumPrimaryTypes, albumSecondaryTypes, isFuzzy, isWildcard, isEnabled]);

  return {
    // State
    query, setQuery: handleSetQuery,
    artistId, setArtistId: handleSetArtistId,
    minYear, setMinYear: handleSetMinYear,
    maxYear, setMaxYear: handleSetMaxYear,
    albumPrimaryTypes, setAlbumPrimaryTypes: handleSetAlbumPrimaryTypes,
    albumSecondaryTypes, setAlbumSecondaryTypes: handleSetAlbumSecondaryTypes,
    page, setPage,
    // Setters update internal state (which acts as fallback/default)
    fuzzy: isFuzzy, setFuzzy: setInternalFuzzy,
    wildcard: isWildcard, setWildcard: setInternalWildcard,
    reset,
    searchNow,
    
    // Data
    results: (data?.results || []) as MediaItemMap[T][],
    totalPages: data?.totalPages || 0,
    isLoading,
    isValidating
  };
}

/**
 * A custom hook that synchronizes state with localStorage.
 * Since this is used in a client-only component (SSR disabled),
 * we can safely use lazy initialization to read from localStorage immediately.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  // 1. Lazy initialization: Read from localStorage on the very first render
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 2. Persist Updates: Debounce the write to localStorage
  const [debouncedState] = useDebounce(state, 1000);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(debouncedState));
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, debouncedState]);

  return [state, setState] as const;
}
