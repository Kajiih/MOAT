import { expect, type Page } from '@playwright/test';

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
  await expect
    .poll(
      async () => {
        const result = await page.evaluate(async (storageKey) => {
          return new Promise((resolve) => {
            const request = indexedDB.open('keyval-store');
            request.onerror = () => resolve(undefined);
            request.onsuccess = () => {
              const db = request.result;
              try {
                // Ensure the object store exists before trying to access it
                if (!db.objectStoreNames.contains('keyval')) {
                  db.close();
                  resolve(undefined);
                  return;
                }
                const tx = db.transaction('keyval', 'readonly');
                const store = tx.objectStore('keyval');
                const getRequest = store.get(storageKey);
                getRequest.onsuccess = () => {
                  resolve(getRequest.result);
                };
                getRequest.onerror = () => resolve(undefined);
              } catch {
                resolve(undefined);
              }
            };
          });
        }, key);
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
