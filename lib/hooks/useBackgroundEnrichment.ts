/**
 * @file useBackgroundEnrichment.ts
 * @description A hook that acts as a background sync engine.
 * Monitors items on the board and automatically fetches deep metadata (tracklists, years, tags)
 * for any item that is missing it. Ensures the board state is "feature-complete" without blocking the UI.
 * @module useBackgroundEnrichment
 */

import { useEffect, useMemo } from 'react';
import { MediaItem, MediaDetails } from '@/lib/types';
import { useMediaDetails } from '@/lib/hooks/useMediaDetails';

/**
 * Helper hook to handle the fetch and sync for a single item.
 * Leverages SWR via useMediaDetails for caching and deduplication.
 */
function useSingleItemSync(
    item: MediaItem, 
    onSync: (itemId: string, details: MediaDetails) => void
) {
    // Only attempt to fetch if we don't already have details
    const shouldFetch = !item.details;
    const { details, isLoading, isFetching, error } = useMediaDetails(
        shouldFetch ? item.id : null, 
        item.type
    );

    useEffect(() => {
        if (details && !isLoading && !isFetching && !error && shouldFetch) {
            onSync(item.id, details);
        }
    }, [details, isLoading, isFetching, error, item.id, onSync, shouldFetch]);
}

/**
 * Main hook to coordinate background enrichment of board items.
 * 
 * @param items - List of all media items on the board.
 * @param onUpdateItem - Callback to update an item with fetched details.
 */
export function useBackgroundEnrichment(
    items: MediaItem[],
    onUpdateItem: (itemId: string, updates: Partial<MediaItem>) => void
) {
    // Identify items needing synchronization (limit concurrency to 3)
    const itemsToSync = useMemo(() => {
        return items
            .filter(item => !item.details)
            .slice(0, 3);
    }, [items]);

    // We can't conditionally call hooks inside a loop.
    // Instead, we can use a fixed number of "slots" or create a separate component to host the hook call.
    // However, since we are moving AWAY from components, we need a pure hook solution.
    //
    // The previous component `SyncItem` worked because it was a component mounted X times.
    // To replicate this in a single hook without violating Rules of Hooks is tricky if X varies.
    //
    // ALTERNATIVE: Since `useMediaDetails` uses SWR, we can just call the fetcher directly or 
    // allow the previous component pattern but keep it as a "logical" component, OR
    // accept that we might need a small wrapper component just for the *per-item* hook call
    // if we want to stick to declarative hooks.
    //
    // Actually, keeping the "Renderless Component" pattern for *per-item* hooks is valid React 
    // when using hooks that depend on mounting (like SWR).
    // But the goal is to remove `BoardDetailBundler` from the main tree.
    //
    // Let's implement the "Slot" pattern: We always render 3 "sync slots".
    
    const slot1 = itemsToSync[0];
    const slot2 = itemsToSync[1];
    const slot3 = itemsToSync[2];

    useSingleItemSyncWrapper(slot1, onUpdateItem);
    useSingleItemSyncWrapper(slot2, onUpdateItem);
    useSingleItemSyncWrapper(slot3, onUpdateItem);
}

// Wrapper to handle potentially undefined items
function useSingleItemSyncWrapper(
    item: MediaItem | undefined, 
    onUpdateItem: (itemId: string, updates: Partial<MediaItem>) => void
) {
    // We must always call useSingleItemSync, even if item is undefined, 
    // but pass null ID to useMediaDetails to disable it.
    // Actually, useSingleItemSync calls useMediaDetails. 
    // We'll modify useSingleItemSync to handle undefined item gracefully.
    
    const shouldFetch = !!item && !item.details;
    const { details, isLoading, isFetching, error } = useMediaDetails(
        shouldFetch && item ? item.id : null, 
        item ? item.type : null
    );

    useEffect(() => {
        if (item && details && !isLoading && !isFetching && !error && shouldFetch) {
            onUpdateItem(item.id, {
                details,
                imageUrl: details.imageUrl || item.imageUrl
            });
        }
    }, [details, isLoading, isFetching, error, item, onUpdateItem, shouldFetch]);
}
