/**
 * @file reducer.ts
 * @description The core state management logic for the Tier List.
 * Delegates state transitions to specialized slice reducers.
 * @module TierListReducer
 */

import { assertNever, TierListState } from '@/lib/types';

import { ActionType, TierListAction } from './actions';
import { globalReducer } from './slices/global-reducer';
import { itemReducer } from './slices/item-reducer';
import { tierReducer } from './slices/tier-reducer';

/**
 * The primary reducer for the Tier List application.
 * Delegates actions to specialized slice reducers for better maintainability.
 * @param state - The current application state.
 * @param action - The action to perform.
 * @returns A new state object reflecting the changes.
 */
export function tierListReducer(state: TierListState, action: TierListAction): TierListState {
  // 1. Structural changes (Tiers)
  let nextState = tierReducer(state, action);
  if (nextState !== state) return nextState;

  // 2. Item manipulation
  nextState = itemReducer(state, action);
  if (nextState !== state) return nextState;

  // 3. Global actions (Title, Import, Clear)
  nextState = globalReducer(state, action);
  if (nextState !== state) return nextState;

  // 4. Exhaustiveness check for the action type
  // This ensures that all ActionTypes are at least KNOWN by the system,
  // even if a specific action results in no state change.
  switch (action.type) {
    case ActionType.ADD_TIER:
    case ActionType.DELETE_TIER:
    case ActionType.UPDATE_TIER:
    case ActionType.REORDER_TIERS:
    case ActionType.MOVE_ITEM:
    case ActionType.UPDATE_ITEM:
    case ActionType.REMOVE_ITEM:
    case ActionType.UPDATE_TITLE:
    case ActionType.RANDOMIZE_COLORS:
    case ActionType.CLEAR_BOARD:
    case ActionType.IMPORT_STATE:
    case ActionType.SET_STATE:
    case ActionType.UPDATE_CATEGORY:
      return state;
    default:
      return assertNever(action);
  }
}
