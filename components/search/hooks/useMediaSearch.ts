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
import { mediaTypeRegistry } from '@/lib/media-types';
import {
  AlbumItem,
  ArtistItem,
  AuthorItem,
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
  author: AuthorItem;
};

/**
 * Generic search state including query, pagination and service-specific filters.
 */
export interface SearchParamsState {
  query: string;
  page: number;
  [key: string]: unknown; // Catch-all for dynamic filters
}

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

  const defaultState = useMemo(() => {
    return {
      query: '',
      page: 1,
      ...mediaTypeRegistry.getDefaultFilters(type),
    } as SearchParamsState;
  }, [type]);

  const storageKey = config?.storageKey || `moat-search-params-${type}`;
  const [state, setState] = usePersistentState<SearchParamsState>(storageKey, defaultState);

  const [internalFuzzy, setInternalFuzzy] = useState(true);
  const [internalWildcard, setInternalWildcard] = useState(true);

  const isFuzzy = config?.fuzzy ?? internalFuzzy;
  const isWildcard = config?.wildcard ?? internalWildcard;
  const isEnabled = config?.enabled ?? true;
  const ignoreFilters = config?.ignoreFilters ?? false;
  const prefetchEnabled = config?.prefetchEnabled ?? true;

  // Debounce the entire state for search
  const [debouncedState, control] = useDebounce(state, 300);
  const searchNow = () => control.flush();

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

    const { query, page, ...rest } = debouncedState;
    const filters: Record<string, unknown> = {
      query,
      page,
      fuzzy: isFuzzy,
      wildcard: isWildcard,
    };

    if (!ignoreFilters) {
      const filterDefs = mediaTypeRegistry.get(type).filters;

      Object.entries(rest).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;

        const def = filterDefs.find((d) => d.id === key);
        const pName = def?.paramName || key;

        if (def?.type === 'picker') {
          // Special handling for pickers to extract the value
          const pickerVal = value as { id?: string; name?: string } | null;
          if (key === 'selectedAuthor') {
            if (pickerVal?.name) filters[pName] = pickerVal.name;
          } else {
            if (pickerVal?.id) filters[pName] = pickerVal.id;
          }
        } else {
          filters[pName] = value as string | number | boolean;
        }
      });
    }

    // Force overrides from config
    if (config?.artistId) filters.artistId = config.artistId;
    if (config?.albumId) filters.albumId = config.albumId;

    return getSearchUrl(category || 'music', type, filters);
  }, [isEnabled, debouncedState, isFuzzy, isWildcard, ignoreFilters, category, type, config]);

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
      const currentUrl = new URL(searchUrl, 'http://localhost');
      currentUrl.searchParams.set('page', (state.page + 1).toString());
      const nextUrl = currentUrl.pathname + currentUrl.search;
      preload(nextUrl, swrFetcher);
    }
  }, [data, state.page, searchUrl, prefetchEnabled]);

  useControls(
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
    [type, prefetchEnabled, state.page, data?.totalPages],
  );

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
