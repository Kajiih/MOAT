import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { BoardMetadata } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const REGISTRY_KEY = 'moat-registry';
const LEGACY_KEY = 'moat-tierlist';

export function useBoardRegistry() {
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load registry on mount
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const registry = await storage.get<BoardMetadata[]>(REGISTRY_KEY);
        if (registry) {
          setBoards(registry.sort((a, b) => b.lastModified - a.lastModified));
        } else {
          // Check for legacy board migration
          const legacyState = await storage.get<any>(LEGACY_KEY);
          if (legacyState) {
            console.log('Migrating legacy board...');
            const newId = uuidv4();
            const newMeta: BoardMetadata = {
              id: newId,
              title: legacyState.title || 'My First Board',
              createdAt: Date.now(),
              lastModified: Date.now(),
              itemCount: Object.values(legacyState.items || {}).flat().length,
            };

            // Save legacy state to new key
            await storage.set(`moat-board-${newId}`, legacyState);

            // Initialize registry
            await storage.set(REGISTRY_KEY, [newMeta]);
            setBoards([newMeta]);

            // Optional: We could delete legacy key, but safer to keep as backup for now
          }
        }
      } catch (error) {
        console.error('Failed to load board registry', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRegistry();
  }, []);

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

  const deleteBoard = useCallback(
    async (id: string) => {
      const updatedBoards = boards.filter((b) => b.id !== id);
      setBoards(updatedBoards);
      await storage.set(REGISTRY_KEY, updatedBoards);
      await storage.del(`moat-board-${id}`);
    },
    [boards],
  );

  const updateBoardMeta = useCallback(
    async (id: string, updates: Partial<BoardMetadata>) => {
      const updatedBoards = boards
        .map((b) => (b.id === id ? { ...b, ...updates, lastModified: Date.now() } : b))
        .sort((a, b) => b.lastModified - a.lastModified);

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
