/**
 * @file TierListContext.tsx
 * @description Provides the React Context for managing the global state of the Tier List.
 * Includes state persistence, hydration status, and registry synchronization.
 * This context is the "source of truth" for the active board data.
 * @module TierListContext
 */

'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
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
import { useTierListNamespaces } from '@/lib/hooks/useTierListNamespaces';
import { SensorDescriptor, SensorOptions, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';

const LOCAL_STORAGE_KEY = 'moat-tierlist';

/**
 * Interface defining the shape of the Tier List Context.
 * Provides access to the board state, computed values, and helper methods.
 */
interface TierListContextType {
  state: TierListState;
  isHydrated: boolean;
  actions: {
    addTier: () => void;
    updateTier: (id: string, updates: Partial<TierDefinition>) => void;
    deleteTier: (id: string) => void;
    randomizeColors: () => void;
    clear: () => void;
    updateTitle: (title: string) => void;
    updateMediaItem: (itemId: string, updates: Partial<MediaItem>, registerItem: (item: MediaItem) => void) => void;
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
  
  const historyRaw = useHistory<TierListState>();
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  const { registerItem } = useMediaRegistry();

  // --- History Helpers ---
  const undo = React.useCallback(() => {
    historyRaw.undo(state, (newState) => dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }));
  }, [historyRaw, state, dispatch]);

  const redo = React.useCallback(() => {
    historyRaw.redo(state, (newState) => dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }));
  }, [historyRaw, state, dispatch]);

  const push = React.useCallback(() => {
    historyRaw.push(state);
  }, [historyRaw, state]);

  // --- Sub-Hooks Integration ---
  const dndRaw = useTierListDnD(state, dispatch, push);
  const structureRaw = useTierStructure(dispatch, push);
  const ioRaw = useTierListIO(state, dispatch, push);
  const utilsRaw = useTierListUtils(state, dndRaw.activeTier?.id || null, dndRaw.overId);

  const { actions, dnd, ui, history } = useTierListNamespaces({
    state,
    dispatch,
    history: { undo, redo, push, canUndo: historyRaw.canUndo, canRedo: historyRaw.canRedo },
    dndRaw,
    structureRaw,
    ioRaw,
    utilsRaw,
    uiState: { detailsItem, setDetailsItem }
  });

  const value = useMemo(() => ({
    state,
    isHydrated,
    actions: {
        ...actions,
        updateMediaItem: (itemId: string, updates: Partial<MediaItem>) => actions.updateMediaItem(itemId, updates, registerItem)
    },
    dnd,
    ui,
    history
  }), [state, isHydrated, actions, dnd, ui, history, registerItem]);

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
