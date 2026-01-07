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

  return [state, setState] as const;
}
