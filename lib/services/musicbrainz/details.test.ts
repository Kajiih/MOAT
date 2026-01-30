import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMediaDetails } from './details';

const MB_BASE = 'https://musicbrainz.org/ws/2';

const server = setupServer(
  // Artist lookup
  http.get(`${MB_BASE}/artist/:id`, ({ params }) => {
    if (params.id === 'artist-1') {
      return HttpResponse.json({
        tags: [{ name: 'rock', count: 10 }, { name: 'indie', count: 20 }],
        area: { name: 'London' },
        'life-span': { begin: '1990', ended: false },
        relations: [
          { type: 'wikidata', url: { resource: 'https://wikidata/Q123' } },
        ],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Release Search (for album details)
  http.get(`${MB_BASE}/release/`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    if (query.includes('rgid:album-1')) {
      return HttpResponse.json({
        releases: [{ id: 'release-1' }],
      });
    }
    return HttpResponse.json({ releases: [] });
  }),

  // Release lookup
  http.get(`${MB_BASE}/release/:id`, ({ params }) => {
    if (params.id === 'release-1') {
      return HttpResponse.json({
        'label-info': [{ label: { name: 'The Label' } }],
        date: '2020-01-01',
        media: [{
          tracks: [
            { id: 't1', position: '1', title: 'Track 1', length: 180_000, recording: { id: 'r1' } },
          ],
        }],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Recording lookup
  http.get(`${MB_BASE}/recording/:id`, ({ params }) => {
    if (params.id === 'song-1') {
      return HttpResponse.json({
        tags: [{ name: 'pop', count: 1 }],
        length: 240_000,
        releases: [{
          title: 'The Album',
          'release-group': { id: 'rg-1' },
        }],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Release Group lookup (fallback when search fails)
  http.get(`${MB_BASE}/release-group/:id`, () => {
    return HttpResponse.json({ releases: [] });
  }),

  // Wikidata lookup (triggered by image service)
  http.get('https://www.wikidata.org/w/api.php', () => {
    return HttpResponse.json({ claims: {} });
  }),
  
  // Artist image fallback (if any)
  http.get('https://webservice.fanart.tv/v3/music/*', () => {
    return new HttpResponse(null, { status: 404 });
  })
);

describe('MusicBrainz Details Service Integration (Fake Server)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });
  afterAll(() => server.close());

  // Mock logger to avoid spamming console during error tests
  vi.mock('@/lib/logger', () => ({
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
    },
  }));

  describe('getArtistDetails', () => {
    it('should fetch and map artist details correctly', async () => {
      // Note: getArtistThumbnail is called inside getArtistDetails
      // We could mock it or let it run (it uses fetch too)
      const result = await getMediaDetails('artist-1', 'artist');

      expect(result).toMatchObject({
        id: 'artist-1',
        type: 'artist',
        tags: ['indie', 'rock'],
        area: 'London',
        urls: [{ type: 'wikidata', url: 'https://wikidata/Q123' }],
      });
    });
  });

  describe('getAlbumDetails', () => {
    it('should fetch release-group and then release details', async () => {
      const result = await getMediaDetails('album-1', 'album');

      expect(result).toMatchObject({
        id: 'album-1',
        type: 'album',
        label: 'The Label',
        date: '2020-01-01',
        tracks: [
          { id: 'r1', position: '1', title: 'Track 1', length: '03:00' },
        ],
      });
    });

    it('should return skeletal details if no release is found', async () => {
      const result = await getMediaDetails('album-empty', 'album');
      expect(result).toEqual({ id: 'album-empty', mbid: 'album-empty', type: 'album' });
    });
  });

  describe('getSongDetails', () => {
    it('should fetch and map recording details correctly', async () => {
      const result = await getMediaDetails('song-1', 'song');

      expect(result).toMatchObject({
        id: 'song-1',
        type: 'song',
        tags: ['pop'],
        length: '04:00',
        album: 'The Album',
        albumId: 'rg-1',
      });
    });
  });

  it('should return fallback if service fails (500)', async () => {
    server.use(
      http.get(`${MB_BASE}/artist/error-id`, () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    const result = await getMediaDetails('error-id', 'artist');
    expect(result).toEqual({ id: 'error-id', mbid: 'error-id', type: 'artist' });
  });
});

