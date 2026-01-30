import { describe, expect, it } from 'vitest';

import { mediaTypeRegistry } from '@/lib/media-types';
import { MediaType } from '@/lib/types';

describe('MediaTypeRegistry', () => {
  it('should be initialized with default definitions', () => {
    const musicTypes = mediaTypeRegistry.getByCategory('music');
    expect(musicTypes.length).toBeGreaterThan(0);
    expect(musicTypes.find((t) => t.id === 'album')).toBeDefined();
  });

  it('should retrieve specific media type definitions', () => {
    const album = mediaTypeRegistry.get('album');
    expect(album).toBeDefined();
    expect(album.id).toBe('album');
    expect(album.label).toBe('Album');
  });

  it('should return sort options', () => {
    const opts = mediaTypeRegistry.getSortOptions('album');
    expect(opts).toBeDefined();
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.find((o) => o.value === 'relevance')).toBeDefined();
  });

  it('should return default filters', () => {
    const defaults = mediaTypeRegistry.getDefaultFilters('album');
    expect(defaults).toBeDefined();
    expect(defaults).toHaveProperty('sort');
  });

  it('should throw error for invalid media type', () => {
    expect(() => mediaTypeRegistry.get('invalid-type' as MediaType)).toThrow();
  });
});
