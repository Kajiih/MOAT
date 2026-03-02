import { describe, expect, it, beforeAll } from 'vitest';
import { RAWGService } from '../games/RAWGService';
import { loadIntegrationEnv } from './setup';
import { logger } from '@/lib/logger';

describe('RAWGService Real API Integration', () => {
  const service = new RAWGService();

  beforeAll(() => {
    loadIntegrationEnv();
    if (!process.env.RAWG_API_KEY) {
      throw new Error('RAWG_API_KEY not found in environment');
    }
  });

  it('should fetch real data for games from RAWG', async () => {
    const result = await service.search('Elden Ring', 'game');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'RAWG Real API Game Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toContain('Elden Ring');
  });

  it('should fetch real details for a game from RAWG', async () => {
    // Elden Ring ID is 432530
    const details = await service.getDetails('432530', 'game');
    
    logger.info({ details }, 'RAWG Real API Game Details Result');

    expect(details.id).toBe('432530');
    expect(details.description).toBeDefined();
  });
});
