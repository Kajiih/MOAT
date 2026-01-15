import { renderHook } from '@testing-library/react';
import { useBackgroundEnrichment } from './useBackgroundEnrichment';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaItem } from '@/lib/types';

// Mock useMediaDetails
const mockUseMediaDetails = vi.fn();
vi.mock('@/lib/hooks/useMediaDetails', () => ({
  useMediaDetails: (id: string | null, type: string | null) => mockUseMediaDetails(id, type)
}));

describe('useBackgroundEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation: not loading, no data
    mockUseMediaDetails.mockReturnValue({
      details: null,
      isLoading: false,
      isFetching: false,
      error: null
    });
  });

  const createMockItem = (id: string, hasDetails = false): MediaItem => ({
    id,
    type: 'album',
    title: `Item ${id}`,
    imageUrl: 'img.jpg',
    details: hasDetails ? { id, type: 'album', title: 'Details', tracks: [] } : undefined
  } as MediaItem);

  it('should only process items that are missing details', () => {
    const items = [
      createMockItem('1', true), // Has details
      createMockItem('2', false) // Missing details
    ];
    const onUpdate = vi.fn();

    renderHook(() => useBackgroundEnrichment(items, onUpdate));

    // Should NOT call hook for item 1 (id: '1')
    expect(mockUseMediaDetails).not.toHaveBeenCalledWith('1', 'album');
    
    // Should call hook for item 2 (id: '2')
    expect(mockUseMediaDetails).toHaveBeenCalledWith('2', 'album');
  });

  it('should limit concurrent fetches to 3 items', () => {
    const items = Array.from({ length: 5 }, (_, i) => createMockItem(`${i}`, false));
    const onUpdate = vi.fn();

    renderHook(() => useBackgroundEnrichment(items, onUpdate));

    // Should only have called for the first 3 items
    expect(mockUseMediaDetails).toHaveBeenCalledWith('0', 'album');
    expect(mockUseMediaDetails).toHaveBeenCalledWith('1', 'album');
    expect(mockUseMediaDetails).toHaveBeenCalledWith('2', 'album');
    
    // Should NOT have called for the 4th or 5th
    expect(mockUseMediaDetails).not.toHaveBeenCalledWith('3', 'album');
    expect(mockUseMediaDetails).not.toHaveBeenCalledWith('4', 'album');
  });

  it('should call onUpdateItem when details are successfully fetched', () => {
    const item = createMockItem('1', false);
    const mockDetails = { id: '1', type: 'album', title: 'Fetched Title' };
    
    // Mock successful return for this item
    mockUseMediaDetails.mockImplementation((id: string) => {
        if (id === '1') {
            return {
                details: mockDetails,
                isLoading: false,
                isFetching: false,
                error: null
            };
        }
        return { details: null };
    });

    const onUpdate = vi.fn();

    renderHook(() => useBackgroundEnrichment([item], onUpdate));

    expect(onUpdate).toHaveBeenCalledWith('1', {
        details: mockDetails,
        imageUrl: 'img.jpg' // Should fallback to existing image if details doesn't have one
    });
  });

  it('should not call onUpdateItem if loading or error', () => {
    const item = createMockItem('1', false);
    
    // Mock loading state
    mockUseMediaDetails.mockReturnValue({
        details: null,
        isLoading: true,
        isFetching: true,
        error: null
    });

    const onUpdate = vi.fn();
    renderHook(() => useBackgroundEnrichment([item], onUpdate));

    expect(onUpdate).not.toHaveBeenCalled();
  });
});
