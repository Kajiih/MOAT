/**
 * @file global-reducer.ts
 * @description specialized slice reducer for global application state.
 * Handles top-level properties like the board title, as well as state-wide operations
 * like clearing the board or importing a full state snapshot.
 * @module GlobalSliceReducer
 */

import { TierListState } from '@/lib/types';
import { ActionType, TierListAction } from '../actions';
import { INITIAL_STATE } from '@/lib/initial-state';

/**
 * Slice reducer for global application actions.
 * @param state - Current tier list state.
 * @param action - TierListAction related to global configuration or state overrides.
 * @returns New state if handled, otherwise original state.
 */
export function globalReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.UPDATE_TITLE:
      return { ...state, title: action.payload.title };

    case ActionType.CLEAR_BOARD:
      return INITIAL_STATE;

    case ActionType.IMPORT_STATE:
    case ActionType.SET_STATE:
      return action.payload.state;

    default:
      return state;
  }
}
