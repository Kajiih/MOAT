/**
 * @file Search Schemas
 * @description Defines the structured data for provider search queries.
 */

import { z } from 'zod';

import { ItemSchema } from '@/items/items';

import { SortDirection } from './sort-schemas';

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
 */
export interface SearchResult<TRaw = unknown> {
  /** List of mapped items */
  items: z.infer<typeof ItemSchema>[];
  /** Pagination metadata */
  pagination: PagePagination | CursorPagination | OffsetPagination | PaginationInfo;
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
 * Unified SearchParams for all entities.
 * Specific entities will use the subset of fields relevant to them.
 */
export interface SearchParams {
  query: string;
  filters: Record<string, unknown>;
  sort?: string;
  sortDirection?: SortDirection;
  limit: number;
  page?: number;
  offset?: number;
  cursor?: string;
  signal?: AbortSignal;
}
