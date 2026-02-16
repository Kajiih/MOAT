/**
 * @file lucene.d.ts
 * @description Type definitions for the 'lucene' module used for advanced search queries.
 */
declare module 'lucene' {
  /**
   * Represents a node in the Lucene AST.
   */
  export interface LuceneAST {
    left?: LuceneAST;
    right?: LuceneAST;
    operator?: string;
    field?: string;
    term?: string;
    term_min?: string;
    term_max?: string;
    inclusive?: boolean;
    similarity?: number;
    proximity?: number;
    boost?: number;
    start?: string;
  }

  /**
   * Parses a Lucene query string into an AST.
   * @param query - The query string to parse.
   * @returns The resulting AST.
   */
  export function parse(query: string): LuceneAST;

  /**
   * Stringifies a Lucene AST back into a query string.
   * @param ast - The AST to stringify.
   * @returns The resulting query string.
   */
  export function stringify(ast: LuceneAST): string;
}
