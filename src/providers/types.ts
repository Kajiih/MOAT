import { LucideIcon } from 'lucide-react';

import { FilterDefinition } from '@/search/schemas';
import { ItemDetails } from '@/items/schemas';
import { SearchParams, SearchResult } from '@/search/schemas';
import { SortDefinition } from '@/search/schemas';

/**
 * A utility type for arrays that must contain at least one element.
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * A type-inference utility that statically guarantees an array is not empty
 * and satisfies the NonEmptyArray<T> contract without requiring explicit type annotations.
 */
export function nonEmpty<T>(first: T, ...rest: T[]): NonEmptyArray<T> {
  return [first, ...rest];
}

/**
 * Possible states for an individual Provider.
 */
export enum ProviderStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

/**
 * Visual branding for a entity.
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
 * Represents an entity within a database (e.g., "Game", "Developer").
 * Generic TRaw allows integration tests to access provider-specific raw results safely.
 *
 * Navigation is fully entity-driven: the UI treats SearchParams as an opaque blob
 * and delegates all pagination logic to the entity via getNextParams / getPreviousParams.
 */
export interface Entity<TRaw = any> {
  /** Unique ID for the entity within the provider */
  readonly id: string;
  /** UI branding for the entity */
  readonly branding: EntityBranding;
  /** Filters available for searching this entity */
  readonly filters: FilterDefinition<any, TRaw>[];
  /** Search-specific options (e.g. "Precise Search") */
  readonly searchOptions: FilterDefinition<any, TRaw>[];
  /** Sort options available for this entity */
  readonly sortOptions: SortDefinition<TRaw>[];

  /**
   * Queries used to verify search, pagination, and sorting in integration tests.
   * Statically enforced to contain at least one query.
   */
  readonly defaultTestQueries: NonEmptyArray<string>;

  /**
   * IDs of items used to verify the getDetails implementation.
   * Statically enforced to contain at least one ID.
   */
  readonly testDetailsIds: NonEmptyArray<string>;

  /** Returns the starting parameters for this entity's search. */
  readonly getInitialParams: (config: { limit: number }) => SearchParams;
  /** Calculates the parameters for the next page of results, or null if none. */
  readonly getNextParams: (params: SearchParams, result: SearchResult) => SearchParams | null;
  /** Calculates the parameters for the previous page of results, or null if none. */
  readonly getPreviousParams: (params: SearchParams, result: SearchResult) => SearchParams | null;
  /** Search for items within the entity. */
  readonly search: (params: SearchParams) => Promise<SearchResult<TRaw>>;
  /** Fetches and maps deep metadata for a single item. */
  readonly getDetails: (dbId: string, options?: { signal?: AbortSignal }) => Promise<ItemDetails>;
}

/**
 * Generic fetcher type for dependency injection.
 */
export type Fetcher = <T>(url: string, options?: RequestInit) => Promise<T>;

/**
 * Represents an independent external database service provider.
 * This is the top-level object registered in the application.
  *
 * Concrete classes narrow the `entities` type via their own annotations
 * (e.g. `readonly entities = [...] as const`), which TypeScript's structural
 * typing matches against this interface.
 */
export interface Provider {
  /** Unique provider ID (e.g., 'rawg', 'igdb', 'musicbrainz') */
  readonly id: string;
  /** Human readable name (e.g., 'RAWG Database') */
  readonly label: string;
  /** Optional description of what this database provides */
  readonly description?: string;
  /** Optional icon representing the service provider */
  readonly icon?: LucideIcon;

  /** The list of entities this database exposes to the user */
  readonly entities: readonly Entity[];
  
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
   * Keys used to verify the resolveImage implementation in integration tests.
   * If the provider supports image resolution, it must provide at least one valid key to test.
   * Statically enforced to be non-empty.
   */
  readonly testImageKeys: NonEmptyArray<string>;

  /**
   * Method to resolve reference image sources.
   * Must be implemented by all providers. If a provider does not support resolving images, 
   * it should return `null`.
   * @param key The provider-specific reference key.
   * @returns The resolved image URL, or null if unresolvable.
   */
  resolveImage: (key: string) => Promise<string | null>;
}
