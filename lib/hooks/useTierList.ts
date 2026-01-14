/**
 * @file useTierList.ts
 * @description The central hook for managing the tier list state. 
 * Orchestrates drag-and-drop, persistence, board structure modifications (add/remove tiers), and import/export functionality.
 * @module useTierList
 */

import { useCallback } from 'react';
import { useTierStructure } from '@/lib/hooks';
import { useTierListDnD } from '@/lib/hooks/useTierListDnD';
import { useTierListContext } from '@/components/TierListContext';
import { useTierListIO } from '@/lib/hooks/useTierListIO';
import { useTierListUtils } from '@/lib/hooks/useTierListUtils';
import { MediaItem } from '../types';

/**
 * Primary hook for managing the state and interactions of the Tier List application.
 * 
 * Refactored to use Context-based architecture.
 * This hook now acts as a facade/composer for specialized hooks.
 */
export function useTierList() {
  const { 
    state, 
    setState, 
    isHydrated, 
    allBoardItems, 
    addedItemIds, 
    detailsItem, 
    setDetailsItem,
    updateMediaItem,
    undo,
    redo,
    canUndo,
    canRedo,
    pushHistory
  } = useTierListContext();

  // 1. Drag & Drop Logic
  const {
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useTierListDnD(state, setState, pushHistory);

  // 2. Structure & Board Actions Logic
  const {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear
  } = useTierStructure(setState, pushHistory);

  // 3. IO Logic
  const { handleExport, handleImport } = useTierListIO(state, setState, pushHistory);

  // 4. Utils (Colors, Locate)
  const { headerColors, handleLocate } = useTierListUtils(state, activeTier?.id || null, overId);

  // --- Details Modal Handlers ---
  const handleShowDetails = useCallback((item: MediaItem) => {
    setDetailsItem(item);
  }, [setDetailsItem]);

  const handleCloseDetails = useCallback(() => {
    setDetailsItem(null);
  }, [setDetailsItem]);

  // --- Misc ---
  const removeItemFromTier = useCallback((tierId: string, itemId: string) => {
    pushHistory();
    setState(prev => ({
        ...prev,
        items: {
            ...prev.items,
            [tierId]: prev.items[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
        }
    }));
  }, [setState, pushHistory]);

  const handleUpdateTitle = useCallback((newTitle: string) => {
    // Only push history if title actually changed (maybe handled by blur/debounce in UI)
    // For now, assuming title updates are significant and infrequent enough (on blur)
    pushHistory();
    setState(prev => ({
      ...prev,
      title: newTitle,
    }));
  }, [setState, pushHistory]);

  return {
    state,
    allBoardItems,
    sensors,
    activeItem,
    activeTier,
    headerColors,
    addedItemIds,
    detailsItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    handleImport,
    handleExport,
    removeItemFromTier,
    updateMediaItem,
    handleLocate,
    handleShowDetails,
    handleCloseDetails,
    isHydrated,
    handleUpdateTitle,
    title: state.title,
    undo,
    redo,
    canUndo,
    canRedo
  };
}