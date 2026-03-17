import { describe, expect, it } from 'vitest';

import { TierListState } from '@/board/types';

describe('TierList custom matchers', () => {
  const mockState: TierListState = {
    title: 'My Custom Board',
    tierDefs: [
      { id: 'tier-s', label: 'S', color: 'red' },
      { id: 'tier-a', label: 'A', color: 'blue' },
    ],
    itemEntities: {
      'item-1': {
        id: 'item-1',
        identity: { providerItemId: 'item-1', providerId: 'mock', entityId: 'item-1' },
        title: 'Top Song',
        images: [],
      },
    },
    tierLayout: {
      'tier-s': ['item-1'],
      'tier-a': [],
    },
  };

  it('verifies toHaveTitle works', () => {
    expect(mockState).toHaveTitle('My Custom Board');
    expect(mockState).not.toHaveTitle('Other Board');
  });

  it('verifies toHaveTier works', () => {
    expect(mockState).toHaveTier('S');
    expect(mockState).toHaveTier('A');
    expect(mockState).not.toHaveTier('F');
  });

  it('verifies toContainItem works', () => {
    expect(mockState).toContainItem('item-1');
    expect(mockState).toContainItem('item-1', 'S');
    expect(mockState).not.toContainItem('item-1', 'A');
    expect(mockState).not.toContainItem('non-existent');
  });

  it('verifies toHaveItemCount works', () => {
    expect(mockState).toHaveItemCount(1, 'S');
    expect(mockState).toHaveItemCount(0, 'A');
    expect(mockState).not.toHaveItemCount(5, 'S');
  });
});
