/**
 * @file registry-utils.ts
 * @description Utilities for managing the board registry and syncing metadata.
 */

import { logger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { BoardMetadata, TierListState } from '@/lib/types';

/**
 * Updates the metadata for a specific board in the registry.
 * Designed to be called from within the board editor to keep the dashboard in sync.
 * @param id - The ID of the board to sync.
 * @param state - The current state of the board.
 */
export async function syncBoardMetadata(id: string, state: TierListState) {
  try {
    const metaKey = `moat-meta-${id}`;
    const allItems = Object.values(state.items).flat();

    // Generate miniature preview data
    // Limit to 10 items per tier to keep registry size manageable
    const previewData = state.tierDefs.map((tier) => ({
      id: tier.id,
      label: tier.label,
      color: tier.color,
      imageUrls: (state.items[tier.id] || [])
        .slice(0, 10)
        .map((item) => item.imageUrl)
        .filter((url): url is string => !!url),
    }));

    const metadata: BoardMetadata = {
      id,
      title: state.title,
      itemCount: allItems.length,
      previewData,
      // We don't track createdAt here easily without reading first,
      // but lastModified is the critical one for sorting.
      // If we really need createdAt, we'd need to read the existing meta first.
      createdAt: Date.now(), // Fallback, will be corrected by read-modify logic below
      lastModified: Date.now(),
    };

    // Optimization: Read existing to preserve createdAt and avoid unnecessary writes?
    // Actually, simple overwrite is safer and faster.
    // BUT we lose createdAt if we just overwrite.
    // Let's do a quick read. It is atomic per board so safe.
    const existing = await storage.get<BoardMetadata>(metaKey);
    if (existing) {
      metadata.createdAt = existing.createdAt;

      // Deep compare to avoid write if identical
      if (
        existing.title === metadata.title &&
        existing.itemCount === metadata.itemCount &&
        JSON.stringify(existing.previewData) === JSON.stringify(metadata.previewData)
      ) {
        return;
      }
    }

    await storage.set(metaKey, metadata);
  } catch (error) {
    logger.error({ error, id }, 'Failed to sync board metadata');
  }
}
