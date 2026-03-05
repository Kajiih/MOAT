import { useEffect } from 'react';

import { useStandardResolver } from '@/lib/database/hooks/useStandardResolver';
import { StandardItem } from '@/lib/database/types';
import { Item, LegacyItem } from '@/lib/types';
import { useLegacyItemResolver } from '@/v1/lib/hooks/useLegacyItemResolver';

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

  // 2. Handle V1 Legacy Logic - Delegated to v1 namespace
  const v1Result = useLegacyItemResolver((!isV2 ? item : null) as LegacyItem | null, options as any);

  return isV2 ? v2Result : v1Result;
}
