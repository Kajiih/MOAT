export interface SearchOptions {
    fuzzy: boolean;
    wildcard: boolean;
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
 * Converts "michael j" into `field:((michael* OR michael~) AND (j* OR j~))` to support partial matches and fuzzy search (typos).
 */
export function constructLuceneQuery(field: string, term: string, options: SearchOptions): string {
  if (!term) return '';
  
  // Normalize whitespace but preserve all other characters (including international)
  // We rely on escaping to handle Lucene syntax safety
  const cleanTerm = term.trim();
  if (!cleanTerm) return '';

  const words = cleanTerm.split(/\s+/);
  
  if (words.length === 0) return '';

  const queryParts = words.map(word => {
      // Escape the word first to treat it as a literal string
      const escapedWord = escapeLucene(word);
      const parts = [];
      
      // 1. Wildcard (Prefix) Strategy
      if (options.wildcard) {
          parts.push(`${escapedWord}*`);
      }

      // 2. Fuzzy Strategy
      // Don't apply fuzzy to very short words to avoid noise
      if (options.fuzzy && word.length >= 3) {
          parts.push(`${escapedWord}~`);
      }

      // If no advanced strategies, fallback to exact match (escaped)
      if (parts.length === 0) {
          return escapedWord;
      }

      // If only one strategy, return it directly
      if (parts.length === 1) {
          return parts[0];
      }

      // If multiple, OR them together
      return `(${parts.join(' OR ')})`;
  });

  const query = queryParts.join(' AND ');
  
  return `${field}:(${query})`;
}
