/**
 * @file TierListContext.tsx
 * @description Provides the React Context for managing the global state of the Tier List.
 * Includes state persistence, hydration status, and registry synchronization.
 * This context is the "source of truth" for the active board data.
 * @module TierListContext
 */

'use client';

import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { useMediaRegistry } from '@/components/MediaRegistryProvider';
import { useTierListDnD, useTierListIO, useTierListUtils, useTierStructure } from '@/lib/hooks';
import { useHistory } from '@/lib/hooks/useHistory';
import { usePersistentReducer } from '@/lib/hooks/usePersistentReducer';
import { useTierListNamespaces } from '@/lib/hooks/useTierListNamespaces';
import { INITIAL_STATE } from '@/lib/initial-state';
import { syncBoardMetadata } from '@/lib/registry-utils';
import { ActionType, TierListAction } from '@/lib/state/actions';
import { tierListReducer } from '@/lib/state/reducer';
import { MediaItem, TierDefinition, TierListState } from '@/lib/types';

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
 * @param props - Component props.
 * @param props.children - Child components that will have access to the context.
 * @param props.boardId - Unique identifier for the current board (for multi-board support).
 * @returns The provider component for the Tier List Context.
 */
export function TierListProvider({ children, boardId }: { children: ReactNode; boardId: string }) {
  const storageKey = `moat-board-${boardId}`;

  const [state, dispatch, isHydrated] = usePersistentReducer<TierListState, TierListAction>(
    tierListReducer,
    INITIAL_STATE,
    storageKey,
  );

  const historyRaw = useHistory<TierListState>();
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  const { registerItem, registerItems } = useMediaRegistry();

  // --- Hydration Sync ---
  // When the board hydrates from IndexedDB, push all items to the Global Media Registry.
  // This ensures they are available for search result enrichment immediately.
  React.useEffect(() => {
    if (isHydrated) {
      const allItems = Object.values(state.items).flat();
      if (allItems.length > 0) {
        registerItems(allItems);
      }
    }
  }, [isHydrated, state.items, registerItems]);

  // --- Metadata Sync ---
  // Keep the Dashboard Registry in sync with the current board state (title, item count).
  // We use a separate debounce to avoid slamming the registry during rapid edits.
  const [debouncedMetadataState] = useDebounce(state, 1000);

  React.useEffect(() => {
    if (isHydrated && boardId) {
      syncBoardMetadata(boardId, debouncedMetadataState);
    }
  }, [debouncedMetadataState, boardId, isHydrated]);

  // --- History Helpers ---
  const undo = React.useCallback(() => {
    historyRaw.undo(state, (newState) =>
      dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }),
    );
  }, [historyRaw, state, dispatch]);

  const redo = React.useCallback(() => {
    historyRaw.redo(state, (newState) =>
      dispatch({ type: ActionType.SET_STATE, payload: { state: newState } }),
    );
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
    uiState: { detailsItem, setDetailsItem },
  });

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      actions: {
        ...actions,
        updateMediaItem: (itemId: string, updates: Partial<MediaItem>) =>
          actions.updateMediaItem(itemId, updates, registerItem),
      },
      dnd,
      ui,
      history,
    }),
    [state, isHydrated, actions, dnd, ui, history, registerItem],
  );

  return <TierListContext.Provider value={value}>{children}</TierListContext.Provider>;
}

/**
 * Custom hook to consume the Tier List Context.
 * Must be used within a TierListProvider.
 * @returns The TierListContextType object.
 * @throws {Error} if used outside of a TierListProvider.
 */
export function useTierListContext() {
  const context = useContext(TierListContext);
  if (!context) {
    throw new Error('useTierListContext must be used within a TierListProvider');
  }
  return context;
}
