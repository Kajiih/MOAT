/**
 * @file useStandardRegistry.ts
 * @description Lightweight persistence hook for V2 StandardItems.
 * Uses idb-keyval directly for a fast, async cache of V2 content.
 * @module useStandardRegistry
 */

import { useCallback } from 'react';
import { update } from 'idb-keyval';
import { StandardItem } from '../types';

const REGISTRY_STORAGE_KEY = 'moat-standard-registry';

/**
 * Hook for interacting with the persistent V2 item registry.
 */
export function useStandardRegistry() {
  /**
   * Register or update an item in the registry.
   */
  const registerItem = useCallback(async (item: StandardItem) => {
    if (!item.id) return;
    
    await update(REGISTRY_STORAGE_KEY, (val: Record<string, StandardItem> = {}) => {
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
  const registerItems = useCallback(async (items: StandardItem[]) => {
    if (items.length === 0) return;
    
    await update(REGISTRY_STORAGE_KEY, (val: Record<string, StandardItem> = {}) => {
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
