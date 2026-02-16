/**
 * @file usePersistentReducer.ts
 * @description A custom React hook that extends useReducer with automatic asynchronous persistence (IndexedDB).
 * Features:
 * - Async hydration from storage.
 * - Debounced writes to minimize storage overhead.
 * @module usePersistentReducer
 */

'use client';

import { Dispatch, Reducer, useCallback, useMemo, useReducer } from 'react';

import { useStorageSync } from './useStorageSync';


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
export interface PersistentReducerOptions<S> {
  persistenceDelay?: number;
  onSave?: (state: S) => void;
}

export function usePersistentReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  key: string,
  options?: PersistentReducerOptions<S>,
): [S, Dispatch<A>, boolean] {
  const { persistenceDelay = 500, onSave } = options || {};

  /**
   * Wrapper reducer that intercepts hydration actions.
   */
  const persistentReducer = useMemo(
    () =>
      (state: S, action: A | HydrateAction<S>): S => {
        if ((action as HydrateAction<S>).type === HYDRATE_ACTION) {
          return (action as HydrateAction<S>).payload;
        }
        return reducer(state, action as A);
      },
    [reducer],
  );

  const [state, dispatch] = useReducer(persistentReducer, initialState);

  const onHydrate = useCallback(
    (payload: S) => {
      dispatch({ type: HYDRATE_ACTION, payload });
    },
    [dispatch],
  );

  const isHydrated = useStorageSync({
    key,
    state,
    initialState,
    onHydrate,
    onSave,
    persistenceDelay,
  });

  return [state, dispatch as Dispatch<A>, isHydrated];
}
