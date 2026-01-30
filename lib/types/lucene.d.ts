declare module 'lucene' {
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
  }

  export function parse(query: string): LuceneAST;
  export function stringify(ast: LuceneAST): string;
}
