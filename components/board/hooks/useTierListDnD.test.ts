import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionType } from '@/lib/state/actions';
import { MediaItem, TierListState } from '@/lib/types';

import { useTierListDnD } from './useTierListDnD';

// Mock dnd-kit sensors to avoid issues with browser APIs in JSDOM
vi.mock('@dnd-kit/core', async () => {
  const actual = (await vi.importActual('@dnd-kit/core')) as object;
  return {
    ...actual,
    useSensors: vi.fn(() => []),
    useSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    MouseSensor: vi.fn(),
    TouchSensor: vi.fn(),
  };
});

describe('useTierListDnD', () => {
  const mockState: TierListState = {
    title: 'Test Board',
    category: 'music',
    tierDefs: [
      { id: 'tier-1', label: 'S', color: 'red' },
      { id: 'tier-2', label: 'A', color: 'blue' },
    ],
    items: {
      'tier-1': [],
      'tier-2': [],
    },
  };

  const mockDispatch = vi.fn();
  const mockPushHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should handle handleDragStart for a media item', () => {
    const { result } = renderHook(() => useTierListDnD(mockState, mockDispatch, mockPushHistory));

    const mediaItem: MediaItem = { id: 'm1', title: 'Song 1', type: 'song' } as MediaItem;
    const event = {
      active: {
        id: 'm1',
        data: {
          current: {
            type: 'mediaItem',
            mediaItem,
          },
        },
      },
    };

    act(() => {
      result.current.handleDragStart(event as unknown as DragStartEvent);
    });

    expect(mockPushHistory).toHaveBeenCalled();
    expect(result.current.activeItem).toEqual(mediaItem);
    expect(result.current.activeTier).toBeNull();
  });

  it('should handle handleDragOver and dispatch MOVE_ITEM', () => {
    const { result } = renderHook(() => useTierListDnD(mockState, mockDispatch, mockPushHistory));

    const mediaItem: MediaItem = { id: 'm1', title: 'Song 1', type: 'song' } as MediaItem;
    const event = {
      active: {
        id: 'm1',
        data: {
          current: {
            type: 'mediaItem',
            mediaItem,
            sourceTier: 'tier-1',
          },
        },
      },
      over: {
        id: 'tier-2',
      },
    };

    act(() => {
      result.current.handleDragOver(event as unknown as DragOverEvent);
    });

    expect(result.current.overId).toBe('tier-2');

    // MOVE_ITEM is wrapped in setTimeout(..., 0)
    act(() => {
      vi.runAllTimers();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionType.MOVE_ITEM,
      payload: {
        activeId: 'm1',
        overId: 'tier-2',
        activeTierId: 'tier-1',
        activeItem: mediaItem,
      },
    });
  });

  it('should handle handleDragEnd for item reordering', () => {
    const { result } = renderHook(() => useTierListDnD(mockState, mockDispatch, mockPushHistory));

    const mediaItem: MediaItem = { id: 'm1', title: 'Song 1', type: 'song' } as MediaItem;
    const event = {
      active: {
        id: 'm1',
        data: {
          current: {
            type: 'mediaItem',
            mediaItem,
          },
        },
      },
      over: {
        id: 'm2',
      },
    };

    act(() => {
      result.current.handleDragEnd(event as unknown as DragEndEvent);
    });

    expect(result.current.activeItem).toBeNull();
    expect(result.current.overId).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionType.MOVE_ITEM,
      payload: {
        activeId: 'm1',
        overId: 'm2',
        activeItem: mediaItem,
      },
    });
  });

  it('should handle handleDragEnd for tier reordering', () => {
    const { result } = renderHook(() => useTierListDnD(mockState, mockDispatch, mockPushHistory));

    const event = {
      active: {
        id: 'tier-1',
        data: {
          current: {
            type: 'tier',
          },
        },
      },
      over: {
        id: 'tier-2',
      },
    };

    act(() => {
      result.current.handleDragEnd(event as unknown as DragEndEvent);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionType.REORDER_TIERS,
      payload: { oldIndex: 0, newIndex: 1 },
    });
  });

  it('should normalize ID after dragging an item from search', () => {
    const { result } = renderHook(() => useTierListDnD(mockState, mockDispatch, mockPushHistory));

    const canonicalItem: MediaItem = {
      id: 'real-id',
      title: 'Real Song',
      type: 'song',
    } as MediaItem;
    const event = {
      active: {
        id: 'search-123',
        data: {
          current: {
            type: 'mediaItem',
            mediaItem: canonicalItem,
          },
        },
      },
      over: {
        id: 'tier-1',
      },
    };

    act(() => {
      result.current.handleDragEnd(event as unknown as DragEndEvent);
    });

    // MOVE_ITEM happens first
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: ActionType.MOVE_ITEM }),
    );

    // Normalization happens in next tick
    act(() => {
      vi.runAllTimers();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: ActionType.UPDATE_ITEM,
      payload: {
        itemId: 'search-123',
        updates: { id: 'real-id' },
      },
    });
  });
});
