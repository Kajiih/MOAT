import { describe, expect, it, beforeAll } from 'vitest';
import { TMDBService } from '../cinema/TMDBService';
import { loadIntegrationEnv } from './setup';
import { logger } from '@/lib/logger';

describe('TMDBService Real API Integration', () => {
  const service = new TMDBService();

  beforeAll(() => {
    loadIntegrationEnv();
    if (!process.env.NEXT_PUBLIC_TMDB_API_KEY) {
      throw new Error('NEXT_PUBLIC_TMDB_API_KEY not found in environment');
    }
  });

  it('should fetch real data for movies from TMDB', async () => {
    const result = await service.search('Inception', 'movie');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'TMDB Real API Movie Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe('Inception');
  });

  it('should fetch real data for TV shows from TMDB', async () => {
    const result = await service.search('Breaking Bad', 'tv');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'TMDB Real API TV Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe('Breaking Bad');
  });
});
