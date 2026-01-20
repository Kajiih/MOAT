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

    const itemCount = Object.values(state.items).flat().length;
    const now = Date.now();

    if (index !== -1) {
      // Update existing entry
      const entry = registry[index];

      // Only write if something changed (optimization)
      if (entry.title === state.title && entry.itemCount === itemCount) {
        // Just update timestamp if it's been a while? Or skip?
        // Let's always update timestamp on save
      }

      registry[index] = {
        ...entry,
        title: state.title,
        itemCount,
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
      });
    }

    await storage.set(REGISTRY_KEY, registry);
  } catch (error) {
    console.error('Failed to sync board metadata', error);
  }
}
