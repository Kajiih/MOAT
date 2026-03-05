import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useItemRegistry } from '@/components/providers/ItemRegistryProvider';
import { useLegacyItemDetails } from '@/v1/lib/hooks/useLegacyItemDetails';
import { LegacyItem } from '@/lib/types';

import { useItemResolver } from './useItemResolver';

// Mock dependencies
vi.mock('@/components/providers/ItemRegistryProvider', () => ({
  useItemRegistry: vi.fn(),
}));

vi.mock('@/v1/lib/hooks/useLegacyItemDetails', () => ({
  useLegacyItemDetails: vi.fn(),
}));

describe('useItemResolver', () => {
  const mockGetItem = vi.fn();
  const mockRegisterItem = vi.fn();
  const mockUseMediaDetails = vi.mocked(useLegacyItemDetails);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useItemRegistry).mockReturnValue({
      getItem: mockGetItem,
      registerItem: mockRegisterItem,
      registerItems: vi.fn(),
      registrySize: 0,
      clearRegistry: vi.fn(),
    });

    mockUseMediaDetails.mockReturnValue({
      details: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useLegacyItemDetails>);
  });

  const mockItem: LegacyItem = {
    id: '1',
    mbid: 'mb1',
    type: 'album',
    title: 'Test Album',
    imageUrl: 'old-img.jpg',
  } as LegacyItem;

  it('should prefer cached item from registry if available', () => {
    const cachedItem = { ...mockItem, title: 'Cached Title' };
    mockGetItem.mockReturnValue(cachedItem);

    const onUpdate = vi.fn();
    const { result } = renderHook(() => useItemResolver(mockItem, { onUpdate }));

    expect(result.current.resolvedItem?.title).toBe('Cached Title');
    expect(onUpdate).toHaveBeenCalledWith('1', cachedItem);
  });

  it('should trigger fetch if item is not enriched in registry', () => {
    mockGetItem.mockReturnValue(undefined); // Not in cache
    renderHook(() => useItemResolver(mockItem, { enabled: true }));

    expect(mockUseMediaDetails).toHaveBeenCalledWith('1', 'album');
  });

  it('should NOT trigger fetch if enabled: false', () => {
    mockGetItem.mockReturnValue(undefined);

    renderHook(() => useItemResolver(mockItem, { enabled: false }));

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
    } as unknown as ReturnType<typeof useLegacyItemDetails>);

    const onUpdate = vi.fn();
    const { rerender } = renderHook(() => useItemResolver(mockItem, { onUpdate, persist: true }));

    // Simulate completion
    mockUseMediaDetails.mockReturnValue({
      details: mockDetails,
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useLegacyItemDetails>);

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

    const { result } = renderHook(() => useItemResolver(mockItem));

    expect(result.current.isEnriched).toBe(true);
    expect(mockUseMediaDetails).toHaveBeenCalledWith(null, null); // No fetch needed
  });
});
