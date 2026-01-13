/**
 * @file TierListContext.tsx
 * @description Provides the React Context for managing the global state of the Tier List.
 * Includes state persistence, hydration status, and registry synchronization.
 * This context is the "source of truth" for the active board data.
 * @module TierListContext
 */

'use client';

import React, { createContext, useContext, useMemo, useRef, useEffect, useState, ReactNode } from 'react';
import { MediaItem, TierListState } from '@/lib/types';
import { usePersistentState } from '@/lib/hooks/usePersistentState';
import { useMediaRegistry } from '@/components/MediaRegistryProvider';
import { INITIAL_STATE } from '@/lib/initial-state';

const LOCAL_STORAGE_KEY = 'moat-tierlist';

/**
 * Interface defining the shape of the Tier List Context.
 * Provides access to the board state, computed values, and helper methods.
 */
interface TierListContextType {
  /** The core state of the tier list (tiers, items, title). */
  state: TierListState;
  /** Dispatcher to update the core state. */
  setState: React.Dispatch<React.SetStateAction<TierListState>>;
  /** Flag indicating if the state has been hydrated from localStorage. */
  isHydrated: boolean;
  
  // Computed
  /** Flattened list of all items currently on the board. */
  allBoardItems: MediaItem[];
  /** Set of unique IDs for items on the board (excluding drag-specific prefixes). */
  addedItemIds: Set<string>;

  // UI State
  /** The item currently displayed in the details modal, or null if closed. */
  detailsItem: MediaItem | null;
  /** Sets the item to display in the details modal. */
  setDetailsItem: React.Dispatch<React.SetStateAction<MediaItem | null>>;
  
  // Helpers
  /** Updates a specific media item on the board and syncs with the registry. */
  updateMediaItem: (itemId: string, updates: Partial<MediaItem>) => void;
}

const TierListContext = createContext<TierListContextType | null>(null);

/**
 * Provider component for the Tier List Context.
 * Manages the top-level state and persistence for the application.
 * 
 * @param props.children - Child components that will have access to the context.
 */
export function TierListProvider({ children }: { children: ReactNode }) {
  const [state, setState, isHydrated] = usePersistentState<TierListState>(LOCAL_STORAGE_KEY, INITIAL_STATE);
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  
  const { registerItem } = useMediaRegistry();
  const itemsToRegister = useRef<MediaItem[]>([]);

  // Computed values
  const allBoardItems = useMemo(() => {
    return Object.values(state.items).flat();
  }, [state.items]);

  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    allBoardItems.forEach(item => {
        const cleanId = item.id.replace(/^search-/, '');
        ids.add(cleanId);
    });
    return ids;
  }, [allBoardItems]);

  // Sync items to registry after state updates
  useEffect(() => {
    if (itemsToRegister.current.length > 0) {
      itemsToRegister.current.forEach(item => registerItem(item));
      itemsToRegister.current = [];
    }
  });

  const updateMediaItem = React.useCallback((itemId: string, updates: Partial<MediaItem>) => {
    setState(prev => {
        const newItems = { ...prev.items };
        let modified = false;

        const tierIds = Object.keys(newItems);
        for (const tierId of tierIds) {
            const list = newItems[tierId];
            const index = list.findIndex(a => a.id === itemId);
            if (index !== -1) {
                const currentItem = list[index];
                
                // PERFORMANCE: Skip update if details are effectively identical
                if (updates.details && currentItem.details) {
                    const currentDetailsStr = JSON.stringify(currentItem.details);
                    const newDetailsStr = JSON.stringify(updates.details);
                    if (currentDetailsStr === newDetailsStr && Object.keys(updates).length === 1) {
                        return prev;
                    }
                }

                const updatedItem = { ...currentItem, ...updates } as MediaItem;
                
                newItems[tierId] = [
                    ...list.slice(0, index),
                    updatedItem,
                    ...list.slice(index + 1)
                ];

                // Queue for registry update (will happen in useEffect)
                itemsToRegister.current.push(updatedItem);
                modified = true;
                break;
            }
        }
        return modified ? { ...prev, items: newItems } : prev;
    });
  }, [setState]);

  const value = useMemo(() => ({
    state,
    setState,
    isHydrated,
    allBoardItems,
    addedItemIds,
    detailsItem,
    setDetailsItem,
    updateMediaItem
  }), [state, setState, isHydrated, allBoardItems, addedItemIds, detailsItem, updateMediaItem]);

  return (
    <TierListContext.Provider value={value}>
      {children}
    </TierListContext.Provider>
  );
}

/**
 * Custom hook to consume the Tier List Context.
 * Must be used within a TierListProvider.
 * 
 * @returns The TierListContextType object.
 * @throws Error if used outside of a TierListProvider.
 */
export function useTierListContext() {
  const context = useContext(TierListContext);
  if (!context) {
    throw new Error('useTierListContext must be used within a TierListProvider');
  }
  return context;
}
