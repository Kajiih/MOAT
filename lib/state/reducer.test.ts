import { describe, expect, it } from 'vitest';

import { createSong, createTierDef, createTierListState } from '@/lib/test/factories';
import { SongItem } from '@/lib/types';

import { ActionType } from './actions';
import { tierListReducer } from './reducer';

// Mock crypto.randomUUID for predictable IDs in tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid',
  },
});

describe('tierListReducer', () => {
  it('should handle ADD_TIER by creating a new tier entry', () => {
    const state = createTierListState({ tierDefs: [], items: {} });
    const action = { type: ActionType.ADD_TIER } as const;

    const nextState = tierListReducer(state, action);

    expect(nextState).toHaveTier('New Tier');
    expect(nextState).toHaveItemCount(0, 'New Tier');
  });

  it('should handle DELETE_TIER by removing the tier and migrating its items', () => {
    const tierKeep = createTierDef({ id: 'keep', label: 'Keep' });
    const tierDelete = createTierDef({ id: 'delete', label: 'Delete' });
    const song = createSong({ id: 'item-1' });

    const state = createTierListState({
      tierDefs: [tierKeep, tierDelete],
      items: {
        keep: [],
        delete: [song],
      },
    });

    const action = { type: ActionType.DELETE_TIER, payload: { id: 'delete' } } as const;
    const nextState = tierListReducer(state, action);

    // Behavior: The tier is gone, but the item is preserved in the remaining tier
    expect(nextState).not.toHaveTier('Delete');
    expect(nextState).toHaveTier('Keep');
    expect(nextState).toContainItem('item-1', 'Keep');
  });

  it('should handle MOVE_ITEM by updating item positions', () => {
    const tier = createTierDef({ id: 't1' });
    const song1 = createSong({ id: '1' });
    const song2 = createSong({ id: '2' });

    const state = createTierListState({
      tierDefs: [tier],
      items: {
        t1: [song1, song2],
      },
    });

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
    const song = createSong({ id: '1', title: 'Old', artist: 'A' });
    const state = createTierListState({
      items: {
        'tier-1': [song],
      },
    });

    const action = {
      type: ActionType.UPDATE_ITEM,
      payload: { itemId: '1', updates: { title: 'New' } },
    } as const;

    const nextState = tierListReducer(state, action);
    const updatedItem = nextState.items['tier-1'][0] as SongItem;

    expect(updatedItem.title).toBe('New');
    expect(updatedItem.artist).toBe('A');
  });

  it('should handle UPDATE_TITLE', () => {
    const action = { type: ActionType.UPDATE_TITLE, payload: { title: 'New' } } as const;
    const nextState = tierListReducer(createTierListState(), action);
    expect(nextState).toHaveTitle('New');
  });

  it('should handle SET_STATE by replacing the entire state', () => {
    const newState = createTierListState({
      title: 'Forced State',
      tierDefs: [createTierDef({ id: '1', label: 'Forced' })],
      items: { '1': [] },
    });
    const action = { type: ActionType.SET_STATE, payload: { state: newState } } as const;
    const nextState = tierListReducer(createTierListState(), action);
    expect(nextState).toEqual(newState);
    expect(nextState).toHaveTitle('Forced State');
    expect(nextState).toHaveTier('Forced');
  });

  it('should be idempotent when moving item over its own tier container', () => {
    const song = createSong({ id: '1' });
    const state = createTierListState({
      tierDefs: [createTierDef({ id: 't1' })],
      items: {
        t1: [song],
      },
    });

    const action = {
      type: ActionType.MOVE_ITEM,
      payload: { activeId: '1', overId: 't1' },
    } as const;

    const nextState = tierListReducer(state, action);

    // If it's already in t1, dragging over t1 should ideally be a no-op (same object reference)
    expect(nextState).toBe(state);
  });
});
