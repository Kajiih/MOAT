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
 * Standard item schema that the Board and UI components expect.
 */
export const StandardItemSchema = z.object({
  /** Globally unique app ID (e.g. `${databaseId}:${entityId}:${dbId}`) */
  id: z.string(),
  /** The original ID in the source database */
  dbId: z.string(),
  /** The identifier of the database provider (e.g., 'rawg', 'musicbrainz') */
  databaseId: z.string(),
  /** The identifier of the entity type (e.g., 'game', 'album') */
  entityId: z.string(),
  
  /** Primary display title */
  title: z.string(),
  /** Optional primary image URL */
  imageUrl: z.string().url().optional().or(z.literal('')),
  /** 
   * Alternative image sources or fallback strategies.
   * Can be URLs or specialized IDs (e.g. 'fanart:album:123')
   */
  imageFallbacks: z.array(z.string()).optional(),
  
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
  /** The internal provider ID of the entity type (e.g., 'developer') */
  entityId: z.string(),
  /** The ID of the item in the source database */
  dbId: z.string(),
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

/**
 * Standardized search response from any entity.
 */
export const SearchResultSchema = z.object({
  /** List of mapped standard items */
  items: z.array(StandardItemSchema),
  /** Total count of matches in the remote database */
  totalCount: z.number(),
  /** Total number of pages available */
  totalPages: z.number(),
  /** The current page index returned (1-indexed) */
  currentPage: z.number(),
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
export interface FilterDefinition<TValue = any, TTransformed = any> {
  /** Unique ID for the filter (used as key in internal state) */
  id: string;
  /** Human readable label for the UI */
  label: string;
  /** The type of input to render */
  type: FilterInputType;
  /** Available options for selection-based inputs */
  options?: FilterOption[];
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

// Note: We keep the schema for runtime validation, but use the interface for complex typing
export const FilterDefinitionSchema = z.any(); 

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
  /** The page to fetch (1-indexed) */
  page: z.number(),
  /** The number of items to fetch per page */
  limit: z.number(),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

// --- Hierarchy Definitions ---

/**
 * Represents a specific type of data inside a database (e.g., "Game" in RAWG).
 * This interface encapsulates everything the UI needs to handle this entity.
 */
export interface DatabaseEntity {
  /** Unique entity ID (e.g., 'game', 'developer', 'album') */
  id: string;
  /** Singular name (e.g., 'Game') */
  label: string;
  /** Plural name (e.g., 'Games') */
  labelPlural: string;
  /** Icon component for the search tab and UI indicators */
  icon: LucideIcon;
  /** Tailwind color class for branding (e.g., 'bg-purple-500') */
  colorClass: string;

  /** Discovery configuration: what filters and sorts are available */
  filters: FilterDefinition[];
  sortOptions: SortDefinition[];
  
  /** 
   * Search method: Fetches and maps raw API data directly into StandardItems.
   */
  search: (params: SearchParams) => Promise<SearchResult>;
  
  /** 
   * Detail method: Fetches and maps deep metadata for a single item.
   */
  getDetails: (dbId: string) => Promise<StandardDetails>;
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
}
