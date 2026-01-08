import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTierStructure } from './useTierStructure';
import { TierListState } from '@/lib/types';

// Mock useToast
const mockShowToast = vi.fn();
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock Color Palette
vi.mock('@/lib/colors', () => ({
  TIER_COLORS: [{ id: 'red', label: 'Red' }, { id: 'blue', label: 'Blue' }],
}));

describe('useTierStructure', () => {
  it('should add a new tier', () => {
    const setStateMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(setStateMock));

    act(() => {
      result.current.handleAddTier();
    });

    expect(setStateMock).toHaveBeenCalled();
    
    // Check if the updater function was called
    const updater = setStateMock.mock.calls[0][0];
    const prevState: TierListState = { tierDefs: [], items: {} };
    const newState = updater(prevState);

    expect(newState.tierDefs).toHaveLength(1);
    expect(newState.tierDefs[0].label).toBe('New Tier');
    expect(newState.items[newState.tierDefs[0].id]).toEqual([]);
  });

  it('should delete a tier', () => {
    const setStateMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(setStateMock));

    const tierId = 'tier-1';
    
    act(() => {
      result.current.handleDeleteTier(tierId);
    });

    const updater = setStateMock.mock.calls[0][0];
    const prevState: TierListState = { 
        tierDefs: [{ id: 'tier-1', label: 'S', color: 'red' }], 
        items: { 'tier-1': [] } 
    };
    const newState = updater(prevState);

    expect(newState.tierDefs).toHaveLength(0);
    expect(newState.items['tier-1']).toBeUndefined();
  });

  it('should move items to fallback tier on delete', () => {
    const setStateMock = vi.fn();
    const { result } = renderHook(() => useTierStructure(setStateMock));

    const tierToDelete = 'tier-delete';
    const tierFallback = 'tier-keep';
    
    act(() => {
      result.current.handleDeleteTier(tierToDelete);
    });

    const updater = setStateMock.mock.calls[0][0];
    const prevState: TierListState = { 
        tierDefs: [
            { id: tierFallback, label: 'Keep', color: 'red' },
            { id: tierToDelete, label: 'Delete', color: 'blue' }
        ], 
        items: { 
            [tierFallback]: [],
            [tierToDelete]: [{ id: 'i1', title: 'Song', type: 'song', artist: 'Artist' }] 
        } 
    };
    const newState = updater(prevState);

    expect(newState.tierDefs).toHaveLength(1);
    expect(newState.tierDefs[0].id).toBe(tierFallback);
    // Items should be moved
    expect(newState.items[tierFallback]).toHaveLength(1);
    expect(newState.items[tierFallback][0].id).toBe('i1');
  });
});
