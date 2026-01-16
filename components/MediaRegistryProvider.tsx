/**
 * @file MediaRegistryProvider.tsx
 * @description A persistent global cache for media items.
 * Acts as a "Shared Memory" for the application, ensuring that once an item's details or image 
 * are found in one part of the app (e.g. Search), they are available everywhere (e.g. Board).
 * Implements a FIFO pruning mechanism to prevent localStorage bloat.
 * @module MediaRegistryProvider
 */

'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { MediaItem } from '@/lib/types';
import { usePersistentState } from '@/lib/hooks/usePersistentState';

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
}

const MediaRegistryContext = createContext<MediaRegistryContextValue | undefined>(undefined);

/**
 * Custom hook to consume the Media Registry.
 * 
 * @returns The MediaRegistryContextValue.
 * @throws Error if used outside of a MediaRegistryProvider.
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
 * Provider component for the Global Media Registry.
 * Handles persistence to IndexedDB and FIFO pruning.
 */
export function MediaRegistryProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = usePersistentState<Record<string, MediaItem>>('moat-media-registry', INITIAL_REGISTRY);

  /**
   * Internal helper to prune the registry if it gets too large.
   * Simple FIFO-ish pruning by removing oldest keys.
   */
  const pruneRegistry = useCallback((current: Record<string, MediaItem>) => {
    const keys = Object.keys(current);
    if (keys.length <= MAX_REGISTRY_SIZE) return current;
    
    // Remove the first 200 items to create some breathing room
    const next = { ...current };
    keys.slice(0, 200).forEach(k => delete next[k]);
    return next;
  }, []);

  /**
   * Core merging logic for one or more items.
   * Efficiently checks for changes before updating state.
   */
  const mergeItems = useCallback((prev: Record<string, MediaItem>, items: MediaItem[]) => {
    let hasChanges = false;
    let next = { ...prev };
    
    for (const item of items) {
      if (!item.id) continue;

      const existing = next[item.id];
      if (existing) {
          // Optimization: Shallow compare critical fields first to avoid deep stringify
          const isUrlChanged = item.imageUrl && item.imageUrl !== existing.imageUrl;
          const isDetailsChanged = item.details && JSON.stringify(item.details) !== JSON.stringify(existing.details);
          
          const isMetadataGeneralChanged = item.title !== existing.title;
          let isArtistChanged = false;

          // Only compare 'artist' field for non-artist types
          if (item.type !== 'artist' && existing.type !== 'artist') {
              isArtistChanged = item.artist !== existing.artist;
          }

          if (isUrlChanged || isDetailsChanged || isMetadataGeneralChanged || isArtistChanged) {
              next[item.id] = {
                  ...existing,
                  ...item,
                  // Keep existing assets if new ones are missing
                  imageUrl: item.imageUrl || existing.imageUrl,
                  details: item.details || existing.details
              };
              hasChanges = true;
          }
      } else {
          next[item.id] = item;
          hasChanges = true;
      }
    }

    if (hasChanges) {
        next = pruneRegistry(next);
        return next;
    }
    return prev;
  }, [pruneRegistry]);

  /**
   * Batched version of registry update.
   * Preferred for search result delivery or board hydration.
   */
  const registerItems = useCallback((items: MediaItem[]) => {
    setRegistry(prev => mergeItems(prev, items));
  }, [setRegistry, mergeItems]);

  /**
   * Single item registration.
   */
  const registerItem = useCallback((item: MediaItem) => {
    setRegistry(prev => mergeItems(prev, [item]));
  }, [setRegistry, mergeItems]);

  /**
   * Retrieval helper.
   */
  const getItem = useCallback(<T extends MediaItem>(id: string): T | undefined => {
    return registry[id] as T | undefined;
  }, [registry]);

  return (
    <MediaRegistryContext.Provider value={{ registerItems, registerItem, getItem }}>
      {children}
    </MediaRegistryContext.Provider>
  );
}
