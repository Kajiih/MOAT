/**
 * @file usePersistentState.ts
 * @description A custom React hook that mimics useState but persists the value to IndexedDB.
 * Features debounced writing to avoid performance issues during rapid updates.
 * @module usePersistentState
 */

'use client';

import { useEffect, useRef, useState } from 'react';


import { useDebouncedCallback } from 'use-debounce';

import { logger } from '@/lib/logger';
import { storage } from '@/lib/storage';

/**
 * A custom hook that synchronizes state with storage.
 * @param key - The key to use for storage.
 * @param initialValue - The initial value of the state.
 * @returns A stateful value, a function to update it, and a hydration status flag.
 */
export interface PersistentStateOptions {
  persistenceDelay?: number;
}

export function usePersistentState<T>(key: string, initialValue: T, options?: PersistentStateOptions) {
  const { persistenceDelay = 1000 } = options || {};
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, setState] = useState<T>(initialValue);

  // 1. Hydrate from storage on mount
  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      try {
        const item = await storage.get<T>(key);
        if (item && isMounted) {
          // Robustness: Merge with initialValue if both are objects (and not arrays/null)
          if (
            typeof initialValue === 'object' &&
            initialValue !== null &&
            !Array.isArray(initialValue) &&
            typeof item === 'object' &&
            item !== null &&
            !Array.isArray(item)
          ) {
            const hydratedState = { ...initialValue, ...item };

            setState(hydratedState);
          } else {

            setState(item);
          }
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
  }, [key, initialValue]);

  // 2. Persist Updates: Debounce the write to storage
  const debouncedSave = useDebouncedCallback((value: T) => {
    storage.set(key, value);
  }, persistenceDelay);

  useEffect(() => {
    if (!isHydrated) return;
    debouncedSave(state);
  }, [state, isHydrated, debouncedSave]);

  // 3. Flush on unmount
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      if (isHydrated) {
        storage.set(key, stateRef.current);
      }
    };
  }, [key, isHydrated]);

  return [state, setState, isHydrated] as const;
}
