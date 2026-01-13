/**
 * @file search.ts
 * @description Utilities for constructing advanced Lucene search queries for the MusicBrainz API.
 * Implements logic for fuzzy matching (Levenshtein distance) and wildcard support based on term length.
 * @module SearchUtils
 */

export interface SearchOptions {
    fuzzy: boolean;
    wildcard: boolean;
}

/**
 * Determines the appropriate Levenshtein distance based on word length.
 * Follows Lucene's standard "AUTO" behavior:
 * - 0-2 chars: distance 0 (exact match only)
 * - 3-5 chars: distance 1 (one typo allowed)
 * - > 5 chars: distance 2 (two typos allowed)
 */
function getFuzzyDistance(length: number): number {
    if (length <= 2) return 0;
    if (length <= 5) return 1;
    return 2;
}

/**
 * Escapes characters that are special to the Lucene query syntax.
 * Characters escaped: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
 */
export function escapeLucene(term: string): string {
  return term.replace(/([\+\-\!\(\)\{\}\[\]\^\"\~\*\?\:\\\/]|\&\&|\|\|)/g, "\\$1");
}

/**
 * Constructs a flexible Lucene query string for MusicBrainz.
 * Example: Converts "michael j" into `field:((michael* OR michael~1) AND j*)`
 * Supports partial matches (wildcard) and typo tolerance (fuzzy).
 */
export function constructLuceneQuery(field: string, term: string, options: SearchOptions): string {
  const cleanTerm = term.trim();
  if (!cleanTerm) return '';

  const words = cleanTerm.split(/\s+/);
  if (words.length === 0) return '';

  const queryParts = words.map((word, index) => {
    const escaped = escapeLucene(word);
    const distance = getFuzzyDistance(word.length);
    const isLast = index === words.length - 1;
    
    const strategies = [
      options.wildcard && isLast && `${escaped}*`,
      options.fuzzy && distance > 0 && `${escaped}~${distance}`,
    ].filter(Boolean);

    if (strategies.length === 0) return escaped;
    if (strategies.length === 1) return strategies[0];
    return `(${strategies.join(' OR ')})`;
  });

  return `${field}:(${queryParts.join(' AND ')})`;
}
