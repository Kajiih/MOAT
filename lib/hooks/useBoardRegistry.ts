/**
 * @file useBoardRegistry.ts
 * @description Manages the global registry of tier list boards.
 * Handles creating, deleting, and updating metadata for multiple boards.
 * Includes logic for migrating legacy single-board state to the new multi-board format.
 * @module useBoardRegistry
 */

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { storage } from '@/lib/storage';
import { BoardMetadata } from '@/lib/types';

const REGISTRY_KEY = 'moat-registry';

/**
 * Hook for managing the application's board registry.
 * Provides methods to list, create, delete, and update tier lists.
 * Automatically handles legacy data migration on initialization.
 * @returns An object containing the list of boards and methods to manage them.
 */
export function useBoardRegistry() {
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load registry on mount
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const registry = await storage.get<BoardMetadata[]>(REGISTRY_KEY);
        if (registry) {
          setBoards(registry.toSorted((a, b) => b.lastModified - a.lastModified));
        }
      } catch (error) {
        console.error('Failed to load board registry', error);
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
   * @returns The UUID of the newly created board.
   */
  const createBoard = useCallback(
    async (title: string = 'Untitled Board') => {
      const newId = uuidv4();
      const newMeta: BoardMetadata = {
        id: newId,
        title,
        createdAt: Date.now(),
        lastModified: Date.now(),
        itemCount: 0,
      };

      const updatedBoards = [newMeta, ...boards];
      setBoards(updatedBoards);
      await storage.set(REGISTRY_KEY, updatedBoards);
      return newId;
    },
    [boards],
  );

  /**
   * Permanently deletes a board and its associated data.
   * @param id - The UUID of the board to delete.
   */
  const deleteBoard = useCallback(
    async (id: string) => {
      const updatedBoards = boards.filter((b) => b.id !== id);
      setBoards(updatedBoards);
      await storage.set(REGISTRY_KEY, updatedBoards);
      await storage.del(`moat-board-${id}`);
    },
    [boards],
  );

  /**
   * Updates the metadata for a specific board (e.g., title, item count).
   * Automatically updates the 'lastModified' timestamp.
   * @param id - The UUID of the board to update.
   * @param updates - Partial metadata object with new values.
   */
  const updateBoardMeta = useCallback(
    async (id: string, updates: Partial<BoardMetadata>) => {
      const updatedBoards = boards
        .map((b) => (b.id === id ? { ...b, ...updates, lastModified: Date.now() } : b))
        .toSorted((a, b) => b.lastModified - a.lastModified);

      setBoards(updatedBoards);
      await storage.set(REGISTRY_KEY, updatedBoards);
    },
    [boards],
  );

  return {
    boards,
    isLoading,
    createBoard,
    deleteBoard,
    updateBoardMeta,
  };
}
