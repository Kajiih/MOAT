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
  const tryClear = async () => {
    try {
      await page.evaluate(async () => {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all IndexedDB databases
        if (globalThis.indexedDB && globalThis.indexedDB.databases) {
          const dbs = await globalThis.indexedDB.databases();
          for (const db of dbs) {
            if (db.name) indexedDB.deleteDatabase(db.name);
          }
        } else {
          indexedDB.deleteDatabase('keyval-store');
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  // If we're on about:blank, we must navigate first
  if (page.url() === 'about:blank') {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  }

  const success = await tryClear();
  if (!success) {
    // If first attempt failed (e.g. Firefox SecurityError), try navigating to dashboard and try again
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await tryClear();
  }
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
