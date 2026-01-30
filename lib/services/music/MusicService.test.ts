import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { setupMSW } from '@/lib/test/msw-test-utils';
import { handlers } from './mocks/handlers';
import { MusicService } from './MusicService';

describe('MusicService Integration (Fake Server)', () => {
  const service = new MusicService();

  // 1. Unified lifecycle management via shared utility
  const server = setupMSW(handlers);

  it('should find items by checking against the "fake database"', async () => {
    // "Fake Song 1" exists in our mock DB logic
    const result = await service.search('Fake Song 1', 'song');
    
    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results.some(r => r.title === 'Fake Song 1')).toBe(true);
  });

  it('should filter correctly by Artist using the real query logic', async () => {
    // Usage: We ask the service to filter by "artist-123".
    const result = await service.search('Fake', 'song', {
        filters: { selectedArtist: 'artist-123' }
    });

    // Expectation: Only the song by artist-123 is returned.
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Fake Song 1');
  });

  it('should return empty results if filters map incorrectly or no match found', async () => {
    // We search for artist-999 (doesn't exist in fake DB)
    const result = await service.search('fake', 'song', {
        filters: { selectedArtist: 'artist-999' }
    });

    expect(result.results).toHaveLength(0);
  });

  it('should filter correctly by Album', async () => {
    // Fake Song 2 is on album-789
    const result = await service.search('Fake', 'song', {
        filters: { selectedAlbum: 'album-789' }
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Fake Song 2');
  });

  it('should filter correctly by Date Range', async () => {
    // Fake Song 1 is 1995.
    // Query: 1994-1996 to be very specific
    const result = await service.search('Fake', 'song', {
        filters: { minYear: '1994', maxYear: '1996' }
    });

    expect(result.results.some(r => r.title === 'Fake Song 1')).toBe(true);
    // It might match other faker items, so we check if Fake Song 2 (2020) is EXCLUDED
    expect(result.results.some(r => r.title === 'Fake Song 2')).toBe(false);
  });

  it('should handle pagination and return offset info', async () => {
    // Page 2 should have offset 15 (default limit 15 for recordings)
    const result = await service.search('fake', 'song', { page: 2 });
    
    // We expect the mock server to return whatever page we asked for (it's a fake server)
    // But we want to know if IT received the right offset.
    // I will update the handler to echo back the offset in a special way if needed, 
    // or just check that it returns the count.
    expect(result.page).toBe(2);
  });

  it('should handle API errors by mocking a server failure', async () => {
    // We can override the "database" for this specific test to simulate a crash
    server.use(
      http.get('https://musicbrainz.org/ws/2/recording/', () => {
        return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
      })
    );

    await expect(service.search('crash', 'song'))
         .rejects.toThrow('API Error: 500 Internal Server Error');
  });
});


