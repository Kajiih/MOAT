/**
 * @file useMediaSearch.ts
 * @description Custom hook for handling media searches against various backend providers via MediaService.
 * @module useMediaSearch
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { preload } from 'swr';
import { useDebounce } from 'use-debounce';

import { useMediaRegistry } from '@/components/providers/MediaRegistryProvider';
import { useTierListContext } from '@/components/providers/TierListContext';
import { usePersistentState } from '@/lib/hooks';
import { getMediaService } from '@/lib/services/factory';
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
 * Internal interface for the SWR cache key.
 */
interface SwrKey extends SearchParamsState {
    category: string;
    type: MediaType;
    fuzzy: boolean;
    wildcard: boolean;
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
 * @param type
 * @param config
 */
export function useMediaSearch<T extends MediaType>(
  type: T,
  config?: UseMediaSearchConfig,
): UseMediaSearchResult<MediaItemMap[T]> {
  const { state: { category } } = useTierListContext();
  const service = getMediaService(category || 'music');
  
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

  const [debouncedFilters, controlFilters] = useDebounce({
      query: state.query,
      minYear: state.minYear,
      maxYear: state.maxYear,
      artistCountry: state.artistCountry,
      tag: state.tag,
      minDuration: state.minDuration,
      maxDuration: state.maxDuration,
  }, 300);

  const searchNow = () => controlFilters.flush();

  const updateFilters = useCallback((patch: Partial<SearchParamsState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch, page: 1 };
      if (next.query && next.query.startsWith(' ')) next.query = next.query.trimStart();
      return next;
    });
  }, [setState]);

  const handleSetPage = (val: number | ((prev: number) => number)) => {
    setState((prev) => ({ ...prev, page: typeof val === 'function' ? val(prev.page) : val }));
  };

  // Simplified SWR Key calculation
  const swrKey: SwrKey | null = useMemo(() => {
    if (!isEnabled) return null;
    return {
      ...state,
      query: debouncedFilters.query,
      minYear: ignoreFilters ? '' : debouncedFilters.minYear,
      maxYear: ignoreFilters ? '' : debouncedFilters.maxYear,
      artistCountry: ignoreFilters ? '' : debouncedFilters.artistCountry,
      tag: ignoreFilters ? '' : debouncedFilters.tag,
      minDuration: ignoreFilters ? '' : debouncedFilters.minDuration,
      maxDuration: ignoreFilters ? '' : debouncedFilters.maxDuration,
      category: category || 'music',
      type,
      fuzzy: isFuzzy,
      wildcard: isWildcard,
      selectedArtist: forcedArtistId ? ({ id: forcedArtistId, name: '' } as ArtistSelection) : state.selectedArtist,
      selectedAlbum: forcedAlbumId ? ({ id: forcedAlbumId, name: '' } as AlbumSelection) : state.selectedAlbum,
    };
  }, [
    isEnabled, state, debouncedFilters, ignoreFilters, category, type, isFuzzy, isWildcard, forcedArtistId, forcedAlbumId
  ]);

  const { data, error, isLoading, isValidating } = useSWR<SearchResult, Error & { status?: number }>(
    swrKey,
    async (k: SwrKey) => {
        return service.search(k.query, k.type, {
            page: k.page,
            fuzzy: k.fuzzy,
            wildcard: k.wildcard,
            filters: {
                ...k,
                artistId: k.selectedArtist?.id,
                albumId: k.selectedAlbum?.id,
                minDuration: k.minDuration ? Number.parseInt(k.minDuration, 10) : undefined,
                maxDuration: k.maxDuration ? Number.parseInt(k.maxDuration, 10) : undefined,
            }
        });
    },
    { keepPreviousData: true }
  );

  const { registerItems, getItem } = useMediaRegistry();

  useEffect(() => {
    if (data?.results) registerItems(data.results);
  }, [data?.results, registerItems]);

  const enrichedResults = useMemo(() => {
    return (data?.results || []).map((item: MediaItem) => getItem(item.id) || item);
  }, [data?.results, getItem]);

  // Prefetching
  useEffect(() => {
    if (data && state.page < data.totalPages && swrKey) {
        const nextKey = { ...swrKey, page: state.page + 1 };
        preload(nextKey, async (k: SwrKey) => {
            return service.search(k.query, k.type, {
                page: k.page,
                fuzzy: k.fuzzy,
                wildcard: k.wildcard,
                filters: k
            });
        });
    }
  }, [data, state.page, swrKey, service]);

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
