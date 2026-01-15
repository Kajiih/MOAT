/**
 * @file useTierListUtils.ts
 * @description Provides utility hooks for derived state and UI interactions specific to the Tier Board.
 * Handles dynamic header coloring based on drag state and item locating/highlighting.
 * @module useTierListUtils
 */

import { useMemo, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { TierListState } from '@/lib/types';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Hook providing utility functions and derived state for the Tier List.
 * Handles tasks like calculating dynamic header colors and locating items on the board.
 * 
 * @param state - The current state of the tier list.
 * @param activeTierId - The ID of the tier currently being dragged (if any).
 * @param overId - The ID of the drop target currently hovered over (if any).
 * @returns An object containing derived colors and helper functions.
 */
export function useTierListUtils(
  state: TierListState,
  activeTierId: string | null,
  overId: string | null
) {
  const { showToast } = useToast();

  /**
   * Calculates the colors for the header based on the current tier order.
   * Dynamically adjusts during drag-and-drop operations to show a preview of the new order.
   */
  const headerColors = useMemo(() => {
    if (!activeTierId || !overId) {
        return state.tierDefs.slice(0, 4).map(t => t.color);
    }

    const oldIndex = state.tierDefs.findIndex(t => t.id === activeTierId);
    const newIndex = state.tierDefs.findIndex(t => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
        const projectedDefs = arrayMove(state.tierDefs, oldIndex, newIndex);
        return projectedDefs.slice(0, 4).map(t => t.color);
    }
    
    return state.tierDefs.slice(0, 4).map(t => t.color);
  }, [state.tierDefs, activeTierId, overId]);

  /**
   * Locates a media item on the board, scrolls it into view, and highlights it.
   * 
   * @param id - The ID of the item to locate.
   */
  const handleLocate = useCallback((id: string) => {
    const el = document.getElementById(`media-card-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = '0 0 20px 5px rgba(255, 255, 255, 0.5)';
        setTimeout(() => {
            el.style.boxShadow = '';
        }, 1500);
    } else {
        showToast("Could not locate item on board.", "error");
    }
  }, [showToast]);

  return {
    headerColors,
    handleLocate
  };
}