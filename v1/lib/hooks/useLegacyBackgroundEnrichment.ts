/**
 * @file useLegacyBackgroundEnrichment.ts
 * @description [LEGACY V1] Main hook to coordinate background enrichment of legacy board items.
 */

import { useMemo } from 'react';

import { Item } from '@/lib/types';

import { useLegacyItemResolver } from './useLegacyItemResolver';

/**
 * Main hook to coordinate background enrichment of board items.
 * @param items - List of all items on the board (V1 or V2).
 * @param onUpdateItem - Callback to update an item with fetched details.
 * @returns An object containing the number of items still pending enrichment.
 */
export function useLegacyBackgroundEnrichment(
  items: (Item)[],
  onUpdateItem: (itemId: string, updates: Partial<Item>) => void,
) {
  // Identify items needing synchronization (limit concurrency to 3)
  const itemsToSync = useMemo(() => {
    return items.filter((item) => !item.details).slice(0, 3);
  }, [items]);

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
 * @param item - The item to sync, or undefined if the slot is empty.
 * @param onUpdateItem - Callback to update the item with fetched details.
 */
function useSingleItemSyncWrapper(
  item: Item | undefined,
  onUpdateItem: (itemId: string, updates: Partial<Item>) => void,
) {
  // Pass the item to the legacy resolver.
  useLegacyItemResolver(item ? (item as any) : null, {
    enabled: !!item && !item.details && !('identity' in item),
    onUpdate: onUpdateItem as any,
    persist: true,
  });
}
