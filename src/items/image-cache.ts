/**
 * @file image-cache.ts
 * @description Persistent cache for tracking failed image URLs across the application.
 * This allows components to avoid repeated 404 requests and helps the screenshot
 * engine differentiate between expected failures and unexpected ones.
 * @module image-cache
 */

const STORAGE_KEY = 'moat_failed_images_v1';
const MAX_ENTRIES = 1000;
const TTL = 24 * 60 * 60 * 1000; // 24 hours

class FailedImageCache {
  private inMemorySet = new Set<string>();
  private timestampMap: Record<string, number> = {};

  constructor() {
    this.hydrate();
  }

  /**
   * Rehydrates the cache from local storage and prunes expired entries.
   */
  private hydrate() {
    if (globalThis.window === undefined || !globalThis.localStorage) return;

    try {
      const data = globalThis.localStorage.getItem(STORAGE_KEY);
      if (!data) return;

      const parsed = JSON.parse(data) as Record<string, number>;
      const now = Date.now();
      let hasExpired = false;

      for (const [url, timestamp] of Object.entries(parsed)) {
        if (now - timestamp < TTL) {
          this.inMemorySet.add(url);
          this.timestampMap[url] = timestamp;
        } else {
          hasExpired = true;
        }
      }

      if (hasExpired) {
        this.saveToStorage();
      }
    } catch (error) {
      console.warn('Failed to parse failed image cache from localStorage, clearing...', error);
      if (typeof globalThis.localStorage?.removeItem === 'function') {
        globalThis.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  /**
   * Checks if a URL is known to be broken.
   * @param url - The image URL to check.
   * @returns True if the image is cached as broken, false otherwise.
   */
  public has(url: string): boolean {
    return this.inMemorySet.has(url);
  }

  /**
   * Adds a URL to the failed cache and persists to disk.
   * @param url - The image URL that failed.
   */
  public add(url: string) {
    if (this.inMemorySet.has(url)) return;

    this.inMemorySet.add(url);
    this.timestampMap[url] = Date.now();

    const keys = Object.keys(this.timestampMap);
    if (keys.length > MAX_ENTRIES) {
      let oldestKey = keys[0];
      let oldestTime = this.timestampMap[oldestKey];

      for (let i = 1; i < keys.length; i++) {
        const key = keys[i];
        if (this.timestampMap[key] < oldestTime) {
          oldestKey = key;
          oldestTime = this.timestampMap[key];
        }
      }

      this.inMemorySet.delete(oldestKey);
      delete this.timestampMap[oldestKey];
    }

    this.saveToStorage();
  }

  private saveToStorage() {
    if (globalThis.window === undefined || !globalThis.localStorage) return;

    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.timestampMap));
    } catch (error) {
      console.error('Failed to save failed image cache to localStorage', error);
    }
  }
}

export const failedImages = new FailedImageCache();
