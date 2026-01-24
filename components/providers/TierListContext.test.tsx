import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TierListProvider, useTierListContext } from './TierListContext';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock dependencies
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn(), toastCount: 0 }),
}));

// Mock useTierListDnD to avoid dnd-kit complexity in this logic test
vi.mock('@/lib/hooks/useTierListDnD', () => ({
  useTierListDnD: () => ({
    sensors: [],
    activeItem: null,
    activeTier: null,
    overId: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
  }),
}));

vi.mock('./MediaRegistryProvider', () => ({
  useMediaRegistry: () => ({
    registerItems: vi.fn(),
    registerItem: vi.fn(),
    getItem: vi.fn(),
  }),
}));

// Mock storage
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockImplementation(() => Promise.resolve()),
    del: vi.fn().mockImplementation(() => Promise.resolve()),
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 11),
  },
});

// Mock window.confirm
globalThis.confirm = vi.fn(() => true);

describe('TierListContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TierListProvider boardId="test-board">{children}</TierListProvider>
  );

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    // Check default tiers
    expect(result.current.state.tierDefs).toHaveLength(6);
    expect(result.current.state.tierDefs[0].label).toBe('S');
    expect(result.current.state.tierDefs[5].label).toBe('Unranked');
  });

  it('should add and delete tiers', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    // Add Tier
    act(() => {
      result.current.actions.addTier();
    });

    expect(result.current.state.tierDefs).toHaveLength(7);
    const newTier = result.current.state.tierDefs.at(-1);
    expect(newTier).toBeDefined();

    if (newTier) {
      expect(newTier.label).toBe('New Tier');

      // Delete Tier
      act(() => {
        result.current.actions.deleteTier(newTier.id);
      });
    }

    expect(result.current.state.tierDefs).toHaveLength(6);
  });

  it('should update tier properties', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const tierId = result.current.state.tierDefs[0].id;

    act(() => {
      result.current.actions.updateTier(tierId, { label: 'Super S' });
    });

    expect(result.current.state.tierDefs[0].label).toBe('Super S');
  });

  it('should import from valid JSON', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const validImportData = {
      version: 1,
      tiers: [
        { label: 'Imported S', color: 'red', items: [] },
        { label: 'Imported A', color: 'blue', items: [] },
      ],
    };

    const file = new File([JSON.stringify(validImportData)], 'import.json', {
      type: 'application/json',
    });
    const event = {
      target: { files: [file], value: 'fakepath' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.actions.import(event);
    });

    // Wait for FileReader async
    await waitFor(() => {
      expect(result.current.state.tierDefs).toHaveLength(2);
    });

    expect(result.current.state.tierDefs[0].label).toBe('Imported S');
    expect(result.current.state.tierDefs[1].label).toBe('Imported A');
  });

  it('should handle invalid JSON import gracefully', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const initialCount = result.current.state.tierDefs.length;

    const file = new File(['invalid json'], 'bad.json', { type: 'application/json' });
    const event = {
      target: { files: [file], value: 'fakepath' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.actions.import(event);
    });

    // Wait for potential async failure handling
    await new Promise((r) => setTimeout(r, 100));

    // State should not change
    expect(result.current.state.tierDefs).toHaveLength(initialCount);

    // Verify logger was called
    const { logger } = await import('@/lib/logger');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should clear the board', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    // Simulate items on board (manually inject or assume initial state is empty)
    // Let's add a tier first to change state
    act(() => {
      result.current.actions.addTier();
    });
    expect(result.current.state.tierDefs).toHaveLength(7);

    act(() => {
      result.current.actions.clear();
    });

    // Should reset to initial state (6 tiers)
    expect(result.current.state.tierDefs).toHaveLength(6);
  });

  it('should undo and redo state changes', async () => {
    const { result } = renderHook(() => useTierListContext(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const initialCount = result.current.state.tierDefs.length;

    // 1. Perform an action
    act(() => {
      result.current.actions.addTier();
    });

    expect(result.current.state.tierDefs).toHaveLength(initialCount + 1);
    expect(result.current.history.canUndo).toBe(true);

    // 2. Undo the action
    act(() => {
      result.current.history.undo();
    });

    expect(result.current.state.tierDefs).toHaveLength(initialCount);
    expect(result.current.history.canRedo).toBe(true);

    // 3. Redo the action
    act(() => {
      result.current.history.redo();
    });

    expect(result.current.state.tierDefs).toHaveLength(initialCount + 1);
    expect(result.current.history.canUndo).toBe(true);
  });
});
