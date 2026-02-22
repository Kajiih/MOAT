/**
 * @file mocks.ts
 * @description Reusable API mock factories for E2E tests. Consolidates the repeated
 * `page.route` API mock patterns found across spec files into composable helpers
 * with sensible defaults.
 * @example
 * ```ts
 * await mockSearchResults(page, [
 *   { id: 'item-1', title: 'First', type: 'song', artist: 'Artist 1' },
 * ]);
 * await mockItemDetails(page, {
 *   id: 'item-1', title: 'First', type: 'song', description: 'Full details',
 * });
 * ```
 */

import type { Page } from '@playwright/test';

/** Minimal shape required to mock a search result. All other fields receive defaults. */
export interface MockSearchItem {
  id: string;
  title: string;
  type: string;
  artist?: string;
  mbid?: string;
}

/** Minimal shape required to mock item details. */
export interface MockItemDetail extends MockSearchItem {
  description?: string;
}

interface SearchMockOptions {
  /** Which page of results this response represents. Defaults to `1`. */
  page?: number;
  /** Total pages available. Defaults to `1`. */
  totalPages?: number;
  /** Total item count. Defaults to `items.length`. */
  totalCount?: number;
}

/**
 * Registers a route handler that intercepts search API calls and returns the
 * provided items as results. Automatically sets `mbid` to `id` if omitted.
 * @param page - Playwright Page object.
 * @param items - Array of items to include in the results.
 * @param options - Optional pagination overrides.
 * @returns A cleanup function to unroute (call in afterEach if needed).
 */
export async function mockSearchResults(
  page: Page,
  items: MockSearchItem[],
  options: SearchMockOptions = {},
) {
  const { page: pageNum = 1, totalPages = 1, totalCount = items.length } = options;

  await page.route('**/api/search*', async (route) => {
    const normalised = items.map((item) => ({
      mbid: item.id,
      ...item,
    }));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: normalised,
        page: pageNum,
        totalPages,
        totalCount,
      }),
    });
  });
}

/**
 * Registers a route handler that intercepts detail API calls and returns the
 * provided detail object. Automatically sets `mbid` to `id` if omitted.
 * @param page - Playwright Page object.
 * @param detail - The detail object to return.
 */
export async function mockItemDetails(page: Page, detail: MockItemDetail) {
  const normalised = { mbid: detail.id, ...detail };

  await page.route('**/api/details*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(normalised),
    });
  });
}

/**
 * Registers a dynamic route handler where the response varies per request.
 * Useful for pagination tests where each page returns different items.
 * @param page - Playwright Page object.
 * @param handler - Receives the parsed URL and returns the response body object.
 */
export async function mockSearchDynamic(
  page: Page,
  handler: (url: URL) => Record<string, unknown>,
) {
  await page.route('**/api/search*', async (route) => {
    const url = new URL(route.request().url());
    const body = handler(url);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}
