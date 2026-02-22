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
 * Options for the usePersistentState hook.
 */
export interface PersistentStateOptions {
  persistenceDelay?: number;
}

/**
 * A custom hook that mimics useState but persists the value to IndexedDB.
 * @template T - The type of the state value.
 * @param key - The storage key to use.
 * @param initialValue - The initial value before hydration.
 * @param options - Optional configuration for persistence.
 * @returns A tuple of [state, setState, isHydrated].
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: PersistentStateOptions,
) {
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
