import { z } from 'zod';
import { ItemSchema } from './items';
import { PaginationInfoSchema } from './pagination';
import { SortDirection } from './sorts';

/**
 * Standardized search response from any entity.
 */
export const SearchResultSchema = z.object({
  /** List of mapped items */
  items: z.array(ItemSchema),
  /** Pagination metadata — either page-based or cursor-based */
  pagination: PaginationInfoSchema,
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

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

export type SearchParams = z.infer<typeof SearchParamsSchema>;
