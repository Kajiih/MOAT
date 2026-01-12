/**
 * @file BoardDetailBundler.tsx
 * @description A "headless" background component that acts as a sync engine.
 * Monitors items on the board and automatically fetches deep metadata (tracklists, years, tags) 
 * for any item that is missing it. Ensures the board state is "feature-complete" without blocking the UI.
 * @module BoardDetailBundler
 */

'use client';

import { useEffect, useMemo } from 'react';
import { MediaItem, MediaDetails } from '@/lib/types';
import { useMediaDetails } from '@/lib/hooks';

interface SyncItemProps {
  item: MediaItem;
  onSync: (itemId: string, details: MediaDetails) => void;
}

/**
 * A sub-component that handles the fetch and sync for a single item.
 * This keeps the main bundler logic clean and leverages SWR hooks.
 */
function SyncItem({ item, onSync }: SyncItemProps) {
  const { details, isLoading, isFetching, error } = useMediaDetails(item.id, item.type);

  useEffect(() => {
    if (details && !isLoading && !isFetching && !error) {
      onSync(item.id, details);
    }
  }, [details, isLoading, isFetching, error, item.id, onSync]);

  return null;
}

interface BoardDetailBundlerProps {
  items: MediaItem[];
  onUpdateItem: (itemId: string, updates: Partial<MediaItem>) => void;
}

/**
 * Background component that monitors the board and ensures every item has its details populated.
 */
export function BoardDetailBundler({ items, onUpdateItem }: BoardDetailBundlerProps) {
  // Find items that are missing their deep details
  const itemsToSync = useMemo(() => {
    // Only fetch for items items that are clearly missing details
    // We limit the concurrent sync to 3 items to avoid smashing the API
    return items
      .filter(item => !item.details)
      .slice(0, 3); 
  }, [items]);

  return (
    <>
      {itemsToSync.map(item => (
        <SyncItem 
          key={item.id} 
          item={item} 
          onSync={(id, details) => onUpdateItem(id, { 
            details, 
            imageUrl: details.imageUrl || item.imageUrl 
          })} 
        />
      ))}
    </>
  );
}
