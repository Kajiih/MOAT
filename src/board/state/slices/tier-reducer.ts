/**
 * @file tier-reducer.ts
 * @description specialized slice reducer for managing tier structure and visual properties.
 * Handles adding, deleting, and updating tiers, as well as color randomization.
 * @module TierSliceReducer
 */

import { TierDefinition, TierListState } from '@/board/types';
import { arrayMove } from '@/lib/array';
import { TIER_COLORS } from '@/lib/colors';

import { ActionType, TierListAction } from '../actions';

/** Type definition for the Delete Tier action payload */
export type DeleteTierPayload = Extract<TierListAction, { type: 'DELETE_TIER' }>['payload'];

/**
 * Logic for adding a new tier with a unique ID and a random unused color.
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
    tierLayout: { ...state.tierLayout, [newId]: [] },
  };
}

/**
 * Handles reordering tiers in the board definition.
 * @param state - Current tier list state.
 * @param payload - Action payload.
 * @param payload.oldIndex - Original array index.
 * @param payload.newIndex - Destination array index.
 * @returns Updated state with reordered tiers.
 */
export function handleReorderTiers(
  state: TierListState,
  payload: { oldIndex: number; newIndex: number },
): TierListState {
  const { oldIndex, newIndex } = payload;
  if (oldIndex === newIndex) return state;
  return {
    ...state,
    tierDefs: arrayMove(state.tierDefs, oldIndex, newIndex),
  };
}

/**
 * Deletes a tier and optionally migrates its items to a fallback tier.
 * @param state - Current tier list state.
 * @param payload - Action payload containing the tier ID.
 * @returns Updated state with the tier removed.
 */
export function handleDeleteTier(state: TierListState, payload: DeleteTierPayload): TierListState {
  const { id } = payload;
  const tierIndex = state.tierDefs.findIndex((t) => t.id === id);
  if (tierIndex === -1) return state;

  const fallbackId = state.tierDefs.find((t) => t.id !== id)?.id;
  const orphanedItemIds = state.tierLayout[id] || [];
  
  const newLayout = { ...state.tierLayout };
  delete newLayout[id];

  const newEntities = { ...state.itemEntities };

  if (fallbackId && orphanedItemIds.length > 0) {
    newLayout[fallbackId] = [...(newLayout[fallbackId] || []), ...orphanedItemIds];
  } else {
    // Remove deleted items from entities if there's no fallback tier
    orphanedItemIds.forEach((itemId) => {
      delete newEntities[itemId];
    });
  }

  return {
    ...state,
    tierDefs: state.tierDefs.filter((t) => t.id !== id),
    tierLayout: newLayout,
    itemEntities: newEntities,
  };
}

/**
 * Slice reducer for tier-related actions.
 * @param state - Current tier list state.
 * @param action - TierListAction related to tier structure.
 * @returns New state if handled, otherwise original state.
 */
export function tierReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.ADD_TIER: {
      return handleAddTier(state);
    }

    case ActionType.DELETE_TIER: {
      return handleDeleteTier(state, action.payload);
    }

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

    default: {
      return state;
    }
  }
}
