/**
 * @file global-reducer.ts
 * @description specialized slice reducer for global application state.
 * Handles top-level properties like the board title, as well as state-wide operations
 * like clearing the board or importing a full state snapshot.
 * @module GlobalSliceReducer
 */

import { getInitialState } from '@/board/initial-state';
import { TierListState } from '@/board/types';

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
      return { ...getInitialState() };
    }

    case ActionType.IMPORT_STATE:
    case ActionType.SET_STATE: {
      const newState = { ...action.payload.state };
      
      // Self-healing: Migrate legacy `items` state to normalized schema if found
      if ('items' in newState && (!newState.itemEntities || !newState.tierLayout)) {
        newState.itemEntities = {};
        newState.tierLayout = {};
        
        const legacyItems = (newState as unknown as { items?: Record<string, import('@/board/types').Item[]> }).items;
        
        if (legacyItems) {
          Object.entries(legacyItems).forEach(([tierId, itemsList]) => {
            newState.tierLayout[tierId] = itemsList.map((item) => {
              newState.itemEntities[item.id] = item;
              return item.id;
            });
          });
        }
        
        // Remove legacy fields
        delete (newState as unknown as { items?: unknown }).items;
        delete (newState as unknown as { itemLookup?: unknown }).itemLookup;
      }
      
      return newState;
    }

    default: {
      return state;
    }
  }
}
