/**
 * @file useTierListDrag.test.ts
 * @description Unit tests for useTierListDrag hook using dnd-helper simulation.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TierListState } from '@/features/board/types';
import { createMockItem } from '@/test/factories';
import { simulateElementDragStart, simulateElementDrop } from '@/test/helpers/dnd-helper';

import { useTierListDrag } from './useTierListDrag';

// Mock dependencies (automatically mocked on import from dnd-helper)

describe('useTierListDrag', () => {
  const mockDispatch = vi.fn();
  const mockPushHistory = vi.fn();
  const item1 = createMockItem({ id: 'item-1', title: 'Item 1' });
  const item2 = createMockItem({ id: 'item-2', title: 'Item 2' });

  const mockState: TierListState = {
    title: 'Test Board',
    tierDefs: [
      { id: 'tier-s', label: 'S', color: 'red' },
      { id: 'tier-a', label: 'A', color: 'orange' },
    ],
    itemEntities: {
      'item-1': item1,
      'item-2': item2,
    },
    tierLayout: {
      'tier-s': ['item-1'],
      'tier-a': ['item-2'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set activeItem on drag start', () => {
    const { result } = renderHook(() =>
      useTierListDrag(mockState, mockDispatch, mockPushHistory)
    );

    const mockElement = document.createElement('div');
    act(() => {
      simulateElementDragStart({
        source: {
          element: mockElement,
          data: {
            type: 'item',
            item: { id: 'item-1', title: 'Item 1' },
            tierId: 'tier-s',
          },
        },
      });
    });

    expect(result.current.activeItem).toEqual({ id: 'item-1', title: 'Item 1' });
  });

  it('should call dispatch with moveItem on drop', () => {
    renderHook(() =>
      useTierListDrag(mockState, mockDispatch, mockPushHistory)
    );

    const sourceElement = document.createElement('div');
    const targetElement = document.createElement('div');

    // Spy on getBoundingClientRect to avoid JSDOM returning zeros if needed, 
    // but here we just need it to not crash. JSDOM usually has stubbed versions.
    sourceElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100, left: 100, width: 50, height: 50 });
    targetElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 200, left: 100, width: 50, height: 50 });

    simulateElementDrop({
      source: {
        element: sourceElement,
        data: {
          type: 'item',
          item: { id: 'item-1', title: 'Item 1' },
          tierId: 'tier-s',
        },
      },
      location: {
        current: {
          dropTargets: [
            {
              element: targetElement,
              data: {
                type: 'tier',
                tierId: 'tier-a',
              },
            },
          ],
        },
      },
    });

    expect(mockPushHistory).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'board/moveItem',
        payload: expect.objectContaining({
          activeId: 'item-1',
          overId: 'tier-a',
        }),
      })
    );
  });
});
