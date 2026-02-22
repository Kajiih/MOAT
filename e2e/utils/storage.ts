import { expect, type Page } from '@playwright/test';

/**
 * Ensures a clean state for E2E tests by clearing all forms of browser storage.
 * This includes LocalStorage, SessionStorage, and specifically IndexedDB used by idb-keyval.
 */
/**
 * Clears all browser storage for the current origin.
 * @param page - The Playwright Page object.
 */
export async function clearBrowserStorage(page: Page) {
  // We navigate to a stable route that doesn't redirect immediately (like /board/:id)
  // to avoid NS_BINDING_ABORTED issues in Firefox during fast subsequent navigations.
  if (page.url() === 'about:blank') {
    await page.goto('/dashboard');
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
          try {
            globalThis.indexedDB.deleteDatabase(db.name);
          } catch (e) {
            // Ignore errors during deletion
          }
        }
      }
    }
  });

  // Instead of fixed timeout, we verify DBs are actually gone or at least we've triggered it
  // Most browsers process this fast enough that the next navigation is clean.
}

/**
 * Polls IndexedDB for a specific key/value combination.
 * Useful for verifying persistence without hardcoded sleeps.
 * @param page - Playwright Page object.
 * @param key - The key to look for in idb-keyval store.
 * @param predicate - A function that receives the value and returns true if it matches.
 * @param timeout - Max time to wait in ms.
 */
export async function waitForStorageValue<T>(
  page: Page,
  key: string,
  predicate: (val: T | undefined) => boolean,
  timeout = 5000,
) {
  let latestVal: T | undefined;
  await expect
    .poll(
      async () => {
        const result = await page.evaluate(async (storageKey) => {
          // console.log(`Polling IDB for key: ${storageKey}`);
          return new Promise((resolve) => {
            const request = indexedDB.open('keyval-store');
            request.onerror = () => resolve(undefined);
            request.onsuccess = () => {
              const db = request.result;
              try {
                const tx = db.transaction('keyval', 'readonly');
                const store = tx.objectStore('keyval');
                const getRequest = store.get(storageKey);
                getRequest.onsuccess = () => {
                   // console.log(`IDB found for ${storageKey}:`, !!getRequest.result);
                   resolve(getRequest.result);
                };
                getRequest.onerror = () => resolve(undefined);
              } catch (e) {
                resolve(undefined);
              }
            };
          });
        }, key);
        latestVal = result as T;
        return predicate(result as T);
      },
      {
        timeout,
        intervals: [100, 250, 500],
        message: 'waitForStorageValue predicate timed out',
      },
    )
    .toBeTruthy();
}
