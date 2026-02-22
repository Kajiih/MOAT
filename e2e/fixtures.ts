/**
 * @file fixtures.ts
 * @description Shared Playwright test fixtures for the Moat application. Provides pre-configured
 * Page Object Models (POMs) and automatic isolation via Playwright's fresh browser contexts.
 * Spec files import `{ test, expect }` from this module instead of `@playwright/test`.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';
import { DashboardPage } from './pom/DashboardPage';
import { SearchPanel } from './pom/SearchPanel';

/** Custom fixture types available to all tests using our extended `test`. */
interface MoatFixtures {
  /** BoardPage POM. */
  boardPage: BoardPage;
  /** DashboardPage POM. */
  dashboardPage: DashboardPage;
  /** SearchPanel POM. */
  searchPanel: SearchPanel;
}

/**
 * Extended Playwright `test` function that provides POM fixtures.
 * Playwright automatically clears storage between tests by using fresh contexts.
 */
export const test = base.extend<MoatFixtures>({
  boardPage: async ({ page }, use) => {
    await use(new BoardPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  searchPanel: async ({ page }, use) => {
    await use(new SearchPanel(page));
  },
});

export { expect } from '@playwright/test';
