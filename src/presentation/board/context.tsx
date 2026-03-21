/**
 * @file TierListContext.tsx
 * @description Provides the React Context for managing the global state of the Tier List.
 * Includes state persistence, hydration status, and registry synchronization.
 * This context is the "source of truth" for the active board data.
 * @module TierListContext
 */

'use client';

import { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/closest-edge';
import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { Item, ItemUpdate } from '@/domain/items/items';
import { useHistory } from '@/presentation/board/hooks/useHistory';
import { useTierListDrag } from '@/presentation/board/hooks/useTierListDrag';
import { useTierListIO } from '@/presentation/board/hooks/useTierListIO';
import { useTierListNamespaces } from '@/presentation/board/hooks/useTierListNamespaces';
import { useTierListUtils } from '@/presentation/board/hooks/useTierListUtils';
import { useTierStructure } from '@/presentation/board/hooks/useTierStructure';
import { INITIAL_STATE } from '@/presentation/board/initial-state';
import { syncBoardMetadata } from '@/presentation/board/registry-utils';
import { BoardAction, setState, tierListReducer } from '@/presentation/board/state/reducer';
import { TierDefinition, TierListState, TierUpdate } from '@/presentation/board/types';
import { useItemRegistry } from '@/providers/useItemRegistry';
import { usePersistentReducer } from '@/storage/usePersistentReducer';

/**
 * Interface defining the shape of the Tier List Context.
 * Provides access to the board state, computed values, and helper methods.
 */
interface TierListContextType {
  state: TierListState;
  isHydrated: boolean;
  actions: {
    addTier: () => void;
    updateTier: (id: string, updates: TierUpdate) => void;
    deleteTier: (id: string) => void;
    randomizeColors: () => void;
    clear: () => void;
    resetItems: () => void;
    updateTitle: (title: string) => void;
    updateItem: (itemId: string, updates: ItemUpdate) => void;
    removeItemFromTier: (tierId: string, itemId: string) => void;
    locate: (id: string) => void;
    import: (e: React.ChangeEvent<HTMLInputElement>) => void;
    export: () => void;
    publish: () => Promise<string | null>;
    moveItem: (payload: {
      activeId: string;
      overId: string;
      activeItem?: Item;
      edge?: Edge | null;
    }) => void;
  };
  dragState: {
    activeItem: Item | null;
    activeTier: TierDefinition | null;
    overId: string | null;
  };
  ui: {
    headerColors: string[];
    detailsItem: Item | null;
    showDetails: (item: Item) => void;
    closeDetails: () => void;
    showShortcuts: boolean;
    setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
    addedItemIds: Set<string>;
    allBoardItems: Item[];
    activeKeyboardDragId: { itemId: string; tierId: string } | null;
    setActiveKeyboardDragId: (state: { itemId: string; tierId: string } | null) => void;
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

  const [state, dispatch, isHydrated] = usePersistentReducer<TierListState, BoardAction>(
    tierListReducer,
    INITIAL_STATE,
    storageKey,
    {
      onSave: (s) => syncBoardMetadata(boardId, s),
    },
  );

  const historyRaw = useHistory<TierListState>();
  const [detailsItem, setDetailsItem] = useState<Item | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeKeyboardDragId, setActiveKeyboardDragId] = useState<{
    itemId: string;
    tierId: string;
  } | null>(null);

  const { registerItem, registerItems } = useItemRegistry();

  const hasSyncedItems = React.useRef(false);

  // --- Hydration Sync ---
  // When the board hydrates from IndexedDB, push all items to the standard registry.
  React.useEffect(() => {
    if (isHydrated && !hasSyncedItems.current) {
      const allItems = Object.values(state.itemEntities);
      if (allItems.length > 0) {
        registerItems(allItems);
        hasSyncedItems.current = true;
      }
    }
  }, [isHydrated, state.itemEntities, registerItems]);

  // --- History Helpers ---
  const undo = React.useCallback(() => {
    historyRaw.undo(state, (newState) => dispatch(setState({ state: newState })));
  }, [historyRaw, state, dispatch]);

  const redo = React.useCallback(() => {
    historyRaw.redo(state, (newState) => dispatch(setState({ state: newState })));
  }, [historyRaw, state, dispatch]);

  const push = React.useCallback(() => {
    historyRaw.push(state);
  }, [historyRaw, state]);

  // --- Sub-Hooks Integration ---

  const dragState = useTierListDrag(state, dispatch, push);
  const structureRaw = useTierStructure(dispatch, push);
  const ioRaw = useTierListIO(state, dispatch, push);
  const utilsRaw = useTierListUtils(state, null, null);

  const { actions, ui, history } = useTierListNamespaces({
    state,
    dispatch,
    history: { undo, redo, push, canUndo: historyRaw.canUndo, canRedo: historyRaw.canRedo },

    structureRaw,
    ioRaw,
    utilsRaw,
    uiState: {
      detailsItem,
      setDetailsItem,
      showShortcuts,
      setShowShortcuts,
      activeKeyboardDragId,
      setActiveKeyboardDragId,
    },
  });

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      actions: {
        ...actions,
        publish: ioRaw.handlePublish,
        updateItem: (itemId: string, updates: ItemUpdate) => {
          const item = state.itemEntities[itemId];
          if (!item) return;

          // 2. Dispatch to state
          actions.updateItem(itemId, updates);

          // 3. Register with standard registry
          registerItem({ ...item, ...updates } as Item);
        },
      },
      dragState,
      ui,
      history,
    }),
    [state, isHydrated, actions, ui, history, registerItem, ioRaw.handlePublish, dragState],
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
