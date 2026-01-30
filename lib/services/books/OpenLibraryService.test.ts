import { describe, expect, it } from 'vitest';

import { setupMSW } from '@/lib/test/msw-test-utils';
import { handlers } from './mocks/handlers';
import { OpenLibraryService } from './OpenLibraryService';

describe('OpenLibraryService Integration (Fake Server)', () => {
  const service = new OpenLibraryService();

  const server = setupMSW(handlers);

  it('should find books by title in the "fake database"', async () => {
    const result = await service.search('Fellowship', 'book');
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Fellowship of the Ring');
    expect(result.results[0].type).toBe('book');
  });

  it('should filter correctly by Author using Lucene query logic', async () => {
    // Search for "Potter" but filter by author "Rowling"
    const result = await service.search('Potter', 'book', {
      filters: { selectedAuthor: 'Rowling' },
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toContain('Harry Potter');
  });

  it('should return empty results for author mismatch', async () => {
    // Tolkien didn't write Harry Potter
    const result = await service.search('Potter', 'book', {
      filters: { selectedAuthor: 'Tolkien' },
    });

    expect(result.results).toHaveLength(0);
  });

  it('should filter by Year Range correctly', async () => {
    // Fellowship is 1954
    const result = await service.search('Ring', 'book', {
      filters: { minYear: '1950', maxYear: '1960' },
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toContain('Fellowship');
  });

  it('should filter by Publisher', async () => {
    const result = await service.search('Ring', 'book', {
      filters: { publisher: 'George Allen' },
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toContain('Fellowship');
  });

  it('should find authors using the Author API', async () => {
    const result = await service.search('Tolkien', 'author');
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('J.R.R. Tolkien');
    expect(result.results[0].type).toBe('author');
  });

  it('should handle API errors gracefully', async () => {
    // Override handler to return 500
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('https://openlibrary.org/search.json', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(service.search('broken', 'book'))
      .rejects.toThrow('API Error: 500');
  });

  it('should fetch book details correctly', async () => {
    const details = await service.getDetails('OL1W', 'book');
    
    expect(details.id).toBe('OL1W');
    expect(details.description).toBe('Mock description for The Fellowship of the Ring');
    expect(details.tags).toContain('Fantasy');
  });
});



