/**
 * @file item-reducer.ts
 * @description specialized slice reducer for managing media items on the board.
 * Handles item movements (reordering and cross-tier), deletions, and attribute updates.
 * @module ItemSliceReducer
 */

import { TierListState, MediaItem } from '@/lib/types';
import { ActionType, TierListAction } from '../actions';
import { arrayMove } from '@dnd-kit/sortable';

/** Type definition for the Move Item action payload */
export type MoveItemPayload = Extract<TierListAction, { type: 'MOVE_ITEM' }>['payload'];

/**
 * Utility function to find which tier (container) an item belongs to.
 *
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

/**
 * Logic for moving an item within a tier or between tiers.
 * Also handles adding new items from the search panel.
 *
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

    const overItems = state.items[overContainer];
    const overIndex = overItems.findIndex((item) => item.id === overId);

    let newIndex;
    if (overId in state.items) {
      newIndex = overItems.length + 1;
    } else {
      newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;
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
          { ...draggingItemFromSearch, id: activeId },
          ...state.items[overContainer].slice(newIndex),
        ],
      },
    };
  }

  // Case 2: Sorting within same container
  if (activeContainer === overContainer) {
    const activeItems = state.items[activeContainer];
    const activeIndex = activeItems.findIndex((i) => i.id === activeId);
    const overIndex = activeItems.findIndex((i) => i.id === overId);

    if (activeIndex !== overIndex) {
      return {
        ...state,
        items: {
          ...state.items,
          [activeContainer]: arrayMove(activeItems, activeIndex, overIndex),
        },
      };
    }
    return state;
  }

  // Case 3: Moving between tiers
  const activeItems = state.items[activeContainer];
  const overItems = state.items[overContainer];
  const activeIndex = activeItems.findIndex((item) => item.id === activeId);
  const overIndex = overItems.findIndex((item) => item.id === overId);

  let newIndex;
  if (overId in state.items) {
    newIndex = overItems.length + 1;
  } else {
    newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;
  }

  return {
    ...state,
    items: {
      ...state.items,
      [activeContainer]: [...state.items[activeContainer].filter((item) => item.id !== activeId)],
      [overContainer]: [
        ...state.items[overContainer].slice(0, newIndex),
        activeItems[activeIndex],
        ...state.items[overContainer].slice(newIndex),
      ],
    },
  };
}

/**
 * Slice reducer for item-related actions.
 *
 * @param state - Current tier list state.
 * @param action - TierListAction related to media items.
 * @returns New state if handled, otherwise original state.
 */
export function itemReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.MOVE_ITEM:
      return handleMoveItem(state, action.payload);

    case ActionType.REMOVE_ITEM: {
      const { tierId, itemId } = action.payload;
      return {
        ...state,
        items: {
          ...state.items,
          [tierId]: state.items[tierId].filter(
            (a) => a.id !== itemId && a.id !== `search-${itemId}`,
          ),
        },
      };
    }

    case ActionType.UPDATE_ITEM: {
      const { itemId, updates } = action.payload;
      const newItems = { ...state.items };
      let modified = false;

      const tierIds = Object.keys(newItems);
      for (const tierId of tierIds) {
        const list = newItems[tierId];
        const index = list.findIndex((a) => a.id === itemId);
        if (index !== -1) {
          const currentItem = list[index];

          if (updates.details && currentItem.details) {
            const currentDetailsStr = JSON.stringify(currentItem.details);
            const newDetailsStr = JSON.stringify(updates.details);
            if (currentDetailsStr === newDetailsStr && Object.keys(updates).length === 1) {
              break;
            }
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

    default:
      return state;
  }
}
