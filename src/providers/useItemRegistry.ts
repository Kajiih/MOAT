/**
 * @file useItemRegistry.ts
 * @description Lightweight persistence hook for Items.
 * Uses idb-keyval directly for a fast, async cache of content.
 * @module useItemRegistry
 */

import { update } from 'idb-keyval';
import { useCallback } from 'react';

import { Item } from '@/items/items';

const REGISTRY_STORAGE_KEY = 'moat-item-registry';

/**
 * Hook for interacting with the persistent item registry.
 * @returns Methods to register single or batched items into the registry.
 */
export function useItemRegistry() {
  /**
   * Register or update an item in the registry.
   */
  const registerItem = useCallback(async (item: Item) => {
    if (!item.id) return;

    await update(REGISTRY_STORAGE_KEY, (val: Record<string, Item> = {}) => {
      const existing = val[item.id];
      if (existing) {
        // Simple merge: prefer new details and images
        return {
          ...val,
          [item.id]: {
            ...existing,
            ...item,
            details: item.details || existing.details,
            images: item.images.length > existing.images.length ? item.images : existing.images,
          },
        };
      }
      return { ...val, [item.id]: item };
    });
  }, []);

  /**
   * Batched version of registerItem.
   */
  const registerItems = useCallback(async (items: Item[]) => {
    if (items.length === 0) return;

    await update(REGISTRY_STORAGE_KEY, (val: Record<string, Item> = {}) => {
      const next = { ...val };
      for (const item of items) {
        if (!item.id) continue;
        const existing = next[item.id];
        if (existing) {
          next[item.id] = {
            ...existing,
            ...item,
            details: item.details || existing.details,
            images: item.images.length > existing.images.length ? item.images : existing.images,
          };
        } else {
          next[item.id] = item;
        }
      }
      return next;
    });
  }, []);

  return {
    registerItem,
    registerItems,
  };
}
