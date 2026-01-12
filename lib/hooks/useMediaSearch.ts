/**
 * @file useMediaSearch.ts
 * @description Custom hook for handling media searches against the backend API.
 * Features include debouncing, SWR-based caching, pagination prefetching, and advanced filtering state management.
 * @module useMediaSearch
 */

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR, { preload } from 'swr';
import { getSearchUrl } from '@/lib/api';
import { MediaType, MediaItem, ArtistItem, AlbumItem, SongItem, ArtistSelection, AlbumSelection } from '@/lib/types';
import { usePersistentState } from './usePersistentState';
import { useMediaRegistry } from '@/components/MediaRegistryProvider';

interface SearchResponse {
  results: MediaItem[];
  page: number;
  totalPages: number;
}

const fetcher = async (url: string, retryCount = 0): Promise<SearchResponse> => {
  const res = await fetch(url);
  
  if (res.status === 503 && retryCount < 2) {
    // Wait for 2 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    return fetcher(url, retryCount + 1);
  }

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

/**
 * Configuration options for the useMediaSearch hook.
 */
interface UseMediaSearchConfig {
  /** Enable fuzzy matching (approximate string matching). Default: true */
  fuzzy?: boolean;
  /** Enable wildcard matching (e.g. "The *"). Default: true */
  wildcard?: boolean;
  /** Whether the search should be active. Default: true */
  enabled?: boolean;
  /** Force a specific artist ID (scoping the search). */
  artistId?: string; // Force a specific artist for this search instance
  /** Force a specific album ID (scoping the search). */
  albumId?: string;  // Force a specific album for this search instance
  /** Ignore advanced filters (dates, types, etc.) from persisted state. Default: false */
  ignoreFilters?: boolean; // Ignore advanced filters (dates, types, etc.) from persisted state
  /** Override default localStorage key for persistence. */
  storageKey?: string; // Override default localStorage key
}

/**
 * Maps each MediaType ('artist', 'album', 'song') to its specific item type definition.
 * Used for type inference in the hook results.
 */
type MediaItemMap = {
  artist: ArtistItem;
  album: AlbumItem;
  song: SongItem;
};

interface SearchParamsState {
  query: string;
  selectedArtist: ArtistSelection | null;
  selectedAlbum: AlbumSelection | null;
  minYear: string;
  maxYear: string;
  albumPrimaryTypes: string[];
  albumSecondaryTypes: string[];
  // New filters
  artistType: string;
  artistCountry: string;
  tag: string;
  minDuration: string;
  maxDuration: string;
  page: number;
}

const defaultState: SearchParamsState = {
  query: '',
  selectedArtist: null,
  selectedAlbum: null,
  minYear: '',
  maxYear: '',
  albumPrimaryTypes: ['Album', 'EP'],
  albumSecondaryTypes: [],
  artistType: '',
  artistCountry: '',
  tag: '',
  minDuration: '',
  maxDuration: '',
  page: 1
};

/**
 * Return type for the useMediaSearch hook.
 * Generic T represents the specific MediaItem type (ArtistItem, AlbumItem, or SongItem).
 */
interface UseMediaSearchResult<T extends MediaItem> {
  // --- Query State ---
  query: string;
  setQuery: (val: string) => void;
  
  // --- Filter State ---
  selectedArtist: ArtistSelection | null;
  setSelectedArtist: (val: ArtistSelection | null) => void;
  selectedAlbum: AlbumSelection | null;
  setSelectedAlbum: (val: AlbumSelection | null) => void;
  minYear: string;
  setMinYear: (val: string) => void;
  maxYear: string;
  setMaxYear: (val: string) => void;
  albumPrimaryTypes: string[];
  setAlbumPrimaryTypes: (val: string[]) => void;
  albumSecondaryTypes: string[];
  setAlbumSecondaryTypes: (val: string[]) => void;
  
  // --- New Filters ---
  artistType: string;
  setArtistType: (val: string) => void;
  artistCountry: string;
  setArtistCountry: (val: string) => void;
  tag: string;
  setTag: (val: string) => void;
  minDuration: string;
  setMinDuration: (val: string) => void;
  maxDuration: string;
  setMaxDuration: (val: string) => void;

  // --- Pagination & Config ---
  page: number;
  setPage: (val: number | ((prev: number) => number)) => void;
  fuzzy: boolean;
  setFuzzy: (val: boolean) => void;
  wildcard: boolean;
  setWildcard: (val: boolean) => void;
  
  /** Resets all search parameters to defaults. */
  reset: () => void;
  /** Manually triggers a search (flushing debounce). */
  searchNow: () => void; // Manually trigger search (flush debounce)
  
  // --- Results ---
  results: T[];
  totalPages: number;
  isLoading: boolean;
  isValidating: boolean;
  error: (Error & { status?: number }) | null;
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
  const storageKey = config?.storageKey || `moat-search-params-${type}`;
  
  const [state, setState] = usePersistentState<SearchParamsState>(storageKey, defaultState);

  // Map state to individual variables
  const { 
      query, selectedArtist, selectedAlbum, minYear, maxYear, 
      albumPrimaryTypes, albumSecondaryTypes, 
      artistType, artistCountry, tag, minDuration, maxDuration,
      page 
  } = state;
  
  // Internal State (used if no config provided)
  const [internalFuzzy, setInternalFuzzy] = useState(true);
  const [internalWildcard, setInternalWildcard] = useState(true);

  // Determine effective values
  const isFuzzy = config?.fuzzy ?? internalFuzzy;
  const isWildcard = config?.wildcard ?? internalWildcard;
  const isEnabled = config?.enabled ?? true;
  const forcedArtistId = config?.artistId;
  const forcedAlbumId = config?.albumId;
  const ignoreFilters = config?.ignoreFilters ?? false;
  
  const debounceDelay = 300; // milliseconds

  // Debounce text inputs to avoid excessive API calls
  const [debouncedQuery, controlQuery] = useDebounce(query, debounceDelay);
  const [debouncedMinYear, controlMinYear] = useDebounce(minYear, debounceDelay);
  const [debouncedMaxYear, controlMaxYear] = useDebounce(maxYear, debounceDelay);
  const [debouncedArtistCountry, controlArtistCountry] = useDebounce(artistCountry, debounceDelay);
  const [debouncedTag, controlTag] = useDebounce(tag, debounceDelay);
  const [debouncedMinDuration, controlMinDuration] = useDebounce(minDuration, debounceDelay);
  const [debouncedMaxDuration, controlMaxDuration] = useDebounce(maxDuration, debounceDelay);
  
  // Explicit flush for immediate search (e.g., on Enter key)
  const searchNow = () => {
    controlQuery.flush();
    controlMinYear.flush();
    controlMaxYear.flush();
    controlArtistCountry.flush();
    controlTag.flush();
    controlMinDuration.flush();
    controlMaxDuration.flush();
  };
  
  // Wrappers to reset page on filter change
  const handleSetQuery = (val: string) => {
    // Trim leading spaces but allow trailing spaces for better UX while typing
    const trimmedVal = val.startsWith(' ') ? val.trimStart() : val;
    setState(prev => ({ ...prev, query: trimmedVal, page: 1 }));
  };
  const handleSetSelectedArtist = (val: ArtistSelection | null) => setState(prev => ({ ...prev, selectedArtist: val, page: 1 }));
  const handleSetSelectedAlbum = (val: AlbumSelection | null) => setState(prev => ({ ...prev, selectedAlbum: val, page: 1 }));
  const handleSetMinYear = (val: string) => setState(prev => ({ ...prev, minYear: val, page: 1 }));
  const handleSetMaxYear = (val: string) => setState(prev => ({ ...prev, maxYear: val, page: 1 }));
  const handleSetAlbumPrimaryTypes = (val: string[]) => setState(prev => ({ ...prev, albumPrimaryTypes: val, page: 1 }));
  const handleSetAlbumSecondaryTypes = (val: string[]) => setState(prev => ({ ...prev, albumSecondaryTypes: val, page: 1 }));
  
  const handleSetArtistType = (val: string) => setState(prev => ({ ...prev, artistType: val, page: 1 }));
  const handleSetArtistCountry = (val: string) => setState(prev => ({ ...prev, artistCountry: val, page: 1 }));
  const handleSetTag = (val: string) => setState(prev => ({ ...prev, tag: val, page: 1 }));
  const handleSetMinDuration = (val: string) => setState(prev => ({ ...prev, minDuration: val, page: 1 }));
  const handleSetMaxDuration = (val: string) => setState(prev => ({ ...prev, maxDuration: val, page: 1 }));

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
    artistId: forcedArtistId || selectedArtist?.id,
    albumId: forcedAlbumId || selectedAlbum?.id,
    minYear: ignoreFilters ? '' : debouncedMinYear,
    maxYear: ignoreFilters ? '' : debouncedMaxYear,
    albumPrimaryTypes: ignoreFilters ? [] : albumPrimaryTypes,
    albumSecondaryTypes: ignoreFilters ? [] : albumSecondaryTypes,
    artistType: ignoreFilters ? '' : artistType,
    artistCountry: ignoreFilters ? '' : debouncedArtistCountry,
    tag: ignoreFilters ? '' : debouncedTag,
    minDuration: ignoreFilters ? '' : debouncedMinDuration,
    maxDuration: ignoreFilters ? '' : debouncedMaxDuration,
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

    const effectiveMinYear = ignoreFilters ? '' : debouncedMinYear;
    const effectiveMaxYear = ignoreFilters ? '' : debouncedMaxYear;
    const effectiveAlbumPrimaryTypes = ignoreFilters ? [] : albumPrimaryTypes;
    const effectiveAlbumSecondaryTypes = ignoreFilters ? [] : albumSecondaryTypes;
    const effectiveArtistType = ignoreFilters ? '' : artistType;
    const effectiveArtistCountry = ignoreFilters ? '' : debouncedArtistCountry;
    const effectiveTag = ignoreFilters ? '' : debouncedTag;
    const effectiveMinDuration = ignoreFilters ? '' : debouncedMinDuration;
    const effectiveMaxDuration = ignoreFilters ? '' : debouncedMaxDuration;

    const hasFilters = debouncedQuery || forcedArtistId || selectedArtist?.id || forcedAlbumId || selectedAlbum?.id || effectiveMinYear || effectiveMaxYear || 
                       effectiveAlbumPrimaryTypes.length > 0 || effectiveAlbumSecondaryTypes.length > 0 ||
                       effectiveArtistType || effectiveArtistCountry || effectiveTag || effectiveMinDuration || effectiveMaxDuration;

    if (!hasFilters) return null;

    return getSearchUrl({
      type,
      page,
      query: debouncedQuery,
      artistId: forcedArtistId || selectedArtist?.id,
      albumId: forcedAlbumId || selectedAlbum?.id,
      minYear: effectiveMinYear,
      maxYear: effectiveMaxYear,
      albumPrimaryTypes: effectiveAlbumPrimaryTypes,
      albumSecondaryTypes: effectiveAlbumSecondaryTypes,
      artistType: effectiveArtistType,
      artistCountry: effectiveArtistCountry,
      tag: effectiveTag,
      minDuration: effectiveMinDuration ? parseInt(effectiveMinDuration, 10) * 1000 : undefined,
      maxDuration: effectiveMaxDuration ? parseInt(effectiveMaxDuration, 10) * 1000 : undefined,
      fuzzy: isFuzzy,
      wildcard: isWildcard
    });
  }, [isEnabled, type, page, debouncedQuery, forcedArtistId, selectedArtist, forcedAlbumId, selectedAlbum, debouncedMinYear, debouncedMaxYear, albumPrimaryTypes, albumSecondaryTypes, artistType, debouncedArtistCountry, debouncedTag, debouncedMinDuration, debouncedMaxDuration, isFuzzy, isWildcard, ignoreFilters]);

  const { data, error, isLoading, isValidating } = useSWR<SearchResponse, Error & { status?: number }>(
    searchUrl,
    fetcher,
    { keepPreviousData: shouldKeepPreviousData }
  );

  const { registerItems, getItem } = useMediaRegistry();

  // Automatically register discovered items in the global registry
  useEffect(() => {
      if (data?.results) {
          registerItems(data.results);
      }
  }, [data?.results, registerItems]);

  // ENRICHMENT: Always use the registry's version of the item if we have it
  // This ensures that if we found an image for an artist previously, it shows up 
  // in search results even if the search API didn't provide it yet.
  const enrichedResults = useMemo(() => {
    return (data?.results || []).map(item => getItem(item.id) || item);
  }, [data?.results, getItem]);
  
  // Pagination Prefetching
  useEffect(() => {
      if (data && page < data.totalPages && isEnabled) {
          const nextUrl = getSearchUrl({
            type,
            page: page + 1,
            query: debouncedQuery,
            artistId: forcedArtistId || selectedArtist?.id,
            albumId: forcedAlbumId || selectedAlbum?.id,
            minYear: debouncedMinYear,
            maxYear: debouncedMaxYear,
            albumPrimaryTypes,
            albumSecondaryTypes,
            artistType,
            artistCountry: debouncedArtistCountry,
            tag: debouncedTag,
            minDuration: debouncedMinDuration ? parseInt(debouncedMinDuration, 10) * 1000 : undefined,
            maxDuration: debouncedMaxDuration ? parseInt(debouncedMaxDuration, 10) * 1000 : undefined,
            fuzzy: isFuzzy,
            wildcard: isWildcard
          });
          preload(nextUrl, fetcher);
      }
  }, [data, page, type, debouncedQuery, forcedArtistId, selectedArtist, forcedAlbumId, selectedAlbum, debouncedMinYear, debouncedMaxYear, albumPrimaryTypes, albumSecondaryTypes, artistType, debouncedArtistCountry, debouncedTag, debouncedMinDuration, debouncedMaxDuration, isFuzzy, isWildcard, isEnabled]);

  return {
    // State
    query, setQuery: handleSetQuery,
    selectedArtist, setSelectedArtist: handleSetSelectedArtist,
    selectedAlbum, setSelectedAlbum: handleSetSelectedAlbum,
    minYear, setMinYear: handleSetMinYear,
    maxYear, setMaxYear: handleSetMaxYear,
    albumPrimaryTypes, setAlbumPrimaryTypes: handleSetAlbumPrimaryTypes,
    albumSecondaryTypes, setAlbumSecondaryTypes: handleSetAlbumSecondaryTypes,
    artistType, setArtistType: handleSetArtistType,
    artistCountry, setArtistCountry: handleSetArtistCountry,
    tag, setTag: handleSetTag,
    minDuration, setMinDuration: handleSetMinDuration,
    maxDuration, setMaxDuration: handleSetMaxDuration,
    
    page, setPage: handleSetPage,
    // Setters update internal state (which acts as fallback/default)
    fuzzy: isFuzzy, setFuzzy: setInternalFuzzy,
    wildcard: isWildcard, setWildcard: setInternalWildcard,
    reset,
    searchNow,
    
    // Data
    results: enrichedResults as MediaItemMap[T][],
    totalPages: data?.totalPages || 0,
    error: error || null,
    isLoading,
    isValidating
  };
}
