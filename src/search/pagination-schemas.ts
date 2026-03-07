import { z } from 'zod';

/**
 * Base pagination contract. The UI only needs this to decide
 * whether to show a \"Load More\" button or pagination controls.
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
