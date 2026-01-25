/**
 * @file useBoardRegistry.ts
 * @description Manages the global registry of tier list boards.
 * Handles creating, deleting, and updating metadata for multiple boards.
 * Each board's metadata is stored in an independent `moat-meta-{id}` key.
 * @module useBoardRegistry
 */

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { INITIAL_STATE } from '@/lib/initial-state';
import { logger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { BoardCategory,BoardMetadata } from '@/lib/types';

/**
 * Hook for managing the application's board registry.
 * Provides methods to list, create, delete, and update tier lists.
 * @returns An object containing the list of boards and methods to manage them.
 */
export function useBoardRegistry() {
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load registry on mount
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        // Scan for all metadata keys
        const allKeys = await storage.keys();
        const metaKeys = allKeys.filter(
          (k): k is string => typeof k === 'string' && k.startsWith('moat-meta-'),
        );
        const metaItems = await Promise.all(
          metaKeys.map((k) => storage.get<BoardMetadata>(k)),
        );

        const validBoards = metaItems
          .filter((b): b is BoardMetadata => !!b)
          .toSorted((a, b) => b.lastModified - a.lastModified);

        setBoards(validBoards);
      } catch (error) {
        logger.error({ error }, 'Failed to load board registry');
      } finally {
        setIsLoading(false);
      }
    };
    loadRegistry();
  }, []);

  /**
   * Creates a new board with the given title.
   * Generates a unique ID and initializes metadata.
   * @param title - The title of the new board.
   * @param category - The category of the board (defaults to 'music').
   * @returns The UUID of the newly created board.
   */
  const createBoard = useCallback(
    async (title: string = 'Untitled Board', category: BoardCategory = 'music') => {
      const newId = uuidv4();
      const newMeta: BoardMetadata = {
        id: newId,
        title,
        category,
        createdAt: Date.now(),
        lastModified: Date.now(),
        itemCount: 0,
      };

      // Optimistic update
      setBoards((prev) => [newMeta, ...prev]);

      // Atomic write metadata
      await storage.set(`moat-meta-${newId}`, newMeta);

      // Pre-seed the board state with the correct category
      // This ensures TierListProvider picks it up immediately
      await storage.set(`moat-board-${newId}`, {
        ...INITIAL_STATE,
        title,
        category,
      });

      return newId;
    },
    [],
  );

  /**
   * Permanently deletes a board and its associated data.
   * @param id - The UUID of the board to delete.
   */
  const deleteBoard = useCallback(
    async (id: string) => {
      // Optimistic update
      setBoards((prev) => prev.filter((b) => b.id !== id));

      await storage.del(`moat-meta-${id}`);
      await storage.del(`moat-board-${id}`);
    },
    [],
  );

  /**
   * Updates the metadata for a specific board (e.g., title, item count).
   * Automatically updates the 'lastModified' timestamp.
   * @param id - The UUID of the board to update.
   * @param updates - Partial metadata object with new values.
   */
  const updateBoardMeta = useCallback(
    async (id: string, updates: Partial<BoardMetadata>) => {
      // Optimistic update
      setBoards((prev) =>
        prev
          .map((b) => (b.id === id ? { ...b, ...updates, lastModified: Date.now() } : b))
          .toSorted((a, b) => b.lastModified - a.lastModified),
      );

      // Atomic read-modify-write for safety (though mostly updates are from Dashboard itself)
      const current = await storage.get<BoardMetadata>(`moat-meta-${id}`);
      if (current) {
        await storage.set(`moat-meta-${id}`, {
          ...current,
          ...updates,
          lastModified: Date.now(),
        });
      }
    },
    [],
  );

  return {
    boards,
    isLoading,
    createBoard,
    deleteBoard,
    updateBoardMeta,
  };
}
