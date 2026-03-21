/**
 * @file batch-resolver.ts
 * @description Frontend batching queue for ReferenceImageSource resolutions.
 * Bundles synchronous-looking calls into single HTTP POST /api/resolve-image/batch requests
 * with a 20ms debounce window.
 * @module BatchResolver
 */

import { logger } from '@/infra/logger';

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
   * @param providerId - The provider ID to search.
   * @param entityId - The entity ID to search.
   * @param key - The image lookup key.
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
    const { itemMap, uniqueItems } = this.groupQueueItems(currentQueue);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch('/api/resolve-image/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uniqueItems),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Batch resolve HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const results: Record<string, string | null> = data.results || {};

      // Resolve back to promised waiters
      this.resolvePendingItems(itemMap, results);
    } catch (error) {
      logger.error({ error }, 'BatchResolver flush failure');
      this.rejectPendingItems(
        itemMap,
        error instanceof Error ? error : new Error('Batch Resolver Failed'),
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private groupQueueItems(queue: BatchItem[]) {
    const itemMap = new Map<string, BatchItem[]>();
    const uniqueItems: { providerId: string; entityId: string; key: string }[] = [];

    for (const item of queue) {
      const cacheKey = `${item.providerId}:${item.entityId}:${item.key}`;
      if (!itemMap.has(cacheKey)) {
        itemMap.set(cacheKey, []);
        uniqueItems.push({ providerId: item.providerId, entityId: item.entityId, key: item.key });
      }
      itemMap.get(cacheKey)!.push(item);
    }
    return { itemMap, uniqueItems };
  }

  private resolvePendingItems(
    itemMap: Map<string, BatchItem[]>,
    results: Record<string, string | null>,
  ) {
    for (const [cacheKey, items] of itemMap.entries()) {
      const url = results[cacheKey] ?? undefined;
      for (const item of items) {
        item.resolve(url);
      }
    }
  }

  private rejectPendingItems(itemMap: Map<string, BatchItem[]>, error: Error) {
    for (const items of itemMap.values()) {
      for (const item of items) {
        item.reject(error);
      }
    }
  }
}

// Export singleton to share queue triggers across useResolvedImage triggers
export const batchResolver = new BatchResolver();
