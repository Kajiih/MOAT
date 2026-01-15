/**
 * @file InteractionContext.tsx
 * @description Provides a context for tracking UI interactions like hovering,
 * allowing components deep in the tree to report their status to top-level listeners.
 * @module InteractionContext
 */

'use client';

import { createContext, useContext } from 'react';
import { MediaItem } from '@/lib/types';

export interface HoveredItemInfo {
  item: MediaItem;
  tierId?: string;
}

interface InteractionContextType {
  setHoveredItem: (info: HoveredItemInfo | null) => void;
}

export const InteractionContext = createContext<InteractionContextType | null>(null);

export function useInteraction() {
  const context = useContext(InteractionContext);
  // We don't throw an error here to allow components to work without the context (graceful degradation)
  // or if they are used in tests/isolations where interaction isn't critical.
  return context;
}
