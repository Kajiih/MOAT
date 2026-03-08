import { z } from 'zod';
import { ItemSchema } from '@/items/schemas';
import { SortDirection } from './sort-schemas';

/**
 * Pagination Strategies
 */
export type PaginationStrategy = 'page' | 'cursor' | 'offset';

/**
 * Base pagination contract. The UI only needs this to decide
 * whether to show a "Load More" button or pagination controls.
 */
export interface PaginationInfo {
  hasNextPage: boolean;
}

/**
 * Page-based pagination for APIs that return total counts (RAWG, TMDB, etc.).
 */
export interface PagePagination extends PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Cursor-based pagination for APIs using opaque tokens (GraphQL, Hardcover, etc.).
 */
export interface CursorPagination extends PaginationInfo {
  nextCursor?: string;
  previousCursor?: string;
}

/**
 * Offset-based pagination for APIs using limit and offset without total counts.
 */
export interface OffsetPagination extends PaginationInfo {
  offset: number;
  limit: number;
  totalCount?: number;
}

// --- Pagination Zod Schemas ---

export const PagePaginationSchema = z.object({
  hasNextPage: z.boolean(),
  currentPage: z.number(),
  totalPages: z.number(),
  totalCount: z.number(),
});

export const CursorPaginationSchema = z.object({
  hasNextPage: z.boolean(),
  nextCursor: z.string().optional(),
  previousCursor: z.string().optional(),
});

export const OffsetPaginationSchema = z.object({
  hasNextPage: z.boolean(),
  offset: z.number(),
  limit: z.number(),
  totalCount: z.number().optional(),
});

/** Runtime schema that accepts any pagination strategy */
export const PaginationInfoSchema = z.union([PagePaginationSchema, CursorPaginationSchema, OffsetPaginationSchema]);

/**
 * Mapping between strategy identifier and its specific pagination metadata type.
 */
export type PaginationType<S extends PaginationStrategy> = 
  S extends 'page' ? PagePagination :
  S extends 'cursor' ? CursorPagination :
  S extends 'offset' ? OffsetPagination :
  PaginationInfo;

/**
 * Standardized search response from any entity.
 */
export const SearchResultSchema = z.object({
  /** List of mapped items */
  items: z.array(ItemSchema),
  /** Pagination metadata — either page-based or cursor-based */
  pagination: PaginationInfoSchema,
  /** Original API objects for testing/specialized verification */
  raw: z.array(z.any()),
});

/**
 * Interface representing a search result.
 * @template TRaw - The type of the raw API objects.
 * @template S - The pagination strategy.
 */
export interface SearchResult<TRaw = unknown, S extends PaginationStrategy = PaginationStrategy> {
  /** List of mapped items */
  items: z.infer<typeof ItemSchema>[];
  /** Pagination metadata specific to the strategy */
  pagination: PaginationType<S>;
  /** Original API objects for testing/specialized verification */
  raw: TRaw[];
}

/**
 * Parameters passed to the search function of an entity.
 */
export const SearchParamsSchema = z.object({
  /** The raw text query */
  query: z.string(),
  /** A map of filter values (ID -> Value) */
  filters: z.record(z.string(), z.unknown()),
  /** The ID of the selected sort option */
  sort: z.string().optional(),
  /** The direction of the sort */
  sortDirection: z.enum(SortDirection).optional(),
  /** The page to fetch (1-indexed, for page-based providers) */
  page: z.number().optional(),
  /** The offset to fetch from (for offset-based providers) */
  offset: z.number().optional(),
  /** The number of items to fetch per page */
  limit: z.number(),
  /** Opaque cursor token (for cursor-based providers) */
  cursor: z.string().optional(),
  /** Optional signal for request cancellation */
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Generic SearchParams allows static enforcement of pagination fields (page, cursor, offset).
 */
export type SearchParams<S extends PaginationStrategy = PaginationStrategy> = {
  query: string;
  filters: Record<string, unknown>;
  sort?: string;
  sortDirection?: SortDirection;
  limit: number;
  signal?: AbortSignal;
} & (
  S extends 'page' ? { page?: number } :
  S extends 'cursor' ? { cursor?: string } :
  S extends 'offset' ? { offset?: number } :
  { page?: number; cursor?: string; offset?: number } // Default/Mixed fallback
);

