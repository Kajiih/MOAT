import { useMemo } from 'react';

import { useItemResolver } from '@/lib/hooks/useItemResolver';
import { Item } from '@/lib/types';

/**
 * Main hook to coordinate background enrichment of board items.
 * @param items - List of all items on the board (V1 or V2).
 * @param onUpdateItem - Callback to update an item with fetched details.
 * @returns An object containing the number of items still pending enrichment.
 */
export function useBackgroundEnrichment(
  items: (Item)[],
  onUpdateItem: (itemId: string, updates: Partial<Item>) => void,
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
 * Leverages the unified useItemResolver.
 * @param item - The item to sync, or undefined if the slot is empty.
 * @param onUpdateItem - Callback to update the item with fetched details.
 */
function useSingleItemSyncWrapper(
  item: Item | undefined,
  onUpdateItem: (itemId: string, updates: Partial<Item>) => void,
) {
  // Pass the item to the resolver. It handles checking the registry and fetching if needed.
  useItemResolver(item || null, {
    enabled: !!item && !item.details,
    onUpdate: onUpdateItem,
    persist: true, // Ensure background updates go into the global registry
  });
}
