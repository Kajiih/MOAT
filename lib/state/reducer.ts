/**
 * @file reducer.ts
 * @description The core state management logic for the Tier List.
 * Implements a pure reducer function that transforms the TierListState based on dispatched actions.
 * Handles structural changes, item positioning, and data integrity (e.g., duplicate checks).
 * @module TierListReducer
 */

import { TierListState, MediaItem, TierDefinition } from '@/lib/types';
import { ActionType, TierListAction } from './actions';
import { TIER_COLORS } from '@/lib/colors';
import { INITIAL_STATE } from '@/lib/initial-state';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Utility function to find which tier (container) an item belongs to.
 * @param id - The ID of the item to locate.
 * @param currentItems - The current items map from state.
 * @returns The ID of the tier containing the item, or undefined if not found.
 */
const findContainer = (id: string, currentItems: Record<string, MediaItem[]>): string | undefined => {
  if (id in currentItems) return id;
  return Object.keys(currentItems).find((key) => currentItems[key].find((a) => a.id === id));
};

/**
 * The primary reducer for the Tier List application.
 * 
 * @param state - The current application state.
 * @param action - The action to perform.
 * @returns A new state object reflecting the changes.
 */
export function tierListReducer(state: TierListState, action: TierListAction): TierListState {
  switch (action.type) {
    // --- TIER STRUCTURE ---
    case ActionType.ADD_TIER: {
      const newId = crypto.randomUUID();
      const usedColors = new Set(state.tierDefs.map(t => t.color));
      const availableColors = TIER_COLORS.filter(c => !usedColors.has(c.id));
      
      const randomColorObj = availableColors.length > 0 
          ? availableColors[Math.floor(Math.random() * availableColors.length)]
          : TIER_COLORS[Math.floor(Math.random() * TIER_COLORS.length)];

      const newTier: TierDefinition = {
          id: newId,
          label: 'New Tier',
          color: randomColorObj.id
      };

      return {
          ...state,
          tierDefs: [...state.tierDefs, newTier],
          items: { ...state.items, [newId]: [] }
      };
    }

    case ActionType.DELETE_TIER: {
      const { id } = action.payload;
      const tierIndex = state.tierDefs.findIndex(t => t.id === id);
      if (tierIndex === -1) return state;

      const fallbackId = state.tierDefs.find(t => t.id !== id)?.id;
      const orphanedItems = state.items[id] || [];
      const newItems = { ...state.items };
      delete newItems[id];

      if (fallbackId && orphanedItems.length > 0) {
          newItems[fallbackId] = [...newItems[fallbackId], ...orphanedItems];
      }

      return {
          ...state,
          tierDefs: state.tierDefs.filter(t => t.id !== id),
          items: newItems
      };
    }

    case ActionType.UPDATE_TIER: {
      const { id, updates } = action.payload;
      return {
          ...state,
          tierDefs: state.tierDefs.map(t => t.id === id ? { ...t, ...updates } : t)
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

    // --- ITEM MANIPULATION ---
    case ActionType.MOVE_ITEM: {
        const { activeId, overId, activeItem: draggingItemFromSearch } = action.payload;
        
        const activeContainer = findContainer(activeId, state.items);
        const overContainer = findContainer(overId, state.items);

        if (!overContainer) return state;

        // Case 1: Dragging from Search (New Item)
        if (!activeContainer) {
            if(!draggingItemFromSearch) return state;
            
            const overItems = state.items[overContainer];
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            let newIndex;
            if (overId in state.items) {
                // Dropped on Empty Tier container
                newIndex = overItems.length + 1;
            } else {
                // Dropped over another item
                // Simplification: We don't have rect data here easily, defaulting to "after" or "at index"
                // For a reducer, precise pixel collision is hard.
                // We assume basic index logic: if overId is an item, put it there.
                // NOTE: The UI logic passed complex rect calculation. 
                // To keep this pure, we might lose sub-pixel precision unless passed in payload.
                // For now, simple insertion.
                newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;
            }

            // Duplicate check
            const exists = Object.values(state.items).flat().some(i => i.id === draggingItemFromSearch.id);
            if (exists) return state;

            return {
                ...state,
                items: {
                    ...state.items,
                    [overContainer]: [
                        ...state.items[overContainer].slice(0, newIndex),
                        { ...draggingItemFromSearch, id: activeId },
                        ...state.items[overContainer].slice(newIndex)
                    ],
                }
            };
        }

        // Case 2: Sorting within same container
        if (activeContainer === overContainer) {
             const activeItems = state.items[activeContainer];
             const activeIndex = activeItems.findIndex((i) => i.id === activeId);
             const overIndex = activeItems.findIndex((i) => i.id === overId);

             if (activeIndex !== overIndex) {
                 return {
                     ...state,
                     items: {
                         ...state.items,
                         [activeContainer]: arrayMove(activeItems, activeIndex, overIndex)
                     }
                 };
             }
             return state;
        }

        // Case 3: Moving between tiers
        const activeItems = state.items[activeContainer];
        const overItems = state.items[overContainer];
        const activeIndex = activeItems.findIndex((item) => item.id === activeId);
        const overIndex = overItems.findIndex((item) => item.id === overId);

        let newIndex;
        if (overId in state.items) {
            newIndex = overItems.length + 1;
        } else {
            newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;
        }

        return {
            ...state,
            items: {
                ...state.items,
                [activeContainer]: [
                    ...state.items[activeContainer].filter((item) => item.id !== activeId),
                ],
                [overContainer]: [
                    ...state.items[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...state.items[overContainer].slice(newIndex),
                ],
            }
        };
    }

    case ActionType.REMOVE_ITEM: {
      const { tierId, itemId } = action.payload;
      return {
          ...state,
          items: {
              ...state.items,
              [tierId]: state.items[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
          }
      };
    }

    case ActionType.UPDATE_ITEM: {
        const { itemId, updates } = action.payload;
        const newItems = { ...state.items };
        let modified = false;

        const tierIds = Object.keys(newItems);
        for (const tierId of tierIds) {
            const list = newItems[tierId];
            const index = list.findIndex(a => a.id === itemId);
            if (index !== -1) {
                const currentItem = list[index];
                
                if (updates.details && currentItem.details) {
                    const currentDetailsStr = JSON.stringify(currentItem.details);
                    const newDetailsStr = JSON.stringify(updates.details);
                    if (currentDetailsStr === newDetailsStr && Object.keys(updates).length === 1) {
                        break; // No change
                    }
                }

                newItems[tierId] = [
                    ...list.slice(0, index),
                    { ...currentItem, ...updates } as MediaItem,
                    ...list.slice(index + 1)
                ];
                modified = true;
                break;
            }
        }
        return modified ? { ...state, items: newItems } : state;
    }

    // --- GLOBAL ---
    case ActionType.UPDATE_TITLE:
      return { ...state, title: action.payload.title };

    case ActionType.RANDOMIZE_COLORS: {
        let pool = [...TIER_COLORS];
        const newDefs = state.tierDefs.map(tier => {
            if (pool.length === 0) pool = [...TIER_COLORS];
            const index = Math.floor(Math.random() * pool.length);
            const color = pool[index];
            pool.splice(index, 1);
            return { ...tier, color: color.id };
        });
        return { ...state, tierDefs: newDefs };
    }

    case ActionType.CLEAR_BOARD:
      return INITIAL_STATE;

    case ActionType.IMPORT_STATE:
    case ActionType.SET_STATE:
      return action.payload.state;

    default:
      return state;
  }
}
