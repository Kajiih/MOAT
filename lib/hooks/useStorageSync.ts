/**
 * @file useStorageSync.ts
 * @description A primitive hook that handles the lifecycle of asynchronous persistence.
 * It handles hydration, debounced writing, and unmount flushing so that
 * higher-level hooks (usePersistentState, usePersistentReducer) can focus on state management.
 * @module useStorageSync
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import { logger } from '@/lib/logger';
import { storage } from '@/lib/storage';

import { useDebouncedEffect } from './useDebouncedEffect';

export interface StorageSyncOptions<T> {
  /** The storage key to use. */
  key: string;
  /** The current state value to persist. */
  state: T;
  /** The initial state value (used for merging logic during hydration). */
  initialState: T;
  /** Callback to update the state when hydration completes. */
  onHydrate: (hydratedState: T) => void;
  /** Delay in ms for debounced writes. Default 1000ms. */
  persistenceDelay?: number;
}

/**
 * A primitive hook for syncing state with asynchronous storage (IndexedDB).
 * @param options - Configuration options.
 * @param options.key - The storage key to use.
 * @param options.state - The current state value to persist.
 * @param options.initialState - The initial state value.
 * @param options.onHydrate - Callback to update state on hydration.
 * @param options.persistenceDelay - Delay in ms for debounced writes.
 * @returns boolean - Whether the state has been hydrated from storage.
 */
export function useStorageSync<T>({
  key,
  state,
  initialState,
  onHydrate,
  persistenceDelay = 1000,
}: StorageSyncOptions<T>): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate from storage (Async)
  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      try {
        const item = await storage.get<T>(key);
        if (item && isMounted) {
          // Robustness: Merge with initialState if both are objects.
          // This ensures that if the schema has changed (new keys added to initial state),
          // the hydrated state will include them instead of being undefined.
          let hydratedState = item;
          if (
            typeof initialState === 'object' &&
            initialState !== null &&
            !Array.isArray(initialState) &&
            typeof item === 'object' &&
            item !== null &&
            !Array.isArray(item)
          ) {
            hydratedState = { ...initialState, ...item };
          }
          onHydrate(hydratedState);
        }
      } catch (error) {
        logger.error({ error, key }, 'Error reading storage key');
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };
    hydrate();
    return () => {
      isMounted = false;
    };
    // We explicitly assume onHydrate is stable or we want to re-run if it changes (which it shouldn't usually)
    // In most cases, passing dispatch or setState setter is stable.
  }, [key, initialState, onHydrate]);

  // 2. Persist Updates (Debounced)
  // We track the hydrated value to avoid immediate write-back if the state matches what we just loaded.
  const lastSavedStateRef = useRef<T | null>(null);

  useDebouncedEffect(
    () => {
      if (!isHydrated) return;

      // Optimization: Skip write if state hasn't changed since last hydration/save
      if (lastSavedStateRef.current === state) return;

      storage.set(key, state);
      lastSavedStateRef.current = state;
    },
    persistenceDelay,
    [state, isHydrated, key],
  );

  return isHydrated;
}
