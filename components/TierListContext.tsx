/**
 * @file TierListContext.tsx
 * @description Provides the React Context for managing the global state of the Tier List.
 * Includes state persistence, hydration status, and registry synchronization.
 * This context is the "source of truth" for the active board data.
 * @module TierListContext
 */

'use client';

import React, { createContext, useContext, useMemo, useRef, useEffect, useState, ReactNode } from 'react';
import { MediaItem, TierListState } from '@/lib/types';
import { usePersistentReducer } from '@/lib/hooks/usePersistentReducer';
import { tierListReducer } from '@/lib/state/reducer';
import { TierListAction, ActionType } from '@/lib/state/actions';
import { useHistory } from '@/lib/hooks/useHistory';
import { useMediaRegistry } from '@/components/MediaRegistryProvider';
import { INITIAL_STATE } from '@/lib/initial-state';

const LOCAL_STORAGE_KEY = 'moat-tierlist';

/**
 * Interface defining the shape of the Tier List Context.
 * Provides access to the board state, computed values, and helper methods.
 */
interface TierListContextType {
  /** The core state of the tier list (tiers, items, title). */
  state: TierListState;
  /** Dispatcher to update the core state. */
  dispatch: React.Dispatch<TierListAction>;
  /** Flag indicating if the state has been hydrated from localStorage. */
  isHydrated: boolean;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: () => void;

  
  // Computed
  /** Flattened list of all items currently on the board. */
  allBoardItems: MediaItem[];
  /** Set of unique IDs for items on the board (excluding drag-specific prefixes). */
  addedItemIds: Set<string>;

  // UI State
  /** The item currently displayed in the details modal, or null if closed. */
  detailsItem: MediaItem | null;
  /** Sets the item to display in the details modal. */
  setDetailsItem: React.Dispatch<React.SetStateAction<MediaItem | null>>;
  
  // Helpers
  /** Updates a specific media item on the board and syncs with the registry. */
  updateMediaItem: (itemId: string, updates: Partial<MediaItem>) => void;
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

  const undo = React.useCallback(() => {
    // We pass a setter that dispatches SET_STATE
    undoHistory(state, (newState) => dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }));
  }, [undoHistory, state, dispatch]);

  const redo = React.useCallback(() => {
    redoHistory(state, (newState) => dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }));
  }, [redoHistory, state, dispatch]);

  const handlePushHistory = React.useCallback(() => {
    pushHistory(state);
  }, [pushHistory, state]);

  // Computed values
  const allBoardItems = useMemo(() => {
    return Object.values(state.items).flat();
  }, [state.items]);

  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    allBoardItems.forEach(item => {
        const cleanId = item.id.replace(/^search-/, '');
        ids.add(cleanId);
    });
    return ids;
  }, [allBoardItems]);

  // Sync items to registry after state updates
  useEffect(() => {
    if (itemsToRegister.current.length > 0) {
      itemsToRegister.current.forEach(item => registerItem(item));
      itemsToRegister.current = [];
    }
  });

  const updateMediaItem = React.useCallback((itemId: string, updates: Partial<MediaItem>) => {
      // With Reducer, we dispatch the update directly. 
      // The optimization logic (diff checking) is moved to the reducer or kept here?
      // Keeping basic check here avoids dispatching unnecessary actions.
      
      // We can't easily check 'state' here without adding it to dependency array, 
      // which might re-render children too often if we are not careful.
      // But we have 'state' in scope.
      
      // Let's just dispatch. The reducer has the logic to check/merge.
      dispatch({ 
        type: ActionType.UPDATE_ITEM, 
        payload: { itemId, updates } 
      });
      
      // Registry update queueing is tricky now because we don't return the "modified" flag from dispatch.
      // We'll trust the effect. But we need to know *what* to register.
      // We can optimistically construct the item? Or we just rely on the effect scanning?
      // The current effect relies on `itemsToRegister` ref being populated.
      // We should populate it here optimistically.
      // Since we don't have the full item here easily, let's defer registry update 
      // or find the item from current state.
      
      // Find item in current state to register it
      const currentItem = Object.values(state.items).flat().find(i => i.id === itemId);
      if (currentItem) {
          itemsToRegister.current.push({ ...currentItem, ...updates } as MediaItem);
      }
  }, [dispatch, state.items]);

  const value = useMemo(() => ({
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
    pushHistory: handlePushHistory
  }), [
    state, 
    dispatch, 
    isHydrated, 
    allBoardItems, 
    addedItemIds, 
    detailsItem, 
    updateMediaItem,
    undo,
    redo,
    canUndo,
    canRedo,
    handlePushHistory
  ]);

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
