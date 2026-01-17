/**
 * @file useBackgroundEnrichment.ts
 * @description Hook that automatically fetches deep metadata for items present on the board.
 * It works in the background to ensure all items have full details (tracklists, etc.) without blocking the UI.
 * @module useBackgroundEnrichment
 */

'use client';

import { useEffect, useMemo } from 'react';
import { MediaItem } from '@/lib/types';
import { useMediaDetails } from '@/lib/hooks';

/**
 * Main hook to coordinate background enrichment of board items.
 *
 * @param items - List of all media items on the board.
 * @param onUpdateItem - Callback to update an item with fetched details.
 */
export function useBackgroundEnrichment(
  items: MediaItem[],
  onUpdateItem: (itemId: string, updates: Partial<MediaItem>) => void,
) {
  // Identify items needing synchronization (limit concurrency to 3)
  const itemsToSync = useMemo(() => {
    return items.filter((item) => !item.details).slice(0, 3);
  }, [items]);

  // "Slot" pattern implementation:
  // We always render 3 "sync slots" to maintain hook consistency.
  // Each slot attempts to sync one of the pending items.

  const slot1 = itemsToSync[0];
  const slot2 = itemsToSync[1];
  const slot3 = itemsToSync[2];

  useSingleItemSyncWrapper(slot1, onUpdateItem);
  useSingleItemSyncWrapper(slot2, onUpdateItem);
  useSingleItemSyncWrapper(slot3, onUpdateItem);
}

/**
 * Helper hook to handle the fetch and sync for a single item (or empty slot).
 * Leverages SWR via useMediaDetails for caching and deduplication.
 */
function useSingleItemSyncWrapper(
  item: MediaItem | undefined,
  onUpdateItem: (itemId: string, updates: Partial<MediaItem>) => void,
) {
  // When item is undefined (empty slot), we pass null to useMediaDetails to disable fetching.

  const shouldFetch = !!item && !item.details;
  const { details, isLoading, isFetching, error } = useMediaDetails(
    shouldFetch && item ? item.id : null,
    item ? item.type : null,
  );

  useEffect(() => {
    if (item && details && !isLoading && !isFetching && !error && shouldFetch) {
      onUpdateItem(item.id, {
        details,
        imageUrl: details.imageUrl || item.imageUrl,
      });
    }
  }, [details, isLoading, isFetching, error, item, onUpdateItem, shouldFetch]);
}
