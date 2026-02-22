/**
 * @file useTierStructure.ts
 * @description Hook responsible for the structural manipulation of the tier board.
 * Contains logic for Adding, Deleting, Updating, and Clearing tiers.
 * Also handles the "Randomize Colors" feature.
 * @module useTierStructure
 */

import { Dispatch, useCallback } from 'react';

import { useToast } from '@/components/ui/ToastProvider';
import { ActionType, TierListAction } from '@/lib/state/actions';
import { TierDefinition } from '@/lib/types';

/**
 * Hook to manage the structure of the tier list board (rows/tiers) and global board actions.
 * @param dispatch - The dispatcher function from the TierList context.
 * @param pushHistory - Callback to capture a history snapshot before mutation.
 * @returns Object containing event handlers for structural changes.
 */
export function useTierStructure(dispatch: Dispatch<TierListAction>, pushHistory: () => void) {
  const { showToast } = useToast();

  const handleAddTier = useCallback(() => {
    pushHistory();
    dispatch({ type: ActionType.ADD_TIER });
  }, [dispatch, pushHistory]);

  const handleRandomizeColors = useCallback(() => {
    pushHistory();
    dispatch({ type: ActionType.RANDOMIZE_COLORS });
    showToast('Colors randomized!', 'success');
  }, [dispatch, showToast, pushHistory]);

  const handleUpdateTier = useCallback(
    (id: string, updates: Partial<TierDefinition>) => {
      // Only push history for significant updates (e.g. not every keystroke if this is debounced elsewhere)
      pushHistory();
      dispatch({
        type: ActionType.UPDATE_TIER,
        payload: { id, updates },
      });
    },
    [dispatch, pushHistory],
  );

  const handleDeleteTier = useCallback(
    (id: string) => {
      pushHistory();
      dispatch({
        type: ActionType.DELETE_TIER,
        payload: { id },
      });
    },
    [dispatch, pushHistory],
  );

  const handleClear = useCallback(() => {
    if (confirm('Clear everything on the board?')) {
      pushHistory();
      dispatch({ type: ActionType.CLEAR_BOARD });
      showToast('Board cleared', 'info');
    }
  }, [dispatch, showToast, pushHistory]);

  const handleResetItems = useCallback(() => {
    if (confirm('Move all ranked items back to unranked?')) {
      pushHistory();
      dispatch({ type: ActionType.MOVE_ALL_TO_UNRANKED });
      showToast('All items moved to unranked', 'info');
    }
  }, [dispatch, showToast, pushHistory]);

  return {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    handleResetItems,
  };
}
