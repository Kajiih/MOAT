/**
 * @file usePersistentState.ts
 * @description A custom React hook that mimics useState but persists the value to IndexedDB.
 * Features debounced writing to avoid performance issues during rapid updates.
 * @module usePersistentState
 */

'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { storage } from '@/lib/storage';

/**
 * A custom hook that synchronizes state with storage.
 * @param key - The key to use for storage.
 * @param initialValue - The initial value of the state.
 * @returns A stateful value, a function to update it, and a hydration status flag.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
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
            setState({ ...initialValue, ...item });
          } else {
            setState(item);
          }
        }
      } catch (error) {
        console.error(`Error reading storage key "${key}":`, error);
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
  const [debouncedState] = useDebounce(state, 1000);

  useEffect(() => {
    // Prevent writing to storage before hydration is complete
    if (!isHydrated) return;
    storage.set(key, debouncedState);
  }, [key, debouncedState, isHydrated]);

  return [state, setState, isHydrated] as const;
}
