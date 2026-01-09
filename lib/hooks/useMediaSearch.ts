import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR, { preload } from 'swr';
import { getSearchUrl } from '@/lib/api';
import { MediaType, MediaItem, ArtistItem, AlbumItem, SongItem, ArtistSelection } from '@/lib/types';
import { usePersistentState } from './usePersistentState';
import { useMediaRegistry } from '@/components/MediaRegistryProvider';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

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

interface SearchParamsState {
  query: string;
  selectedArtist: ArtistSelection | null;
  minYear: string;
  maxYear: string;
  albumPrimaryTypes: string[];
  albumSecondaryTypes: string[];
  page: number;
}

interface UseMediaSearchResult<T extends MediaItem> {
  query: string;
  setQuery: (val: string) => void;
  selectedArtist: ArtistSelection | null;
  setSelectedArtist: (val: ArtistSelection | null) => void;
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
  error: any;
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
  const storageKey = `moat-search-params-${type}`;
  
  const defaultState: SearchParamsState = {
    query: '',
    selectedArtist: null,
    minYear: '',
    maxYear: '',
    albumPrimaryTypes: ['Album', 'EP'],
    albumSecondaryTypes: [],
    page: 1
  };

  const [state, setState] = usePersistentState<SearchParamsState>(storageKey, defaultState);

  // Map state to individual variables
  const { query, selectedArtist, minYear, maxYear, albumPrimaryTypes, albumSecondaryTypes, page } = state;
  
  // Internal State (used if no config provided)
  const [internalFuzzy, setInternalFuzzy] = useState(true);
  const [internalWildcard, setInternalWildcard] = useState(true);

  // Determine effective values
  const isFuzzy = config?.fuzzy ?? internalFuzzy;
  const isWildcard = config?.wildcard ?? internalWildcard;
  const isEnabled = config?.enabled ?? true;
  
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
  // Wrappers to reset page on filter change
  const handleSetQuery = (val: string) => {
    // Trim leading spaces but allow trailing spaces for better UX while typing
    const trimmedVal = val.startsWith(' ') ? val.trimStart() : val;
    setState(prev => ({ ...prev, query: trimmedVal, page: 1 }));
  };
  const handleSetSelectedArtist = (val: ArtistSelection | null) => setState(prev => ({ ...prev, selectedArtist: val, page: 1 }));
  const handleSetMinYear = (val: string) => setState(prev => ({ ...prev, minYear: val, page: 1 }));
  const handleSetMaxYear = (val: string) => setState(prev => ({ ...prev, maxYear: val, page: 1 }));
  const handleSetAlbumPrimaryTypes = (val: string[]) => setState(prev => ({ ...prev, albumPrimaryTypes: val, page: 1 }));
  const handleSetAlbumSecondaryTypes = (val: string[]) => setState(prev => ({ ...prev, albumSecondaryTypes: val, page: 1 }));
  const handleSetPage = (val: number | ((prev: number) => number)) => {
    setState(prev => ({ ...prev, page: typeof val === 'function' ? val(prev.page) : val }));
  };

  const reset = () => {
    setState(defaultState);
  };

  // Determine if filters have changed to toggle keepPreviousData
  // We construct a "fingerprint" of the filters (excluding page)
  const filterKey = JSON.stringify({
    type,
    query: debouncedQuery,
    artistId: selectedArtist?.id,
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

    const hasFilters = debouncedQuery || selectedArtist?.id || debouncedMinYear || debouncedMaxYear || albumPrimaryTypes.length > 0 || albumSecondaryTypes.length > 0;
    if (!hasFilters) return null;

    return getSearchUrl({
      type,
      page,
      query: debouncedQuery,
      artistId: selectedArtist?.id,
      minYear: debouncedMinYear,
      maxYear: debouncedMaxYear,
      albumPrimaryTypes,
      albumSecondaryTypes,
      fuzzy: isFuzzy,
      wildcard: isWildcard
    });
  }, [isEnabled, type, page, debouncedQuery, selectedArtist, debouncedMinYear, debouncedMaxYear, albumPrimaryTypes, albumSecondaryTypes, isFuzzy, isWildcard]);

  const { data, error, isLoading, isValidating } = useSWR<{ results: MediaItem[], page: number, totalPages: number }>(
    searchUrl,
    fetcher,
    { keepPreviousData: shouldKeepPreviousData }
  );

  const { registerItems } = useMediaRegistry();

  // Automatically register discovered items in the global registry
  useEffect(() => {
      if (data?.results) {
          registerItems(data.results);
      }
  }, [data?.results, registerItems]);
  
  // Pagination Prefetching
  useEffect(() => {
      if (data && page < data.totalPages && isEnabled) {
          const nextUrl = getSearchUrl({
            type,
            page: page + 1,
            query: debouncedQuery,
            artistId: selectedArtist?.id,
            minYear: debouncedMinYear,
            maxYear: debouncedMaxYear,
            albumPrimaryTypes,
            albumSecondaryTypes,
            fuzzy: isFuzzy,
            wildcard: isWildcard
          });
          preload(nextUrl, fetcher);
      }
  }, [data, page, type, debouncedQuery, selectedArtist, debouncedMinYear, debouncedMaxYear, albumPrimaryTypes, albumSecondaryTypes, isFuzzy, isWildcard, isEnabled]);

  return {
    // State
    query, setQuery: handleSetQuery,
    selectedArtist, setSelectedArtist: handleSetSelectedArtist,
    minYear, setMinYear: handleSetMinYear,
    maxYear, setMaxYear: handleSetMaxYear,
    albumPrimaryTypes, setAlbumPrimaryTypes: handleSetAlbumPrimaryTypes,
    albumSecondaryTypes, setAlbumSecondaryTypes: handleSetAlbumSecondaryTypes,
    page, setPage: handleSetPage,
    // Setters update internal state (which acts as fallback/default)
    fuzzy: isFuzzy, setFuzzy: setInternalFuzzy,
    wildcard: isWildcard, setWildcard: setInternalWildcard,
    reset,
    searchNow,
    
    // Data
    results: (data?.results || []) as MediaItemMap[T][],
    totalPages: data?.totalPages || 0,
    error,
    isLoading,
    isValidating
  };
}
