
import { describe, expect,it } from 'vitest';

import { BookItem } from '@/lib/types';

import { OpenLibraryService } from './OpenLibraryService';

describe('OpenLibraryService', () => {
    const service = new OpenLibraryService();

    it('should return results for "harry"', async () => {
        const result = await service.search('harry', 'book');
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results[0].title.toLowerCase()).toContain('harry');
    });

    it('should handle short queries by returning empty results instead of 422', async () => {
        const result = await service.search('h', 'book');
        expect(result.results).toEqual([]);
    });

    it('should apply fuzzy search when enabled', async () => {
        // We can't easily mock the fetch or check the URL without more setup,
        // but we can verify that a fuzzy search for a typo returns results.
        const result = await service.search('hary', 'book', { fuzzy: true });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results[0].title.toLowerCase()).toContain('harry');
    });

    it('should apply wildcard search when enabled', async () => {
        const result = await service.search('harr', 'book', { wildcard: true });
        expect(result.results.length).toBeGreaterThan(0);
        const hasHarry = result.results.some(r => r.title.toLowerCase().includes('harry') || (r as BookItem).author?.toLowerCase().includes('harry'));
        expect(hasHarry).toBe(true);
    });

    it('should apply filters for language and publisher', async () => {
        // Search for "The Hobbit" in English by Allen (original publisher)
        const result = await service.search('Hobbit', 'book', {
            filters: { publisher: 'Allen' }
        });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results[0].title).toContain('Hobbit');
    });

    it('should respect the sort parameter', async () => {
        // Search for popular books and sort by rating
        const result = await service.search('Potter', 'book', {
            filters: { sort: 'rating_desc' }
        });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results[0].title.toLowerCase()).toContain('potter');
    });
});
