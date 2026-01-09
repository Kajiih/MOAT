'use client';

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { MediaItem } from '@/lib/types';

interface MediaRegistryContextValue {
  registerItems: (items: MediaItem[]) => void;
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

export function MediaRegistryProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<Record<string, MediaItem>>({});

  const registerItems = useCallback((items: MediaItem[]) => {
    setRegistry(prev => {
      let hasChanges = false;
      const next = { ...prev };
      
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = item;
          hasChanges = true;
        }
      }
      
      return hasChanges ? next : prev;
    });
  }, []);

  const getItem = useCallback(<T extends MediaItem>(id: string): T | undefined => {
    return registry[id] as T | undefined;
  }, [registry]);

  return (
    <MediaRegistryContext.Provider value={{ registerItems, getItem }}>
      {children}
    </MediaRegistryContext.Provider>
  );
}
