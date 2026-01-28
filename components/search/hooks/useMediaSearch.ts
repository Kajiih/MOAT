/**
 * @file useMediaSearch.ts
 * @description Custom hook for handling media searches against various backend providers via MediaService.
 * @module useMediaSearch
 */

'use client';

import { folder, useControls } from 'leva';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { preload } from 'swr';
import { useDebounce } from 'use-debounce';

import { useMediaRegistry } from '@/components/providers/MediaRegistryProvider';
import { useTierListContext } from '@/components/providers/TierListContext';
import { getSearchUrl } from '@/lib/api';
import { swrFetcher } from '@/lib/api/fetcher';
import { usePersistentState } from '@/lib/hooks';
import {
  AlbumItem,
  AlbumSelection,
  ArtistItem,
  ArtistSelection,
  BookItem,
  GameItem,
  MediaItem,
  MediaType,
  MovieItem,
  PersonItem,
  SearchResult,
  SongItem,
  TVItem,
} from '@/lib/types';

/**
 * Maps each MediaType to its specific item type definition for inference.
 */
type MediaItemMap = {
  artist: ArtistItem;
  album: AlbumItem;
  song: SongItem;
  movie: MovieItem;
  tv: TVItem;
  person: PersonItem;
  game: GameItem;
  book: BookItem;
};

/**
 * Represents the full state of search filters and pagination.
 * This structure is broad to accommodate multiple services.
 */
export interface SearchParamsState {
  query: string;
  selectedArtist: ArtistSelection | null;
  selectedAlbum: AlbumSelection | null;
  minYear: string;
  maxYear: string;
  albumPrimaryTypes: string[];
  albumSecondaryTypes: string[];
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
  page: 1,
};

/**
 * Configuration options for the useMediaSearch hook.
 */
interface UseMediaSearchConfig {
  fuzzy?: boolean;
  wildcard?: boolean;
  enabled?: boolean;
  artistId?: string;
  albumId?: string;
  ignoreFilters?: boolean;
  storageKey?: string;
  prefetchEnabled?: boolean;
}

/**
 * Return type for the useMediaSearch hook.
 */
interface UseMediaSearchResult<T extends MediaItem> {
  filters: SearchParamsState;
  updateFilters: (patch: Partial<SearchParamsState>) => void;
  page: number;
  setPage: (val: number | ((prev: number) => number)) => void;
  fuzzy: boolean;
  setFuzzy: (val: boolean) => void;
  wildcard: boolean;
  setWildcard: (val: boolean) => void;
  reset: () => void;
  searchNow: () => void;
  results: T[];
  totalPages: number;
  isLoading: boolean;
  isValidating: boolean;
  error: (Error & { status?: number }) | null;
}

/**
 * Custom hook to manage the state and data fetching for media searches using the active MediaService.
 * @param type - The type of media to search for.
 * @param config - Configuration options for the search hook.
 * @returns An object containing search filters, results, and state.
 */
export function useMediaSearch<T extends MediaType>(
  type: T,
  config?: UseMediaSearchConfig,
): UseMediaSearchResult<MediaItemMap[T]> {
  const {
    state: { category },
  } = useTierListContext();

  const storageKey = config?.storageKey || `moat-search-params-${type}`;
  const [state, setState] = usePersistentState<SearchParamsState>(storageKey, defaultState);

  const [internalFuzzy, setInternalFuzzy] = useState(true);
  const [internalWildcard, setInternalWildcard] = useState(true);

  const isFuzzy = config?.fuzzy ?? internalFuzzy;
  const isWildcard = config?.wildcard ?? internalWildcard;
  const isEnabled = config?.enabled ?? true;
  const forcedArtistId = config?.artistId;
  const forcedAlbumId = config?.albumId;
  const ignoreFilters = config?.ignoreFilters ?? false;
  const prefetchEnabled = config?.prefetchEnabled ?? true;

  const [debouncedFilters, controlFilters] = useDebounce(
    {
      query: state.query,
      minYear: state.minYear,
      maxYear: state.maxYear,
      artistCountry: state.artistCountry,
      tag: state.tag,
      minDuration: state.minDuration,
      maxDuration: state.maxDuration,
    },
    300,
  );

  const searchNow = () => controlFilters.flush();

  const updateFilters = useCallback(
    (patch: Partial<SearchParamsState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch, page: 1 };
        if (next.query && next.query.startsWith(' ')) next.query = next.query.trimStart();
        return next;
      });
    },
    [setState],
  );

  const handleSetPage = (val: number | ((prev: number) => number)) => {
    setState((prev) => ({ ...prev, page: typeof val === 'function' ? val(prev.page) : val }));
  };

  const searchUrl = useMemo(() => {
    if (!isEnabled) return null;

    return getSearchUrl({
      category: category || 'music',
      type,
      page: state.page,
      query: debouncedFilters.query,
      artistId: forcedArtistId || state.selectedArtist?.id,
      albumId: forcedAlbumId || state.selectedAlbum?.id,
      minYear: ignoreFilters ? '' : debouncedFilters.minYear,
      maxYear: ignoreFilters ? '' : debouncedFilters.maxYear,
      albumPrimaryTypes: ignoreFilters ? [] : state.albumPrimaryTypes,
      albumSecondaryTypes: ignoreFilters ? [] : state.albumSecondaryTypes,
      artistType: ignoreFilters ? '' : state.artistType,
      artistCountry: ignoreFilters ? '' : debouncedFilters.artistCountry,
      tag: ignoreFilters ? '' : debouncedFilters.tag,
      minDuration:
        !ignoreFilters && debouncedFilters.minDuration
          ? Number.parseInt(debouncedFilters.minDuration, 10)
          : undefined,
      maxDuration:
        !ignoreFilters && debouncedFilters.maxDuration
          ? Number.parseInt(debouncedFilters.maxDuration, 10)
          : undefined,
      fuzzy: isFuzzy,
      wildcard: isWildcard,
    });
  }, [
    isEnabled,
    category,
    type,
    state,
    debouncedFilters,
    forcedArtistId,
    forcedAlbumId,
    ignoreFilters,
    isFuzzy,
    isWildcard,
  ]);

  const { data, error, isLoading, isValidating } = useSWR<
    SearchResult,
    Error & { status?: number }
  >(searchUrl, swrFetcher, { keepPreviousData: true });

  const { registerItems, getItem } = useMediaRegistry();

  useEffect(() => {
    if (data?.results) registerItems(data.results);
  }, [data?.results, registerItems]);

  const enrichedResults = useMemo(() => {
    return (data?.results || []).map((item: MediaItem) => getItem(item.id) || item);
  }, [data?.results, getItem]);

  // Prefetching
  useEffect(() => {
    if (prefetchEnabled && data && state.page < data.totalPages && searchUrl) {
      // Need to construct next page URL
      const currentUrl = new URL(searchUrl, 'http://localhost'); // Dummy base for relative URL parsing
      currentUrl.searchParams.set('page', (state.page + 1).toString());
      // Re-extract the relative path + query
      const nextUrl = currentUrl.pathname + currentUrl.search;
      preload(nextUrl, swrFetcher);
    }
  }, [data, state.page, searchUrl, prefetchEnabled]);

  // Debug: Search Prefetch Monitor
  // Use imperative updates to ensure Leva stays in sync
  const [, setPrefetchStats] = useControls(
    'Debug',
    () => ({
      [`Search Prefetch (${type})`]: folder(
        {
          'Prefetch Enabled': { value: prefetchEnabled, disabled: true },
          'Current Page': { value: state.page, disabled: true },
          'Total Pages': { value: data?.totalPages || 0, disabled: true },
        },
        { collapsed: true },
      ),
    }),
    [type],
  );

  useEffect(() => {
    setPrefetchStats({
      'Prefetch Enabled': prefetchEnabled,
      'Current Page': state.page,
      'Total Pages': data?.totalPages || 0,
    });
  }, [setPrefetchStats, prefetchEnabled, state.page, data?.totalPages]);

  return {
    filters: state,
    updateFilters,
    page: state.page,
    setPage: handleSetPage,
    fuzzy: isFuzzy,
    setFuzzy: setInternalFuzzy,
    wildcard: isWildcard,
    setWildcard: setInternalWildcard,
    reset: () => setState(defaultState),
    searchNow,
    results: enrichedResults as MediaItemMap[T][],
    totalPages: data?.totalPages || 0,
    error: error || null,
    isLoading,
    isValidating,
  };
}
