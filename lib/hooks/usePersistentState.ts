/**
 * @file usePersistentState.ts
 * @description A custom hook that synchronizes state with localStorage.
 * Features:
 * - Lazy hydration (client-side only) to match Next.js SSR requirements.
 * - Debounced writes to prevent excessive disk I/O.
 * - Robust object merging to handle schema migrations.
 * - Cross-tab synchronization via the 'storage' event.
 * @module usePersistentState
 */

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

/**
 * A custom hook that synchronizes state with localStorage.
 * Since this is used in a client-only component (SSR disabled),
 * we can safely use lazy initialization to read from localStorage immediately.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, setState] = useState<T>(initialValue);

  // 1. Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Robustness: Merge with initialValue if both are objects (and not arrays/null)
        if (
          typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue) &&
          typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ) {
          // eslint-disable-next-line
          setState({ ...initialValue, ...parsed });
        } else {
          setState(parsed);
        }
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key, initialValue]);

  // 2. Persist Updates: Debounce the write to localStorage
  const [debouncedState] = useDebounce(state, 1000);

  useEffect(() => {
    // Prevent writing to storage before hydration is complete
    if (!isHydrated) return;

    try {
      window.localStorage.setItem(key, JSON.stringify(debouncedState));
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, debouncedState, isHydrated]);

  // 3. Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage change for key "${key}":`, error);
        }
      } else if (e.key === key && !e.newValue) {
        // Key was cleared in another tab
        // eslint-disable-next-line
        setState(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [state, setState, isHydrated] as const;
}
