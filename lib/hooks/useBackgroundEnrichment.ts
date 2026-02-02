/**
 * @file useBackgroundEnrichment.ts
 * @description Hook that automatically fetches deep metadata for items present on the board.
 * It works in the background to ensure all items have full details (tracklists, etc.) without blocking the UI.
 * @module useBackgroundEnrichment
 */

'use client';

import { useEffect, useMemo } from 'react';

import { useMediaResolver } from '@/lib/hooks/useMediaResolver';
import { MediaItem } from '@/lib/types';

/**
 * Main hook to coordinate background enrichment of board items.
 * @param items - List of all media items on the board.
 * @param onUpdateItem - Callback to update an item with fetched details.
 * @returns An object containing the number of items still pending enrichment.
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

  return {
    pendingCount: items.filter((item) => !item.details).length,
  };
}

/**
 * Helper hook to handle the fetch and sync for a single item (or empty slot).
 * Leverages the unified useMediaResolver.
 * @param item - The media item to sync, or undefined if the slot is empty.
 * @param onUpdateItem - Callback to update the item with fetched details.
 */
function useSingleItemSyncWrapper(
  item: MediaItem | undefined,
  onUpdateItem: (itemId: string, updates: Partial<MediaItem>) => void,
) {
  // Pass the item to the resolver. It handles checking the registry and fetching if needed.
  useMediaResolver(item || null, {
    enabled: !!item && !item.details,
    onUpdate: onUpdateItem,
    persist: true, // Ensure background updates go into the global registry
  });
}
