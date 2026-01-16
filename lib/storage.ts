/**
 * @file storage.ts
 * @description abstract storage interface to switch between localStorage, IndexedDB, or others.
 * Currently uses 'idb-keyval' for asynchronous IndexedDB storage.
 */

import { get, set, del } from 'idb-keyval';

export interface StorageBackend {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, value: T) => Promise<void>;
  del: (key: string) => Promise<void>;
}

export const storage: StorageBackend = {
  get: async <T>(key: string) => {
    try {
      return await get<T>(key);
    } catch (err) {
      console.error(`Storage get error for key "${key}":`, err);
      return undefined;
    }
  },
  set: async <T>(key: string, value: T) => {
    try {
      await set(key, value);
    } catch (err) {
      console.error(`Storage set error for key "${key}":`, err);
    }
  },
  del: async (key: string) => {
    try {
      await del(key);
    } catch (err) {
      console.error(`Storage del error for key "${key}":`, err);
    }
  },
};
