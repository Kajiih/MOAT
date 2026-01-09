import { MediaItem } from '@/lib/types';

/**
 * A simple in-memory cache for mapped MediaItem objects.
 * This prevents redundant image lookups (especially for artists)
 * and mapping logic across different search queries.
 */
class MediaItemCache {
  private cache = new Map<string, { item: MediaItem; expiry: number }>();
  private defaultTTL = 1000 * 60 * 60 * 24; // 24 hours

  get(id: string): MediaItem | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(id);
      return null;
    }

    return entry.item;
  }

  set(item: MediaItem, ttl = this.defaultTTL): void {
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
