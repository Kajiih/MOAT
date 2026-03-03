/**
 * @file useMediaResolver.ts
 * @description Central logic for resolving and enriching media items.
 * Orchestrates interaction between the board state, global media registry, and details API.
 * @module useMediaResolver
 */

import { useEffect } from 'react';

import { useMediaRegistry } from '@/components/providers/MediaRegistryProvider';
import { MediaItem } from '@/lib/types';
import { hasMediaItemUpdates } from '@/lib/utils/comparisons';

import { useMediaDetails } from './useMediaDetails';

/**
 * Options for the useMediaResolver hook.
 */
interface UseMediaResolverOptions {
  /** If false, enrichment will not be attempted. Defaults to true. */
  enabled?: boolean;
  /** Whether to persist resolved metadata back to the global registry. Defaults to true. */
  persist?: boolean;
  /** Callback fired when a more complete version of the item is found or resolved. */
  onUpdate?: (id: string, updates: Partial<MediaItem>) => void;
}

/**
 * Custom hook to resolve and enrich a media item.
 * @param item - The media item to resolve.
 * @param options - Resolution options.
 * @returns Resolution state including the enriched item and loading status.
 */
export function useMediaResolver(item: MediaItem | null, options: UseMediaResolverOptions = {}) {
  const { enabled = true, persist = true, onUpdate } = options;
  const { getItem, registerItem } = useMediaRegistry();

  // 1. Check if we already have a cached version in the local registry
  const cached = item ? getItem(item.id) : undefined;

  // 2. Determine if we need to fetch deep metadata
  // We fetch if the item exists but lacks 'details', and we don't have them in cache either.
  const needsEnrichment = !!item && !item.details && !cached?.details;
  const shouldFetch = enabled && needsEnrichment;

  const { details, isLoading, error, isFetching } = useMediaDetails(
    shouldFetch && item ? item.id : null,
    shouldFetch && item ? item.type : null,
    shouldFetch && item ? item.serviceId : null,
  );

  /**
   * Effect to sync cache to board.
   * If the global registry has a version that is more complete than what's on the board,
   * we propagate those changes immediately.
   */
  useEffect(() => {
    if (!item || !cached) return;

    if (hasMediaItemUpdates(item, cached)) {
      onUpdate?.(item.id, cached);
    }
  }, [item, cached, onUpdate]);

  /**
   * Effect to sync newly resolved details to registry and board.
   */
  useEffect(() => {
    if (!item || !details || isLoading || error || !shouldFetch) return;

    const updates: Partial<MediaItem> = {
      details,
      imageUrl: details.imageUrl || item.imageUrl,
    };

    // Prevent redundant updates if board already has these details (race condition check)
    if (!hasMediaItemUpdates(item, updates)) return;

    const merged = { ...item, ...updates } as MediaItem;

    // Persist to Global Registry
    if (persist) {
      registerItem(merged);
    }

    // Propagate to Board
    onUpdate?.(item.id, updates);
  }, [item, details, isLoading, error, shouldFetch, persist, registerItem, onUpdate]);

  return {
    /** The best available version of the item (Cached > Provided). */
    resolvedItem: (cached || item) as MediaItem | null,
    /** Whether an enrichment fetch is currently in progress. */
    isLoading: isLoading && shouldFetch,
    /** Whether revalidation is happening in the background. */
    isFetching,
    /** Error state if the fetch failed. */
    error: shouldFetch ? error : null,
  };
}
