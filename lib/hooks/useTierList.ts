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

import { ActionType } from '../state/actions';



/**
 * Primary hook for managing the state and interactions of the Tier List application.
 * 
 * Refactored to use Context-based architecture.
 * This hook now acts as a facade/composer for specialized hooks.
 * 
 * @returns Comprehensive API for interacting with the tier list state and UI.
 */
export function useTierList() {

  const { 

    state, 

    dispatch, 

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

  } = useTierListDnD(state, dispatch, pushHistory);



  // 2. Structure & Board Actions Logic

  const {

    handleAddTier,

    handleUpdateTier,

    handleDeleteTier,

    handleRandomizeColors,

    handleClear

  } = useTierStructure(dispatch, pushHistory);



  // 3. IO Logic

  const { handleExport, handleImport } = useTierListIO(state, dispatch, pushHistory);



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

    dispatch({

        type: ActionType.REMOVE_ITEM,

        payload: { tierId, itemId }

    });

  }, [dispatch, pushHistory]);



  const handleUpdateTitle = useCallback((newTitle: string) => {

    dispatch({

        type: ActionType.UPDATE_TITLE,

        payload: { title: newTitle }

    });

  }, [dispatch]);



  return {
    // State & Data
    state,
    allBoardItems,
    isHydrated,
    title: state.title,
    
    // Drag & Drop
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,

    // Board Actions
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    headerColors,

    // Item Actions
    addedItemIds,
    updateMediaItem,
    removeItemFromTier,
    
    // Details Modal
    detailsItem,
    handleShowDetails,
    handleCloseDetails,
    
    // Search Interaction
    handleLocate,

    // IO
    handleImport,
    handleExport,

    // History
    undo,
    redo,
    canUndo,
    canRedo,
    pushHistory,

    handleUpdateTitle,
  };
}
