/**
 * @file storage.ts
 * @description abstract storage interface to switch between localStorage, IndexedDB, or others.
 * Currently uses 'idb-keyval' for asynchronous IndexedDB storage.
 */

import { del, delMany, get, keys, set, setMany, update } from 'idb-keyval';

/**
 * Interface defining the abstract storage backend for the application.
 */
export interface StorageBackend {
  /** Retrieves a value by key. */
  get: <T>(key: string) => Promise<T | undefined>;
  /** Persists a value by key. */
  set: <T>(key: string, value: T) => Promise<void>;
  /** Safely updates a value using an atomic read-modify-write transaction. */
  update: <T>(key: string, updater: (val: T | undefined) => T) => Promise<void>;
  /** Persists multiple key-value pairs in a single transaction. */
  setMany: (entries: [string, unknown][]) => Promise<void>;
  /** Removes a value by key. */
  del: (key: string) => Promise<void>;
  /** Removes multiple values by keys in a single transaction. */
  delMany: (keys: string[]) => Promise<void>;
  /** Retrieves all keys. */
  keys: () => Promise<IDBValidKey[]>;
}

import { logger } from './logger';

export const storage: StorageBackend = {
  get: async <T>(key: string) => {
    try {
      return await get<T>(key);
    } catch (error) {
      logger.error({ error, key }, 'Storage get error');
      return;
    }
  },
  set: async <T>(key: string, value: T) => {
    try {
      await set(key, value);
    } catch (error) {
      logger.error({ error, key }, 'Storage set error');
    }
  },
  update: async <T>(key: string, updater: (val: T | undefined) => T) => {
    try {
      await update(key, updater);
    } catch (error) {
      logger.error({ error, key }, 'Storage update error');
    }
  },
  setMany: async (entries: [string, unknown][]) => {
    try {
      await setMany(entries);
    } catch (error) {
      logger.error({ error }, 'Storage setMany error');
    }
  },
  del: async (key: string) => {
    try {
      await del(key);
    } catch (error) {
      logger.error({ error, key }, 'Storage del error');
    }
  },
  delMany: async (keys: string[]) => {
    try {
      await delMany(keys);
    } catch (error) {
      logger.error({ error }, 'Storage delMany error');
    }
  },
  keys: async () => {
    try {
      return await keys();
    } catch (error) {
      logger.error({ error }, 'Storage keys error');
      return [];
    }
  },
};
