/**
 * @file MediaRegistryProvider.tsx
 * @description A persistent global cache for media items.
 * Acts as a "Shared Memory" for the application, ensuring that once an item's details or image
 * are found in one part of the app (e.g. Search), they are available everywhere (e.g. Board).
 * Implements a FIFO pruning mechanism to prevent localStorage bloat.
 * @module MediaRegistryProvider
 */

'use client';

import React, { createContext, ReactNode, useCallback, useContext } from 'react';

import { usePersistentState } from '@/lib/hooks/usePersistentState';
import { MediaItem } from '@/lib/types';

/**
 * Interface defining the API for the Media Registry.
 */
interface MediaRegistryContextValue {
  /** Register multiple items at once (optimized for batches). */
  registerItems: (items: MediaItem[]) => void;
  /** Register a single item. */
  registerItem: (item: MediaItem) => void;
  /** Retrieve an item from the registry by its ID. */
  getItem: <T extends MediaItem>(id: string) => T | undefined;
  /** Current number of items in the registry. */
  registrySize: number;
  /** Clear the entire registry (Debug only). */
  clearRegistry: () => void;
}

const MediaRegistryContext = createContext<MediaRegistryContextValue | undefined>(undefined);

/**
 * Custom hook to consume the Media Registry.
 * @returns The MediaRegistryContextValue.
 * @throws {Error} if used outside of a MediaRegistryProvider.
 */
export function useMediaRegistry() {
  const context = useContext(MediaRegistryContext);
  if (!context) {
    throw new Error('useMediaRegistry must be used within a MediaRegistryProvider');
  }
  return context;
}

const MAX_REGISTRY_SIZE = 2000;
const INITIAL_REGISTRY: Record<string, MediaItem> = {};

/**
 * Helper to determine if an item should be updated in the registry.
 * Compares critical fields and avoids unnecessary updates.
 * @param existing - The existing media item in the registry.
 * @param newItem - The new media item to compare.
 * @returns True if the item should be updated, false otherwise.
 */
function shouldUpdateItem(existing: MediaItem, newItem: MediaItem): boolean {
  // Optimization: Shallow compare critical fields first to avoid deep stringify
  const isUrlChanged = newItem.imageUrl && newItem.imageUrl !== existing.imageUrl;
  const isDetailsChanged =
    newItem.details && JSON.stringify(newItem.details) !== JSON.stringify(existing.details);

  const isMetadataGeneralChanged =
    newItem.title !== existing.title || newItem.notes !== existing.notes;
  let isArtistChanged = false;

  // Only compare 'artist' field for types that have it
  if (
    (newItem.type === 'album' || newItem.type === 'song') &&
    (existing.type === 'album' || existing.type === 'song')
  ) {
    isArtistChanged = newItem.artist !== existing.artist;
  }

  return isUrlChanged || isDetailsChanged || isMetadataGeneralChanged || isArtistChanged;
}

/** Props for the MediaRegistryProvider. */
interface MediaRegistryProviderProps {
  /** The child components that will have access to the context. */
  children: ReactNode;
}

/**
 * Provider component for the Global Media Registry.
 * Handles persistence to IndexedDB and FIFO pruning.
 * @param props - The props for the component.
 * @param props.children - The child components that will have access to the context.
 * @returns The provider component for the Media Registry.
 */
export function MediaRegistryProvider({ children }: MediaRegistryProviderProps) {
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
              // Keep existing assets if new ones are missing
              imageUrl: item.imageUrl || existing.imageUrl,
              details: item.details || existing.details,
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
