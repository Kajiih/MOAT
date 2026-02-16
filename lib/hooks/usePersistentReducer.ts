/**
 * @file usePersistentReducer.ts
 * @description A custom React hook that extends useReducer with automatic asynchronous persistence (IndexedDB).
 * Features:
 * - Async hydration from storage.
 * - Debounced writes to minimize storage overhead.
 * @module usePersistentReducer
 */

'use client';

import { Dispatch, Reducer, useEffect, useReducer, useRef, useState } from 'react';


import { useDebouncedCallback } from 'use-debounce';

import { logger } from '@/lib/logger';
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
 * @template S - The shape of the state.
 * @template A - The union type of possible actions.
 * @param reducer - The pure reducer function.
 * @param initialState - The default state to use before hydration.
 * @param key - The storage key to use for persistence.
 * @returns A tuple of [state, dispatch, isHydrated].
 */
export interface PersistentReducerOptions {
  persistenceDelay?: number;
}

export function usePersistentReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  key: string,
  options?: PersistentReducerOptions,
): [S, Dispatch<A>, boolean] {
  const { persistenceDelay = 500 } = options || {};
  /**
   * Wrapper reducer that intercepts hydration actions.
   * @param state - The current state.
   * @param action - The dispatched action.
   * @returns The new state.
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
        logger.error({ error, key }, 'Error reading storage key');
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
  const debouncedSave = useDebouncedCallback((value: S) => {
    storage.set(key, value);
  }, persistenceDelay);

  useEffect(() => {
    if (!isHydrated) return;
    debouncedSave(state);
  }, [state, isHydrated, debouncedSave]);

  // 3. Flush on unmount
  // We use a ref to always have the latest state for unmount flushing.
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

  return [state, dispatch as Dispatch<A>, isHydrated];
}
