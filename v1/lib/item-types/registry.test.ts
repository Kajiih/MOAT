import { describe, expect, it } from 'vitest';

import { itemTypeRegistry } from '@/lib/media-types';
import { ItemType } from '@/v1/lib/types';

describe('ItemTypeRegistry', () => {
  it('should be initialized with default definitions', () => {
    const musicTypes = itemTypeRegistry.getByCategory('music');
    expect(musicTypes.length).toBeGreaterThan(0);
    expect(musicTypes.find((t) => t.id === 'album')).toBeDefined();
  });

  it('should retrieve specific media type definitions', () => {
    const album = itemTypeRegistry.get('album');
    expect(album).toBeDefined();
    expect(album.id).toBe('album');
    expect(album.label).toBe('Album');
  });

  it('should return sort options', () => {
    const opts = itemTypeRegistry.getSortOptions('album');
    expect(opts).toBeDefined();
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.find((o) => o.value === 'relevance')).toBeDefined();
  });

  it('should return default filters', () => {
    const defaults = itemTypeRegistry.getDefaultFilters('album');
    expect(defaults).toBeDefined();
    expect(defaults).toHaveProperty('sort');
  });

  it('should throw error for invalid media type', () => {
    expect(() => itemTypeRegistry.get('invalid-type' as ItemType)).toThrow();
  });
});
