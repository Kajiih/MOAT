import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaItem } from '@/lib/types';

import { useBackgroundEnrichment } from './useBackgroundEnrichment';

// Mock useMediaResolver
const mockUseMediaResolver = vi.fn();
vi.mock('@/lib/hooks/useMediaResolver', () => ({
  useMediaResolver: (item: unknown, options: unknown) => mockUseMediaResolver(item, options),
}));

describe('useBackgroundEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation: not enriched
    mockUseMediaResolver.mockReturnValue({
      isEnriched: false,
      isLoading: false,
      error: null,
    });
  });

  const createMockItem = (id: string, hasDetails = false): MediaItem =>
    ({
      id,
      type: 'album',
      title: `Item ${id}`,
      imageUrl: 'img.jpg',
      details: hasDetails ? { id, type: 'album', title: 'Details', tracks: [] } : undefined,
    }) as MediaItem;

  it('should only process items that are missing details', () => {
    const items = [
      createMockItem('1', true), // Has details
      createMockItem('2', false), // Missing details
    ];
    const onUpdate = vi.fn();

    renderHook(() => useBackgroundEnrichment(items, onUpdate));

    // Item 1 has details, so it should NOT be passed to the resolver
    expect(mockUseMediaResolver).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      expect.any(Object),
    );

    // Item 2 is missing details, so it should be passed and enabled
    expect(mockUseMediaResolver).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ enabled: true }),
    );
  });

  it('should limit concurrent fetches to 3 items', () => {
    const items = Array.from({ length: 5 }, (_, i) => createMockItem(`${i}`, false));
    const onUpdate = vi.fn();

    renderHook(() => useBackgroundEnrichment(items, onUpdate));

    // First 3 should be enabled
    expect(mockUseMediaResolver).toHaveBeenCalledWith(
      expect.objectContaining({ id: '0' }),
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseMediaResolver).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseMediaResolver).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ enabled: true }),
    );

    // 4th and 5th should be called with null or excluded (wait, the hook renders 3 slots)
    // Actually the hook takes itemsToSync which is sliced at 3.
    // So the mock should have 3 enabled calls and many potentially null calls?
    // Wait, the current implementation of useBackgroundEnrichment:
    // slot1 = itemsToSync[0]; ...
    // useSingleItemSyncWrapper(slot1, onUpdateItem);

    // So if itemsToSync has 3 items, the first 3 calls to useMediaResolver will have items.
    // The rest will NOT be called because useBackgroundEnrichment only has 3 slots.

    expect(mockUseMediaResolver).toHaveBeenCalledTimes(3);
  });

  it('should correctly pass the onUpdate callback', () => {
    const item = createMockItem('1', false);
    const onUpdate = vi.fn();

    renderHook(() => useBackgroundEnrichment([item], onUpdate));

    expect(mockUseMediaResolver).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ onUpdate, persist: true }),
    );
  });
});
