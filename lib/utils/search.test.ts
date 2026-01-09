import { describe, it, expect } from 'vitest';
import { constructLuceneQuery } from './search';

describe('constructLuceneQuery', () => {
  describe('Basic Handling', () => {
    it('should return empty string for empty term', () => {
      expect(constructLuceneQuery('artist', '', { fuzzy: true, wildcard: true })).toBe('');
      expect(constructLuceneQuery('artist', '   ', { fuzzy: true, wildcard: true })).toBe('');
    });

    it('should construct a simple query with no options', () => {
      const result = constructLuceneQuery('artist', 'Adele', { fuzzy: false, wildcard: false });
      expect(result).toBe('artist:(Adele)');
    });

    it('should handle multi-word queries with AND', () => {
      const result = constructLuceneQuery('title', 'Hello World', { fuzzy: false, wildcard: false });
      expect(result).toBe('title:(Hello AND World)');
    });
  });

  describe('Wildcard Strategy', () => {
    it('should apply wildcard to all words when enabled', () => {
      const result = constructLuceneQuery('artist', 'Ade', { fuzzy: false, wildcard: true });
      expect(result).toBe('artist:(Ade*)');
    });

    it('should apply wildcard even to single character words', () => {
      const result = constructLuceneQuery('artist', 'A', { fuzzy: false, wildcard: true });
      expect(result).toBe('artist:(A*)');
    });

    it('should apply wildcard to multiple words', () => {
      const result = constructLuceneQuery('artist', 'A B', { fuzzy: false, wildcard: true });
      expect(result).toBe('artist:(A* AND B*)');
    });
  });

  describe('Fuzzy Strategy', () => {
    it('should NOT apply fuzzy to very short words (<= 2 chars)', () => {
      const result = constructLuceneQuery('artist', 'Ad', { fuzzy: true, wildcard: false });
      expect(result).toBe('artist:(Ad)'); 
    });

    it('should apply fuzzy distance 1 to medium words (3-5 chars)', () => {
      const result3 = constructLuceneQuery('artist', 'Ade', { fuzzy: true, wildcard: false });
      const result5 = constructLuceneQuery('artist', 'Adele', { fuzzy: true, wildcard: false });
      expect(result3).toBe('artist:(Ade~1)');
      expect(result5).toBe('artist:(Adele~1)');
    });

    it('should apply fuzzy distance 2 to long words (> 5 chars)', () => {
      const result = constructLuceneQuery('artist', 'Beatles', { fuzzy: true, wildcard: false });
      expect(result).toBe('artist:(Beatles~2)');
    });
  });

  describe('Combined Strategies', () => {
    it('should combine wildcard and fuzzy with OR', () => {
      const result = constructLuceneQuery('artist', 'Adele', { fuzzy: true, wildcard: true });
      expect(result).toBe('artist:((Adele* OR Adele~1))');
    });

    it('should apply correct strategy and distance per word length in a sentence', () => {
        // "A" (1 char) -> Wildcard + Dist 0
        // "Adele" (5 chars) -> Wildcard + Dist 1
        // "Beatles" (7 chars) -> Wildcard + Dist 2
        const result = constructLuceneQuery('artist', 'A Adele Beatles', { fuzzy: true, wildcard: true });
        expect(result).toBe('artist:(A* AND (Adele* OR Adele~1) AND (Beatles* OR Beatles~2))');
    });
  });

  describe('Safety & Internationalization', () => {
    it('should escape special Lucene characters', () => {
      const result = constructLuceneQuery('artist', 'Oasis!', { fuzzy: false, wildcard: false });
      expect(result).toBe('artist:(Oasis\\!)');
    });

    it('should preserve international characters', () => {
      const result = constructLuceneQuery('artist', 'Björk', { fuzzy: false, wildcard: false });
      expect(result).toBe('artist:(Björk)');
    });
  });
});
