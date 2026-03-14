/**
 * @file global-reducer.ts
 * @description Specialized slice case reducers for global application state via Redux Toolkit.
 * Handles top-level properties like the board title.
 * @module GlobalSliceReducers
 */

import { PayloadAction } from '@reduxjs/toolkit';

import { TierListState } from '@/board/types';

/**
 * RTK Case Reducer for updating the global title of the tier list.
 */
export const handleGlobalState = {
  updateTitle: (state: TierListState, action: PayloadAction<{ title: string }>): void => {
    // MUTATE VIA IMMER
    state.title = action.payload.title;
  }
};
