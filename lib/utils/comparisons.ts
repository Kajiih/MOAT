/**
 * @file comparisons.ts
 * @description Utility functions for comparing items to detect changes.
 * Used to optimize state updates and prevent unnecessary re-renders.
 * @module Comparisons
 */

import { Item } from '@/lib/database/items';

/**
 * Checks if a partial update actually changes any values in the current item.
 * @param current - The existing item.
 * @param updates - The partial updates to apply.
 * @returns True if the updates would change the item, false otherwise.
 */
export function hasItemUpdates(
  current: Item, 
  updates: Partial<Item>
): boolean {
  for (const key of Object.keys(updates)) {
    const k = key as keyof Item;
    const newValue = (updates as any)[k];
    const oldValue = (current as any)[k];

    // If values are referentially equal, move on
    if (newValue === oldValue) continue;

    // Ignore undefined values in updates. Partial updates should only update
    // fields they explicitly provide, not unset existing ones.
    if (newValue === undefined) continue;

    // Special handling for nested objects (deep compare)
    if (k === 'details' || k === 'images' || k === 'identity') {
      // If one is null/undefined and the other isn't, they are different
      if (!newValue || !oldValue) return true;

      // Deep compare
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        return true;
      }
      continue;
    }

    // For all other fields (strings, numbers, booleans), strict inequality means they changed
    return true;
  }

  return false;
}
