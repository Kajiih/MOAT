/**
 * @file usePersistentReducer.ts
 * @description A custom React hook that extends useReducer with automatic asynchronous persistence (IndexedDB).
 * Features:
 * - Async hydration from storage.
 * - Debounced writes to minimize storage overhead.
 * @module usePersistentReducer
 */

'use client';

import { useState, useEffect, useReducer, Dispatch, Reducer } from 'react';
import { useDebounce } from 'use-debounce';
import { storage } from '@/lib/storage';

/** Internal action type used for state hydration. */
const HYDRATE_ACTION = '@@PERSIST/HYDRATE';

/** Interface for the internal hydration action. */
interface HydrateAction<S> {
  type: typeof HYDRATE_ACTION;
  payload: S;
}

/**
 * A custom hook that combines useReducer with async persistence.
 *
 * @template S - The shape of the state.
 * @template A - The union type of possible actions.
 * @param reducer - The pure reducer function.
 * @param initialState - The default state to use before hydration.
 * @param key - The storage key to use for persistence.
 * @returns A tuple of [state, dispatch, isHydrated].
 */
export function usePersistentReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  key: string,
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

  // 1. Hydrate from storage (Async)
  // Effect runs once on mount to load the persisted state from db.
  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      try {
        const item = await storage.get<S>(key);
        if (item && isMounted) {
          // Robustness: Merge with initialValue if both are objects.
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

          dispatch({ type: HYDRATE_ACTION, payload: hydratedState });
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
  }, [key, initialState]);

  // 2. Persist Updates (Debounced)
  const [debouncedState] = useDebounce(state, 1000);

  useEffect(() => {
    if (!isHydrated) return;
    storage.set(key, debouncedState);
  }, [key, debouncedState, isHydrated]);

  return [state, dispatch as Dispatch<A>, isHydrated];
}
