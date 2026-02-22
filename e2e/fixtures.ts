/**
 * @file fixtures.ts
 * @description Shared Playwright test fixtures for the Moat application. Provides pre-configured
 * Page Object Models (POMs) and automatic storage cleanup via `test.extend`. Spec files import
 * `{ test, expect }` from this module instead of `@playwright/test` to receive ready-to-use
 * POM instances.
 * @example
 * ```ts
 * import { expect, test } from './fixtures';
 *
 * test('example', async ({ boardPage }) => {
 *   await boardPage.goto();
 *   await expect(boardPage.titleInput).toBeVisible();
 * });
 * ```
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';
import { DashboardPage } from './pom/DashboardPage';
import { SearchPanel } from './pom/SearchPanel';
import { clearBrowserStorage } from './utils/storage';

/** Custom fixture types available to all tests using our extended `test`. */
interface MoatFixtures {
  /** BoardPage POM — storage is cleared automatically before use. */
  boardPage: BoardPage;
  /** DashboardPage POM — storage is cleared automatically before use. */
  dashboardPage: DashboardPage;
  /** SearchPanel POM — storage is cleared automatically before use. */
  searchPanel: SearchPanel;
}

/**
 * Extended Playwright `test` function that provides POM fixtures with
 * automatic browser storage cleanup. Each fixture lazily clears storage
 * on first access so tests that don't need a particular POM pay no cost.
 */
export const test = base.extend<MoatFixtures>({
  boardPage: async ({ page }, use) => {
    await clearBrowserStorage(page);
    await use(new BoardPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await clearBrowserStorage(page);
    await use(new DashboardPage(page));
  },

  searchPanel: async ({ page }, use) => {
    await clearBrowserStorage(page);
    await use(new SearchPanel(page));
  },
});

export { expect } from '@playwright/test';
