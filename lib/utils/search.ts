export interface SearchOptions {
    fuzzy: boolean;
    wildcard: boolean;
}

/**
 * Constructs a flexible Lucene query string for MusicBrainz.
 * Converts "michael j" into `field:((michael* OR michael~) AND (j* OR j~))` to support partial matches and fuzzy search (typos).
 */
export function constructLuceneQuery(field: string, term: string, options: SearchOptions): string {
  if (!term) return '';
  
  // Remove special characters that might break Lucene syntax, keep alphanumeric and spaces
  const cleanTerm = term.replace(/[^\w\s]/g, '').trim();
  if (!cleanTerm) return '';

  const words = cleanTerm.split(/\s+/);
  
  if (words.length === 0) return '';

  const queryParts = words.map(word => {
      const parts = [];
      
      // 1. Wildcard (Prefix) Strategy
      if (options.wildcard) {
          parts.push(`${word}*`);
      }

      // 2. Fuzzy Strategy
      // Don't apply fuzzy to very short words to avoid noise
      if (options.fuzzy && word.length >= 3) {
          parts.push(`${word}~`);
      }

      // If no advanced strategies, fallback to exact match
      if (parts.length === 0) {
          return word;
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
