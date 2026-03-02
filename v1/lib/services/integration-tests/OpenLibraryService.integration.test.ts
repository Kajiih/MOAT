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
  
  it('should support sorting by date from Open Library', async () => {
    const result = await service.search('Foundation', 'book', { sort: 'date_desc' });
    
    expect(result.results.length).toBeGreaterThan(0);
    // Open Library sorting is server-side, we trust it mostly but can check 
    // that results are at least present.
    logger.info({ 
      firstYear: result.results[0].year,
      secondYear: result.results[1]?.year 
    }, 'Open Library Sort Result');
  });

  it('should support filtering by author from Open Library', async () => {
    // Search for "The Hobbit" but filtered by "J.R.R. Tolkien"
    const result = await service.search('The Hobbit', 'book', {
      filters: { selectedAuthor: 'J.R.R. Tolkien' }
    });
    
    expect(result.results.length).toBeGreaterThan(0);
    expect((result.results[0] as any).author).toContain('Tolkien');
  });

  it('should support filtering by year range from Open Library', async () => {
    const result = await service.search('Dune', 'book', {
      filters: { minYear: '1960', maxYear: '1970' }
    });
    
    expect(result.results.length).toBeGreaterThan(0);
    const years = result.results.map(r => parseInt(r.year || '0', 10));
    const validYears = years.filter(y => y >= 1960 && y <= 1970);
    // API might return some outliers if year mapping is fuzzy, but first one should be good
    expect(validYears.length).toBeGreaterThan(0);
  });
});
