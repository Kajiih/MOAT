import { type Page } from '@playwright/test';

/**
 * Ensures a clean state for E2E tests by clearing all forms of browser storage.
 * This includes LocalStorage, SessionStorage, and specifically IndexedDB used by idb-keyval.
 */
/**
 * Clears all browser storage for the current origin.
 * @param page - The Playwright Page object.
 */
export async function clearBrowserStorage(page: Page) {
  // We navigate to the root first so we are on the correct origin
  if (page.url() === 'about:blank') {
    await page.goto('/');
  }

  await page.evaluate(async () => {
    // Clear standard storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear all IndexedDB databases
    if (globalThis.indexedDB && globalThis.indexedDB.databases) {
      const dbs = await globalThis.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          globalThis.indexedDB.deleteDatabase(db.name);
        }
      }
    }
  });

  // Small delay to ensure DB deletions are processed by the browser
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(200);
}
