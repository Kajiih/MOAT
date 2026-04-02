/**
 * @file route.test.ts
 * @description Integration tests for /api/search route.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// We need to mock the MODULE registry if we want to spy on it, BUT we want to use its real logic.
// If we mock the whole module, we overwrite the real logic!
// To use real logic, we should NOT mock the module, OR use vi.importOriginal.
// But we want to use real logic + real bootstrap!
// The route.ts imports bootstrap, which registers real providers.
// So if we just run GET, it will use real registry!
// We only need to mock fetch to prevent network calls.

describe('Search API Route - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default fetch mock (empty MusicBrainz response)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 'release-groups': [], count: 0 }),
    });
  });

  it('should return 400 if providerId or entityId is missing', async () => {
    const request = new NextRequest('http://localhost/api/search?providerId=musicbrainz');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing providerId or entityId');
  });

  it('should return 404 if entity is not found', async () => {
    const request = new NextRequest('http://localhost/api/search?providerId=musicbrainz&entityId=invalid');
    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('not found in provider');
  });

  it('should return 200 and mapped items on successful search', async () => {
    const sampleMusicBrainzResponse = {
      count: 1,
      offset: 0,
      'release-groups': [
        {
          id: 'mb-album-1',
          title: 'Random Access Memories',
          'primary-type': 'Album',
          'artist-credit': [
            {
              name: 'Daft Punk',
              artist: {
                id: 'daft-punk-id',
                name: 'Daft Punk',
              },
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleMusicBrainzResponse,
    });

    const request = new NextRequest('http://localhost/api/search?providerId=musicbrainz&entityId=album&query=Daft+Punk');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.items).toBeDefined();
    expect(data.items.length).toBe(1);
    expect(data.items[0].title).toBe('Random Access Memories');
    expect(data.items[0].identity.providerId).toBe('musicbrainz');
    expect(data.items[0].identity.entityId).toBe('album');
  });
});
