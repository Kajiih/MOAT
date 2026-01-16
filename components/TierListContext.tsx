/**
 * @file TierListContext.tsx
 * @description Provides the React Context for managing the global state of the Tier List.
 * Includes state persistence, hydration status, and registry synchronization.
 * This context is the "source of truth" for the active board data.
 * @module TierListContext
 */

'use client';

import React, { createContext, useContext, useMemo, useRef, useEffect, useState, ReactNode } from 'react';
import { MediaItem, TierListState, TierDefinition } from '@/lib/types';
import { usePersistentReducer } from '@/lib/hooks/usePersistentReducer';
import { tierListReducer } from '@/lib/state/reducer';
import { TierListAction, ActionType } from '@/lib/state/actions';
import { useHistory } from '@/lib/hooks/useHistory';
import { useMediaRegistry } from '@/components/MediaRegistryProvider';
import { INITIAL_STATE } from '@/lib/initial-state';
import { 
  useTierListDnD, 
  useTierStructure, 
  useTierListIO, 
  useTierListUtils 
} from '@/lib/hooks';
import { 
  SensorDescriptor, 
  SensorOptions,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';

const LOCAL_STORAGE_KEY = 'moat-tierlist';

/**
 * Interface defining the shape of the Tier List Context.
 * Provides access to the board state, computed values, and helper methods.
 */
interface TierListContextType {
  state: TierListState;
  isHydrated: boolean;
  
  // Grouped Namespaces
  actions: {
    addTier: () => void;
    updateTier: (id: string, updates: Partial<TierDefinition>) => void;
    deleteTier: (id: string) => void;
    randomizeColors: () => void;
    clear: () => void;
    updateTitle: (title: string) => void;
    updateMediaItem: (itemId: string, updates: Partial<MediaItem>) => void;
    removeItemFromTier: (tierId: string, itemId: string) => void;
    locate: (id: string) => void;
    import: (e: React.ChangeEvent<HTMLInputElement>) => void;
    export: () => void;
  };

  dnd: {
    sensors: SensorDescriptor<SensorOptions>[];
    activeItem: MediaItem | null;
    activeTier: TierDefinition | null;
    overId: string | null;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
  };

  ui: {
    headerColors: string[];
    detailsItem: MediaItem | null;
    showDetails: (item: MediaItem) => void;
    closeDetails: () => void;
    addedItemIds: Set<string>;
    allBoardItems: MediaItem[];
  };

  history: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    push: () => void;
  };
}

const TierListContext = createContext<TierListContextType | null>(null);

/**
 * Provider component for the Tier List Context.
 * Manages the top-level state and persistence for the application.
 * 
 * @param props.children - Child components that will have access to the context.
 */
export function TierListProvider({ children }: { children: ReactNode }) {
  const [state, dispatch, isHydrated] = usePersistentReducer<TierListState, TierListAction>(
    tierListReducer,
    INITIAL_STATE,
    LOCAL_STORAGE_KEY
  );
  
  const { undo: undoHistory, redo: redoHistory, push: pushHistory, canUndo, canRedo } = useHistory<TierListState>();
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  const { registerItem } = useMediaRegistry();
  const itemsToRegister = useRef<MediaItem[]>([]);

  // --- History Helpers ---
  const undo = React.useCallback(() => {
    undoHistory(state, (newState) => dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }));
  }, [undoHistory, state, dispatch]);

  const redo = React.useCallback(() => {
    redoHistory(state, (newState) => dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }));
  }, [redoHistory, state, dispatch]);

  const handlePushHistory = React.useCallback(() => {
    pushHistory(state);
  }, [pushHistory, state]);

  // --- Sub-Hooks Integration ---
  
  // 1. Drag & Drop Logic
  const {
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useTierListDnD(state, dispatch, handlePushHistory);

  // 2. Structure Logic
  const {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear
  } = useTierStructure(dispatch, handlePushHistory);

  // 3. IO Logic
  const { handleExport, handleImport } = useTierListIO(state, dispatch, handlePushHistory);

  // 4. Utils
  const { headerColors, handleLocate } = useTierListUtils(state, activeTier?.id || null, overId);

  // --- Misc Helpers ---
  const handleUpdateTitle = React.useCallback((newTitle: string) => {
    dispatch({ type: ActionType.UPDATE_TITLE, payload: { title: newTitle } });
  }, [dispatch]);

  const removeItemFromTier = React.useCallback((tierId: string, itemId: string) => {
    pushHistory(state);
    dispatch({ type: ActionType.REMOVE_ITEM, payload: { tierId, itemId } });
  }, [dispatch, pushHistory, state]);

  const handleShowDetails = React.useCallback((item: MediaItem) => setDetailsItem(item), []);
  const handleCloseDetails = React.useCallback(() => setDetailsItem(null), []);

  const updateMediaItem = React.useCallback((itemId: string, updates: Partial<MediaItem>) => {
      dispatch({ type: ActionType.UPDATE_ITEM, payload: { itemId, updates } });
      const currentItem = Object.values(state.items).flat().find(i => i.id === itemId);
      if (currentItem) {
          itemsToRegister.current.push({ ...currentItem, ...updates } as MediaItem);
      }
  }, [dispatch, state.items]);

  // Computed values
  const allBoardItems = useMemo(() => Object.values(state.items).flat(), [state.items]);
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    allBoardItems.forEach(item => {
        // Handle undefined or malformed IDs safely, though they should strict strings
        if (item && item.id) {
           ids.add(item.id.replace(/^search-/, ''));
        }
    });
    return ids;
  }, [allBoardItems]);

  useEffect(() => {
    if (itemsToRegister.current.length > 0) {
      itemsToRegister.current.forEach(item => registerItem(item));
      itemsToRegister.current = [];
    }
  });

  // --- Context Value Grouping & Memoization ---

  const actions = useMemo(() => ({
    addTier: handleAddTier,
    updateTier: handleUpdateTier,
    deleteTier: handleDeleteTier,
    randomizeColors: handleRandomizeColors,
    clear: handleClear,
    updateTitle: handleUpdateTitle,
    updateMediaItem: updateMediaItem,
    removeItemFromTier: removeItemFromTier,
    locate: handleLocate,
    import: handleImport,
    export: handleExport,
  }), [
    handleAddTier, handleUpdateTier, handleDeleteTier, handleRandomizeColors, handleClear,
    handleUpdateTitle, updateMediaItem, removeItemFromTier, handleLocate, handleImport, handleExport
  ]);

  const dnd = useMemo(() => ({
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }), [sensors, activeItem, activeTier, overId, handleDragStart, handleDragOver, handleDragEnd]);

  const ui = useMemo(() => ({
    headerColors,
    detailsItem,
    showDetails: handleShowDetails,
    closeDetails: handleCloseDetails,
    addedItemIds,
    allBoardItems,
  }), [headerColors, detailsItem, handleShowDetails, handleCloseDetails, addedItemIds, allBoardItems]);

  const history = useMemo(() => ({
    undo,
    redo,
    canUndo,
    canRedo,
    push: handlePushHistory,
  }), [undo, redo, canUndo, canRedo, handlePushHistory]);

  const value = useMemo(() => ({
    state,
    isHydrated,
    actions,
    dnd,
    ui,
    history
  }), [state, isHydrated, actions, dnd, ui, history]);

  return (
    <TierListContext.Provider value={value}>
      {children}
    </TierListContext.Provider>
  );
}

/**
 * Custom hook to consume the Tier List Context.
 * Must be used within a TierListProvider.
 * 
 * @returns The TierListContextType object.
 * @throws Error if used outside of a TierListProvider.
 */
export function useTierListContext() {
  const context = useContext(TierListContext);
  if (!context) {
    throw new Error('useTierListContext must be used within a TierListProvider');
  }
  return context;
}
