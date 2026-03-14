import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addTier, deleteTier, randomizeColors } from '@/board/state/reducer';

import { useTierStructure } from './useTierStructure';

// Mock useToast
const mockShowToast = vi.fn();
vi.mock('@/lib/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock Color Palette
vi.mock('@/lib/colors', () => ({
  TIER_COLORS: [
    { id: 'red', label: 'Red' },
    { id: 'blue', label: 'Blue' },
  ],
  DEFAULT_BRAND_COLORS: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
}));

describe('useTierStructure', () => {
  it('should add a new tier', () => {
    const dispatchMock = vi.fn();
    const pushHistoryMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(dispatchMock, pushHistoryMock));

    act(() => {
      result.current.handleAddTier();
    });

    expect(pushHistoryMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith(addTier());
  });

  it('should delete a tier', () => {
    const dispatchMock = vi.fn();
    const pushHistoryMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(dispatchMock, pushHistoryMock));

    const tierId = 'tier-1';

    act(() => {
      result.current.handleDeleteTier(tierId);
    });

    expect(pushHistoryMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith(deleteTier({ id: tierId }));
  });

  it('should randomize colors', () => {
    const dispatchMock = vi.fn();
    const pushHistoryMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(dispatchMock, pushHistoryMock));

    act(() => {
      result.current.handleRandomizeColors();
    });

    expect(pushHistoryMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith(randomizeColors());
    expect(mockShowToast).toHaveBeenCalled();
  });
});
