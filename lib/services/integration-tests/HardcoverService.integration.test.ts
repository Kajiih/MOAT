import { describe, expect, it, beforeAll } from 'vitest';
import { HardcoverService } from '../books/HardcoverService';
import { loadIntegrationEnv } from './setup';
import { logger } from '@/lib/logger';

describe('HardcoverService Real API Integration', () => {
  const service = new HardcoverService();

  beforeAll(() => {
    loadIntegrationEnv();
    if (!process.env.HARDCOVER_TOKEN) {
      throw new Error('HARDCOVER_TOKEN not found in environment. Please check .env.local');
    }
  });

  it('should fetch real data for books and log the structure', async () => {
    const result = await service.search('Harry Potter', 'book');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'Hardcover Real API Book Search Result');

    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should fetch real data for series and log the structure', async () => {
    const result = await service.search('The Witcher', 'series');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'Hardcover Real API Series Search Result');

    expect(result.results.length).toBeGreaterThan(0);
  });
});
