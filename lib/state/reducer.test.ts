import { describe, expect, it } from 'vitest';

import { TierListState } from '@/lib/types';

import { ActionType } from './actions';
import { tierListReducer } from './reducer';

// Mock crypto.randomUUID for predictable IDs in tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid',
  },
});

describe('tierListReducer', () => {
  const createBaseState = (): TierListState => ({
    title: 'Test Board',
    tierDefs: [],
    items: {},
  });

  it('should handle ADD_TIER by creating a new tier entry', () => {
    const state = createBaseState();
    const action = { type: ActionType.ADD_TIER } as const;

    const nextState = tierListReducer(state, action);

    expect(nextState).toHaveTier('New Tier');
    expect(nextState).toHaveItemCount(0, 'New Tier');
  });

  it('should handle DELETE_TIER by removing the tier and migrating its items', () => {
    const state: TierListState = {
      ...createBaseState(),
      tierDefs: [
        { id: 'keep', label: 'Keep', color: 'blue' },
        { id: 'delete', label: 'Delete', color: 'red' },
      ],
      items: {
        keep: [],
        delete: [{ id: 'item-1', title: 'Song', type: 'song', artist: 'Artist', mbid: 'mbid-1' }],
      },
    };

    const action = { type: ActionType.DELETE_TIER, payload: { id: 'delete' } } as const;
    const nextState = tierListReducer(state, action);

    // Behavior: The tier is gone, but the item is preserved in the remaining tier
    expect(nextState).not.toHaveTier('Delete');
    expect(nextState).toHaveTier('Keep');
    expect(nextState).toContainItem('item-1', 'Keep');
  });

  it('should handle MOVE_ITEM by updating item positions', () => {
    const state: TierListState = {
      ...createBaseState(),
      items: {
        t1: [
          { id: '1', title: 'Item 1', type: 'song', artist: 'A', mbid: 'mbid-1' },
          { id: '2', title: 'Item 2', type: 'song', artist: 'B', mbid: 'mbid-2' },
        ],
      },
    };

    const action = {
      type: ActionType.MOVE_ITEM,
      payload: { activeId: '2', overId: '1' },
    } as const;

    const nextState = tierListReducer(state, action);

    // Behavior: The order of items in the list has changed
    const itemIds = nextState.items['t1'].map((i) => i.id);
    expect(itemIds).toEqual(['2', '1']);
  });

  it('should handle UPDATE_ITEM details without affecting other properties', () => {
    const state: TierListState = {
      ...createBaseState(),
      items: {
        t1: [{ id: '1', title: 'Old', type: 'song', artist: 'A', mbid: 'mbid-1' }],
      },
    };

    const action = {
      type: ActionType.UPDATE_ITEM,
      payload: { itemId: '1', updates: { title: 'New' } },
    } as const;

    const nextState = tierListReducer(state, action);

    expect(nextState.items['t1'][0].title).toBe('New');
    expect(nextState.items['t1'][0]).toHaveProperty('artist', 'A');
  });

  it('should handle UPDATE_TITLE', () => {
    const action = { type: ActionType.UPDATE_TITLE, payload: { title: 'New' } } as const;
    const nextState = tierListReducer(createBaseState(), action);
    expect(nextState).toHaveTitle('New');
  });

  it('should handle SET_STATE by replacing the entire state', () => {
    const newState: TierListState = {
      title: 'Forced State',
      tierDefs: [{ id: '1', label: 'Forced', color: 'red' }],
      items: { '1': [] },
    };
    const action = { type: ActionType.SET_STATE, payload: { state: newState } } as const;
    const nextState = tierListReducer(createBaseState(), action);
    expect(nextState).toEqual(newState);
    expect(nextState).toHaveTitle('Forced State');
    expect(nextState).toHaveTier('Forced');
  });

  it('should be idempotent when moving item over its own tier container', () => {
    const state: TierListState = {
      ...createBaseState(),
      items: {
        t1: [{ id: '1', title: 'Item 1', type: 'song', artist: 'A', mbid: 'mbid-1' }],
      },
    };

    const action = {
      type: ActionType.MOVE_ITEM,
      payload: { activeId: '1', overId: 't1' },
    } as const;

    const nextState = tierListReducer(state, action);

    // If it's already in t1, dragging over t1 should ideally be a no-op (same object reference)
    // Currently, it might be returning a new object which is part of the problem.
    expect(nextState).toBe(state);
  });
});
