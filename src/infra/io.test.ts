import { describe, expect, it } from 'vitest';

import { Item } from '@/domain/items/items';
import { TierListState } from '@/features/board/types';

import { deserializeBoardData, serializeBoardData } from './io';

describe('io.ts', () => {
  const mockState: TierListState = {
    title: 'Test Board',
    tierDefs: [
      { id: 't1', label: 'S', color: '#ff0000' },
      { id: 't2', label: 'A', color: '#00ff00' },
    ],
    itemEntities: {
      i1: {
        id: 'i1',
        title: 'Item 1',
        identity: { providerId: 'test', entityId: 'track', providerItemId: '1' },
      } as unknown as Item,
      i2: {
        id: 'i2',
        title: 'Item 2',
        identity: { providerId: 'test', entityId: 'track', providerItemId: '2' },
      } as unknown as Item,
    },
    tierLayout: {
      t1: ['i1'],
      t2: ['i2'],
      unranked: [],
    },
  };

  it('serializeBoardData should create valid schema object', () => {
    const data = serializeBoardData(mockState);
    expect(data.version).toBe(2);
    expect(data.title).toBe('Test Board');
    expect(data.tiers).toHaveLength(2);
    expect(data.tiers[0].label).toBe('S');
    expect(data.tiers[0].items[0].id).toBe('i1');
  });

  it('deserializeBoardData should parse valid export data', () => {
    const exportData = serializeBoardData(mockState);
    const jsonString = JSON.stringify(exportData);

    const importedState = deserializeBoardData(jsonString, 'Fallback');
    expect(importedState.title).toBe('Test Board');
    expect(importedState.tierDefs).toHaveLength(2);
    expect(importedState.tierDefs[0].label).toBe('S');
    // UUIDs are regenerated, so we check if layout matches items
    const firstTierId = importedState.tierDefs[0].id;
    const firstTierItems = importedState.tierLayout[firstTierId];
    expect(firstTierItems).toHaveLength(1);
  });

  it('deserializeBoardData should throw for missing version', () => {
    const invalidData = {
      title: 'Test',
      tiers: [],
      createdAt: 'now',
    };
    expect(() => deserializeBoardData(JSON.stringify(invalidData), 'Fallback')).toThrow();
  });

  it('deserializeBoardData should throw for missing items inside tiers', () => {
    const invalidData = {
      version: 1,
      title: 'Test',
      createdAt: 'now',
      tiers: [
        { label: 'S', color: '#fff' }, // missing items
      ],
    };
    expect(() => deserializeBoardData(JSON.stringify(invalidData), 'Fallback')).toThrow();
  });

  it('deserializeBoardData should handle legacy data with auto-migration', () => {
    const legacyData = {
      version: 1,
      // missing createdAt and title
      tiers: [
        {
          label: 'S',
          color: '#ff0000',
          items: [
            { id: 'i1', mbid: 'mbid-1', type: 'album' }, // missing identity
          ],
        },
      ],
    };

    const importedState = deserializeBoardData(JSON.stringify(legacyData), 'Fallback Title');
    
    expect(importedState.title).toBe('Untitled Board'); // Default applied
    expect(importedState.tierDefs).toHaveLength(1);
    
    const firstTierId = importedState.tierDefs[0].id;
    const firstItemId = importedState.tierLayout[firstTierId][0];
    const item = importedState.itemEntities[firstItemId];
    
    expect(item.identity).toBeDefined();
    expect(item.identity?.providerId).toBe('musicbrainz');
    expect(item.identity?.entityId).toBe('album');
    expect(item.identity?.providerItemId).toBe('mbid-1');
  });

  it('deserializeBoardData should reject invalid modern data if migration fails', () => {
    const invalidData = {
      version: 1,
      createdAt: 'now',
      title: 'Test',
      tiers: [
        {
          label: 'S',
          color: '#ff0000',
          items: [
            { id: 'i1' }, // missing identity AND missing mbid/type (cannot migrate!)
          ],
        },
      ],
    };

    expect(() => deserializeBoardData(JSON.stringify(invalidData), 'Fallback')).toThrow();
  });

  it('deserializeBoardData should migrate imageUrl to images array', () => {
    const legacyData = {
      version: 1,
      title: 'Test',
      tiers: [
        {
          label: 'S',
          color: '#ff0000',
          items: [
            { id: 'i1', mbid: 'mbid-1', type: 'song', imageUrl: 'http://example.com/image.jpg' },
          ],
        },
      ],
    };

    const importedState = deserializeBoardData(JSON.stringify(legacyData), 'Fallback');
    
    const firstTierId = importedState.tierDefs[0].id;
    const firstItemId = importedState.tierLayout[firstTierId][0];
    const item = importedState.itemEntities[firstItemId];
    
    expect(item.images).toBeDefined();
    expect(item.images).toHaveLength(1);
    expect(item.images[0].type).toBe('url');
    const image = item.images[0];
    if (image.type === 'url') {
      expect(image.url).toBe('http://example.com/image.jpg');
    } else {
      throw new Error('Expected image to be of type url');
    }
  });
});
