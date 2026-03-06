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
 * @param length - The length of the word.
 * @returns The fuzzy distance.
 */
function getFuzzyDistance(length: number): number {
  if (length <= 2) return 0;
  if (length <= 5) return 1;
  return 2;
}

/**
 * Escapes characters that are special to the Lucene query syntax.
 * Characters escaped: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
 * @param term - The term to escape.
 * @returns The escaped term.
 */
export function escapeLucene(term: string): string {
  return term.replaceAll(/([\+\-\!\(\)\{\}\[\]\^\"\~\*\?\:\\\/]|\&\&|\|\|)/g, String.raw`\$1`);
}

/**
 * Constructs the core Lucene query string without the field prefix.
 * Example: Converts "michael j" into `(michael* OR michael~1) AND j*`
 * @param term - The search term.
 * @param options - Search options including fuzzy and wildcard.
 * @returns The constructed Lucene query parts joined by AND.
 */
export function constructLuceneQueryBasis(term: string, options: SearchOptions): string {
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

  return queryParts.join(' AND ');
}

/**
 * Constructs a flexible Lucene query string for a specific field.
 * Example: Converts "michael j" into `field:((michael* OR michael~1) AND j*)`
 * @param field - The field to search in (e.g., 'artist', 'release').
 * @param term - The search term.
 * @param options - Search options including fuzzy and wildcard.
 * @returns The constructed Lucene query string.
 */
export function constructLuceneQuery(field: string, term: string, options: SearchOptions): string {
  const basis = constructLuceneQueryBasis(term, options);
  if (!basis) return '';
  return `${field}:(${basis})`;
}
