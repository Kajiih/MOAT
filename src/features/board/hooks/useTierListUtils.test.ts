/**
 * @file useTierListUtils.test.ts
 * @description Unit tests for useTierListUtils hook.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TierListState } from '@/features/board/types';

import { useTierListUtils } from './useTierListUtils';

const mockShowToast = vi.fn();

// Mock dependecies
vi.mock('@/core/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

describe('useTierListUtils', () => {
  const mockState: TierListState = {
    title: 'Test Board',
    tierDefs: [
      { id: 'tier-s', label: 'S', color: 'red' },
      { id: 'tier-a', label: 'A', color: 'blue' },
      { id: 'tier-b', label: 'B', color: 'green' },
      { id: 'tier-c', label: 'C', color: 'yellow' },
      { id: 'tier-d', label: 'D', color: 'purple' },
    ],
    itemEntities: {},
    tierLayout: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default header colors when not dragging', () => {
    const { result } = renderHook(() => useTierListUtils(mockState, null, null));

    expect(result.current.headerColors).toEqual(['red', 'blue', 'green', 'yellow']);
  });

  it('should return projected header colors when dragging and hovering', () => {
    // Drag S over B (index 0 to 2)
    const { result } = renderHook(() => useTierListUtils(mockState, 'tier-s', 'tier-b'));

    // Expected order: A, B, S, C (if active moves to over index)
    // arrayMove shifts items. oldIndex=0, newIndex=2.
    // [S, A, B, C, D] -> [A, B, S, C, D]
    expect(result.current.headerColors).toEqual(['blue', 'green', 'red', 'yellow']);
  });

  it('should handle locate successfully when element exists', () => {
    const { result } = renderHook(() => useTierListUtils(mockState, null, null));

    const mockElement = document.createElement('div');
    mockElement.id = 'item-card-item-1';
    mockElement.scrollIntoView = vi.fn();
    document.body.append(mockElement);

    act(() => {
      result.current.handleLocate('item-1');
    });

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });

    // Cleanup
    mockElement.remove();
  });

  it('should show toast when locate fails', () => {
    const { result } = renderHook(() => useTierListUtils(mockState, null, null));
    act(() => {
      result.current.handleLocate('non-existent');
    });

    expect(mockShowToast).toHaveBeenCalledWith('Could not locate item on board.', 'error');
  });
});
