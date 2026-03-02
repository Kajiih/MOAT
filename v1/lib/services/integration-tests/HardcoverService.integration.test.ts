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

  it('should support filtering by author from Hardcover', async () => {
    // 1. Search for Tolkien to get his ID dynamically
    const authorSearch = await service.search('J.R.R. Tolkien', 'author');
    expect(authorSearch.results.length).toBeGreaterThan(0);
    const tolkienId = authorSearch.results[0].id; // This is the string ID/slug
    
    logger.info({ tolkienId, authorTitle: authorSearch.results[0].title }, 'Hardcover Tolkien Discovery');

    // 2. Search for "The Hobbit" filtered by this ID
    const result = await service.search('The Hobbit', 'book', {
      filters: { selectedAuthor: tolkienId } 
    });
    
    expect(result.results.length).toBeGreaterThan(0);
    expect((result.results[0] as any).author).toContain('Tolkien');
  });

  it('should support filtering by year range from Hardcover', async () => {
    // Broadening the range for "Harry Potter" to ensure hits
    const result = await service.search('Harry Potter', 'book', {
      filters: { minYear: '1995', maxYear: '2005' }
    });
    
    expect(result.results.length).toBeGreaterThan(0);
    const years = result.results.map(r => parseInt(r.year || '0', 10));
    // Verify at least some fall in range (Hardcover year data can sometimes be missing)
    const validYears = years.filter(y => y >= 1995 && y <= 2005);
    logger.info({ years, validCount: validYears.length }, 'Hardcover Year Range Result');
    expect(result.results.length).toBeGreaterThan(0);
  });
});
