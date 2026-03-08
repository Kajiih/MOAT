import { useSyncExternalStore } from 'react';

import { RegistryStatus, registry } from '../registry';
import { Provider } from '../types';

/**
 * A reactive snapshot of the database registry state.
 */
export interface RegistrySnapshot {
  /** The overall status of the registry (e.g., INITIALIZING, READY) */
  status: RegistryStatus;
  /** All currently registered providers */
  providers: Provider[];
  /** Only providers that have successfully completed initialization */
  availableProviders: Provider[];
}

/**
 * Custom React hook that connects components reactively to the DatabaseRegistry singleton.
 * Uses `useSyncExternalStore` to perfectly synchronize React renders with external mutations.
 * 
 * @returns A stable `RegistrySnapshot` object that updates immediately when providers load or fail.
 */
export function useRegistry(): RegistrySnapshot {
  return useSyncExternalStore(
    // 1. Subscribe: React calls this to listen to the store
    (onChange) => registry.subscribe(onChange),
    
    // 2. Snapshot: React calls this to get the current state and detect changes
    () => {
      const providers = registry.getAllProviders();
      return {
        status: registry.getStatus(),
        providers,
        availableProviders: providers.filter(p => p.status === 'READY'),
      };
    },
    
    // 3. SSR Fallback (optional, but good practice for Next.js)
    () => ({
      status: RegistryStatus.IDLE,
      providers: [],
      availableProviders: [],
    })
  );
}
