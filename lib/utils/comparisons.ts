/**
 * @file comparisons.ts
 * @description Utility functions for comparing media objects to detect changes.
 * Used to optimize state updates and prevent unnecessary re-renders.
 * @module Comparisons
 */

import { MediaItem } from '@/lib/types';

/**
 * Checks if a partial update actually changes any values in the current media item.
 * Performs deep comparison for the `details` object using JSON.stringify.
 * @param current - The existing media item.
 * @param updates - The partial updates to apply.
 * @returns True if the updates would change the item, false otherwise.
 */
export function hasMediaItemUpdates(current: MediaItem, updates: Partial<MediaItem>): boolean {
  for (const key of Object.keys(updates)) {
    const k = key as keyof MediaItem;
    const newValue = updates[k];
    const oldValue = current[k];

    // If values are referentially equal, move on
    if (newValue === oldValue) continue;

    // Ignore undefined values in updates. Partial updates should only update 
    // fields they explicitly provide, not unset existing ones.
    if (newValue === undefined) continue;

    // Special handling for the 'details' object (deep compare)
    if (k === 'details') {
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
