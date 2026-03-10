/**
 * @file item-reducer.ts
 * @description specialized slice reducer for managing items on the board.
 * Handles item movements (reordering and cross-tier), deletions, and attribute updates.
 * @module ItemSliceReducer
 */

import { arrayMove } from '@/lib/array';

import { Item, TierListState } from '@/board/types';
import { hasItemUpdates } from '@/lib/comparisons';

import { ActionType, TierListAction } from '../actions';

/** Type definition for the Move Item action payload */
export type MoveItemPayload = Extract<TierListAction, { type: 'MOVE_ITEM' }>['payload'];
export type UpdateItemPayload = Extract<TierListAction, { type: 'UPDATE_ITEM' }>['payload'];

const findContainer = (id: string, state: TierListState): string | undefined => {
  // Optimization: O(1) Lookup since tierLayout is just maps of small string arrays
  const layout = state.tierLayout;
  if (!layout) return undefined;
  
  return Object.keys(layout).find((tierId) => layout[tierId]?.includes(id));
};

function handleMoveFromSearch(
  state: TierListState,
  activeId: string,
  overId: string,
  overContainer: string,
  draggingItemFromSearch: Item,
): TierListState {
  const overLayout = state.tierLayout[overContainer] || [];
  const overIndex = overLayout.indexOf(overId);

  let newIndex;
  // If moving directly onto the container itself, append
  if (overId in state.tierLayout) {
    newIndex = overLayout.length;
  } else {
    // Else insert before/after the target item
    newIndex = overIndex !== -1 ? overIndex : overLayout.length;
  }

  // Already exists somewhere? Abort.
  if (state.itemEntities[activeId]) return state;

  return {
    ...state,
    itemEntities: {
      ...state.itemEntities,
      [activeId]: draggingItemFromSearch,
    },
    tierLayout: {
      ...state.tierLayout,
      [overContainer]: [
        ...overLayout.slice(0, newIndex),
        activeId,
        ...overLayout.slice(newIndex),
      ],
    },
  };
}

function handleSortInContainer(
  state: TierListState,
  activeId: string,
  overId: string,
  container: string,
): TierListState {
  const activeLayout = state.tierLayout[container] || [];
  const activeIndex = activeLayout.indexOf(activeId);
  const overIndex = activeLayout.indexOf(overId);

  if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
    return {
      ...state,
      tierLayout: {
        ...state.tierLayout,
        [container]: arrayMove(activeLayout, activeIndex, overIndex),
      },
    };
  }
  return state;
}

function handleMoveBetweenContainers(
  state: TierListState,
  activeId: string,
  overId: string,
  activeContainer: string,
  overContainer: string,
): TierListState {
  const activeLayout = state.tierLayout[activeContainer] || [];
  const overLayout = state.tierLayout[overContainer] || [];
  const overIndex = overLayout.indexOf(overId);

  let newIndex;
  if (overId in state.tierLayout) {
    newIndex = overLayout.length;
  } else {
    newIndex = overIndex !== -1 ? overIndex : overLayout.length;
  }

  return {
    ...state,
    tierLayout: {
      ...state.tierLayout,
      [activeContainer]: activeLayout.filter((id) => id !== activeId),
      [overContainer]: [
        ...overLayout.slice(0, newIndex),
        activeId,
        ...overLayout.slice(newIndex),
      ],
    },
  };
}

/**
 * Logic for moving an item within a tier or between tiers.
 * Also handles adding new items from the search panel.
 * @param state - Current tier list state.
 * @param payload - Move details (activeId, overId, dragging item if from search).
 * @returns Updated state with item in its new position.
 */
export function handleMoveItem(state: TierListState, payload: MoveItemPayload): TierListState {
  const { activeId, overId, activeItem: draggingItemFromSearch } = payload;

  const activeContainer = activeId in state.tierLayout ? activeId : findContainer(activeId, state);
  const overContainer = overId in state.tierLayout ? overId : findContainer(overId, state);

  if (!overContainer) return state;

  // Case 1: Dragging from Search (New Item)
  if (!activeContainer) {
    if (!draggingItemFromSearch) return state;
    return handleMoveFromSearch(state, activeId, overId, overContainer, draggingItemFromSearch);
  }

  // Case 2: Sorting within same container
  if (activeContainer === overContainer) {
    // Optimization: If overId is the container ID itself and item is already in it, skip
    if (overId === overContainer) return state;
    return handleSortInContainer(state, activeId, overId, activeContainer);
  }

  // Case 3: Moving between tiers
  // Optimization: If it's already in the right spot, we skip
  // (Mostly for handleDragOver which can be called many times)
  const isAlreadyAtTarget =
    activeContainer !== overContainer && state.tierLayout[overContainer]?.includes(activeId);
  if (isAlreadyAtTarget) return state;

  return handleMoveBetweenContainers(state, activeId, overId, activeContainer, overContainer);
}

function handleUpdateItem(state: TierListState, payload: UpdateItemPayload): TierListState {
  const { itemId, updates } = payload;
  const currentItem = state.itemEntities[itemId];
  
  if (!currentItem) return state;

  if (!hasItemUpdates(currentItem, updates)) {
    return state;
  }

  const newItem: Item = { ...currentItem, ...updates };

  // Pure data update
  return {
    ...state,
    itemEntities: {
      ...state.itemEntities,
      [newItem.id]: newItem
    }
  };
}

/**
 * Slice reducer for item-related actions.
 * @param state - Current tier list state.
 * @param action - TierListAction related to items.
 * @returns New state if handled, otherwise original state.
 */
export function itemReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.MOVE_ITEM: {
      return handleMoveItem(state, action.payload);
    }
    case ActionType.REMOVE_ITEM: {
      const { tierId, itemId } = action.payload;
      
      const newEntities = { ...state.itemEntities };
      delete newEntities[itemId];

      return {
        ...state,
        itemEntities: newEntities,
        tierLayout: {
          ...state.tierLayout,
          [tierId]: (state.tierLayout[tierId] || []).filter((id) => id !== itemId),
        },
      };
    }

    case ActionType.UPDATE_ITEM: {
      return handleUpdateItem(state, action.payload);
    }

    case ActionType.MOVE_ALL_TO_UNRANKED: {
      const allItemIds = Object.keys(state.itemEntities);
      if (allItemIds.length === 0) return state;

      const newLayout: Record<string, string[]> = {};

      // Initialize all tiers as empty
      state.tierDefs.forEach((tier) => {
        newLayout[tier.id] = [];
      });

      const unrankedTier =
        state.tierDefs.find((t) => t.label.toLowerCase() === 'unranked') || state.tierDefs.at(-1);

      if (unrankedTier) {
        newLayout[unrankedTier.id] = allItemIds;
      }

      return {
        ...state,
        tierLayout: newLayout,
      };
    }

    default: {
      return state;
    }
  }
}
