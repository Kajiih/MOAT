/**
 * @file useTierStructure.ts
 * @description Hook responsible for the structural manipulation of the tier board.
 * Contains logic for Adding, Deleting, Updating, and Clearing tiers.
 * Also handles the "Randomize Colors" feature.
 * @module useTierStructure
 */

import { useCallback } from 'react';

import { addTier, BoardDispatch, clearBoard, deleteTier, moveAllToUnranked, randomizeColors, updateTier } from '@/board/state/reducer';
import { TierUpdate } from '@/board/types';
import { useToast } from '@/lib/ui/ToastProvider';

/**
 * Hook to manage the structure of the tier list board (rows/tiers) and global board actions.
 * @param dispatch - The dispatcher function from the TierList context.
 * @param pushHistory - Callback to capture a history snapshot before mutation.
 * @returns Object containing event handlers for structural changes.
 */
export function useTierStructure(dispatch: BoardDispatch, pushHistory: () => void) {
  const { showToast } = useToast();

  const handleAddTier = useCallback(() => {
    pushHistory();
    dispatch(addTier());
  }, [dispatch, pushHistory]);

  const handleRandomizeColors = useCallback(() => {
    pushHistory();
    dispatch(randomizeColors());
    showToast('Colors randomized!', 'success');
  }, [dispatch, showToast, pushHistory]);

  const handleUpdateTier = useCallback(
    (id: string, updates: TierUpdate) => {
      // Only push history for significant updates (e.g. not every keystroke if this is debounced elsewhere)
      pushHistory();
      dispatch(updateTier({ id, updates }));
    },
    [dispatch, pushHistory],
  );

  const handleDeleteTier = useCallback(
    (id: string) => {
      pushHistory();
      dispatch(deleteTier({ id }));
    },
    [dispatch, pushHistory],
  );

  const handleClear = useCallback(() => {
    pushHistory();
    dispatch(clearBoard());
  }, [dispatch, pushHistory]);

  const handleResetItems = useCallback(() => {
    pushHistory();
    dispatch(moveAllToUnranked());
  }, [dispatch, pushHistory]);

  return {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    handleResetItems,
  };
}
