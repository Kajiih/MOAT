import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActionType } from '@/lib/state/actions';

import { useTierStructure } from './useTierStructure';

// Mock useToast
const mockShowToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
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
    expect(dispatchMock).toHaveBeenCalledWith({
      type: ActionType.ADD_TIER,
    });
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
    expect(dispatchMock).toHaveBeenCalledWith({
      type: ActionType.DELETE_TIER,
      payload: { id: tierId },
    });
  });

  it('should randomize colors', () => {
    const dispatchMock = vi.fn();
    const pushHistoryMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(dispatchMock, pushHistoryMock));

    act(() => {
      result.current.handleRandomizeColors();
    });

    expect(pushHistoryMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: ActionType.RANDOMIZE_COLORS,
    });
    expect(mockShowToast).toHaveBeenCalled();
  });
});
