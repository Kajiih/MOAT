import { describe, expect, it, beforeAll } from 'vitest';
import { IGDBService } from '../games/IGDBService';
import { loadIntegrationEnv } from './setup';
import { logger } from '@/lib/logger';

describe('IGDBService Real API Integration', () => {
  const service = new IGDBService();

  beforeAll(() => {
    loadIntegrationEnv();
    if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET) {
      throw new Error('IGDB_CLIENT_ID or IGDB_CLIENT_SECRET not found in environment');
    }
  });

  it('should fetch real data for games from IGDB', async () => {
    const result = await service.search('Final Fantasy VII', 'game');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'IGDB Real API Game Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toContain('Final Fantasy VII');
  });

  it('should fetch real data for franchises from IGDB', async () => {
    const result = await service.search('Zelda', 'franchise');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'IGDB Real API Franchise Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toContain('Zelda');
  });
});
