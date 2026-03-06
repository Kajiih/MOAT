/**
 * @file useTierListNamespaces.ts
 * @description A clean-up hook for aggregating state, dispatch, and multiple sub-hooks
 * into a unified, namespaced API used by the TierListContext.
 * This pattern improves memoization and discoverability of board actions.
 * @module useTierListNamespaces
 */

import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { ActionType, TierListAction } from '@/lib/state/actions';
import { BoardCategory, TierDefinition, TierListState } from '@/lib/types';
import { Item } from '@/lib/database/types';
import { fromSearchId } from '@/lib/utils/ids';

/**
 * Props for the useTierListNamespaces hook.
 * Accepts raw outputs from domain-specific hooks and raw state/dispatch.
 */
interface UseTierListNamespacesProps {
  state: TierListState;
  dispatch: React.Dispatch<TierListAction>;
  history: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    push: () => void;
  };
  dndRaw: {
    sensors: SensorDescriptor<SensorOptions>[];
    activeItem: Item | null;
    activeTier: TierDefinition | null;
    overId: string | null;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    handleDragCancel: () => void;
  };
  structureRaw: {
    handleAddTier: () => void;
    handleUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
    handleDeleteTier: (id: string) => void;
    handleRandomizeColors: () => void;
    handleClear: () => void;
    handleResetItems: () => void;
  };
  ioRaw: {
    handleExport: () => void;
    handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  utilsRaw: {
    headerColors: string[];
    handleLocate: (id: string) => void;
  };
  uiState: {
    detailsItem: Item | null;
    setDetailsItem: (item: Item | null) => void;
    showShortcuts: boolean;
    setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  };
}

/**
 * Aggregates state and logic into logical namespaces (actions, dnd, ui, history).
 * @param props - The props for the hook.
 * @param props.state
 * @param props.dispatch
 * @param props.history
 * @param props.dndRaw
 * @param props.structureRaw
 * @param props.ioRaw
 * @param props.utilsRaw
 * @param props.uiState
 */
export function useTierListNamespaces({
  state,
  dispatch,
  history,
  dndRaw,
  structureRaw,
  ioRaw,
  utilsRaw,
  uiState,
}: UseTierListNamespacesProps) {
  /** Ref to the latest items state to keep callbacks stable */
  const itemsRef = useRef(state.items);
  useEffect(() => {
    itemsRef.current = state.items;
  }, [state.items]);

  /**
   * Updates the global board title.
   */
  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      dispatch({ type: ActionType.UPDATE_TITLE, payload: { title: newTitle } });
    },
    [dispatch],
  );

  /**
   * Removes a specific item from a tier.
   */
  const removeItemFromTier = useCallback(
    (tierId: string, itemId: string) => {
      history.push();
      dispatch({ type: ActionType.REMOVE_ITEM, payload: { tierId, itemId } });
    },
    [dispatch, history],
  );

  /**
   * Updates item attributes.
   */
  const updateMediaItem = useCallback(
    (itemId: string, updates: Partial<Item>) => {
      dispatch({ type: ActionType.UPDATE_ITEM, payload: { itemId, updates } });
    },
    [dispatch],
  );

  // Namespace: actions
  const actions = useMemo(
    () => ({
      addTier: structureRaw.handleAddTier,
      updateTier: structureRaw.handleUpdateTier,
      deleteTier: structureRaw.handleDeleteTier,
      randomizeColors: structureRaw.handleRandomizeColors,
      clear: structureRaw.handleClear,
      updateTitle: handleUpdateTitle,
      updateMediaItem,
      removeItemFromTier: removeItemFromTier,
      locate: utilsRaw.handleLocate,
      import: ioRaw.handleImport,
      export: ioRaw.handleExport,
      resetItems: structureRaw.handleResetItems,
      updateCategory: (category: BoardCategory) =>
        dispatch({ type: ActionType.UPDATE_CATEGORY, payload: { category } }),
    }),
    [
      structureRaw,
      handleUpdateTitle,
      updateMediaItem,
      removeItemFromTier,
      utilsRaw.handleLocate,
      ioRaw,
      dispatch,
    ],
  );

  /** Computed list of all items currently on the board */
  const allBoardItems = useMemo(() => Object.values(state.items).flat(), [state.items]);

  /** Set of item IDs currently on the board (used for badge indicators in search) */
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    allBoardItems.forEach((item) => {
      if (item && item.id) {
        ids.add(fromSearchId(item.id));
      }
    });
    return ids;
  }, [allBoardItems]);

  // Namespace: ui
  const ui = useMemo(() => {
    // Find the 'live' version of the item on the board if it exists.
    const liveDetailsItem = uiState.detailsItem
      ? allBoardItems.find((i) => i.id === uiState.detailsItem!.id) || uiState.detailsItem
      : null;

    return {
      headerColors: utilsRaw.headerColors,
      detailsItem: liveDetailsItem,
      showDetails: (item: Item) => uiState.setDetailsItem(item),
      closeDetails: () => uiState.setDetailsItem(null),
      showShortcuts: uiState.showShortcuts,
      setShowShortcuts: uiState.setShowShortcuts,
      addedItemIds,
      allBoardItems,
    };
  }, [utilsRaw.headerColors, uiState, addedItemIds, allBoardItems]);

  return {
    actions,
    dnd: dndRaw,
    ui,
    history,
  };
}
