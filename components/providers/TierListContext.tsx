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

import { useTierListDnD } from '@/components/board/hooks/useTierListDnD';
import { useTierListIO, useTierListUtils, useTierStructure } from '@/lib/hooks';
import { useHistory } from '@/lib/hooks/useHistory';
import { usePersistentReducer } from '@/lib/hooks/usePersistentReducer';
import { useTierListNamespaces } from '@/lib/hooks/useTierListNamespaces';
import { INITIAL_STATE } from '@/lib/initial-state';
import { syncBoardMetadata } from '@/lib/registry-utils';
import { ActionType, TierListAction } from '@/lib/state/actions';
import { tierListReducer } from '@/lib/state/reducer';
import { BoardCategory, MediaItem, TierDefinition, TierListState } from '@/lib/types';
import { StandardItem } from '@/lib/database/types';

import { useMediaRegistry } from './MediaRegistryProvider';
import { useStandardRegistry } from '@/lib/database/hooks/useStandardRegistry';

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
    resetItems: () => void;
    updateTitle: (title: string) => void;
    updateMediaItem: (itemId: string, updates: Partial<MediaItem | StandardItem>) => void;
    removeItemFromTier: (tierId: string, itemId: string) => void;
    locate: (id: string) => void;
    import: (e: React.ChangeEvent<HTMLInputElement>) => void;
    export: () => void;
    publish: () => Promise<string | null>;
    updateCategory: (category: BoardCategory) => void;
  };
  dnd: {
    sensors: SensorDescriptor<SensorOptions>[];
    activeItem: MediaItem | StandardItem | null;
    activeTier: TierDefinition | null;
    overId: string | null;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    handleDragCancel: () => void;
  };
  ui: {
    headerColors: string[];
    detailsItem: MediaItem | StandardItem | null;
    showDetails: (item: MediaItem | StandardItem) => void;
    closeDetails: () => void;
    showShortcuts: boolean;
    setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
    addedItemIds: Set<string>;
    allBoardItems: (MediaItem | StandardItem)[];
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
    {
      onSave: (s) => syncBoardMetadata(boardId, s),
    },
  );

  const historyRaw = useHistory<TierListState>();
  const [detailsItem, setDetailsItem] = useState<MediaItem | StandardItem | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const { registerItem: registerV1Item, registerItems: registerV1Items } = useMediaRegistry();
  const { registerItem: registerV2Item, registerItems: registerV2Items } = useStandardRegistry();
  
  const hasSyncedItems = React.useRef(false);

  // --- Hydration Sync ---
  // When the board hydrates from IndexedDB, push all items to their respective registries.
  React.useEffect(() => {
    if (isHydrated && !hasSyncedItems.current) {
      const allItems = Object.values(state.items).flat();
      if (allItems.length > 0) {
        const v1Items: MediaItem[] = [];
        const v2Items: StandardItem[] = [];

        allItems.forEach(item => {
          if ('identity' in item) {
            v2Items.push(item);
          } else {
            v1Items.push(item);
          }
        });

        if (v1Items.length > 0) registerV1Items(v1Items);
        if (v2Items.length > 0) registerV2Items(v2Items);
        
        hasSyncedItems.current = true;
      }
    }
  }, [isHydrated, state.items, registerV1Items, registerV2Items]);

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
    dndRaw: dndRaw as any, // Temporary cast while polishing sub-hooks
    structureRaw,
    ioRaw,
    utilsRaw,
    uiState: { detailsItem, setDetailsItem, showShortcuts, setShowShortcuts },
  });

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      actions: {
        ...actions,
        publish: ioRaw.handlePublish,
        updateMediaItem: (itemId: string, updates: Partial<MediaItem | StandardItem>) => {
          // 1. Find the item to determine its type
          const item = Object.values(state.items).flat().find(i => i.id === itemId);
          if (!item) return;

          // 2. Dispatch to state
          actions.updateMediaItem(itemId, updates);

          // 3. Register with correct registry
          if ('identity' in item) {
            registerV2Item({ ...item, ...updates } as StandardItem);
          } else {
            registerV1Item({ ...item, ...updates } as MediaItem);
          }
        },
      },
      dnd: dnd as any,
      ui,
      history,
    }),
    [state, isHydrated, actions, dnd, ui, history, registerV1Item, registerV2Item, ioRaw.handlePublish],
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
