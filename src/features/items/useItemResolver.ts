/**
 * @file useItemResolver.ts
 * @description Unified resolver hook for items.
 * Orchestrates fetching details and syncing with the persistent item registry.
 */

'use client';

import { useEffect, useMemo } from 'react';

import { ItemDetailsCoreSchema, ItemUpdate } from '@/domain/items/items';
import { Item } from '@/features/board/types';
import { useItemDetails } from '@/features/items/useItemDetails';
import { useItemRegistry } from '@/infra/providers/useItemRegistry';

interface UseItemResolverOptions {
  /** If false, enrichment will not be attempted. Defaults to true. */
  enabled?: boolean;
  /** Callback fired when a more complete version of the item is found or resolved. */
  onUpdate?: (id: string, updates: ItemUpdate) => void;
  /** Whether to persist resolved metadata back to the registry. Defaults to true. */
  persist?: boolean;
}

/**
 * Custom hook to resolve and enrich an item.
 * @param item - The item to resolve.
 * @param options - Resolution options.
 * @returns Resolution state including the enriched item and loading status.
 */
export function useItemResolver(item: Item | null, options: UseItemResolverOptions = {}) {
  const { enabled = true, persist = true, onUpdate } = options;
  const { registerItem } = useItemRegistry();

  // 1. Determine if we need to fetch deep metadata
  const needsEnrichment = !!item && !item.details;
  const shouldFetch = enabled && needsEnrichment;

  const { details, isLoading, error, isValidating } = useItemDetails(
    item?.identity.providerId,
    item?.identity.entityId,
    item?.identity.providerItemId,
    { enabled: shouldFetch },
  );

  /**
   * Effect to sync newly resolved details to registry and board.
   */
  useEffect(() => {
    if (!item || !details || isLoading || error || !shouldFetch) return;

    const mergedImages = [...item.images];
    if (details.images) {
      for (const newImg of details.images) {
        const exists = mergedImages.some((existing) => {
          if (existing.type !== newImg.type) return false;
          if (existing.type === 'url' && newImg.type === 'url') return existing.url === newImg.url;
          if (existing.type === 'reference' && newImg.type === 'reference') {
            return existing.provider === newImg.provider && existing.key === newImg.key;
          }
          return false;
        });
        if (!exists) mergedImages.push(newImg);
      }
    }

    const updates: ItemUpdate = {
      images: mergedImages,
    };

    if (details) {
      const parsed = ItemDetailsCoreSchema.safeParse(details);
      if (parsed.success) {
        updates.details = parsed.data;
      }
      if (details.subtitle) {
        updates.subtitle = details.subtitle;
      }
      if (details.tertiaryText) {
        updates.tertiaryText = details.tertiaryText;
      }
    }

    // Propagate to Board
    onUpdate?.(item.id, updates);

    // Persist to Registry
    if (persist) {
      const merged = { ...item, ...updates } as Item;
      registerItem(merged);
    }
  }, [item, details, isLoading, error, shouldFetch, persist, registerItem, onUpdate]);

  const resolvedItem = useMemo(() => {
    if (!item) return null;
    return {
      ...item,
      subtitle: item.subtitle || details?.subtitle,
      tertiaryText: item.tertiaryText || details?.tertiaryText,
      images: item.images && item.images.length > 0 ? item.images : details?.images || [],
      details: item.details || details,
    };
  }, [item, details]);

  return {
    resolvedItem,
    details: item?.details || details, // Buffer response to prevent state lag
    isLoading: isLoading && shouldFetch,
    isFetching: isValidating && shouldFetch,
    error: shouldFetch ? error : null,
    isEnriched: !!(item?.details || details),
  };
}
