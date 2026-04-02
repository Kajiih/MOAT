import { PayloadAction } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import { createMockItem } from '@/test/factories';

import { INITIAL_STATE } from '../../../initial-state';
import { TierListState } from '../../../types';
import { MoveItemPayload } from '../../reducer';
import { handleMoveItem } from '../item-reducer';

describe('itemReducer handleMoveItem', () => {
  it('should move item from one tier to another and remove from source', () => {
    const state: TierListState = {
      ...INITIAL_STATE,
      tierDefs: [
        { id: 'S', label: 'S', color: 'red' },
        { id: 'A', label: 'A', color: 'orange' },
      ],
      tierLayout: {
        S: ['rawg:game:item-1'],
        A: [],
      },
      itemEntities: {
        'rawg:game:item-1': createMockItem({ id: 'rawg:game:item-1', title: 'First Item' }),
      },
    };

    const action: PayloadAction<MoveItemPayload> = {
      type: 'board/moveItem',
      payload: {
        activeId: 'rawg:game:item-1',
        overId: 'A',
      },
    };

    handleMoveItem(state, action);

    // Verify it is in A
    expect(state.tierLayout['A']).toContain('rawg:game:item-1');
    // Verify it is NOT in S
    expect(state.tierLayout['S']).not.toContain('rawg:game:item-1');
  });

  it('should move item between items in same tier', () => {
    const state: TierListState = {
      ...INITIAL_STATE,
      tierLayout: {
        S: ['item-1', 'item-2'],
      },
      itemEntities: {
        'item-1': createMockItem({ id: 'item-1' }),
        'item-2': createMockItem({ id: 'item-2' }),
      },
    };

    const action: PayloadAction<MoveItemPayload> = {
      type: 'board/moveItem',
      payload: {
        activeId: 'item-2',
        overId: 'item-1',
        edge: 'left' as const,
      },
    };

    handleMoveItem(state, action);

    expect(state.tierLayout['S']).toEqual(['item-2', 'item-1']);
  });
});
