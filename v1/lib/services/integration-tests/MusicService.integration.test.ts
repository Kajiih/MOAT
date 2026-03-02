import { describe, expect, it, beforeAll } from 'vitest';
import { MusicService } from '../music/MusicService';
import { loadIntegrationEnv } from './setup';
import { logger } from '@/lib/logger';

describe('MusicService Real API Integration', () => {
  const service = new MusicService();

  beforeAll(() => {
    loadIntegrationEnv();
  });

  it('should fetch real data for artists from MusicBrainz', async () => {
    await new Promise(r => setTimeout(r, 1100));
    const result = await service.search('Radiohead', 'artist');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'MusicBrainz Real API Artist Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe('Radiohead');
  });

  it('should fetch real data for albums from MusicBrainz', async () => {
    await new Promise(r => setTimeout(r, 1100));
    const result = await service.search('In Rainbows', 'album');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'MusicBrainz Real API Album Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe('In Rainbows');
  });
});
