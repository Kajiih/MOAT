/**
 * @file useStorageSync.ts
 * @description A primitive hook that handles the lifecycle of asynchronous persistence.
 * It handles hydration, debounced writing, and unmount flushing so that
 * higher-level hooks (usePersistentState, usePersistentReducer) can focus on state management.
 * @module useStorageSync
 */

'use client';

import deepEqual from 'fast-deep-equal';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { logger } from '@/lib/logger';
import { storage } from '@/lib/storage';



/**
 * Options for the useStorageSync hook.
 * @template T - The type of the state being synchronized.
 */
export interface StorageSyncOptions<T> {
  /** The storage key to use. */
  key: string;
  /** The current state value to persist. */
  state: T;
  /** The initial state value (used for merging logic during hydration). */
  initialState: T;
  /** Callback to update the state when hydration completes. */
  onHydrate: (hydratedState: T) => void;
  /** Optional callback triggered after a successful write to storage. */
  onSave?: (savedState: T) => void;
  /** Delay in ms for debounced writes. Default 1000ms. */
  persistenceDelay?: number;
}

/**
 * A primitive hook for syncing state with asynchronous storage (IndexedDB).
 * @param options - Configuration options.
 * @param options.key - The storage key to use.
 * @param options.state - The current state to persist.
 * @param options.initialState - The initial state to merge with.
 * @param options.onHydrate - Callback for state hydration.
 * @param options.onSave - Callback after state persistence.
 * @param options.persistenceDelay - Debounce delay in milliseconds.
 * @returns Whether the state has been hydrated from storage.
 */
export function useStorageSync<T>({
  key,
  state,
  initialState,
  onHydrate,
  onSave,
  persistenceDelay = 1000,
}: StorageSyncOptions<T>): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  // Use refs for callbacks and constants to avoid re-triggering effects if they aren't stable
  const onHydrateRef = useRef(onHydrate);
  const initialStateRef = useRef(initialState);
  const onSaveRef = useRef(onSave);
  // We track the hydrated value to avoid immediate write-back if the state matches what we just loaded.
  const lastSavedStateRef = useRef<T | null>(null);

  useEffect(() => {
    onHydrateRef.current = onHydrate;
  }, [onHydrate]);

  useEffect(() => {
    initialStateRef.current = initialState;
  }, [initialState]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // 1. Hydrate from storage (Async)
  useEffect(() => {
    let isMounted = true;
    setIsHydrated(false);

    const hydrate = async () => {
      try {
        const item = await storage.get<T>(key);
        if (item && isMounted) {
          const currentInitialState = initialStateRef.current;
          let hydratedState = item;

          // Merge with initialState if both are objects
          if (
            typeof currentInitialState === 'object' &&
            currentInitialState !== null &&
            !Array.isArray(currentInitialState) &&
            typeof item === 'object' &&
            item !== null &&
            !Array.isArray(item)
          ) {
            hydratedState = { ...currentInitialState, ...item };
          }
          onHydrateRef.current(hydratedState);
          // Initialize tracking ref to prevent immediate re-save
          lastSavedStateRef.current = hydratedState;
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
  }, [key]); // ONLY re-run when key changes

  // 2. Persist Updates (Debounced)
  const debouncedSave = useDebouncedCallback((value: T) => {
    // Deep check to prevent redundant writes (serialization + IDB overhead)
    // This is the single source of truth for "change detection"
    if (deepEqual(value, lastSavedStateRef.current)) return;

    storage.set(key, value);
    lastSavedStateRef.current = value;
    onSaveRef.current?.(value);
  }, persistenceDelay);

  useEffect(() => {
    if (!isHydrated) return;

    // We no longer skip scheduling based on shallow equality.
    // We trust deepEqual in the callback to be the gatekeeper.
    // This handles cases where state is referentially new but deep-equal (reverts),
    // and ensures we don't miss updates that shallow-check might misjudge.
    debouncedSave(state);
  }, [state, isHydrated, debouncedSave]);

  // 3. Flush on unmount
  useEffect(() => {
    return () => {
      // Ensure any pending write is executed before unmount.
      // The callback itself contains the deepEqual check, so this is safe and efficient.
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return isHydrated;
}
