import { expect } from 'vitest';
import { BaseItem } from '@/items/items';
import { SortDirection } from '@/search/schemas';

/**
 * Shared test utilities for database provider integration tests.
 */

/**
 * Ensures that the search results contain the expected canonical item ID.
 */
export function expectContainsCanonical(items: BaseItem[], targetId: string) {
  const ids = items.map(i => i.identity.dbId);
  expect(ids, `Expected results to contain ID ${targetId}`).toContain(targetId);
}

/**
 * Ensures that the search results DO NOT contain any of the excluded IDs.
 * Use this for cross-exclusion testing.
 */
export function expectExcludesAnchors(items: BaseItem[], excludedIds: string[]) {
  const foundIds = items.map(i => i.identity.dbId);
  for (const excludedId of excludedIds) {
    expect(foundIds, `Expected results to NOT contain ID ${excludedId}`).not.toContain(excludedId);
  }
}

/**
 * Verifies that the items are sorted by a generic value.
 */
export function expectSorted<T>(
  items: T[],
  getValue: (item: T) => number | string,
  direction: SortDirection,
  label: string = 'value'
) {
  for (let i = 0; i < items.length - 1; i++) {
    const current = getValue(items[i]);
    const next = getValue(items[i+1]);
    
    // We only compare if both values are defined and not empty strings
    if (current !== undefined && current !== null && current !== '' &&
        next !== undefined && next !== null && next !== '') {
      
      const isNumeric = typeof current === 'number' && typeof next === 'number';
      
      if (direction === SortDirection.DESC) {
        if (isNumeric) {
          expect(current as number, `Wrong sort order for ${label} at index ${i}`).toBeGreaterThanOrEqual(next as number);
        } else {
          expect(current.toString() >= next.toString(), `Wrong sort order for ${label} at index ${i} ('${current}' vs '${next}')`).toBe(true);
        }
      } else {
        if (isNumeric) {
          expect(current as number, `Wrong sort order for ${label} at index ${i}`).toBeLessThanOrEqual(next as number);
        } else {
          expect(current.toString() <= next.toString(), `Wrong sort order for ${label} at index ${i} ('${current}' vs '${next}')`).toBe(true);
        }
      }
    }
  }
}


/**
 * Verifies that two pages of results are distinct (pagination check).
 */
export function expectDistinctPages(page1: BaseItem[], page2: BaseItem[]) {
  if (page1.length > 0 && page2.length > 0) {
    expect(page1[0].id, 'Page 1 and Page 2 should have different first items').not.toBe(page2[0].id);
  }
}
