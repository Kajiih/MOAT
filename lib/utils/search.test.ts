import { describe, it, expect } from 'vitest';
import { constructLuceneQuery } from './search';

describe('constructLuceneQuery', () => {
  it('should return empty string for empty term', () => {
    expect(constructLuceneQuery('artist', '', { fuzzy: true, wildcard: true })).toBe('');
    expect(constructLuceneQuery('artist', '   ', { fuzzy: true, wildcard: true })).toBe('');
  });

  it('should construct a simple query with no options', () => {
    const result = constructLuceneQuery('artist', 'Adele', { fuzzy: false, wildcard: false });
    expect(result).toBe('artist:(Adele)');
  });

  it('should apply wildcard strategy', () => {
    const result = constructLuceneQuery('artist', 'Ade', { fuzzy: false, wildcard: true });
    expect(result).toBe('artist:(Ade*)');
  });

  it('should apply fuzzy strategy for words >= 3 chars', () => {
    const result = constructLuceneQuery('artist', 'Adele', { fuzzy: true, wildcard: false });
    expect(result).toBe('artist:(Adele~)');
  });

  it('should NOT apply fuzzy strategy for short words', () => {
    const result = constructLuceneQuery('artist', 'Ad', { fuzzy: true, wildcard: false });
    expect(result).toBe('artist:(Ad)');
  });

  it('should combine wildcard and fuzzy strategies with OR', () => {
    const result = constructLuceneQuery('artist', 'Adele', { fuzzy: true, wildcard: true });
    expect(result).toBe('artist:((Adele* OR Adele~))');
  });

  it('should handle multiple words with AND', () => {
    const result = constructLuceneQuery('title', 'Hello World', { fuzzy: false, wildcard: true });
    // Expect: title:(Hello* AND World*)
    expect(result).toBe('title:(Hello* AND World*)');
  });

  it('should escape special characters', () => {
    const result = constructLuceneQuery('artist', 'Oasis!', { fuzzy: false, wildcard: false });
    expect(result).toBe('artist:(Oasis\\!)');
  });

  it('should preserve international characters', () => {
    const result = constructLuceneQuery('artist', 'Björk', { fuzzy: false, wildcard: false });
    expect(result).toBe('artist:(Björk)');
  });
});
