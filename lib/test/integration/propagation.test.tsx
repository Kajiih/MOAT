/**
 * @file propagation.test.tsx
 * @description Integration tests for state propagation between hooks and the global TierListProvider.
 * Verifies that async resolver updates correctly trigger state updates in the provider.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaRegistryProvider } from '@/components/providers/MediaRegistryProvider';
import { TierListProvider, useTierListContext } from '@/components/providers/TierListContext';
import { useBackgroundEnrichment, useMediaDetails, useMediaResolver } from '@/lib/hooks';
import { createSong, createTierListState } from '@/lib/test/factories';

// Mock dependencies
vi.mock('@/lib/hooks/useMediaDetails', () => ({
  useMediaDetails: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// Mock useTierListDnD to avoid sensor complexity
vi.mock('@/components/board/hooks/useTierListDnD', () => ({
  useTierListDnD: () => ({
    sensors: [],
    activeItem: null,
    activeTier: null,
    overId: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragCancel: vi.fn(),
  }),
}));

describe('State Propagation Integration', () => {
  const mockUseMediaDetails = vi.mocked(useMediaDetails);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMediaDetails.mockReturnValue({
      details: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MediaRegistryProvider>
      <TierListProvider boardId="test-board">{children}</TierListProvider>
    </MediaRegistryProvider>
  );

  it('should propagate enriched metadata from useMediaResolver to TierListProvider state via actions', async () => {
    const itemId = 'item-1';
    // Start with a basic item
    const initialItem = createSong({ id: itemId, details: undefined, title: 'Old Title' });
    const initialState = createTierListState({
      items: { 'tier-1': [initialItem] },
      tierDefs: [{ id: 'tier-1', label: 'S', color: 'red' }],
    });

    const { storage } = await import('@/lib/storage');
    vi.mocked(storage.get).mockResolvedValue(initialState);

    // Mock the API details that will be "discovered" by the resolver
    const mockDetails = {
      type: 'song',
      genres: ['Integration Test'],
      imageUrl: 'enriched-image.jpg',
    };

    // 1. Render a hook that simulates a component (like DetailsModal)
    // using useMediaResolver within the TierListProvider
    const { result, rerender } = renderHook(
      () => {
        const context = useTierListContext();

        // Pull the item directly from the context state to ensure we are testing propagation
        const itemOnBoard = context.state.items['tier-1']?.[0];

        const resolver = useMediaResolver(itemOnBoard || null, {
          enabled: context.isHydrated,
          onUpdate: (id, updates) => context.actions.updateMediaItem(id, updates),
        });

        return { context, resolver };
      },
      { wrapper },
    );

    // Wait for hydration so the resolver becomes 'enabled'
    await waitFor(() => expect(result.current.context.isHydrated).toBe(true));

    // Safety check: verify initial state
    expect(result.current.context.state.items['tier-1'][0].details).toBeUndefined();

    // 2. Simulate the async arrival of enrichment data (e.g. SWR resolves)
    mockUseMediaDetails.mockReturnValue({
      details: mockDetails as any,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    // Trigger a re-render of the hook to pick up the new mock values
    rerender();

    // 3. Verify that the update flowed: Resolver -> onUpdate -> Context Action -> Reducer -> State
    await waitFor(
      () => {
        const updatedItem = result.current.context.state.items['tier-1'][0];
        expect(updatedItem?.details).toEqual(mockDetails);
        expect(updatedItem?.imageUrl).toBe('enriched-image.jpg');
      },
      { timeout: 3000 },
    );

    // Verify it also hit the Media Registry (as side effect of resolver + persistent persist: true)
    expect(result.current.resolver.resolvedItem?.details).toEqual(mockDetails);
  });

  it('should handle background enrichment for multiple items automatically', async () => {
    // 1. Setup board with 2 items needing enrichment
    const item1 = createSong({ id: 'song-1', details: undefined });
    const item2 = createSong({ id: 'song-2', details: undefined });
    const initialState = createTierListState({
      items: { 'tier-1': [item1, item2] },
    });

    const { storage } = await import('@/lib/storage');
    // vi.mocked(storage.get).mockResolvedValue(initialState);
    vi.mocked(storage.get).mockImplementation((key) => {
      if (typeof key === 'string' && key.startsWith('moat-board-')) {
        return Promise.resolve(initialState);
      }
      return Promise.resolve(null);
    });

    // Mock API responses for both items
    mockUseMediaDetails.mockImplementation((id) => {
      if (id === 'song-1')
        return {
          details: { type: 'song', genres: ['S1'] } as any,
          isLoading: false,
          isFetching: false,
          error: null,
        };
      if (id === 'song-2')
        return {
          details: { type: 'song', genres: ['S2'] } as any,
          isLoading: false,
          isFetching: false,
          error: null,
        };
      return { details: undefined, isLoading: false, isFetching: false, error: null };
    });

    const { result, rerender } = renderHook(
      () => {
        const { state, actions, isHydrated } = useTierListContext();
        const allItems = Object.values(state.items).flat();

        const enrichment = useBackgroundEnrichment(allItems, actions.updateMediaItem);

        return { state, isHydrated, enrichment };
      },
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
      const itemsOnBoard = Object.values(result.current.state.items).flat();
      expect(itemsOnBoard).toHaveLength(2);
    });

    // Re-render to ensure useBackgroundEnrichment sees the populated items
    rerender();

    // 2. Verify both items eventually get their details via background propagation
    await waitFor(
      () => {
        const items = Object.values(result.current.state.items).flat();
        const s1 = items.find((i) => i.id === 'song-1');
        const s2 = items.find((i) => i.id === 'song-2');

        expect(s1?.details).toBeDefined();
        expect(s2?.details).toBeDefined();
      },
      { timeout: 4000 },
    );

    expect(result.current.enrichment.pendingCount).toBe(0);
  });
});
