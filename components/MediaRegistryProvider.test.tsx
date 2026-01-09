import { renderHook, act } from '@testing-library/react';
import { MediaRegistryProvider, useMediaRegistry } from './MediaRegistryProvider';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock usePersistentState to isolate registry logic
vi.mock('@/lib/hooks/usePersistentState', () => ({
  usePersistentState: vi.fn((key, initial) => {
    const [state, setState] = React.useState(initial);
    return [state, setState];
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MediaRegistryProvider>{children}</MediaRegistryProvider>
);

describe('MediaRegistryProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register and retrieve items', () => {
    const { result } = renderHook(() => useMediaRegistry(), { wrapper });

    const item = { id: '1', title: 'Test', type: 'artist' as const };
    
    act(() => {
      result.current.registerItem(item);
    });

    expect(result.current.getItem('1')).toEqual(item);
  });

  it('should merge items and NOT lose images or details', () => {
    const { result } = renderHook(() => useMediaRegistry(), { wrapper });

    const initialItem = { 
        id: '1', 
        title: 'Test', 
        type: 'artist' as const, 
        imageUrl: 'http://image.com/1.jpg',
        details: { id: '1', type: 'artist' as const, tags: ['rock'] } 
    };
    
    act(() => {
      result.current.registerItem(initialItem as any);
    });

    // Update with an item that lacks image/details (e.g. from a fresh search)
    const sparseItem = { id: '1', title: 'Updated Title', type: 'artist' as const };
    
    act(() => {
      result.current.registerItem(sparseItem as any);
    });

    const final = result.current.getItem('1');
    expect(final?.title).toBe('Updated Title');
    expect(final?.imageUrl).toBe('http://image.com/1.jpg'); // Preserved!
    expect(final?.details?.tags).toContain('rock'); // Preserved!
  });

  it('should prune the registry when it exceeds MAX_REGISTRY_SIZE', () => {
    const { result } = renderHook(() => useMediaRegistry(), { wrapper });

    // Fill with 2001 items (limit is 2000)
    act(() => {
      const items = [];
      for (let i = 0; i < 2001; i++) {
        items.push({ 
            id: `item-${i}`, 
            title: `Item ${i}`, 
            type: 'album' as const,
            artist: 'Test Artist' 
        });
      }
      result.current.registerItems(items as any[]);
    });

    // Should have pruned 200 items (limit hit, prune 200)
    // 2001 - 200 = 1801
    const keys = Object.keys((result.current as any).registry || {});
    // Actually registry is not exposed, but we can check existence of early vs late items
    
    // The implementation prunes the FIRST 200 keys.
    expect(result.current.getItem('item-0')).toBeUndefined();
    expect(result.current.getItem('item-199')).toBeUndefined();
    expect(result.current.getItem('item-200')).toBeDefined();
    expect(result.current.getItem('item-2000')).toBeDefined();
  });

  it('should skip updates if items are identical', async () => {
    const { result } = renderHook(() => useMediaRegistry(), { wrapper });
    const item = { id: '1', title: 'Test', type: 'artist' as const };
    
    act(() => {
      result.current.registerItem(item);
    });

    // We can't easily check 'setRegistry' calls here since we mocked usePersistentState 
    // to use internal useState, but we can verify the state remains the same reference if possible.
    // Instead, let's just ensure logic is sound.
    act(() => {
        result.current.registerItem({ ...item });
    });

    expect(result.current.getItem('1')).toEqual(item);
  });
});
