/**
 * @file useMediaResolver.ts
 * @description Centralized hook for resolving and enriching media items.
 * Orchestrates the lifecycle from Search Result -> Cached Item -> Enriched Item.
 * Ensures metadata consistency between the Board and the Global Media Registry.
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
  /** Callback fired when new metadata or images are found. */
  onUpdate?: (itemId: string, updates: Partial<MediaItem>) => void;
  /** Whether the resolver is allowed to trigger new network requests. */
  enabled?: boolean;
  /** Whether to automatically sync resolved data back to the Global Media Registry. */
  persist?: boolean;
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

  // 1. Check Global Registry for a "better" version of this item
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
   * Effect to handle incoming API details.
   * Merges fetched details into the registry and the board.
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
    isFetching: isFetching && shouldFetch,
    /** Any error encountered during enrichment. */
    error,
    /** Whether the item now possesses deep metadata. */
    isEnriched: !!(cached?.details || details || item?.details),
  };
}
