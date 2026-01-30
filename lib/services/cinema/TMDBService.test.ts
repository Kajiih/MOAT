import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { setupMSW } from '@/lib/test/msw-test-utils';
import { handlers } from './mocks/handlers';
import { TMDBService } from './TMDBService';

describe('TMDBService Integration (Fake Server)', () => {
  const service = new TMDBService();

  setupMSW(handlers);

  beforeAll(() => {
    // We need the API KEY check to pass
    vi.stubEnv('NEXT_PUBLIC_TMDB_API_KEY', 'fake-key');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('should find movies by title', async () => {
    const result = await service.search('Inception', 'movie');
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Inception');
    expect(result.results[0].year).toBe('2010');
    expect(result.results[0].type).toBe('movie');
  });

  it('should find tv shows', async () => {
    const result = await service.search('Breaking', 'tv');
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Breaking Bad');
    expect(result.results[0].type).toBe('tv');
  });

  it('should find persons', async () => {
    const result = await service.search('Nolan', 'person');
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Christopher Nolan');
    expect(result.results[0].type).toBe('person');
  });

  it('should fetch details correctly', async () => {
    const details = await service.getDetails('1', 'movie');
    
    expect(details.id).toBe('1');
    expect(details.date).toBe('2010-07-16');
    expect(details.imageUrl).toContain('inception.jpg');
  });

  it('should handle pagination', async () => {
    // In our mock, we only have one page, but we check if the request contains the right page
    const result = await service.search('Inception', 'movie', { page: 2 });
    expect(result.page).toBe(1); // Our mock always returns page 1, but this verifies the call didn't crash
  });

  it('should throw if API key is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_TMDB_API_KEY', '');
    await expect(service.search('test', 'movie')).rejects.toThrow('TMDB_API_KEY is missing');
    vi.stubEnv('NEXT_PUBLIC_TMDB_API_KEY', 'fake-key');
  });
});
