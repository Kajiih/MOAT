/**
 * @file DebugPanel.tsx
 * @description A hidden debug panel using Leva to monitor application state and registry size.
 */

import { button, folder, monitor, useControls } from 'leva';
import { useEffect } from 'react';

import { useMediaRegistry } from '@/components/providers/MediaRegistryProvider';
import { useTierListContext } from '@/components/providers/TierListContext';

interface DebugPanelProps {
  pendingEnrichmentCount: number;
}

/**
 * Debug panel component that integrates with Leva to provide a UI for monitoring board state.
 * @param props - Component props.
 * @param props.pendingEnrichmentCount - Number of items currently queued for enrichment.
 * @returns null (Leva renders its own UI).
 */
export function DebugPanel({ pendingEnrichmentCount }: DebugPanelProps) {
  const {
    state,
    isHydrated,
  } = useTierListContext();
  const { registrySize, clearRegistry } = useMediaRegistry();

  // General Board State
  const [, setBoardState] = useControls(
    'Debug',
    () => ({
      'Board State': folder(
        {
          Hydrated: { value: isHydrated, disabled: true },
          'Total Tiers': { value: state.tierDefs.length, disabled: true },
          'Total Items': {
            value: Object.values(state.items).flat().length,
            disabled: true,
          },
        },
        { collapsed: true },
      ),
    }),
    [],
  );

  useEffect(() => {
    setBoardState({
      Hydrated: isHydrated,
      'Total Tiers': state.tierDefs.length,
      'Total Items': Object.values(state.items).flat().length,
    });
  }, [setBoardState, state, isHydrated]);

  // Registry Stats
  const [, setRegistryStats] = useControls(
    'Debug',
    () => ({
      'Media Registry': folder(
        {
          'Registry Size': { value: registrySize, disabled: true },
          'Clear Registry': button(() => {
            if (confirm('Are you sure? This will clear all cached images.')) {
              clearRegistry();
            }
          }),
          monitorSize: monitor(() => registrySize, { graph: true, interval: 30 }),
        },
        { collapsed: true },
      ),
    }),
    [],
  );

  useEffect(() => {
    setRegistryStats({
      'Registry Size': registrySize,
    });
  }, [setRegistryStats, registrySize]);

  // Background Workers / Prefetch
  const [, setBackgroundStats] = useControls(
    'Debug',
    () => ({
      'Background Enrichment': folder(
        {
          'Items Pending': { value: pendingEnrichmentCount, disabled: true },
          monitorPending: monitor(() => pendingEnrichmentCount, { graph: true, interval: 30 }),
        },
        { collapsed: true },
      ),
    }),
    [],
  );

  useEffect(() => {
    setBackgroundStats({
      'Items Pending': pendingEnrichmentCount,
    });
  }, [setBackgroundStats, pendingEnrichmentCount]);



  // Hide the panel by default, or style it?
  // Leva handles its own UI, so we just return null.
  return null;
}
