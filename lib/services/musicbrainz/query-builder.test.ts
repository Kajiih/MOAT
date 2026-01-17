import { describe, it, expect } from 'vitest';
import { buildMusicBrainzQuery, QueryBuilderParams } from './query-builder';
import { MediaType } from '@/lib/types';

const defaultOptions = { fuzzy: false, wildcard: false };

/**
 * Helper to create standard query params with sensible defaults
 * @param overrides
 */
function createParams(overrides: Partial<QueryBuilderParams> = {}): QueryBuilderParams {
  return {
    type: 'album' as MediaType,
    query: '',
    artist: null,
    artistId: null,
    albumId: null,
    minYear: null,
    maxYear: null,
    albumPrimaryTypes: [],
    albumSecondaryTypes: [],
    artistType: null,
    artistCountry: null,
    tag: null,
    minDuration: null,
    maxDuration: null,
    options: defaultOptions,
    ...overrides,
  };
}

describe('buildMusicBrainzQuery', () => {
  describe('Basic Entity Mapping', () => {
    it('should map album to releasegroup field and release-group endpoint', () => {
      const { endpoint, query } = buildMusicBrainzQuery(
        createParams({ type: 'album', query: 'Abbey Road' }),
      );
      expect(endpoint).toBe('release-group');
      expect(query).toContain('releasegroup:(Abbey AND Road)');
    });

    it('should map artist to artist field and endpoint', () => {
      const { endpoint, query } = buildMusicBrainzQuery(
        createParams({ type: 'artist', query: 'Beatles' }),
      );
      expect(endpoint).toBe('artist');
      expect(query).toContain('artist:(Beatles)');
    });

    it('should map song to recording field and endpoint', () => {
      const { endpoint, query } = buildMusicBrainzQuery(
        createParams({ type: 'song', query: 'Imagine' }),
      );
      expect(endpoint).toBe('recording');
      expect(query).toContain('recording:(Imagine)');
    });
  });

  describe('Artist Filters', () => {
    it('should include arid when artistId is provided', () => {
      const { query } = buildMusicBrainzQuery(createParams({ type: 'album', artistId: '123' }));
      expect(query).toContain('arid:123');
    });

    it('should include literal artist name when artistId is missing', () => {
      const { query } = buildMusicBrainzQuery(createParams({ type: 'album', artist: 'Queen' }));
      expect(query).toContain('artist:"Queen"');
    });

    it('should NOT include artist filters for artist type search', () => {
      // Searching for an artist named "Queen" shouldn't add artist:Queen filter to itself
      const { query } = buildMusicBrainzQuery(
        createParams({ type: 'artist', query: 'Queen', artist: 'Queen' }),
      );
      expect(query).toBe('artist:(Queen)');
    });
  });

  describe('Year Filters', () => {
    it('should use firstreleasedate for albums and songs', () => {
      const albumQuery = buildMusicBrainzQuery(
        createParams({ type: 'album', minYear: '2000' }),
      ).query;
      const songQuery = buildMusicBrainzQuery(
        createParams({ type: 'song', minYear: '2000' }),
      ).query;

      expect(albumQuery).toContain('firstreleasedate:[2000 TO *]');
      expect(songQuery).toContain('firstreleasedate:[2000 TO *]');
    });

    it('should use begin for artists', () => {
      const { query } = buildMusicBrainzQuery(
        createParams({ type: 'artist', minYear: '1960', maxYear: '1970' }),
      );
      expect(query).toContain('begin:[1960 TO 1970]');
    });
  });

  describe('Duration Filters', () => {
    it('should include dur field for songs when duration range is provided', () => {
      const { query } = buildMusicBrainzQuery(
        createParams({ type: 'song', minDuration: 180000, maxDuration: 300000 }),
      );
      expect(query).toContain('dur:[180000 TO 300000]');
    });

    it('should use wildcards for open-ended duration ranges', () => {
      const { query } = buildMusicBrainzQuery(createParams({ type: 'song', minDuration: 180000 }));
      expect(query).toContain('dur:[180000 TO *]');
    });

    it('should NOT include dur filters for albums', () => {
      const { query } = buildMusicBrainzQuery(createParams({ type: 'album', minDuration: 180000 }));
      expect(query).not.toContain('dur:');
    });
  });

  describe('Album Types', () => {
    it('should include primary types when selected', () => {
      const { query } = buildMusicBrainzQuery(
        createParams({ type: 'album', albumPrimaryTypes: ['Album', 'EP'] }),
      );
      expect(query).toContain('primarytype:("Album" OR "EP")');
    });

    it('should include secondary types when selected', () => {
      const { query } = buildMusicBrainzQuery(
        createParams({ type: 'album', albumSecondaryTypes: ['Live'] }),
      );
      expect(query).toContain('secondarytype:("Live")');
    });

    it('should exclude all known secondary types by default', () => {
      const { query } = buildMusicBrainzQuery(
        createParams({ type: 'album', albumSecondaryTypes: [] }),
      );
      expect(query).toContain('NOT secondarytype:(');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in query', () => {
      const { query } = buildMusicBrainzQuery(createParams({ query: '!!!' }));
      expect(query).toContain('\\\!\\\!\\\!');
    });
  });
});
