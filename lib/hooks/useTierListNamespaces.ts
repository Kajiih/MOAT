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
import { useCallback, useMemo } from 'react';

import { ActionType, TierListAction } from '@/lib/state/actions';
import { MediaItem, TierDefinition, TierListState } from '@/lib/types';

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
    activeItem: MediaItem | null;
    activeTier: TierDefinition | null;
    overId: string | null;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
  };
  structureRaw: {
    handleAddTier: () => void;
    handleUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
    handleDeleteTier: (id: string) => void;
    handleRandomizeColors: () => void;
    handleClear: () => void;
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
    detailsItem: MediaItem | null;
    setDetailsItem: (item: MediaItem | null) => void;
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
 * @returns An object containing grouped board properties and actions.
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
   * Updates item attributes and synchronizes with the Global Media Registry.
   */
  const updateMediaItem = useCallback(
    (itemId: string, updates: Partial<MediaItem>, registerItem: (item: MediaItem) => void) => {
      dispatch({ type: ActionType.UPDATE_ITEM, payload: { itemId, updates } });
      const currentItem = Object.values(state.items)
        .flat()
        .find((i) => i.id === itemId);
      if (currentItem) {
        registerItem({ ...currentItem, ...updates } as MediaItem);
      }
    },
    [dispatch, state.items],
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
    }),
    [
      structureRaw,
      handleUpdateTitle,
      updateMediaItem,
      removeItemFromTier,
      utilsRaw.handleLocate,
      ioRaw,
    ],
  );

  /** Computed list of all items currently on the board */
  const allBoardItems = useMemo(() => Object.values(state.items).flat(), [state.items]);

  /** Set of item IDs currently on the board (used for badge indicators in search) */
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    allBoardItems.forEach((item) => {
      if (item && item.id) {
        ids.add(item.id.replace(/^search-/, ''));
      }
    });
    return ids;
  }, [allBoardItems]);

  // Namespace: ui
  const ui = useMemo(
    () => ({
      headerColors: utilsRaw.headerColors,
      detailsItem: uiState.detailsItem,
      showDetails: (item: MediaItem) => uiState.setDetailsItem(item),
      closeDetails: () => uiState.setDetailsItem(null),
      addedItemIds,
      allBoardItems,
    }),
    [utilsRaw.headerColors, uiState, addedItemIds, allBoardItems],
  );

  return {
    actions,
    dnd: dndRaw,
    ui,
    history,
  };
}
