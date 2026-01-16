/**
 * @file reducer.ts
 * @description The core state management logic for the Tier List.
 * Delegates state transitions to specialized slice reducers.
 * @module TierListReducer
 */

import { TierListState } from '@/lib/types';
import { TierListAction } from './actions';
import { tierReducer } from './slices/tier-reducer';
import { itemReducer } from './slices/item-reducer';
import { globalReducer } from './slices/global-reducer';

/**
 * The primary reducer for the Tier List application.
 * Delegates actions to specialized slice reducers for better maintainability.
 * 
 * @param state - The current application state.
 * @param action - The action to perform.
 * @returns A new state object reflecting the changes.
 */
export function tierListReducer(state: TierListState, action: TierListAction): TierListState {
  // Try each slice reducer. Slice reducers return the unchanged state if they don't handle the action.
  
  // 1. Structural changes (Tiers)
  let nextState = tierReducer(state, action);
  if (nextState !== state) return nextState;

  // 2. Item manipulation
  nextState = itemReducer(state, action);
  if (nextState !== state) return nextState;

  // 3. Global actions (Title, Import, Clear)
  return globalReducer(state, action);
}
