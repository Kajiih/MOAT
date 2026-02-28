import { describe, expect, it, beforeAll } from 'vitest';
import { OpenLibraryService } from '../books/OpenLibraryService';
import { loadIntegrationEnv } from './setup';
import { logger } from '@/lib/logger';

describe('OpenLibraryService Real API Integration', () => {
  const service = new OpenLibraryService();

  beforeAll(() => {
    loadIntegrationEnv();
    // Open Library doesn't require an API key for search, but good to have setup
  });

  it('should fetch real data for books from Open Library', async () => {
    const result = await service.search('Harry Potter', 'book');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'Open Library Real API Book Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toContain('Harry Potter');
  });

  it('should fetch real data for authors from Open Library', async () => {
    const result = await service.search('J.K. Rowling', 'author');
    
    logger.info({ 
      resultCount: result.results.length,
      firstResult: result.results[0] 
    }, 'Open Library Real API Author Search Result');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toContain('Rowling');
  });

  it('should fetch real details for a book from Open Library', async () => {
    // Fellowship of the Ring Work ID is OL27448W
    const details = await service.getDetails('OL27448W', 'book');
    
    logger.info({ details }, 'Open Library Real API Book Details Result');

    expect(details.id).toBe('OL27448W');
    expect(details.description).toBeDefined();
  });
});
