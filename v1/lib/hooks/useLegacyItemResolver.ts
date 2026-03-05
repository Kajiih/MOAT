/**
 * @file useLegacyItemResolver.ts
 * @description [LEGACY V1] Internal legacy resolver for V1 items.
 */

'use client';

import { useEffect } from 'react';

import { useItemRegistry } from '@/components/providers/ItemRegistryProvider';
import { LegacyItem } from '@/lib/types';
import { hasMediaItemUpdates } from '@/lib/utils/comparisons';

import { useLegacyItemDetails } from './useLegacyItemDetails';

interface UseLegacyItemResolverOptions {
  /** If false, enrichment will not be attempted. Defaults to true. */
  enabled?: boolean;
  /** Whether to persist resolved metadata back to the global registry. Defaults to true. */
  persist?: boolean;
  /** Callback fired when a more complete version of the item is found or resolved. */
  onUpdate?: (id: string, updates: Partial<LegacyItem>) => void;
}

/**
 * Internal legacy resolver for V1 items.
 * @param item
 * @param options
 */
export function useLegacyItemResolver(item: LegacyItem | null, options: UseLegacyItemResolverOptions = {}) {
  const { enabled = true, persist = true, onUpdate } = options;
  const { getItem, registerItem } = useItemRegistry();

  const cached = item ? getItem(item.id) : undefined;
  const needsEnrichment = !!item && !item.details && !cached?.details;
  const shouldFetch = enabled && needsEnrichment;

  const { details, isLoading, error, isFetching } = useLegacyItemDetails(
    shouldFetch && item ? item.id : null,
    shouldFetch && item ? item.type : null,
    shouldFetch && item ? item.serviceId : null,
  );

  useEffect(() => {
    if (!item || !cached) return;
    if (hasMediaItemUpdates(item, cached)) {
      onUpdate?.(item.id, cached);
    }
  }, [item, cached, onUpdate]);

  useEffect(() => {
    if (!item || !details || isLoading || error || !shouldFetch) return;

    const updates: Partial<LegacyItem> = {
      details,
      imageUrl: details.imageUrl || item.imageUrl,
    };

    if (!hasMediaItemUpdates(item, updates)) return;

    const merged = { ...item, ...updates } as LegacyItem;

    if (persist) {
      registerItem(merged);
    }

    onUpdate?.(item.id, updates);
  }, [item, details, isLoading, error, shouldFetch, persist, registerItem, onUpdate]);

  return {
    resolvedItem: (cached || item) as LegacyItem | null,
    isLoading: isLoading && shouldFetch,
    isFetching,
    error: shouldFetch ? error : null,
  };
}
