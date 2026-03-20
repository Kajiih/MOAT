/**
 * @file batch-resolver.ts
 * @description Frontend batching queue for ReferenceImageSource resolutions.
 * Bundles synchronous-looking calls into single HTTP POST /api/resolve-image/batch requests
 * with a 20ms debounce window.
 * @module BatchResolver
 */

import { logger } from '@/lib/logger';

interface BatchItem {
  providerId: string;
  entityId: string;
  key: string;
  resolve: (url: string | undefined) => void;
  reject: (error: Error) => void;
}

class BatchResolver {
  private queue: BatchItem[] = [];
  private ScheduledTimeout: NodeJS.Timeout | null = null;
  private debounceMs = 20; // Debounce window before flushing

  /**
   * Load a reference source. Returns a promise for the resolved URL.
   */
  public load(providerId: string, entityId: string, key: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.queue.push({ providerId, entityId, key, resolve, reject });
      this.scheduleFlush();
    });
  }

  private scheduleFlush() {
    if (this.ScheduledTimeout) return;

    this.ScheduledTimeout = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  private async flush() {
    this.ScheduledTimeout = null;
    const currentQueue = [...this.queue];
    this.queue = []; // clear queue for next interval

    if (currentQueue.length === 0) return;

    // Deduplicate items to avoid double fetch requests in the same batch
    const itemMap = new Map<string, BatchItem[]>();
    const uniqueItems: { providerId: string; entityId: string; key: string }[] = [];

    for (const item of currentQueue) {
      const cacheKey = `${item.providerId}:${item.entityId}:${item.key}`;
      if (!itemMap.has(cacheKey)) {
        itemMap.set(cacheKey, []);
        uniqueItems.push({ providerId: item.providerId, entityId: item.entityId, key: item.key });
      }
      itemMap.get(cacheKey)!.push(item);
    }

    try {
      const response = await fetch('/api/resolve-image/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uniqueItems),
      });

      if (!response.ok) {
        throw new Error(`Batch resolve HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const results: Record<string, string | null> = data.results || {};

      // Resolve back to promised waiters
      for (const [cacheKey, items] of itemMap.entries()) {
        const url = results[cacheKey] ?? undefined;
        for (const item of items) {
          item.resolve(url);
        }
      }
    } catch (error) {
      logger.error({ error }, 'BatchResolver flush failure');
      // Reject all items if the entire batch fails
      for (const items of itemMap.values()) {
        for (const item of items) {
          item.reject(error instanceof Error ? error : new Error('Batch Resolver Failed'));
        }
      }
    }
  }
}

// Export singleton to share queue triggers across useResolvedImage triggers
export const batchResolver = new BatchResolver();
