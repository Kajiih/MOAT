import { describe, expect, it } from 'vitest';

import {
  buildAlbumLuceneQuery,
  buildArtistLuceneQuery,
  buildRecordingLuceneQuery,
} from './musicbrainz';

describe('MusicBrainz Adapter', () => {
  describe('Lucene Query Builders', () => {
    describe('buildAlbumLuceneQuery', () => {
      it('should build a basic term query', () => {
        const query = buildAlbumLuceneQuery({ term: 'thriller' });
        expect(query).toBe('"thriller"');
      });

      it('should escape special characters in term', () => {
        const query = buildAlbumLuceneQuery({ term: 'AC/DC' });
        expect(query).toBe(String.raw`"AC\/DC"`);
      });

      it('should build an exact artistId query', () => {
        const query = buildAlbumLuceneQuery({ artistId: '1234-5678', term: 'album' });
        expect(query).toBe('"album" AND arid:1234-5678');
      });

      it('should prioritize artistId over artist text', () => {
        const query = buildAlbumLuceneQuery({ artistId: '1234-5678', artist: 'Michael Jackson' });
        expect(query).toBe('arid:1234-5678');
      });

      it('should handle secondary types array', () => {
        const query = buildAlbumLuceneQuery({ secondarytype: ['Live', 'Compilation'] });
        expect(query).toBe('secondarytype:("Live" OR "Compilation")');
      });

      it('should handle date ranges', () => {
        const query = buildAlbumLuceneQuery({ firstreleasedate: { min: '1990', max: '2000' } });
        expect(query).toBe('firstreleasedate:[1990 TO 2000]');
      });

      it('should return empty string query if no conditions', () => {
        const query = buildAlbumLuceneQuery({});
        expect(query).toBe('""');
      });
    });

    describe('buildArtistLuceneQuery', () => {
      it('should build a basic term query', () => {
        const query = buildArtistLuceneQuery({ term: 'daft punk' });
        expect(query).toBe('"daft punk"');
      });

      it('should build country filter', () => {
        const query = buildArtistLuceneQuery({ country: 'GB', term: 'radiohead' });
        expect(query).toBe('"radiohead" AND country:"GB"');
      });

      it('should handle begin date ranges', () => {
        const query = buildArtistLuceneQuery({ begin: { min: '1990' } });
        expect(query).toBe('begin:[1990 TO *]');
      });
    });

    describe('buildRecordingLuceneQuery', () => {
      it('should build a basic term query', () => {
        const query = buildRecordingLuceneQuery({ term: 'moonlight' });
        expect(query).toBe('"moonlight"');
      });

      it('should handle video boolean', () => {
        const query = buildRecordingLuceneQuery({ video: true, term: 'thriller' });
        expect(query).toBe('"thriller" AND video:true');
      });

      it('should handle dur (duration) range', () => {
        const query = buildRecordingLuceneQuery({ dur: { min: '120000', max: '240000' } });
        expect(query).toBe('dur:[120000 TO 240000]');
      });
    });
  });
});
