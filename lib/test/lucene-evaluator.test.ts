import { describe, expect, it } from 'vitest';

import { matchesQuery } from './lucene-evaluator';

describe('Lucene Evaluator', () => {
  const item = {
    id: '123',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    tags: ['classic', 'drama'],
  };

  it('should match basic terms in any field', () => {
    expect(matchesQuery('Gatsby', item)).toBe(true);
    expect(matchesQuery('Fitzgerald', item)).toBe(true);
    expect(matchesQuery('Classic', item)).toBe(true);
    expect(matchesQuery('Missing', item)).toBe(false);
  });

  it('should match specific fields', () => {
    expect(matchesQuery('title:Gatsby', item)).toBe(true);
    expect(matchesQuery('author:Fitzgerald', item)).toBe(true);
    expect(matchesQuery('author:Gatsby', item)).toBe(false);
  });

  it('should handle AND operators', () => {
    expect(matchesQuery('title:Gatsby AND author:Fitzgerald', item)).toBe(true);
    expect(matchesQuery('title:Gatsby AND author:King', item)).toBe(false);
  });

  it('should handle OR operators', () => {
    expect(matchesQuery('title:Gatsby OR author:King', item)).toBe(true);
    expect(matchesQuery('title:Wrong OR author:Fitzgerald', item)).toBe(true);
    expect(matchesQuery('title:Wrong OR author:Wrong', item)).toBe(false);
  });

  it('should handle NOT/negation', () => {
    expect(matchesQuery('NOT author:King', item)).toBe(true);
    expect(matchesQuery('title:Gatsby AND NOT author:King', item)).toBe(true);
    expect(matchesQuery('title:Gatsby AND NOT author:Fitzgerald', item)).toBe(false);
  });

  it('should handle range queries (term_min, term_max)', () => {
    // Note: Our evaluator uses Number(itemValue) for ranges
    expect(matchesQuery('year:[1900 TO 1950]', item)).toBe(true);
    expect(matchesQuery('year:[1930 TO 1950]', item)).toBe(false);
    expect(matchesQuery('year:[* TO 1950]', item)).toBe(true);
    expect(matchesQuery('year:[1900 TO *]', item)).toBe(true);
  });

  it('should handle wildcard queries', () => {
    expect(matchesQuery('title:Gat*', item)).toBe(true);
    expect(matchesQuery('title:*atsby', item)).toBe(true);
    expect(matchesQuery('author:F*', item)).toBe(true);
  });

  it('should use field mapping if provided', () => {
    const customItem = {
      mbid: 'abc',
      full_name: 'John Doe',
    };
    expect(matchesQuery('id:abc', customItem, { id: 'mbid' })).toBe(true);
    expect(matchesQuery('name:"John Doe"', customItem, { name: 'full_name' })).toBe(true);
  });

  it('should handle empty/missing queries gracefully', () => {
    expect(matchesQuery('', item)).toBe(true);
  });
});
