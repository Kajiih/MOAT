/**
 * @file usePersistentState.ts
 * @description A custom React hook that mimics useState but persists the value to IndexedDB.
 * Features debounced writing to avoid performance issues during rapid updates.
 * @module usePersistentState
 */

'use client';

import { useState } from 'react';

import { useStorageSync } from './useStorageSync';


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
  const [state, setState] = useState<T>(initialValue);

  const isHydrated = useStorageSync({
    key,
    state,
    initialState: initialValue,
    onHydrate: setState,
    persistenceDelay,
  });

  return [state, setState, isHydrated] as const;
}
