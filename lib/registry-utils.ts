/**
 * @file registry-utils.ts
 * @description Utilities for managing the board registry and syncing metadata.
 */

import { storage } from '@/lib/storage';
import { BoardMetadata, TierListState } from '@/lib/types';

const REGISTRY_KEY = 'moat-registry';

/**
 * Updates the metadata for a specific board in the registry.
 * Designed to be called from within the board editor to keep the dashboard in sync.
 * @param id - The ID of the board to sync.
 * @param state - The current state of the board.
 */
export async function syncBoardMetadata(id: string, state: TierListState) {
  try {
    const registry = (await storage.get<BoardMetadata[]>(REGISTRY_KEY)) || [];
    const index = registry.findIndex((b) => b.id === id);

    const allItems = Object.values(state.items).flat();
    const itemCount = allItems.length;
    const now = Date.now();

    // Extract up to 4 unique image URLs for the preview
    const previewImages = [
      ...new Set(allItems.map((item) => item.imageUrl).filter((url): url is string => !!url)),
    ].slice(0, 4);

    if (index !== -1) {
      // Update existing entry
      const entry = registry[index];

      // Only write if something changed (optimization)
      if (
        entry.title === state.title &&
        entry.itemCount === itemCount &&
        JSON.stringify(entry.previewImages) === JSON.stringify(previewImages)
      ) {
        // Skip write if nothing changed to reduce IO
        return;
      }

      registry[index] = {
        ...entry,
        title: state.title,
        itemCount,
        previewImages,
        lastModified: now,
      };
    } else {
      // Edge case: Board exists in editor but not in registry (e.g. legacy migration or error)
      // Re-create the entry
      registry.push({
        id,
        title: state.title,
        createdAt: now,
        lastModified: now,
        itemCount,
        previewImages,
      });
    }

    await storage.set(REGISTRY_KEY, registry);
  } catch (error) {
    console.error('Failed to sync board metadata', error);
  }
}
