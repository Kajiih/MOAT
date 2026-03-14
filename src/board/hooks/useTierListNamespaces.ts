/**
 * @file useTierListNamespaces.ts
 * @description A clean-up hook for aggregating state, dispatch, and multiple sub-hooks
 * into a unified, namespaced API used by the TierListContext.
 * This pattern improves memoization and discoverability of board actions.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { BoardDispatch, moveItem, removeItem, updateItem, updateTitle } from '@/board/state/reducer';
import { TierListState, TierUpdate } from '@/board/types';
import { Item, ItemUpdate } from '@/items/items';
import { fromSearchId } from '@/lib/ids';
import { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/closest-edge';

/**
 * Props for the useTierListNamespaces hook.
 * Accepts raw outputs from domain-specific hooks and raw state/dispatch.
 */
interface UseTierListNamespacesProps {
  state: TierListState;
  dispatch: BoardDispatch;
  history: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    push: () => void;
  };

  structureRaw: {
    handleAddTier: () => void;
    handleUpdateTier: (id: string, updates: TierUpdate) => void;
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
    activeKeyboardDragId: { itemId: string; tierId: string } | null;
    setActiveKeyboardDragId: React.Dispatch<React.SetStateAction<{ itemId: string; tierId: string } | null>>;
  };
}

/**
 * Aggregates state and logic into logical namespaces (actions, dragState, ui, history).
 * @param props - The props for the hook.
 * @param props.state - The current tier list state.
 * @param props.dispatch - The dispatch function for tier list actions.
 * @param props.history - The history management functions.
 * @param props.structureRaw - Raw outputs from the structure formatting hook.
 * @param props.ioRaw - Raw outputs from the import/export hook.
 * @param props.utilsRaw - Raw outputs from the utility hook.
 * @param props.uiState - Raw outputs from the UI state hook.
 * @returns A structured object containing actions, ui, and history namespaces.
 */
export function useTierListNamespaces({
  state,
  dispatch,
  history,

  structureRaw,
  ioRaw,
  utilsRaw,
  uiState,
}: UseTierListNamespacesProps) {
  /** Ref to the latest items state to keep callbacks stable */
  const itemsRef = useRef(state.itemEntities);
  useEffect(() => {
    itemsRef.current = state.itemEntities;
  }, [state.itemEntities]);

  /**
   * Updates the global board title.
   */
  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      dispatch(updateTitle({ title: newTitle }));
    },
    [dispatch],
  );

  /**
   * Removes a specific item from a tier.
   */
  const removeItemFromTier = useCallback(
    (tierId: string, itemId: string) => {
      history.push();
      dispatch(removeItem({ tierId, itemId }));
    },
    [dispatch, history],
  );

  /**
   * Updates item attributes.
   */
  const updateMediaItem = useCallback(
    (itemId: string, updates: ItemUpdate) => {
      dispatch(updateItem({ itemId, updates }));
    },
    [dispatch],
  );

  const handleMoveItem = useCallback(
    (payload: { activeId: string; overId: string; activeItem?: Item; edge?: Edge | null }) => {
      history.push();
      dispatch(moveItem(payload));
    },
    [dispatch, history],
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
      moveItem: handleMoveItem,
    }),
    [
      structureRaw,
      handleUpdateTitle,
      updateMediaItem,
      removeItemFromTier,
      utilsRaw.handleLocate,
      ioRaw,
      handleMoveItem,
    ],
  );

  /** Computed list of all items currently on the board */
  const allBoardItems = useMemo(() => Object.values(state.itemEntities), [state.itemEntities]);

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
      activeKeyboardDragId: uiState.activeKeyboardDragId,
      setActiveKeyboardDragId: uiState.setActiveKeyboardDragId,
    };
  }, [utilsRaw.headerColors, uiState, addedItemIds, allBoardItems]);

  return {
    actions,
    ui,
    history,
  };
}
