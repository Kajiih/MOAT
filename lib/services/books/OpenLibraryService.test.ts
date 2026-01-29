
import { describe, it, expect } from 'vitest';
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
});
