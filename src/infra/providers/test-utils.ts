/**
 * @file Test Utilities
 * @description Shared test helpers and distinct generic assertions for provider integration logic.
 */

import { expect } from 'vitest';

import { BaseItem } from '@/domain/items/items';
import { SortDirection } from '@/presentation/search/sort-schemas';

/**
 * Shared test utilities for provider integration tests.
 */

/**
 * Ensures that the search results contain the expected canonical item ID.
 * @param items - The array of items to search.
 * @param targetId - The canonical ID that must be present.
 */
export function expectContainsCanonical(items: BaseItem[], targetId: string) {
  const ids = items.map((i) => i.identity.providerItemId);
  expect(ids, `Expected results to contain ID ${targetId}`).toContain(targetId);
}

/**
 * Ensures that the search results DO NOT contain any of the excluded IDs.
 * Use this for cross-exclusion testing.
 * @param items - The array of items to verify.
 * @param excludedIds - Array of IDs that must not be present.
 */
export function expectExcludesAnchors(items: BaseItem[], excludedIds: string[]) {
  const foundIds = items.map((i) => i.identity.providerItemId);
  for (const excludedId of excludedIds) {
    expect(foundIds, `Expected results to NOT contain ID ${excludedId}`).not.toContain(excludedId);
  }
}

function assertCorrectSortOrder(
  current: number | string,
  next: number | string,
  direction: SortDirection,
  index: number,
  label: string,
) {
  const isNumeric = typeof current === 'number' && typeof next === 'number';

  if (direction === SortDirection.DESC) {
    if (isNumeric) {
      expect(
        current as number,
        `Wrong sort order for ${label} at index ${index}`,
      ).toBeGreaterThanOrEqual(next as number);
    } else {
      expect(
        current.toString() >= next.toString(),
        `Wrong sort order for ${label} at index ${index} ('${current}' vs '${next}')`,
      ).toBe(true);
    }
  } else {
    if (isNumeric) {
      expect(
        current as number,
        `Wrong sort order for ${label} at index ${index}`,
      ).toBeLessThanOrEqual(next as number);
    } else {
      expect(
        current.toString() <= next.toString(),
        `Wrong sort order for ${label} at index ${index} ('${current}' vs '${next}')`,
      ).toBe(true);
    }
  }
}

function isValidSortValue(value: unknown): value is string | number {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Verifies that the items are sorted by a generic value.
 * @param items - The array of items to test.
 * @param getValue - Function to extract the sorting scalar value.
 * @param direction - The target sorting direction.
 * @param label - A label for the sorted property used in expectations.
 */
export function expectSorted<T>(
  items: T[],
  getValue: (item: T) => number | string,
  direction: SortDirection,
  label: string = 'value',
) {
  for (let i = 0; i < items.length - 1; i++) {
    const current = getValue(items[i]);
    const next = getValue(items[i + 1]);

    if (isValidSortValue(current) && isValidSortValue(next)) {
      assertCorrectSortOrder(current, next, direction, i, label);
    }
  }
}

/**
 * Verifies that two pages of results are distinct (pagination check).
 * @param page1 - The first array of generic items.
 * @param page2 - The second array of generic items to disjoint.
 */
export function expectDistinctPages(page1: BaseItem[], page2: BaseItem[]) {
  if (page1.length > 0 && page2.length > 0) {
    expect(page1[0].id, 'Page 1 and Page 2 should have different first items').not.toBe(
      page2[0].id,
    );
  }
}
