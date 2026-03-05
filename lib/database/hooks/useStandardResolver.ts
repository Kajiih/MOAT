/**
 * @file useStandardResolver.ts
 * @description V2-specific resolver hook for StandardItems.
 * Orchestrates fetching details and syncing with the persistent registry.
 */

'use client';

import { useEffect } from 'react';

import {StandardItem } from '../types';
import { useDatabaseDetails } from './useDatabaseDetails';
import { useStandardRegistry } from './useStandardRegistry';

interface UseStandardResolverOptions {
  /** If false, enrichment will not be attempted. */
  enabled?: boolean;
  /** Callback fired when a more complete version of the item is found or resolved. */
  onUpdate?: (id: string, updates: Partial<StandardItem>) => void;
  /** Whether to persist resolved metadata back to the registry. */
  persist?: boolean;
}

/**
 * Custom hook to resolve and enrich a V2 StandardItem.
 * @param item
 * @param options
 */
export function useStandardResolver(
  item: StandardItem | null,
  options: UseStandardResolverOptions = {}
) {
  const { enabled = true, persist = true, onUpdate } = options;
  const { registerItem } = useStandardRegistry();

  // 1. Determine if we need to fetch deep metadata
  const needsEnrichment = !!item && !item.details;
  const shouldFetch = enabled && needsEnrichment;

  const { details, isLoading, error, isValidating } = useDatabaseDetails(
    item?.identity.databaseId,
    item?.identity.entityId,
    item?.identity.dbId,
    { enabled: shouldFetch }
  );

  /**
   * Effect to sync newly resolved details to registry and board.
   */
  useEffect(() => {
    if (!item || !details || isLoading || error || !shouldFetch) return;

    const updates: Partial<StandardItem> = {
      details,
      // If details contains more images, merge them
      images: details.images && details.images.length > item.images.length 
        ? details.images 
        : item.images,
    };

    // Propagate to Board
    onUpdate?.(item.id, updates);

    // Persist to Registry
    if (persist) {
      const merged = { ...item, ...updates } as StandardItem;
      registerItem(merged);
    }
  }, [item, details, isLoading, error, shouldFetch, persist, registerItem, onUpdate]);

  return {
    resolvedItem: item,
    isLoading: isLoading && shouldFetch,
    isFetching: isValidating && shouldFetch,
    error: shouldFetch ? error : null,
    isEnriched: !!(item?.details || details),
  };
}
