/**
 * @file usePersistentReducer.ts
 * @description A custom React hook that extends useReducer with automatic localStorage persistence.
 * Features:
 * - Internal hydration logic to avoid SSR mismatches.
 * - Debounced writes to minimize localStorage overhead.
 * - Cross-tab synchronization using the storage event.
 * @module usePersistentReducer
 */

import { useState, useEffect, useReducer, Dispatch, Reducer } from 'react';
import { useDebounce } from 'use-debounce';

/** Internal action type used for state hydration. */
const HYDRATE_ACTION = '@@PERSIST/HYDRATE';

/** Interface for the internal hydration action. */
interface HydrateAction<S> {
  type: typeof HYDRATE_ACTION;
  payload: S;
}

/**
 * A custom hook that combines useReducer with localStorage persistence.
 * 
 * @template S - The shape of the state.
 * @template A - The union type of possible actions.
 * @param reducer - The pure reducer function.
 * @param initialState - The default state to use before hydration.
 * @param key - The localStorage key to use for persistence.
 * @returns A tuple of [state, dispatch, isHydrated].
 */
export function usePersistentReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  key: string
): [S, Dispatch<A>, boolean] {
  
  /**
   * Wrapper reducer that intercepts hydration actions.
   */
  const persistentReducer = (state: S, action: A | HydrateAction<S>): S => {
    if ((action as HydrateAction<S>).type === HYDRATE_ACTION) {
      return (action as HydrateAction<S>).payload;
    }
    return reducer(state, action as A);
  };

  const [state, dispatch] = useReducer(persistentReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate from localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Robustness: Merge with initialValue if both are objects
        let hydratedState = parsed;
         if (
          typeof initialState === 'object' && initialState !== null && !Array.isArray(initialState) &&
          typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ) {
           hydratedState = { ...initialState, ...parsed };
        }
        
        dispatch({ type: HYDRATE_ACTION, payload: hydratedState });
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, [key, initialState]);

  // 2. Persist Updates (Debounced)
  const [debouncedState] = useDebounce(state, 1000);

  useEffect(() => {
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
           dispatch({ type: HYDRATE_ACTION, payload: JSON.parse(e.newValue) });
        } catch (error) {
          console.error(`Error parsing storage change for key "${key}":`, error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [state, dispatch as Dispatch<A>, isHydrated];
}