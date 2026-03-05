import { useEffect } from 'react';

import { useItemRegistry } from '@/components/providers/ItemRegistryProvider';
import { useStandardResolver } from '@/lib/database/hooks/useStandardResolver';
import { StandardItem } from '@/lib/database/types';
import { Item, LegacyItem } from '@/lib/types';
import { hasMediaItemUpdates } from '@/lib/utils/comparisons';

import { useItemDetails } from './useItemDetails';

/**
 * Options for the useItemResolver hook.
 */
interface UseItemResolverOptions {
  /** If false, enrichment will not be attempted. Defaults to true. */
  enabled?: boolean;
  /** Whether to persist resolved metadata back to the global registry. Defaults to true. */
  persist?: boolean;
  /** Callback fired when a more complete version of the item is found or resolved. */
  onUpdate?: (id: string, updates: Partial<Item>) => void;
}

/**
 * A unified hook to resolve and enrich any item (V1 or V2).
 * Automatically delegates to the correct architecture-specific resolver.
 * @param item - The item to resolve.
 * @param options - Resolution options.
 * @returns Resolution state including the enriched item and loading status.
 */
export function useItemResolver(
  item: Item | null,
  options: UseItemResolverOptions = {},
) {
  const isV2 = !!(item && 'identity' in item);

  // 1. Delegate V2 requests to the standard resolver
  const v2Result = useStandardResolver((isV2 ? item : null) as StandardItem | null, {
    enabled: options.enabled,
    onUpdate: options.onUpdate as any,
    persist: options.persist,
  });

  // 2. Handle V1 Legacy Logic
  const v1Result = useV1ItemResolver((!isV2 ? item : null) as LegacyItem | null, options as any);

  return isV2 ? v2Result : v1Result;
}

/**
 * Internal legacy resolver for V1 items.
 * (Moved from original useItemResolver implementation)
 * @param item
 * @param options
 */
function useV1ItemResolver(item: LegacyItem | null, options: UseItemResolverOptions = {}) {
  const { enabled = true, persist = true, onUpdate } = options;
  const { getItem, registerItem } = useItemRegistry();

  const cached = item ? getItem(item.id) : undefined;
  const needsEnrichment = !!item && !item.details && !cached?.details;
  const shouldFetch = enabled && needsEnrichment;

  const { details, isLoading, error, isFetching } = useItemDetails(
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
