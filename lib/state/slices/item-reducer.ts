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
 * Uses optimized O(1) lookup if available, otherwise falls back to O(N) scan.
 * @param id - The ID of the item to locate.
 * @param state - The current tier list state.
 * @returns The ID of the tier containing the item, or undefined if not found.
 */
const findContainer = (id: string, state: TierListState): string | undefined => {
  // Optimization: O(1) Lookup
  if (state.itemLookup && state.itemLookup[id]) {
    // Verify consistency (optional but good for safety during dev/migrations)
    // If the lookup points to a tier, but the item isn't actually there, it's stale.
    // However, for performance we trust the lookup.
    // If we want to be paranoid:
    // const claimedTier = state.itemLookup[id];
    // if (state.items[claimedTier]?.some(i => i.id === id)) return claimedTier;
    return state.itemLookup[id];
  }

  // Fallback: O(N) Scan
  const currentItems = state.items;
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
    newIndex = overItems.length;
  } else {
    newIndex = overIndex !== -1 ? overIndex : overItems.length;
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
    itemLookup: {
      ...state.itemLookup,
      [activeId]: overContainer,
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
    newIndex = overItems.length;
  } else {
    newIndex = overIndex !== -1 ? overIndex : overItems.length;
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
    itemLookup: {
      ...state.itemLookup,
      [activeId]: overContainer,
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

  const activeContainer = findContainer(activeId, state);
  const overContainer = findContainer(overId, state);

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
    activeContainer !== overContainer && state.items[overContainer].some((i) => i.id === activeId);
  if (isAlreadyAtTarget) return state;

  return handleMoveBetweenContainers(state, activeId, overId, activeContainer, overContainer);
}

function handleUpdateItem(state: TierListState, payload: UpdateItemPayload): TierListState {
  const { itemId, updates } = payload;
  const newItems = { ...state.items };
  let modified = false;
  let newItemLookup = state.itemLookup;

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

      const newItem = { ...currentItem, ...updates } as MediaItem;

      newItems[tierId] = [...list.slice(0, index), newItem, ...list.slice(index + 1)];
      modified = true;

      // Handle ID change (Normalization)
      if (currentItem.id !== newItem.id && state.itemLookup) {
        newItemLookup = { ...state.itemLookup };
        delete newItemLookup[currentItem.id];
        newItemLookup[newItem.id] = tierId;
      }
      break;
    }
  }
  return modified ? { ...state, items: newItems, itemLookup: newItemLookup } : state;
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
      const newLookup = { ...state.itemLookup };
      delete newLookup[itemId];

      return {
        ...state,
        items: {
          ...state.items,
          [tierId]: state.items[tierId].filter((a) => a.id !== itemId),
        },
        itemLookup: newLookup,
      };
    }

    case ActionType.UPDATE_ITEM: {
      return handleUpdateItem(state, action.payload);
    }

    case ActionType.MOVE_ALL_TO_UNRANKED: {
      const allItems = Object.values(state.items).flat();
      if (allItems.length === 0) return state;

      const newItems: Record<string, MediaItem[]> = {};
      const newLookup: Record<string, string> = {};

      // Initialize all tiers as empty
      state.tierDefs.forEach((tier) => {
        newItems[tier.id] = [];
      });

      const unrankedTier =
        state.tierDefs.find((t) => t.label.toLowerCase() === 'unranked') || state.tierDefs.at(-1);

      if (unrankedTier) {
        newItems[unrankedTier.id] = allItems;
        allItems.forEach((item) => {
          newLookup[item.id] = unrankedTier.id;
        });
      }

      return {
        ...state,
        items: newItems,
        itemLookup: newLookup,
      };
    }

    default: {
      return state;
    }
  }
}
