import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getArtistThumbnail } from './images';

const server = setupServer(
  // Fanart.tv Handler
  http.get('https://webservice.fanart.tv/v3/music/:mbid', ({ params, request }) => {
    const url = new URL(request.url);
    if (!url.searchParams.get('api_key')) return new HttpResponse(null, { status: 401 });
    
    if (params.mbid === 'mbid-fanart') {
      return HttpResponse.json({
        artistthumb: [{ url: 'https://fanart.tv/fanart/artist.jpg' }]
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // MusicBrainz Handler (for Wikidata relay)
  http.get('https://musicbrainz.org/ws/2/artist/:mbid', ({ params }) => {
    if (params.mbid === 'mbid-wikidata') {
      return HttpResponse.json({
        relations: [{
          type: 'wikidata',
          url: { resource: 'https://www.wikidata.org/wiki/Q123' }
        }]
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Wikidata Handler
  http.get('https://www.wikidata.org/w/api.php', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('entity') === 'Q123') {
      return HttpResponse.json({
        claims: {
          P18: [{
            mainsnak: {
              datavalue: { value: 'ArtistImage.jpg' }
            }
          }]
        }
      });
    }
    return HttpResponse.json({ claims: {} });
  })
);

describe('Image Service Integration (Fake Server)', () => {
  beforeAll(() => {
    vi.stubEnv('FANART_API_KEY', 'fake-fanart-key');
    server.listen({ onUnhandledRequest: 'error' });
  });
  
  afterEach(() => server.resetHandlers());
  
  afterAll(() => {
    vi.unstubAllEnvs();
    server.close();
  });

  it('should return Fanart image as first priority', async () => {
    const url = await getArtistThumbnail('mbid-fanart');
    // It should replace /fanart/ with /preview/
    expect(url).toBe('https://fanart.tv/preview/artist.jpg');
  });

  it('should fallback to Wikidata if Fanart fails or has no key', async () => {
    const url = await getArtistThumbnail('mbid-wikidata');
    expect(url).toContain('commons.wikimedia.org');
    expect(url).toContain('ArtistImage.jpg');
  });

  it('should return undefined if all services fail', async () => {
    const url = await getArtistThumbnail('unknown-mbid');
    expect(url).toBeUndefined();
  });

  it('should handle missing Fanart API Key gracefully', async () => {
    vi.stubEnv('FANART_API_KEY', '');
    const url = await getArtistThumbnail('mbid-fanart');
    // Should skip fanart and try wikidata (which will fail for this ID)
    expect(url).toBeUndefined();
    vi.stubEnv('FANART_API_KEY', 'fake-fanart-key');
  });
});
