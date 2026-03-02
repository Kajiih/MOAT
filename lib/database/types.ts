import { LucideIcon } from 'lucide-react';
import { z } from 'zod';

/**
 * Standardized error codes for the database layer.
 */
export enum DatabaseErrorCode {
  /** The item was not found in the database */
  NOT_FOUND = 'NOT_FOUND',
  /** API key is missing or invalid */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Too many requests to the external service */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Data from the API did not match our Zod schemas */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** External service is currently down or unreachable */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** The request timed out or was aborted */
  TIMEOUT = 'TIMEOUT',
  /** A generic network or internal error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Possible states for an individual DatabaseProvider.
 */
export enum ProviderStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

/**
 * Standardized error class for the database layer.
 */
export class DatabaseError extends Error {
  constructor(
    public readonly code: DatabaseErrorCode,
    public readonly message: string,
    public readonly originalError?: unknown,
    public readonly databaseId?: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// --- Core Schemas ---

/**
 * Identifies an entity within a specific database provider.
 * This is the routing key used throughout the application.
 */
export const EntityIdentitySchema = z.object({
  /** The original ID in the source database */
  dbId: z.string(),
  /** The identifier of the database provider (e.g., 'rawg', 'musicbrainz') */
  databaseId: z.string(),
  /** The identifier of the entity type (e.g., 'game', 'album') */
  entityId: z.string(),
});

export type EntityIdentity = z.infer<typeof EntityIdentitySchema>;

/**
 * Derives a globally unique composite ID from an EntityIdentity.
 * Format: `${databaseId}:${entityId}:${dbId}`
 */
export function toCompositeId(identity: EntityIdentity): string {
  return `${identity.databaseId}:${identity.entityId}:${identity.dbId}`;
}

// --- Image Source Types ---

/** A direct image URL */
export const UrlImageSourceSchema = z.object({
  type: z.literal('url'),
  url: z.string().url(),
});

/** A reference to an image that needs async resolution via a provider */
export const ReferenceImageSourceSchema = z.object({
  type: z.literal('reference'),
  /** The image provider (e.g. 'wikidata', 'fanart', 'caa') */
  provider: z.string(),
  /** Provider-specific lookup key (e.g. 'elden-ring', 'album:123') */
  key: z.string(),
});

/** Discriminated union of image source strategies */
export const ImageSourceSchema = z.discriminatedUnion('type', [
  UrlImageSourceSchema,
  ReferenceImageSourceSchema,
]);

export type UrlImageSource = z.infer<typeof UrlImageSourceSchema>;
export type ReferenceImageSource = z.infer<typeof ReferenceImageSourceSchema>;
export type ImageSource = z.infer<typeof ImageSourceSchema>;

/** Helper to create a URL image source */
export function urlImage(url: string): UrlImageSource {
  return { type: 'url', url };
}

/** Helper to create a reference image source */
export function referenceImage(provider: string, key: string): ReferenceImageSource {
  return { type: 'reference', provider, key };
}

/**
 * Standard item schema that the Board and UI components expect.
 */
export const StandardItemSchema = z.object({
  /** Globally unique app ID (e.g. `${databaseId}:${entityId}:${dbId}`) */
  id: z.string(),
  /** Routing identity — where this item comes from */
  identity: EntityIdentitySchema,
  
  /** Primary display title */
  title: z.string(),
  /** Ordered list of image sources to try — first working source wins */
  images: z.array(ImageSourceSchema).default([]),
  
  /** Pre-computed strings for the UI to avoid complex formatting logic in components */
  subtitle: z.string().optional(),
  tertiaryText: z.string().optional(),
  
  /** Normalized rating (usually 0-10 or 0-100) */
  rating: z.number().optional(),
});

export type StandardItem = z.infer<typeof StandardItemSchema>;

/**
 * A link to another entity within the same database.
 */
export const EntityLinkSchema = z.object({
  /** Singular label for the entity type (e.g., 'Developer') */
  label: z.string(),
  /** The display name of the target item (e.g., 'FromSoftware') */
  name: z.string(),
  /** Routing identity of the target entity */
  identity: EntityIdentitySchema,
});

export type EntityLink = z.infer<typeof EntityLinkSchema>;

/**
 * Deep metadata fetched on demand for an item.
 */
export const StandardDetailsSchema = StandardItemSchema.extend({
  /** A full description or biography */
  description: z.string().optional(),
  /** Descriptive tags or genres */
  tags: z.array(z.string()).optional(),
  /** Links to other entities in the same database (e.g. Developer of a Game) */
  relatedEntities: z.array(EntityLinkSchema).optional(),
  /** External resource links (Wikipedia, Official Site, etc.) */
  externalLinks: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional(),
  /** Flexible record for any extra data specific to a database/entity */
  extendedData: z.record(z.string(), z.unknown()).optional(),
});

export type StandardDetails = z.infer<typeof StandardDetailsSchema>;
// --- Pagination Interfaces ---

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
  /** List of mapped standard items */
  items: z.array(StandardItemSchema),
  /** Pagination metadata — either page-based or cursor-based */
  pagination: PaginationInfoSchema,
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// --- Search & Filtering Schemas ---

/**
 * The types of UI inputs supported for filters.
 */
export const FilterInputTypeSchema = z.enum([
  'text', 
  'number', 
  'boolean', 
  'select', 
  'multiselect', 
  'async-select',
  'async-multiselect',
  'range', 
  'date'
]);

export type FilterInputType = z.infer<typeof FilterInputTypeSchema>;

/**
 * Represents a single option for select/multiselect filters.
 */
export const FilterOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  // LucideIcon cannot be easily validated with Zod as it's a component
  icon: z.any().optional(), 
});

export type FilterOption = z.infer<typeof FilterOptionSchema>;

/**
 * Definition for a filter that the UI should render.
 */
export interface BaseFilterDefinition<TValue = any, TTransformed = any> {
  /** Unique ID for the filter (used as key in internal state) */
  id: string;
  /** Human readable label for the UI */
  label: string;
  /** Default value for the filter state */
  defaultValue?: TValue;
  /** Placeholder text for inputs */
  placeholder?: string;
  /** Optional helper text shown to the user */
  helperText?: string;

  /** 
   * Declarative Mapping (V2 Refinement)
   * The API parameter name this filter maps to.
   */
  mapTo?: string;
  /** 
   * A transformation function to convert the UI value to an API parameter.
   * This is the "Escape Hatch" for database-specific logic.
   */
  transform?: (value: TValue) => TTransformed;
}

export interface TextFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string, TTransformed> {
  type: 'text';
}

export interface NumberFilterDefinition<TTransformed = any> extends BaseFilterDefinition<number, TTransformed> {
  type: 'number';
}

export interface BooleanFilterDefinition<TTransformed = any> extends BaseFilterDefinition<boolean, TTransformed> {
  type: 'boolean';
}

export interface SelectFilterDefinition<TValue = any, TTransformed = any> extends BaseFilterDefinition<TValue, TTransformed> {
  type: 'select' | 'multiselect';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

export interface AsyncSelectFilterDefinition<TValue = any, TTransformed = any> extends BaseFilterDefinition<TValue, TTransformed> {
  type: 'async-select' | 'async-multiselect';
  /** 
   * For 'async-select' or 'async-multiselect' filters.
   * Specifies the ID of the entity within the SAME database provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

export interface RangeFilterDefinition<TValue = any, TTransformed = any> extends BaseFilterDefinition<TValue, TTransformed> {
  type: 'range';
}

export interface DateFilterDefinition<TValue = any, TTransformed = any> extends BaseFilterDefinition<TValue, TTransformed> {
  type: 'date';
}

/**
 * Discriminated union of all filter definitions.
 */
export type FilterDefinition<TValue = any, TTransformed = any> = 
  | TextFilterDefinition<TTransformed>
  | NumberFilterDefinition<TTransformed>
  | BooleanFilterDefinition<TTransformed>
  | SelectFilterDefinition<TValue, TTransformed>
  | AsyncSelectFilterDefinition<TValue, TTransformed>
  | RangeFilterDefinition<TValue, TTransformed>
  | DateFilterDefinition<TValue, TTransformed>;

/**
 * Definition for a sort option supported by the entity.
 */
export const SortDefinitionSchema = z.object({
  /** Unique ID for the sort option */
  id: z.string(),
  /** Human readable label for the UI (e.g. "Release Date") */
  label: z.string(),
  /** Default direction if this sort is selected */
  defaultDirection: z.enum(['asc', 'desc']).optional(),
});

export type SortDefinition = z.infer<typeof SortDefinitionSchema>;

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
  sortDirection: z.enum(['asc', 'desc']).optional(),
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

// --- Hierarchy Definitions ---

/**
 * Visual branding for a database entity.
 * Separates "what it looks like" from "what it does."
 */
export interface EntityBranding {
  /** Singular name (e.g., 'Game') */
  label: string;
  /** Plural name (e.g., 'Games') */
  labelPlural: string;
  /** Icon component for the search tab and UI indicators */
  icon: LucideIcon;
  /** Tailwind color class for branding (e.g., 'text-purple-400') */
  colorClass: string;
}

/**
 * Represents a specific type of data inside a database (e.g., "Game" in RAWG).
 * This interface encapsulates everything the UI needs to handle this entity.
 */
export interface DatabaseEntity {
  /** Unique entity ID (e.g., 'game', 'developer', 'album') */
  id: string;
  /** Visual branding for the UI */
  branding: EntityBranding;

  /** Data filters for the filter sidebar (e.g. Platform, Year Range, Genre) */
  filters: FilterDefinition[];
  /**
   * Query modifiers rendered near the search input (e.g. Fuzzy Search, Precise Match).
   * These change how the query string is interpreted rather than filtering by a data
   * dimension. Uses the same FilterDefinition type so `applyFilters()` works on both.
   */
  searchOptions: FilterDefinition[];
  sortOptions: SortDefinition[];
  
  /** 
   * Search method: Fetches and maps raw API data directly into StandardItems.
   */
  search: (params: SearchParams) => Promise<SearchResult>;
  
  /** 
   * Detail method: Fetches and maps deep metadata for a single item.
   */
  getDetails: (dbId: string, options?: { signal?: AbortSignal }) => Promise<StandardDetails>;
}

/**
 * Generic fetcher type for dependency injection.
 */
export type Fetcher = <T>(url: string, options?: RequestInit) => Promise<T>;

/**
 * Represents an independent external database service provider.
 * This is the top-level object registered in the application.
 */
export interface DatabaseProvider {
  /** Unique provider ID (e.g., 'rawg', 'igdb', 'musicbrainz') */
  id: string;
  /** Human readable name (e.g., 'RAWG Database') */
  label: string;
  /** Optional description of what this database provides */
  description?: string;
  /** Optional icon representing the service provider */
  icon?: LucideIcon;

  /** The list of entities this database exposes to the user */
  entities: DatabaseEntity[];
  
  /** 
   * The current status of this specific provider.
   */
  status: ProviderStatus;

  /** 
   * Lifecycle hook for initialization.
   * Receives a standard fetcher for dependency injection.
   */
  initialize?: (fetcher: Fetcher) => Promise<void>; 

  /**
   * Optional method to resolve reference image sources.
   * @param key The provider-specific reference key.
   * @returns The resolved image URL, or null if unresolvable.
   */
  resolveImage?: (key: string) => Promise<string | null>;
}
