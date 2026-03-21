/**
 * @file comparisons.ts
 * @description Utility functions for comparing items to detect changes.
 * Used to optimize state updates and prevent unnecessary re-renders.
 * @module Comparisons
 */

import fastDeepEqual from 'fast-deep-equal';

import { Item, ItemUpdate } from '@/domain/items/items';
import { isObject } from '@/domain/utils/type-guards';

/**
 * Checks if a partial update actually changes any values in the current item.
 * @param current - The existing item.
 * @param updates - The proposed new properties payload.
 * @returns True if at least one property has meaningfully changed.
 */
export function hasItemUpdates(current: Item, updates: ItemUpdate): boolean {
  const entries = Object.entries(updates) as [keyof Item, Item[keyof Item]][];

  for (const [key, newValue] of entries) {
    const oldValue = current[key];

    // If values are referentially equal, move on
    if (newValue === oldValue) continue;

    // Ignore undefined values in updates. Partial updates should only update
    // fields they explicitly provide, not unset existing ones.
    if (newValue === undefined) continue;

    // Special handling for nested objects (deep compare)
    if (isObject(newValue) || isObject(oldValue)) {
      if (!fastDeepEqual(newValue, oldValue)) {
        return true;
      }
      continue;
    }

    // For all other fields (strings, numbers, booleans), strict inequality means they changed
    return true;
  }

  return false;
}
