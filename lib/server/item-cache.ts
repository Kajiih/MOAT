/**
 * @file item-cache.ts
 * @description A simple server-side in-memory LRU-like cache for MediaItems.
 * Used to store mapped items during search to avoid re-fetching/re-mapping them
 * when subsequent detailed requests or related searches occur.
 * @module ServerItemCache
 */

import { LegacyItem } from '@/lib/types';

/**
 * A simple in-memory cache for mapped LegacyItem objects.
 * This prevents redundant image lookups (especially for artists)
 * and mapping logic across different search queries.
 */
class MediaItemCache {
  private cache = new Map<string, { item: LegacyItem; expiry: number }>();
  private defaultTTL = 1000 * 60 * 60 * 24; // 24 hours

  get(id: string): LegacyItem | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(id);
      return null;
    }

    return entry.item;
  }

  set(item: LegacyItem, ttl = this.defaultTTL): void {
    this.cache.set(item.id, {
      item,
      expiry: Date.now() + ttl,
    });
  }

  has(id: string): boolean {
    return this.cache.has(id) && Date.now() <= (this.cache.get(id)?.expiry || 0);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const serverItemCache = new MediaItemCache();
