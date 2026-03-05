import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LegacyItem } from '@/lib/types';

import { ItemRegistryProvider, useItemRegistry } from './ItemRegistryProvider';

// Mock usePersistentState to isolate registry logic
vi.mock('@/lib/hooks/usePersistentState', () => ({
  usePersistentState: vi.fn((_key, initial) => {
    const [state, setState] = React.useState(initial);
    return [state, setState];
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ItemRegistryProvider>{children}</ItemRegistryProvider>
);

describe('ItemRegistryProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register and retrieve items', () => {
    const { result } = renderHook(() => useItemRegistry(), { wrapper });

    const item: LegacyItem = { id: '1', title: 'Test', type: 'artist', mbid: 'mbid-1' };

    act(() => {
      result.current.registerItem(item);
    });

    expect(result.current.getItem('1')).toEqual(item);
  });

  it('should merge items and NOT lose images or details', () => {
    const { result } = renderHook(() => useItemRegistry(), { wrapper });

    const initialItem: LegacyItem = {
      id: '1',
      title: 'Test',
      type: 'artist',
      mbid: 'mbid-1',
      imageUrl: 'http://image.com/1.jpg',
      details: { id: '1', mbid: 'mbid-1', type: 'artist', tags: ['rock'] },
    };

    act(() => {
      result.current.registerItem(initialItem);
    });

    // Update with an item that lacks image/details (e.g. from a fresh search)
    const sparseItem: LegacyItem = {
      id: '1',
      title: 'Updated Title',
      type: 'artist',
      mbid: 'mbid-1',
    };

    act(() => {
      result.current.registerItem(sparseItem);
    });

    const final = result.current.getItem('1');
    expect(final?.title).toBe('Updated Title');
    expect(final?.imageUrl).toBe('http://image.com/1.jpg'); // Preserved!
    expect(final?.details?.tags).toContain('rock'); // Preserved!
  });

  it('should prune the registry when it exceeds MAX_REGISTRY_SIZE', () => {
    const { result } = renderHook(() => useItemRegistry(), { wrapper });

    // Fill with 2001 items (limit is 2000)
    act(() => {
      const items: LegacyItem[] = [];
      for (let i = 0; i < 2001; i++) {
        items.push({
          id: `item-${i}`,
          title: `Item ${i}`,
          type: 'album',
          artist: 'Test Artist',
          mbid: `mbid-${i}`,
        } as LegacyItem);
      }
      result.current.registerItems(items);
    });

    // Should have pruned 200 items (limit hit, prune 200)
    // 2001 - 200 = 1801

    // The implementation prunes the FIRST 200 keys.
    expect(result.current.getItem('item-0')).toBeUndefined();
    expect(result.current.getItem('item-199')).toBeUndefined();
    expect(result.current.getItem('item-200')).toBeDefined();
    expect(result.current.getItem('item-2000')).toBeDefined();
  });

  it('should skip updates if items are identical', async () => {
    const { result } = renderHook(() => useItemRegistry(), { wrapper });
    const item: LegacyItem = { id: '1', title: 'Test', type: 'artist', mbid: 'mbid-1' };

    act(() => {
      result.current.registerItem(item);
    });

    act(() => {
      result.current.registerItem({ ...item });
    });

    expect(result.current.getItem('1')).toEqual(item);
  });

  it('should update notes in the registry', () => {
    const { result } = renderHook(() => useItemRegistry(), { wrapper });

    const item: LegacyItem = {
      id: '1',
      title: 'Test',
      type: 'artist',
      mbid: 'mbid-1',
      notes: 'Old',
    };

    act(() => {
      result.current.registerItem(item);
    });

    expect(result.current.getItem('1')?.notes).toBe('Old');

    act(() => {
      result.current.registerItem({ ...item, notes: 'New' });
    });

    expect(result.current.getItem('1')?.notes).toBe('New');
  });
});
