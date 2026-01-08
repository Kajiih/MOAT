import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

/**
 * A custom hook that synchronizes state with localStorage.
 * Since this is used in a client-only component (SSR disabled),
 * we can safely use lazy initialization to read from localStorage immediately.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  // 1. Lazy initialization: Read from localStorage on the very first render
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 2. Persist Updates: Debounce the write to localStorage
  const [debouncedState] = useDebounce(state, 1000);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(debouncedState));
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, debouncedState]);

  // 3. Sync across tabs: Listen for storage events (fired when other tabs update this key)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue);
          setState(newValue);
        } catch (error) {
          console.error(`Error parsing storage change for key "${key}":`, error);
        }
      } else if (e.key === key && !e.newValue) {
        // Key was cleared in another tab
        setState(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [state, setState] as const;
}
