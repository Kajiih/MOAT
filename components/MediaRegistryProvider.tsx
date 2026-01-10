'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { MediaItem } from '@/lib/types';
import { usePersistentState } from '@/lib/hooks/usePersistentState';

interface MediaRegistryContextValue {
  registerItems: (items: MediaItem[]) => void;
  registerItem: (item: MediaItem) => void;
  getItem: <T extends MediaItem>(id: string) => T | undefined;
}

const MediaRegistryContext = createContext<MediaRegistryContextValue | undefined>(undefined);

export function useMediaRegistry() {
  const context = useContext(MediaRegistryContext);
  if (!context) {
    throw new Error('useMediaRegistry must be used within a MediaRegistryProvider');
  }
  return context;
}

const MAX_REGISTRY_SIZE = 2000;

export function MediaRegistryProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = usePersistentState<Record<string, MediaItem>>('moat-media-registry', {});

  /**
   * Internal helper to prune the registry if it gets too large.
   * Simple FIFO-ish pruning by removing oldest keys.
   */
  const pruneRegistry = (current: Record<string, MediaItem>) => {
    const keys = Object.keys(current);
    if (keys.length <= MAX_REGISTRY_SIZE) return current;
    
    // Remove the first 200 items to create some breathing room
    const next = { ...current };
    keys.slice(0, 200).forEach(k => delete next[k]);
    return next;
  };

  const registerItems = useCallback((items: MediaItem[]) => {
    setRegistry(prev => {
      let hasChanges = false;
      let next = { ...prev };
      
      for (const item of items) {
        const existing = next[item.id];
        if (existing) {
            const updated = {
                ...existing,
                ...item,
                imageUrl: item.imageUrl || existing.imageUrl,
                details: item.details || existing.details
            };
            if (JSON.stringify(existing) !== JSON.stringify(updated)) {
                next[item.id] = updated;
                hasChanges = true;
            }
        } else {
            next[item.id] = item;
            hasChanges = true;
        }
      }

      if (hasChanges) {
          next = pruneRegistry(next);
      }
      
      return hasChanges ? next : prev;
    });
  }, [setRegistry]);

  const registerItem = useCallback((item: MediaItem) => {
    setRegistry(prev => {
        const existing = prev[item.id];
        let next = { ...prev };
        let hasChanges = false;

        if (existing) {
            const updated = { 
                ...existing, 
                ...item,
                imageUrl: item.imageUrl || existing.imageUrl,
                details: item.details || existing.details
            };
            if (JSON.stringify(existing) !== JSON.stringify(updated)) {
                next[item.id] = updated;
                hasChanges = true;
            }
        } else {
            next[item.id] = item;
            hasChanges = true;
        }

        if (hasChanges) {
            next = pruneRegistry(next);
            return next;
        }
        return prev;
    });
  }, [setRegistry]);

  const getItem = useCallback(<T extends MediaItem>(id: string): T | undefined => {
    return registry[id] as T | undefined;
  }, [registry]);

  return (
    <MediaRegistryContext.Provider value={{ registerItems, registerItem, getItem }}>
      {children}
    </MediaRegistryContext.Provider>
  );
}
