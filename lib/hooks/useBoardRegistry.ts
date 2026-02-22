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
import { BoardCategory, BoardMetadata } from '@/lib/types';

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
        const BOARD_INDEX_KEY = 'moat-boards-index';
        const boardIds = (await storage.get<string[]>(BOARD_INDEX_KEY)) || [];

        if (boardIds.length === 0) {
          setBoards([]);
          return;
        }

        // Fetch metadata for all IDs
        const metaItems = await Promise.all(
          boardIds.map((id) => storage.get<BoardMetadata>(`moat-meta-${id}`)),
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

      const BOARD_INDEX_KEY = 'moat-boards-index';

      // 1. Optimistic UI update
      setBoards((prev) => [newMeta, ...prev]);

      // 2. Atomic DB Transaction: Update Index, Meta, and Initial State
      // We first need the current index to append.
      // NOTE: strict atomicity for "read-modify-write" of index across multiple tabs
      // would require a transaction block, which `idb-keyval` doesn't fully expose in `setMany`.
      // Usage of `update` is safer for the index, but we also want to set the other keys.
      // For now, we chain them, but use `update` for the index to avoid race conditions there.

      const newBoardState = {
        ...INITIAL_STATE,
        title,
        category,
      };

      await Promise.all([
        storage.set(`moat-meta-${newId}`, newMeta),
        storage.set(`moat-board-${newId}`, newBoardState),
        storage.update<string[]>(BOARD_INDEX_KEY, (prev) => [newId, ...(prev || [])]),
      ]);

      return newId;
    },
    [],
  );

  /**
   * Permanently deletes a board and its associated data.
   * @param id - The UUID of the board to delete.
   */
  const deleteBoard = useCallback(async (id: string) => {
    // Optimistic update
    setBoards((prev) => prev.filter((b) => b.id !== id));

    const BOARD_INDEX_KEY = 'moat-boards-index';

    // Atomic / Parallel clean up
    await Promise.all([
      storage.delMany([`moat-meta-${id}`, `moat-board-${id}`]),
      storage.update<string[]>(BOARD_INDEX_KEY, (prev) => (prev || []).filter((idx) => idx !== id)),
    ]);
  }, []);

  /**
   * Updates the metadata for a specific board (e.g., title, item count).
   * Automatically updates the 'lastModified' timestamp.
   * @param id - The UUID of the board to update.
   * @param updates - Partial metadata object with new values.
   */
  const updateBoardMeta = useCallback(async (id: string, updates: Partial<BoardMetadata>) => {
    // Optimistic update
    setBoards((prev) =>
      prev
        .map((b) => (b.id === id ? { ...b, ...updates, lastModified: Date.now() } : b))
        .toSorted((a, b) => b.lastModified - a.lastModified),
    );

    // Atomic read-modify-write
    await storage.update<BoardMetadata>(`moat-meta-${id}`, (current) => {
      // If the board disappears from storage (unlikely), we return current (undefined) to avoid creating a corrupted entry.
      // We use the cast to satisfy the idb-keyval updater signature requirement.
      if (!current) return current as unknown as BoardMetadata;

      return {
        ...current,
        ...updates,
        lastModified: Date.now(),
      };
    });
  }, []);

  return {
    boards,
    isLoading,
    createBoard,
    deleteBoard,
    updateBoardMeta,
  };
}
