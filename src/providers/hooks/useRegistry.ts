/**
 * @file Registry React Hook
 * @description useSyncExternalStore implementation bridging the static Provider pipeline to React.
 */

import { useSyncExternalStore } from 'react';

import { registry, RegistrySnapshot, RegistryStatus } from '../registry';

/**
 * Custom React hook that connects components reactively to the DatabaseRegistry singleton.
 * Uses `useSyncExternalStore` to perfectly synchronize React renders with external mutations.
 * @returns A stable `RegistrySnapshot` object that updates immediately when providers load or fail.
 */
export function useRegistry(): RegistrySnapshot {
  return useSyncExternalStore(
    // 1. Subscribe: React calls this to listen to the store
    (onChange) => registry.subscribe(onChange),

    // 2. Snapshot: React calls this to get the current state and detect changes
    // Referentially stable (memoized) to prevent continuous re-renders
    () => registry.getSnapshot(),

    // 3. SSR Fallback (optional, but good practice for Next.js)
    () => ({
      status: RegistryStatus.IDLE,
      providers: [],
      availableProviders: [],
    }),
  );
}
