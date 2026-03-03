/**
 * @file MediaRegistryProvider.tsx
 * @description Provides a global, persistent registry for media items (Albums, Artists, Songs).
 * Acts as a LRU-ish cache in IndexedDB to ensure consistency across the app and sessions.
 * @module MediaRegistryProvider
 */

'use client';

import React, { createContext, useCallback, useContext } from 'react';

import { usePersistentState } from '@/lib/hooks/usePersistentState';
import { MediaItem } from '@/lib/types';
import { hasMediaItemUpdates } from '@/lib/utils/comparisons';

/**
 * Maximum items allowed in the persistent registry before pruning.
 */
const MAX_REGISTRY_SIZE = 2000;

/**
 * Initial empty state for the registry.
 */
const INITIAL_REGISTRY: Record<string, MediaItem> = {};

/**
 * Shape of the Media Registry Context.
 */
interface MediaRegistryContextType {
  /** Batched registration of multiple items. */
  registerItems: (items: MediaItem[]) => void;
  /** Registration of a single item. */
  registerItem: (item: MediaItem) => void;
  /** Retrieval of an item by its globally unique ID. */
  getItem: <T extends MediaItem>(id: string) => T | undefined;
  /** Current number of items in the registry. */
  registrySize: number;
  /** Clear all registry data. */
  clearRegistry: () => void;
}

const MediaRegistryContext = createContext<MediaRegistryContextType | null>(null);

/**
 * Internal logic to determine if an existing item should be updated with new data.
 * Prioritizes retaining existing metadata while accepting "upgrades" like deep details or fixed images.
 * @param existing - The item currently in the registry.
 * @param newItem - The new data being proposed.
 * @returns True if the registry should be updated.
 */
function shouldUpdateItem(existing: MediaItem, newItem: MediaItem): boolean {
  // If we have details now but didn't before, definitely update
  if (newItem.details && !existing.details) return true;

  // Use the standard comparison utility for other fields
  return hasMediaItemUpdates(existing, newItem);
}

/**
 * Provider component for the Media Registry.
 * Handles persistence to IndexedDB via the usePersistentState hook.
 * @param props - Component props.
 * @param props.children - Child components.
 * @returns The provider component for the Media Registry.
 */
export function MediaRegistryProvider({ children }: { children: React.ReactNode }) {
  const [registry, setRegistry] = usePersistentState<Record<string, MediaItem>>(
    'moat-media-registry',
    INITIAL_REGISTRY,
  );

  /**
   * Internal helper to prune the registry if it gets too large.
   * Simple FIFO-ish pruning by removing oldest keys.
   */
  const pruneRegistry = useCallback((current: Record<string, MediaItem>) => {
    const keys = Object.keys(current);
    if (keys.length <= MAX_REGISTRY_SIZE) return current;

    // Remove the first 200 items to create some breathing room
    const next = { ...current };
    keys.slice(0, 200).forEach((k) => delete next[k]);
    return next;
  }, []);

  /**
   * Core merging logic for one or more items.
   * Efficiently checks for changes before updating state.
   */
  const mergeItems = useCallback(
    (prev: Record<string, MediaItem>, items: MediaItem[]) => {
      let hasChanges = false;
      const next = { ...prev };

      for (const item of items) {
        if (!item.id) continue;

        const existing = next[item.id];
        if (existing) {
          if (shouldUpdateItem(existing, item)) {
            next[item.id] = {
              ...existing,
              ...item,
              // Special handling for nested structures
              details: item.details || existing.details,
              imageUrl: item.imageUrl || existing.imageUrl,
            };
            hasChanges = true;
          }
        } else {
          next[item.id] = item;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        return pruneRegistry(next);
      }
      return prev;
    },
    [pruneRegistry],
  );

  /**
   * Batched version of registry update.
   * Preferred for search result delivery or board hydration.
   */
  const registerItems = useCallback(
    (items: MediaItem[]) => {
      setRegistry((prev) => mergeItems(prev, items));
    },
    [setRegistry, mergeItems],
  );

  /**
   * Single item registration.
   */
  const registerItem = useCallback(
    (item: MediaItem) => {
      setRegistry((prev) => mergeItems(prev, [item]));
    },
    [setRegistry, mergeItems],
  );

  /**
   * Retrieval helper.
   */
  const getItem = useCallback(
    <T extends MediaItem>(id: string): T | undefined => {
      return registry[id] as T | undefined;
    },
    [registry],
  );

  /**
   * Debug helper to clear the registry.
   */
  const clearRegistry = useCallback(() => {
    setRegistry({});
  }, [setRegistry]);

  return (
    <MediaRegistryContext.Provider
      value={{
        registerItems,
        registerItem,
        getItem,
        registrySize: Object.keys(registry).length,
        clearRegistry,
      }}
    >
      {children}
    </MediaRegistryContext.Provider>
  );
}

/**
 * Custom hook to consume the Media Registry.
 * @returns The Media Registry context object.
 * @throws {Error} if used outside of a MediaRegistryProvider.
 */
export function useMediaRegistry() {
  const context = useContext(MediaRegistryContext);
  if (!context) {
    throw new Error('useMediaRegistry must be used within a MediaRegistryProvider');
  }
  return context;
}
