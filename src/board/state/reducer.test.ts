import { describe, expect, it } from 'vitest';

import { Item } from '@/board/types';
import { createMockItem, createTierDef, createTierListState } from '@/test/factories';

import {
  addTier,
  deleteTier,
  moveItem,
  setState,
  tierListReducer,
  updateItem,
  updateTitle,
} from './reducer';

// Mock crypto.randomUUID for predictable IDs in tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid',
  },
});

describe('tierListReducer', () => {
  it('should handle addTier by creating a new tier entry', () => {
    const state = createTierListState({ tierDefs: [], tierLayout: {}, itemEntities: {} });
    const action = addTier();

    const nextState = tierListReducer(state, action);

    expect(nextState).toHaveTier('New Tier');
    expect(nextState).toHaveItemCount(0, 'New Tier');
  });

  it('should handle deleteTier by removing the tier and migrating its items', () => {
    const tierKeep = createTierDef({ id: 'keep', label: 'Keep' });
    const tierDelete = createTierDef({ id: 'delete', label: 'Delete' });
    const song = createMockItem({ id: 'item-1' });

    const state = createTierListState({
      tierDefs: [tierKeep, tierDelete],
      itemEntities: { [song.id]: song },
      tierLayout: {
        keep: [],
        delete: [song.id],
      },
    });

    const action = deleteTier({ id: 'delete' });
    const nextState = tierListReducer(state, action);

    // Behavior: The tier is gone, but the item is preserved in the remaining tier
    expect(nextState).not.toHaveTier('Delete');
    expect(nextState).toHaveTier('Keep');
    expect(nextState).toContainItem('item-1', 'Keep');
  });

  it('should handle moveItem by updating item positions', () => {
    const tier = createTierDef({ id: 't1' });
    const song1 = createMockItem({ id: '1' });
    const song2 = createMockItem({ id: '2' });

    const state = createTierListState({
      tierDefs: [tier],
      itemEntities: { [song1.id]: song1, [song2.id]: song2 },
      tierLayout: {
        t1: [song1.id, song2.id],
      },
    });

    const action = moveItem({ activeId: '2', overId: '1' });

    const nextState = tierListReducer(state, action);

    // Behavior: The order of items in the list has changed
    const itemIds = nextState.tierLayout['t1'];
    expect(itemIds).toEqual(['2', '1']);
  });

  it('should handle updateItem details without affecting other properties', () => {
    const song = createMockItem({ id: '1', title: 'Old' });
    const state = createTierListState({
      itemEntities: { [song.id]: song },
      tierLayout: {
        'tier-1': [song.id],
      },
    });

    const action = updateItem({ itemId: '1', updates: { title: 'New' } });

    const nextState = tierListReducer(state, action);
    const updatedItem = nextState.itemEntities['1'] as Item;

    expect(updatedItem.title).toBe('New');
  });

  it('should handle updateTitle', () => {
    const action = updateTitle({ title: 'New' });
    const nextState = tierListReducer(createTierListState(), action);
    expect(nextState).toHaveTitle('New');
  });

  it('should handle setState by replacing the entire state', () => {
    const newState = createTierListState({
      title: 'Forced State',
      tierDefs: [createTierDef({ id: '1', label: 'Forced' })],
      itemEntities: {},
      tierLayout: { '1': [] },
    });
    const action = setState({ state: newState });
    const nextState = tierListReducer(createTierListState(), action);
    expect(nextState).toEqual(newState);
    expect(nextState).toHaveTitle('Forced State');
    expect(nextState).toHaveTier('Forced');
  });

  it('should be idempotent when moving item over its own tier container', () => {
    const song = createMockItem({ id: '1' });
    const state = createTierListState({
      tierDefs: [createTierDef({ id: 't1' })],
      itemEntities: { [song.id]: song },
      tierLayout: {
        t1: [song.id],
      },
    });

    const action = moveItem({ activeId: '1', overId: 't1' });

    const nextState = tierListReducer(state, action);

    // RTK with Immer will return the exact same object if mutations are avoided (which our early return `return;` does)
    expect(nextState).toBe(state);
  });
});
