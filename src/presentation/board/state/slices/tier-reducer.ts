/**
 * @file tier-reducer.ts
 * @description Specialized slice case reducers for managing tier structure and visual properties via Redux Toolkit.
 * Handles adding, deleting, and updating tiers, as well as color randomization.
 * @module TierSliceReducers
 */

import { PayloadAction } from '@reduxjs/toolkit';

import { TierDefinition, TierId, TierListState, TierUpdate } from '@/presentation/board/types';
import { arrayMove } from '@/lib/array';
import { TIER_COLORS } from '@/lib/colors';

/**
 * RTK Case Reducer for adding a new tier with a unique ID and a random unused color.
 * @param state - The draft state provided by Immer.
 */
export function handleAddTier(state: TierListState): void {
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

  // MUTATE VIA IMMER
  state.tierDefs.push(newTier);
  state.tierLayout[newId] = [];
}

/**
 * RTK Case Reducer for deleting a tier and optionally migrating its items to a fallback tier.
 * @param state - The draft state provided by Immer.
 * @param action - The RTK PayloadAction containing the tier ID to delete.
 */
export function handleDeleteTier(
  state: TierListState,
  action: PayloadAction<{ id: string | TierId }>,
): void {
  const { id } = action.payload;
  const tierIndex = state.tierDefs.findIndex((t) => t.id === id);
  if (tierIndex === -1) return;

  const fallbackId = state.tierDefs.find((t) => t.id !== id)?.id;
  const orphanedItemIds = state.tierLayout[id] || [];

  // MUTATE VIA IMMER
  state.tierDefs.splice(tierIndex, 1);
  delete state.tierLayout[id];

  if (fallbackId && orphanedItemIds.length > 0) {
    if (!state.tierLayout[fallbackId]) state.tierLayout[fallbackId] = [];
    state.tierLayout[fallbackId].push(...orphanedItemIds);
  } else {
    // Remove deleted items from entities if there's no fallback tier
    orphanedItemIds.forEach((itemId) => {
      delete state.itemEntities[itemId];
    });
  }
}

/**
 * RTK Case Reducer for updating a tier's metadata.
 * @param state - The draft state provided by Immer.
 * @param action - The RTK PayloadAction containing the tier ID and updates.
 */
export function handleUpdateTier(
  state: TierListState,
  action: PayloadAction<{ id: string | TierId; updates: TierUpdate }>,
): void {
  const { id, updates } = action.payload;
  const tier = state.tierDefs.find((t) => t.id === id);

  if (tier) {
    // MUTATE VIA IMMER
    Object.assign(tier, updates);
  }
}

/**
 * RTK Case Reducer for reordering tiers vertically.
 * @param state - The draft state provided by Immer.
 * @param action - The RTK PayloadAction containing the active and over tier IDs.
 */
export function handleReorderTiers(
  state: TierListState,
  action: PayloadAction<{ activeId: string | TierId; overId: string | TierId }>,
): void {
  const { activeId, overId } = action.payload;
  const oldIndex = state.tierDefs.findIndex((t) => t.id === activeId);
  const newIndex = state.tierDefs.findIndex((t) => t.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

  // MUTATE VIA IMMER
  state.tierDefs = arrayMove(state.tierDefs, oldIndex, newIndex);
}

/**
 * RTK Case Reducer for shuffling all tier colors.
 * @param state - The draft state provided by Immer.
 */
export function handleRandomizeColors(state: TierListState): void {
  let pool = [...TIER_COLORS];

  // MUTATE VIA IMMER
  state.tierDefs.forEach((tier) => {
    if (pool.length === 0) pool = [...TIER_COLORS];
    const index = Math.floor(Math.random() * pool.length);
    const color = pool[index];
    pool.splice(index, 1);
    tier.color = color.id;
  });
}
