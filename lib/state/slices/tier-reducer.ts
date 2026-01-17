/**
 * @file tier-reducer.ts
 * @description specialized slice reducer for managing tier structure and visual properties.
 * Handles adding, deleting, and updating tiers, as well as color randomization.
 * @module TierSliceReducer
 */

import { TierListState, TierDefinition } from '@/lib/types';
import { ActionType, TierListAction } from '../actions';
import { TIER_COLORS } from '@/lib/colors';
import { arrayMove } from '@dnd-kit/sortable';

/** Type definition for the Delete Tier action payload */
export type DeleteTierPayload = Extract<TierListAction, { type: 'DELETE_TIER' }>['payload'];

/**
 * Logic for adding a new tier with a unique ID and a random unused color.
 *
 * @param state - Current tier list state.
 * @returns Updated state with the new tier.
 */
export function handleAddTier(state: TierListState): TierListState {
  const newId = crypto.randomUUID();
  const usedColors = new Set(state.tierDefs.map((t) => t.color));
  const availableColors = TIER_COLORS.filter((c) => !usedColors.has(c.id));

  const randomColorObj =
    availableColors.length > 0
      ? availableColors[Math.floor(Math.random() * availableColors.length)]
      : TIER_COLORS[Math.floor(Math.random() * TIER_COLORS.length)];

  const newTier: TierDefinition = {
    id: newId,
    label: 'New Tier',
    color: randomColorObj.id,
  };

  return {
    ...state,
    tierDefs: [...state.tierDefs, newTier],
    items: { ...state.items, [newId]: [] },
  };
}

/**
 * Logic for deleting a tier and migrating its items to another tier if possible.
 *
 * @param state - Current tier list state.
 * @param payload - Contains the ID of the tier to delete.
 * @returns Updated state with the tier removed and items migrated.
 */
export function handleDeleteTier(state: TierListState, payload: DeleteTierPayload): TierListState {
  const { id } = payload;
  const tierIndex = state.tierDefs.findIndex((t) => t.id === id);
  if (tierIndex === -1) return state;

  const fallbackId = state.tierDefs.find((t) => t.id !== id)?.id;
  const orphanedItems = state.items[id] || [];
  const newItems = { ...state.items };
  delete newItems[id];

  if (fallbackId && orphanedItems.length > 0) {
    newItems[fallbackId] = [...newItems[fallbackId], ...orphanedItems];
  }

  return {
    ...state,
    tierDefs: state.tierDefs.filter((t) => t.id !== id),
    items: newItems,
  };
}

/**
 * Slice reducer for tier-related actions.
 *
 * @param state - Current tier list state.
 * @param action - TierListAction related to tier structure.
 * @returns New state if handled, otherwise original state.
 */
export function tierReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.ADD_TIER:
      return handleAddTier(state);

    case ActionType.DELETE_TIER:
      return handleDeleteTier(state, action.payload);

    case ActionType.UPDATE_TIER: {
      const { id, updates } = action.payload;
      return {
        ...state,
        tierDefs: state.tierDefs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      };
    }

    case ActionType.REORDER_TIERS: {
      const { oldIndex, newIndex } = action.payload;
      if (oldIndex === newIndex) return state;
      return {
        ...state,
        tierDefs: arrayMove(state.tierDefs, oldIndex, newIndex),
      };
    }

    case ActionType.RANDOMIZE_COLORS: {
      let pool = [...TIER_COLORS];
      const newDefs = state.tierDefs.map((tier) => {
        if (pool.length === 0) pool = [...TIER_COLORS];
        const index = Math.floor(Math.random() * pool.length);
        const color = pool[index];
        pool.splice(index, 1);
        return { ...tier, color: color.id };
      });
      return { ...state, tierDefs: newDefs };
    }

    default:
      return state;
  }
}
