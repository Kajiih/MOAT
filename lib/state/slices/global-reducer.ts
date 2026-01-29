/**
 * @file global-reducer.ts
 * @description specialized slice reducer for global application state.
 * Handles top-level properties like the board title, as well as state-wide operations
 * like clearing the board or importing a full state snapshot.
 * @module GlobalSliceReducer
 */

import { getInitialState } from '@/lib/initial-state';
import { TierListState } from '@/lib/types';

import { ActionType, TierListAction } from '../actions';

/**
 * Slice reducer for global application actions.
 * @param state - Current tier list state.
 * @param action - TierListAction related to global configuration or state overrides.
 * @returns New state if handled, otherwise original state.
 */
export function globalReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    case ActionType.UPDATE_TITLE: {
      return { ...state, title: action.payload.title };
    }

    case ActionType.CLEAR_BOARD: {
      return { ...getInitialState(), category: state.category || 'music' };
    }

    case ActionType.IMPORT_STATE:
    case ActionType.SET_STATE: {
      const newState = action.payload.state;
      // Self-healing: Ensure itemLookup exists
      if (!newState.itemLookup) {
        newState.itemLookup = {};
        Object.entries(newState.items).forEach(([tierId, items]) => {
          items.forEach((item) => {
            newState.itemLookup![item.id] = tierId;
          });
        });
      }
      return newState;
    }

    case ActionType.UPDATE_CATEGORY: {
      return { ...state, category: action.payload.category };
    }

    default: {
      return state;
    }
  }
}
