import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaRegistry } from '@/components/providers/MediaRegistryProvider';
import { useMediaDetails } from '@/lib/hooks/useMediaDetails';
import { MediaItem } from '@/lib/types';

import { useMediaResolver } from './useMediaResolver';

// Mock dependencies
vi.mock('@/components/providers/MediaRegistryProvider', () => ({
  useMediaRegistry: vi.fn(),
}));

vi.mock('@/lib/hooks/useMediaDetails', () => ({
  useMediaDetails: vi.fn(),
}));

describe('useMediaResolver', () => {
  const mockGetItem = vi.fn();
  const mockRegisterItem = vi.fn();
  const mockUseMediaDetails = vi.mocked(useMediaDetails);

  beforeEach(() => {
    vi.clearAllMocks();
    (useMediaRegistry as any).mockReturnValue({
      getItem: mockGetItem,
      registerItem: mockRegisterItem,
    });

    mockUseMediaDetails.mockReturnValue({
      details: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);
  });

  const mockItem: MediaItem = {
    id: '1',
    mbid: 'mb1',
    type: 'album',
    title: 'Test Album',
    imageUrl: 'old-img.jpg',
  } as MediaItem;

  it('should prefer cached item from registry if available', () => {
    const cachedItem = { ...mockItem, title: 'Cached Title' };
    mockGetItem.mockReturnValue(cachedItem);

    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMediaResolver(mockItem, { onUpdate }));

    expect(result.current.resolvedItem?.title).toBe('Cached Title');
    expect(onUpdate).toHaveBeenCalledWith('1', cachedItem);
  });

  it('should trigger fetch if item is not enriched in registry', () => {
    mockGetItem.mockReturnValue(undefined); // Not in cache

    renderHook(() => useMediaResolver(mockItem, { enabled: true }));

    expect(mockUseMediaDetails).toHaveBeenCalledWith('1', 'album');
  });

  it('should NOT trigger fetch if enabled: false', () => {
    mockGetItem.mockReturnValue(undefined);

    renderHook(() => useMediaResolver(mockItem, { enabled: false }));

    expect(mockUseMediaDetails).toHaveBeenCalledWith(null, null);
  });

  it('should update registry and call onUpdate when details are fetched', async () => {
    mockGetItem.mockReturnValue(undefined);
    const mockDetails = { id: '1', type: 'album', mbid: 'mb1', title: 'Details' };

    mockUseMediaDetails.mockReturnValueOnce({
      details: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    } as any);

    const onUpdate = vi.fn();
    const { rerender } = renderHook(() => useMediaResolver(mockItem, { onUpdate, persist: true }));

    // Simulate completion
    mockUseMediaDetails.mockReturnValue({
      details: mockDetails,
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);

    rerender();

    expect(mockRegisterItem).toHaveBeenCalledWith(
      expect.objectContaining({
        details: mockDetails,
      }),
    );
    expect(onUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ details: mockDetails }));
  });

  it('should report as enriched if registry already has details', () => {
    const enrichedCached = { ...mockItem, details: { id: '1' } };
    mockGetItem.mockReturnValue(enrichedCached);

    const { result } = renderHook(() => useMediaResolver(mockItem));

    expect(result.current.isEnriched).toBe(true);
    expect(mockUseMediaDetails).toHaveBeenCalledWith(null, null); // No fetch needed
  });
});
