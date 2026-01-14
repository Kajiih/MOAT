/**
 * @file actions.ts
 * @description Defines the comprehensive set of actions and action types used by the Tier List reducer.
 * Following the Flux/Redux pattern, these actions represent every possible state mutation in the app.
 * @module StateActions
 */

import { MediaItem, TierDefinition, TierListState } from '@/lib/types';

/**
 * Enumeration of all possible action types that can be dispatched to the tierListReducer.
 */
export enum ActionType {
  /** Adds a new tier with a random color to the bottom of the board. */
  ADD_TIER = 'ADD_TIER',
  /** Removes a tier and moves any orphaned items to a fallback tier. */
  DELETE_TIER = 'DELETE_TIER',
  /** Updates properties of a specific tier (label, color). */
  UPDATE_TIER = 'UPDATE_TIER',
  /** Reorders tiers in the vertical list. */
  REORDER_TIERS = 'REORDER_TIERS',
  
  /** Moves an item within a tier, between tiers, or adds it from search. */
  MOVE_ITEM = 'MOVE_ITEM',
  /** Updates metadata for a specific item (e.g., deep details). */
  UPDATE_ITEM = 'UPDATE_ITEM',
  /** Removes an item from its current tier. */
  REMOVE_ITEM = 'REMOVE_ITEM',
  
  /** Updates the global title of the tier list. */
  UPDATE_TITLE = 'UPDATE_TITLE',
  /** Shuffles colors for all existing tiers. */
  RANDOMIZE_COLORS = 'RANDOMIZE_COLORS',
  /** Resets the board to its initial default state. */
  CLEAR_BOARD = 'CLEAR_BOARD',
  /** Replaces the entire state with imported data. */
  IMPORT_STATE = 'IMPORT_STATE',
  /** Replaces state during Undo/Redo operations. */
  SET_STATE = 'SET_STATE'
}

/**
 * Discriminated union of all action objects.
 * Each action includes its type and its specific payload requirements.
 */
export type TierListAction = 
  | { type: ActionType.ADD_TIER }
  | { type: ActionType.DELETE_TIER; payload: { id: string } }
  | { type: ActionType.UPDATE_TIER; payload: { id: string; updates: Partial<TierDefinition> } }
  | { type: ActionType.REORDER_TIERS; payload: { oldIndex: number; newIndex: number } }
  
  | { type: ActionType.MOVE_ITEM; payload: { 
      activeId: string; 
      overId: string; 
      activeTierId?: string; // Optional: Optimize lookup
      overTierId?: string;   // Optional: Optimize lookup
      activeItem?: MediaItem; // For dragging from search
    } }
  | { type: ActionType.UPDATE_ITEM; payload: { itemId: string; updates: Partial<MediaItem> } }
  | { type: ActionType.REMOVE_ITEM; payload: { tierId: string; itemId: string } }

  | { type: ActionType.UPDATE_TITLE; payload: { title: string } }
  | { type: ActionType.RANDOMIZE_COLORS }
  | { type: ActionType.CLEAR_BOARD }
  | { type: ActionType.IMPORT_STATE; payload: { state: TierListState } }
  | { type: ActionType.SET_STATE; payload: { state: TierListState } };
