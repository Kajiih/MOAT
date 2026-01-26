import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import useSWR from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaItem } from '@/lib/types';

import { useMediaSearch } from './useMediaSearch';

// Mock SWR - we need this to track calls
vi.mock('swr', () => ({
  default: vi.fn(),
  preload: vi.fn(),
}));

// Mock persistent state to avoid localstorage issues in tests
// Mock persistent state to avoid localstorage issues in tests
vi.mock('@/lib/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks')>();
  return {
    ...actual,
    usePersistentState: vi.fn((_key, initial) => {
      const [state, setState] = useState(initial);
      return [state, setState];
    }),
  };
});

// Mock Media Registry
vi.mock('@/components/providers/MediaRegistryProvider', () => ({
  useMediaRegistry: vi.fn(() => ({
    registerItems: vi.fn(),
    getItem: vi.fn(),
    registerItem: vi.fn(),
  })),
}));

// Mock TierList Context
vi.mock('@/components/providers/TierListContext', () => ({
  useTierListContext: vi.fn(() => ({
    state: { category: 'music' },
  })),
}));

describe('useMediaSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default return for useSWR
    // @ts-expect-error - simplified mock for test
    vi.mocked(useSWR).mockReturnValue({
      data: null,
      isLoading: false,
      isValidating: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default active search due to default types', () => {
    const { result } = renderHook(() => useMediaSearch('artist'));
    expect(result.current.filters.query).toBe('');
    // By default it searches for Album/EP types even without query
    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'artist' }),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should debounce typing and only trigger search after it timeout', () => {
    const { result } = renderHook(() => useMediaSearch('album'));

    // Clear initial call
    vi.mocked(useSWR).mockClear();

    // Type "Abbey"
    act(() => {
      result.current.updateFilters({ query: 'Abbey' });
    });

    // Advance 150ms - should NOT have triggered searchUrl update with query yet
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should still be the old URL or not called again if nothing changed except query
    // In our implementation, since query didn't update debouncedQuery, URL hasn't changed.
    const callsAfterType = vi.mocked(useSWR).mock.calls;
    const hasAbbeyEarly = callsAfterType.some((call) =>
      (call[0] as any)?.query === 'Abbey',
    );
    expect(hasAbbeyEarly).toBe(false);

    // Advance to 350ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now it should be called with Abbey
    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Abbey' }),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should debounce deleting and only trigger search after it timeout', () => {
    const { result } = renderHook(() => useMediaSearch('album'));

    // 1. Set initial query and wait for it to settle
    act(() => {
      result.current.updateFilters({ query: 'Queen' });
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Queen' }),
      expect.any(Function),
      expect.any(Object),
    );
    vi.mocked(useSWR).mockClear();

    // 2. Clear the query (deleting)
    act(() => {
      result.current.updateFilters({ query: '' });
    });

    // Advance 150ms - should still have Queen in the active SWR call if we check it
    act(() => {
      vi.advanceTimersByTime(150);
    });
    const callsAfterDelete = vi.mocked(useSWR).mock.calls;
    // Actually, SWR isn't called again if the URL doesn't change.
    // Our check should be that it hasn't been called WITH NONE (empty query) yet.
    const hasEmptyQuery = callsAfterDelete.some((call) => (call[0] as any)?.query === '');
    expect(hasEmptyQuery).toBe(false);

    // Advance to 350ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Now it should be called without the query param
    const finalCalls = vi.mocked(useSWR).mock.calls;
    const hasNoQuery = finalCalls.some((call) => (call[0] as any)?.query === '');
    expect(hasNoQuery).toBe(true);
  });

  it('should trigger search IMMEDIATELY when searchNow is called', () => {
    const { result } = renderHook(() => useMediaSearch('album'));
    vi.mocked(useSWR).mockClear();

    act(() => {
      result.current.updateFilters({ query: 'Thriller' });
    });

    // Immediately call searchNow without waiting
    act(() => {
      result.current.searchNow();
    });

    // Should be triggered now even if timers haven't advanced
    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Thriller' }),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should reset debounce timer if user continues typing', () => {
    const { result } = renderHook(() => useMediaSearch('album'));
    vi.mocked(useSWR).mockClear();

    act(() => {
      result.current.updateFilters({ query: 'B' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.updateFilters({ query: 'Bee' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Total 400ms passed, but only 200ms since last keystroke.
    // Should NOT have searched for 'Bee' yet.
    const calls = vi.mocked(useSWR).mock.calls;
    const hasBee = calls.some((call) => (call[0] as any)?.query === 'Bee');
    expect(hasBee).toBe(false);

    // Wait for the remaining 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Bee' }),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should return error when SWR fails with status 503', () => {
    const mockError = new Error('MusicBrainz is busy') as Error & { status?: number };
    mockError.status = 503;

    // @ts-expect-error - simplified mock for test
    vi.mocked(useSWR).mockReturnValue({
      data: null,
      error: mockError,
      isLoading: false,
      isValidating: false,
    });

    const { result } = renderHook(() => useMediaSearch('album'));
    expect(result.current.error?.status).toBe(503);
  });

  it('should register items in the Media Registry when data is received', async () => {
    const { useMediaRegistry } = await import('@/components/providers/MediaRegistryProvider');
    const mockRegisterItems = vi.fn();
    vi.mocked(useMediaRegistry).mockReturnValue({
      registerItems: mockRegisterItems,
      getItem: vi.fn(),
      registerItem: vi.fn(),
    });

    const mockResults: MediaItem[] = [
      { id: '1', title: 'Test Item', type: 'album', artist: 'Test Artist', mbid: '123' },
    ];

    // @ts-expect-error - simplified mock for test
    vi.mocked(useSWR).mockReturnValue({
      data: { results: mockResults, page: 1, totalPages: 1 },
      isLoading: false,
      isValidating: false,
    });

    renderHook(() => useMediaSearch('album'));

    expect(mockRegisterItems).toHaveBeenCalledWith(mockResults);
  });

  it('should enrich search results with data from the global registry', async () => {
    const { useMediaRegistry } = await import('@/components/providers/MediaRegistryProvider');
    const mockItem1: MediaItem = { id: '1', title: 'Search Result', type: 'artist', mbid: 'mbid-1' };
    const mockItem1Enriched: MediaItem = { ...mockItem1, imageUrl: 'http://cached.com/image.jpg' };

    vi.mocked(useMediaRegistry).mockReturnValue({
      registerItems: vi.fn(),
      registerItem: vi.fn(),
      getItem: vi.fn((id: string) =>
        id === '1' ? mockItem1Enriched : undefined,
      ) as unknown as <T extends MediaItem>(id: string) => T | undefined,
    });

    // @ts-expect-error - simplified mock for test
    vi.mocked(useSWR).mockReturnValue({
      data: { results: [mockItem1], page: 1, totalPages: 1 },
      isLoading: false,
      isValidating: false,
    });

    const { result } = renderHook(() => useMediaSearch('artist'));

    // Result should be enriched with the cached image URL
    expect(result.current.results[0].imageUrl).toBe('http://cached.com/image.jpg');
    expect(result.current.results[0].title).toBe('Search Result');
  });

  it('should trigger search with new filters like artistId and albumId', () => {
    const { result } = renderHook(() => useMediaSearch('song'));
    vi.mocked(useSWR).mockClear();

    act(() => {
      result.current.updateFilters({ selectedArtist: { id: 'artist-1', name: 'The Beatles' } });
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    act(() => {
      result.current.updateFilters({
        selectedAlbum: { id: 'album-1', name: 'Abbey Road', artist: 'The Beatles' },
      });
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ 
        selectedArtist: expect.objectContaining({ id: 'artist-1' }) 
      }),
      expect.any(Function),
      expect.any(Object),
    );
    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ 
        selectedAlbum: expect.objectContaining({ id: 'album-1' }) 
      }),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should respect artistId and albumId configuration overrides', () => {
    renderHook(() => useMediaSearch('album', { artistId: 'forced-artist' }));

    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedArtist: expect.objectContaining({ id: 'forced-artist' })
      }),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should trigger search with minDuration and maxDuration filters', () => {
    const { result } = renderHook(() => useMediaSearch('song'));
    vi.mocked(useSWR).mockClear();

    act(() => {
      result.current.updateFilters({ minDuration: '180' }); // 3 minutes
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ minDuration: '180' }),
      expect.any(Function),
      expect.any(Object),
    );

    act(() => {
      result.current.updateFilters({ maxDuration: '300' }); // 5 minutes
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(useSWR).toHaveBeenCalledWith(
      expect.objectContaining({ maxDuration: '300' }),
      expect.any(Function),
      expect.any(Object),
    );
  });
});
