/**
 * @file item-reducer.ts
 * @description specialized slice reducer for managing media items on the board.
 * Handles item movements (reordering and cross-tier), deletions, and attribute updates.
 * @module ItemSliceReducer
 */

import { arrayMove } from '@dnd-kit/sortable';

import { MediaItem, TierListState } from '@/lib/types';
import { hasMediaItemUpdates } from '@/lib/utils/comparisons';

import { ActionType, TierListAction } from '../actions';

/** Type definition for the Move Item action payload */
export type MoveItemPayload = Extract<TierListAction, { type: 'MOVE_ITEM' }>['payload'];
export type UpdateItemPayload = Extract<TierListAction, { type: 'UPDATE_ITEM' }>['payload'];

/**
 * Utility function to find which tier (container) an item belongs to.
 * @param id - The ID of the item to locate.
 * @param currentItems - The current items map from state.
 * @returns The ID of the tier containing the item, or undefined if not found.
 */
const findContainer = (
  id: string,
  currentItems: Record<string, MediaItem[]>,
): string | undefined => {
  if (id in currentItems) return id;
  return Object.keys(currentItems).find((key) => currentItems[key].find((a) => a.id === id));
};

function handleMoveFromSearch(
  state: TierListState,
  activeId: string,
  overId: string,
  overContainer: string,
  draggingItemFromSearch: MediaItem,
): TierListState {
  const overItems = state.items[overContainer];
  const overIndex = overItems.findIndex((item) => item.id === overId);

  let newIndex;
  if (overId in state.items) {
    newIndex = overItems.length + 1;
  } else {
    newIndex = overIndex !== -1 ? overIndex : overItems.length + 1;
  }

  const exists = Object.values(state.items)
    .flat()
    .some((i) => i.id === draggingItemFromSearch.id);
  if (exists) return state;

  return {
    ...state,
    items: {
      ...state.items,
      [overContainer]: [
        ...state.items[overContainer].slice(0, newIndex),
        { ...draggingItemFromSearch },
        ...state.items[overContainer].slice(newIndex),
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
  const activeItems = state.items[container];
  const activeIndex = activeItems.findIndex((i) => i.id === activeId);
  const overIndex = activeItems.findIndex((i) => i.id === overId);

  if (activeIndex !== overIndex) {
    return {
      ...state,
      items: {
        ...state.items,
        [container]: arrayMove(activeItems, activeIndex, overIndex),
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
  const activeItems = state.items[activeContainer];
  const overItems = state.items[overContainer];
  const activeIndex = activeItems.findIndex((item) => item.id === activeId);
  const overIndex = overItems.findIndex((item) => item.id === overId);

  let newIndex;
  if (overId in state.items) {
    newIndex = overItems.length + 1;
  } else {
    newIndex = overIndex !== -1 ? overIndex : overItems.length + 1;
  }

  return {
    ...state,
    items: {
      ...state.items,
      [activeContainer]: state.items[activeContainer].filter((item) => item.id !== activeId),
      [overContainer]: [
        ...state.items[overContainer].slice(0, newIndex),
        activeItems[activeIndex],
        ...state.items[overContainer].slice(newIndex),
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

  const activeContainer = findContainer(activeId, state.items);
  const overContainer = findContainer(overId, state.items);

  if (!overContainer) return state;

  // Case 1: Dragging from Search (New Item)
  if (!activeContainer) {
    if (!draggingItemFromSearch) return state;
    return handleMoveFromSearch(state, activeId, overId, overContainer, draggingItemFromSearch);
  }

  // Case 2: Sorting within same container
  if (activeContainer === overContainer) {
    return handleSortInContainer(state, activeId, overId, activeContainer);
  }

  // Case 3: Moving between tiers
  return handleMoveBetweenContainers(state, activeId, overId, activeContainer, overContainer);
}

function handleUpdateItem(state: TierListState, payload: UpdateItemPayload): TierListState {
  const { itemId, updates } = payload;
  const newItems = { ...state.items };
  let modified = false;

  const tierIds = Object.keys(newItems);
  for (const tierId of tierIds) {
    const list = newItems[tierId];
    const index = list.findIndex((a) => a.id === itemId);
    if (index !== -1) {
      const currentItem = list[index];

      // Optimization: Check if updates actually change anything
      if (!hasMediaItemUpdates(currentItem, updates)) {
        break;
      }

      newItems[tierId] = [
        ...list.slice(0, index),
        { ...currentItem, ...updates } as MediaItem,
        ...list.slice(index + 1),
      ];
      modified = true;
      break;
    }
  }
  return modified ? { ...state, items: newItems } : state;
}

/**
 * Slice reducer for item-related actions.
 * @param state - Current tier list state.
 * @param action - TierListAction related to media items.
 * @returns New state if handled, otherwise original state.
 */
export function itemReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.MOVE_ITEM: {
      return handleMoveItem(state, action.payload);
    }

    case ActionType.REMOVE_ITEM: {
      const { tierId, itemId } = action.payload;
      return {
        ...state,
        items: {
          ...state.items,
          [tierId]: state.items[tierId].filter((a) => a.id !== itemId),
        },
      };
    }

    case ActionType.UPDATE_ITEM: {
      return handleUpdateItem(state, action.payload);
    }

    default: {
      return state;
    }
  }
}
