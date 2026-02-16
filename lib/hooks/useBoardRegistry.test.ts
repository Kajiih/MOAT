import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storage } from '@/lib/storage';

import { useBoardRegistry } from './useBoardRegistry';

// Mock the storage module
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}));

// Mock logger to avoid console spam in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useBoardRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with an empty list and load from storage on mount', async () => {
    const mockMeta = {
      id: 'board-1',
      title: 'Board 1',
      category: 'music',
      createdAt: 1000,
      lastModified: 2000,
      itemCount: 5,
    };

    vi.mocked(storage.get).mockImplementation(async (key) => {
      if (key === 'moat-boards-index') return ['board-1'];
      if (key === 'moat-meta-board-1') return mockMeta;
      return undefined;
    });

    const { result } = renderHook(() => useBoardRegistry());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for effect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.boards).toHaveLength(1);
    expect(result.current.boards[0]).toEqual(mockMeta);
    expect(storage.get).toHaveBeenCalledWith('moat-boards-index');
    expect(storage.get).toHaveBeenCalledWith('moat-meta-board-1');
  });

  it('should create a new board', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined); // No existing index

    const { result } = renderHook(() => useBoardRegistry());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let newId: string;
    await act(async () => {
      newId = await result.current.createBoard('New Test Board', 'cinema');
    });

    expect(result.current.boards).toHaveLength(1);
    expect(result.current.boards[0].title).toBe('New Test Board');
    expect(result.current.boards[0].category).toBe('cinema');
    expect(result.current.boards[0].id).toBe(newId!);

    // Check persistence
    expect(storage.set).toHaveBeenCalledWith(
      `moat-meta-${newId!}`,
      expect.objectContaining({ title: 'New Test Board', category: 'cinema' }),
    );
    expect(storage.set).toHaveBeenCalledWith(
      `moat-board-${newId!}`,
      expect.objectContaining({ title: 'New Test Board', category: 'cinema' }),
    );
    // Index update
    expect(storage.set).toHaveBeenCalledWith(
      'moat-boards-index',
      expect.arrayContaining([newId!]),
    );
  });

  it('should delete a board', async () => {
    const mockMeta = {
      id: 'board-1',
      title: 'Board 1',
      category: 'music',
      createdAt: 1000,
      lastModified: 2000,
      itemCount: 5,
    };

    vi.mocked(storage.get).mockImplementation(async (key) => {
      if (key === 'moat-boards-index') return ['board-1'];
      if (key === 'moat-meta-board-1') return mockMeta;
      return undefined;
    });

    const { result } = renderHook(() => useBoardRegistry());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.boards).toHaveLength(1);

    await act(async () => {
      await result.current.deleteBoard('board-1');
    });

    expect(result.current.boards).toHaveLength(0);
    expect(storage.del).toHaveBeenCalledWith('moat-meta-board-1');
    expect(storage.del).toHaveBeenCalledWith('moat-board-board-1');
    // Index update
    expect(storage.set).toHaveBeenCalledWith('moat-boards-index', []);
  });

  it('should update board metadata', async () => {
    const mockMeta = {
      id: 'board-1',
      title: 'Board 1',
      category: 'music',
      createdAt: 1000,
      lastModified: 2000,
      itemCount: 5,
    };

    vi.mocked(storage.get).mockImplementation(async (key) => {
      if (key === 'moat-boards-index') return ['board-1'];
      if (key === 'moat-meta-board-1') return mockMeta;
      return undefined;
    });

    const { result } = renderHook(() => useBoardRegistry());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.boards).toHaveLength(1); // Ensure load succeeded
    expect(result.current.boards[0].title).toBe('Board 1');

    await act(async () => {
      await result.current.updateBoardMeta('board-1', { title: 'Updated Title' });
    });

    expect(result.current.boards[0].title).toBe('Updated Title');
    // lastModified should be updated to roughly now
    expect(result.current.boards[0].lastModified).toBeGreaterThan(2000);

    // Persistence check
    expect(storage.set).toHaveBeenCalledWith(
      'moat-meta-board-1',
      expect.objectContaining({ title: 'Updated Title' }),
    );
  });
});
