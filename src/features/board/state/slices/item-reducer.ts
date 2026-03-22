/**
 * @file item-reducer.ts
 * @description Specialized slice case reducers for managing items on the board via Redux Toolkit.
 * Handles item movements (reordering and cross-tier), deletions, and attribute updates.
 * @module ItemSliceReducers
 */

import { PayloadAction } from '@reduxjs/toolkit';

import { ItemUpdate } from '@/domain/items/items';
import { arrayMove } from '@/domain/utils/array';
import { hasItemUpdates } from '@/domain/utils/comparisons';
import { TierId, TierListState } from '@/features/board/types';

import { MoveItemPayload } from '../reducer';

const findContainer = (id: string, state: TierListState): string | undefined => {
  const layout = state.tierLayout;
  if (!layout) return undefined;
  return Object.keys(layout).find((tierId) => layout[tierId]?.includes(id));
};

function handleMoveFromSearch(
  state: TierListState,
  payload: MoveItemPayload,
  overContainer: string,
): void {
  const { activeId, overId, activeItem: draggingItemFromSearch, edge } = payload;
  if (!draggingItemFromSearch) return;

  const overLayout = state.tierLayout[overContainer] || [];
  const overIndex = overLayout.indexOf(overId);

  let newIndex;
  // If moving directly onto the container itself, append or prepend based on edge
  if (overId in state.tierLayout) {
    newIndex = edge === 'left' || edge === 'top' ? 0 : overLayout.length;
  } else {
    // Determine edge placement around target item
    newIndex = overIndex !== -1 ? overIndex : overLayout.length;

    // Apply strict PRDnD edge index adjustments if available
    if (overIndex !== -1) {
      if (edge === 'right' || edge === 'bottom') {
        newIndex = overIndex + 1;
      } else if (edge === 'left' || edge === 'top') {
        newIndex = overIndex;
      }
    }
  }

  // Already exists somewhere? Abort.
  if (state.itemEntities[activeId]) return;

  // IMUTATE VIA IMMER
  state.itemEntities[activeId] = draggingItemFromSearch;

  if (!state.tierLayout[overContainer]) state.tierLayout[overContainer] = [];
  state.tierLayout[overContainer].splice(newIndex, 0, activeId);
}

function handleSortInContainer(
  state: TierListState,
  payload: MoveItemPayload,
  container: string,
): void {
  const { activeId, overId, edge } = payload;
  const activeLayout = state.tierLayout[container] || [];
  const activeIndex = activeLayout.indexOf(activeId);
  const overIndex = activeLayout.indexOf(overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return;
  }

  // Find exact DOM edge (Pragmatic Drag and Drop Hitboxes)
  let finalDropIndex = overIndex;

  if (edge) {
    if (edge === 'right' || edge === 'bottom') {
      finalDropIndex = activeIndex < overIndex ? overIndex : overIndex + 1;
    } else if (edge === 'left' || edge === 'top') {
      finalDropIndex = activeIndex > overIndex ? overIndex : Math.max(0, overIndex - 1);
    }
  } else {
    // Default fallback to old behavior
    finalDropIndex = activeIndex < overIndex ? Math.max(0, overIndex - 1) : overIndex;
  }

  if (finalDropIndex === activeIndex) {
    return;
  }

  // MUTATE VIA IMMER
  state.tierLayout[container] = arrayMove(activeLayout, activeIndex, finalDropIndex);
}

function handleMoveBetweenContainers(
  state: TierListState,
  payload: MoveItemPayload,
  activeContainer: string,
  overContainer: string,
): void {
  const { activeId, overId, edge } = payload;
  const overLayout = state.tierLayout[overContainer] || [];
  const overIndex = overLayout.indexOf(overId);

  let newIndex;
  // If moving directly onto the container itself, append or prepend based on edge
  if (overId in state.tierLayout) {
    newIndex = edge === 'left' || edge === 'top' ? 0 : overLayout.length;
  } else {
    newIndex = overIndex !== -1 ? overIndex : overLayout.length;

    if (overIndex !== -1) {
      if (edge === 'right' || edge === 'bottom') {
        newIndex = overIndex + 1;
      } else if (edge === 'left' || edge === 'top') {
        newIndex = overIndex;
      }
    }
  }

  // MUTATE VIA IMMER
  if (!state.tierLayout[overContainer]) state.tierLayout[overContainer] = [];

  // 1. Remove from source
  state.tierLayout[activeContainer] = state.tierLayout[activeContainer].filter(
    (id) => id !== activeId,
  );

  // 2. Insert into destination
  state.tierLayout[overContainer].splice(newIndex, 0, activeId);
}

/**
 * RTK Case Reducer for moving an item within a tier or between tiers.
 * @param state - The draft state provided by Immer.
 * @param action - The RTK PayloadAction containing MoveItemPayload.
 * @returns Mutates the state directly via Immer.
 */
export function handleMoveItem(state: TierListState, action: PayloadAction<MoveItemPayload>): void {
  const payload = action.payload;
  const { activeId, overId } = payload;

  const activeContainer = activeId in state.tierLayout ? activeId : findContainer(activeId, state);
  const overContainer = overId in state.tierLayout ? overId : findContainer(overId, state);

  if (!overContainer) return;

  if (!activeContainer) {
    return handleMoveFromSearch(state, payload, overContainer);
  }

  if (activeContainer === overContainer) {
    if (overId === overContainer) return;
    return handleSortInContainer(state, payload, activeContainer);
  }

  const isAlreadyAtTarget = state.tierLayout[overContainer]?.includes(activeId);
  if (isAlreadyAtTarget) return;

  return handleMoveBetweenContainers(state, payload, activeContainer, overContainer);
}

/**
 * RTK Case Reducer for updating item attributes.
 * @param state - The draft state provided by Immer.
 * @param action - The RTK PayloadAction containing the item ID and updates.
 */
export function handleUpdateItem(
  state: TierListState,
  action: PayloadAction<{ itemId: string; updates: ItemUpdate }>,
): void {
  const { itemId, updates } = action.payload;
  const currentItem = state.itemEntities[itemId];

  if (!currentItem) return;

  if (!hasItemUpdates(currentItem, updates)) {
    return;
  }

  // MUTATE VIA IMMER
  Object.assign(state.itemEntities[itemId], updates);
}

/**
 * RTK Case Reducer for removing an item from the board.
 * @param state - The draft state provided by Immer.
 * @param action - The RTK PayloadAction containing the tier ID and item ID.
 */
export function handleRemoveItem(
  state: TierListState,
  action: PayloadAction<{ tierId: string | TierId; itemId: string }>,
): void {
  const { tierId, itemId } = action.payload;

  // MUTATE VIA IMMER
  delete state.itemEntities[itemId];
  if (state.tierLayout[tierId]) {
    state.tierLayout[tierId] = state.tierLayout[tierId].filter((id) => id !== itemId);
  }
}

/**
 * RTK Case Reducer for resetting all items to the unranked tier.
 * @param state - The draft state provided by Immer.
 */
export function handleMoveAllToUnranked(state: TierListState): void {
  const allItemIds = Object.keys(state.itemEntities);
  if (allItemIds.length === 0) return;

  // Clear all layouts explicitly
  state.tierDefs.forEach((tier) => {
    state.tierLayout[tier.id] = [];
  });

  const unrankedTier =
    state.tierDefs.find((t) => t.label.toLowerCase() === 'unranked') || state.tierDefs.at(-1);

  if (unrankedTier) {
    state.tierLayout[unrankedTier.id] = allItemIds;
  }
}
