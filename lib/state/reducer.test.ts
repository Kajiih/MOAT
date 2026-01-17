import { describe, it, expect } from 'vitest';
import { tierListReducer } from './reducer';
import { ActionType } from './actions';
import { TierListState } from '@/lib/types';

// Mock crypto.randomUUID for predictable IDs in tests
Object.defineProperty(global, 'crypto', {
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

    const newTierId = nextState.tierDefs[0]?.id;
    expect(newTierId).toBe('mock-uuid');
    expect(nextState.items[newTierId]).toEqual([]);
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
        delete: [{ id: 'item-1', title: 'Song', type: 'song', artist: 'Artist' }],
      },
    };

    const action = { type: ActionType.DELETE_TIER, payload: { id: 'delete' } } as const;
    const nextState = tierListReducer(state, action);

    // Behavior: The tier is gone, but the item is preserved in the remaining tier
    expect(nextState.tierDefs.find((t) => t.id === 'delete')).toBeUndefined();
    expect(Object.values(nextState.items).flat()).toContainEqual(
      expect.objectContaining({ id: 'item-1' }),
    );
  });

  it('should handle MOVE_ITEM by updating item positions', () => {
    const state: TierListState = {
      ...createBaseState(),
      items: {
        t1: [
          { id: '1', title: 'Item 1', type: 'song', artist: 'A' },
          { id: '2', title: 'Item 2', type: 'song', artist: 'B' },
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
        t1: [{ id: '1', title: 'Old', type: 'song', artist: 'A' }],
      },
    };

    const action = {
      type: ActionType.UPDATE_ITEM,
      payload: { itemId: '1', updates: { title: 'New' } },
    } as const;

    const nextState = tierListReducer(state, action);

    expect(nextState.items['t1'][0].title).toBe('New');
    expect(nextState.items['t1'][0].artist).toBe('A');
  });

  it('should handle UPDATE_TITLE', () => {
    const action = { type: ActionType.UPDATE_TITLE, payload: { title: 'New' } } as const;
    const nextState = tierListReducer(createBaseState(), action);
    expect(nextState.title).toBe('New');
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
  });
});
