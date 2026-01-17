/**
 * @file InteractionContext.tsx
 * @description Provides a context for tracking UI interactions like hovering,
 * allowing components deep in the tree to report their status to top-level listeners.
 * @module InteractionContext
 */

'use client';

import { createContext, useContext } from 'react';
import { MediaItem } from '@/lib/types';

/**
 * Metadata for an item currently being hovered in the UI.
 */
export interface HoveredItemInfo {
  /** The media item object. */
  item: MediaItem;
  /** Optional ID of the tier where the item is located. */
  tierId?: string;
}

interface InteractionContextType {
  setHoveredItem: (info: HoveredItemInfo | null) => void;
}

export const InteractionContext = createContext<InteractionContextType | null>(null);

/**
 * Custom hook to consume the Interaction Context.
 * Used for reporting or responding to global hover events.
 * @returns The interaction context value, or null if used outside of a provider.
 */
export function useInteraction() {
  const context = useContext(InteractionContext);
  // We don't throw an error here to allow components to work without the context (graceful degradation)
  // or if they are used in tests/isolations where interaction isn't critical.
  return context;
}
