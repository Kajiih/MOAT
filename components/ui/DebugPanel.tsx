/**
 * @file DebugPanel.tsx
 * @description A hidden debug panel using Leva to monitor application state and registry size.
 */

import { button, folder, monitor, useControls } from 'leva';
import { useEffect } from 'react';

import { useItemRegistry } from '@/lib/database/hooks/useItemRegistry';
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
  const { state, isHydrated } = useTierListContext();
  const registryContext = useItemRegistry();

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

  // History Controls
  const { history } = useTierListContext();
  useControls(
    'Debug',
    () => ({
      History: folder(
        {
          'Can Undo': { value: history.canUndo, disabled: true },
          'Can Redo': { value: history.canRedo, disabled: true },
          Undo: button(() => history.undo(), { disabled: !history.canUndo }),
          Redo: button(() => history.redo(), { disabled: !history.canRedo }),
        },
        { collapsed: true },
      ),
    }),
    [history],
  );

  // Hide the panel by default, or style it?
  // Leva handles its own UI, so we just return null.
  return null;
}
