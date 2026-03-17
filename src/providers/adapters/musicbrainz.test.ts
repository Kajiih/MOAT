import { describe, expect, it } from 'vitest';

import {
  buildAlbumLuceneQuery,
  buildArtistLuceneQuery,
  buildRecordingLuceneQuery,
} from './musicbrainz';

describe('MusicBrainz Adapter', () => {
  describe('Lucene Query Builders', () => {
    describe('buildAlbumLuceneQuery', () => {
      const NOT_SECONDARY = String.raw`NOT secondarytype:(Compilation OR Live OR Soundtrack OR Spokenword OR Interview OR Audiobook OR Demo OR DJ\-mix OR Mixtape\/Street)`;

      it('should build a basic term query', () => {
        const query = buildAlbumLuceneQuery({ term: 'thriller' });
        expect(query).toBe(`release:thriller AND ${NOT_SECONDARY}`);
      });

      it('should escape special characters in term', () => {
        const query = buildAlbumLuceneQuery({ term: 'AC/DC' });
        expect(query).toBe(String.raw`release:AC\/DC AND ${NOT_SECONDARY}`);
      });

      it('should build an exact artistId query', () => {
        const query = buildAlbumLuceneQuery({ artistId: '1234-5678', term: 'album' });
        expect(query).toBe(`release:album AND arid:1234-5678 AND ${NOT_SECONDARY}`);
      });

      it('should prioritize artistId over artist text', () => {
        const query = buildAlbumLuceneQuery({ artistId: '1234-5678', artist: 'Michael Jackson' });
        expect(query).toBe(`arid:1234-5678 AND ${NOT_SECONDARY}`);
      });

      it('should handle secondary types array', () => {
        const query = buildAlbumLuceneQuery({ secondarytype: ['Live', 'Compilation'] });
        expect(query).toBe('secondarytype:(Live OR Compilation)');
      });

      it('should handle date ranges', () => {
        const query = buildAlbumLuceneQuery({ firstreleasedate_min: '1990', firstreleasedate_max: '2000' });
        expect(query).toBe(`${NOT_SECONDARY} AND firstreleasedate:[1990 TO 2000]`);
      });

      it('should return empty string query if no conditions', () => {
        const query = buildAlbumLuceneQuery({});
        expect(query).toBe('*:*');
      });
    });

    describe('buildArtistLuceneQuery', () => {
      it('should build a basic term query', () => {
        const query = buildArtistLuceneQuery({ term: 'daft punk' });
        expect(query).toBe('"daft punk"');
      });

      it('should build country filter', () => {
        const query = buildArtistLuceneQuery({ country: 'GB', term: 'radiohead' });
        expect(query).toBe('radiohead AND country:GB');
      });

      it('should handle begin date ranges', () => {
        const query = buildArtistLuceneQuery({ begin_min: '1990' });
        expect(query).toBe('begin:[1990 TO 9999]');
      });
    });

    describe('buildRecordingLuceneQuery', () => {
      it('should build a basic term query', () => {
        const query = buildRecordingLuceneQuery({ term: 'moonlight' });
        expect(query).toBe('moonlight');
      });

      it('should handle video boolean', () => {
        const query = buildRecordingLuceneQuery({ video: true, term: 'thriller' });
        expect(query).toBe('thriller AND video:true');
      });

      it('should handle dur (duration) range', () => {
        const query = buildRecordingLuceneQuery({ duration_min: '120000', duration_max: '240000' });
        expect(query).toBe('dur:[120000 TO 240000]');
      });
    });
  });

  describe('MusicBrainzProvider Search Methods', () => {
    it('should generate the correct URL containing the proper Lucene query', async () => {
      // We import here to avoid circular dep issues if any, but they are already imported above for query builders.
      // Wait, we need to import MusicBrainzProvider and MusicBrainzAlbumEntity
      const { MusicBrainzProvider, MusicBrainzAlbumEntity } = await import('./musicbrainz');

      const provider = new MusicBrainzProvider();
      let fetchedUrl = '';

      // Mock fetcher that captures URL and returns empty response payload
      await provider.initialize((async (url: string) => {
        fetchedUrl = url;
        return { count: 0, offset: 0, 'release-groups': [] };
      }) as never);

      const albumEntity = new MusicBrainzAlbumEntity(provider);
      await albumEntity.search({
        query: 'Billie Jean',
        filters: {},
        limit: 10,
        page: 1,
      });

      const urlObj = new URL(fetchedUrl);
      const EXPECTED_NOT = String.raw`NOT secondarytype:(Compilation OR Live OR Soundtrack OR Spokenword OR Interview OR Audiobook OR Demo OR DJ\-mix OR Mixtape\/Street)`;
      expect(urlObj.searchParams.get('query')).toBe(`release:"Billie Jean" AND ${EXPECTED_NOT}`);
    });
  });

  describe('MusicBrainzProvider.resolveImage', () => {
    it('should resolve an album reference to coverartarchive', async () => {
      const { MusicBrainzProvider } = await import('./musicbrainz');
      const provider = new MusicBrainzProvider();

      // Ensure no real network requests execute
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({ ok: true, url: 'https://coverartarchive.org/release-group/2c55f39d-9cb3-401c-b218-2fc600d26ec5/front' } as Response);

      const albumEntity = provider.entities.find((e) => e.id === 'album')!;
      const url = await albumEntity.resolveImage?.('2c55f39d-9cb3-401c-b218-2fc600d26ec5');
      expect(url).toBe('https://coverartarchive.org/release-group/2c55f39d-9cb3-401c-b218-2fc600d26ec5/front');
      globalThis.fetch = originalFetch;
    });

    it('should successfully resolve an artist reference using Wikidata fallback', async () => {
      const { MusicBrainzProvider } = await import('./musicbrainz');
      const provider = new MusicBrainzProvider();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({ ok: false } as Response);

      // Mock externalFetcher manually to return JSON (as secureFetch naturally does)
      (provider as unknown as { externalFetcher: unknown }).externalFetcher = async (url: string | URL | Request) => {
        const urlStr = url.toString();
        let data: Record<string, unknown> = {};

        if (urlStr.includes('fanart.tv')) {
          throw new Error('Not found'); // secureFetch throws generic/ProviderErrors
        } else if (urlStr.includes('query.wikidata.org/sparql')) {
          data = {
            results: {
              bindings: [
                {
                  image: {
                    value: 'http://commons.wikimedia.org/wiki/Special:FilePath/Artist_Image.jpg'
                  }
                }
              ]
            }
          };
        }

        return data; // returning raw parsed JSON
      };

      const artistEntity = provider.entities.find((e) => e.id === 'artist')!;
      const url = await artistEntity.resolveImage?.('076caf66-1bb1-4486-8f46-910c83441eab');
      expect(url).toContain('Artist_Image.jpg');
      globalThis.fetch = originalFetch;
    });
  });
});
