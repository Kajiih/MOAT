/**
 * @file Provider Types
 * @description Core types and protocol interfaces for the generic Provider orchestration layer.
 */

import { LucideIcon } from 'lucide-react';

import { ItemDetails } from '@/domain/items/items';
import { RequestOptions } from '@/infra/providers/api-client';
import { FilterDefinition } from '@/presentation/search/filter-schemas';
import { SearchParams, SearchResult } from '@/presentation/search/search-schemas';
import { SortDefinition } from '@/presentation/search/sort-schemas';

/**
 * Standard default page limit for fetching items from providers.
 */
export const DEFAULT_PAGE_LIMIT = 20;

/**
 * A utility type for arrays that must contain at least one element.
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * A type-inference utility that statically guarantees an array is not empty
 * and satisfies the NonEmptyArray<T> contract without requiring explicit type annotations.
 * @param first - The initial mandatory element of the array.
 * @param rest - The remaining optional elements of the array.
 * @returns A tuple guaranteeing at least one element exists (`[T, ...T[]]`).
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
  ERROR = 'ERROR',
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
 * Represents an entity within a provider (e.g., "Game", "Developer").
 * Generic TRaw allows integration tests to access provider-specific raw results safely.
 *
 * Navigation is fully entity-driven: the UI treats SearchParams as an opaque blob
 * and delegates all pagination logic to the entity via getNextParams / getPreviousParams.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Entity<TRaw = any> {
  /** Unique ID for the entity within the provider */
  readonly id: string;
  /** UI branding for the entity */
  readonly branding: EntityBranding;
  /** Filters available for searching this entity */
  readonly filters: FilterDefinition<TRaw>[];
  /** Search-specific options (e.g. "Precise Search") */
  readonly searchOptions: FilterDefinition<TRaw>[];
  /** Sort options available for this entity */
  readonly sortOptions: SortDefinition<TRaw>[];

  /** String guaranteed to return 1-3 pages of results. Mandatory for boundary pagination integration testing. */
  readonly edgeShortQuery: string;

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
  readonly getDetails: (
    providerItemId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<ItemDetails>;

  /**
   * Structured array of exact targets used to verify the resolveImage implementation natively in integration tests.
   * If the entity supports image resolution, it must provide at least one valid test case.
   */
  readonly testImageResolution?: NonEmptyArray<{
    /** The composite key or identity to resolve (e.g., specific DB ID) */
    key: string;
    /** Describes what this test accomplishes (e.g., 'Resolves secondary fallback via Wikidata') */
    description: string;
    /** If provided, asserts the resolved URL contains this substring (useful for ensuring it hit the right CDN) */
    expectUrlContains?: string;
  }>;

  /**
   * Method to resolve a stored reference image to a direct HTTP URL.
   * Must be implemented by all entities natively.
   * @param key The provider-specific reference key (typically just the DB ID, previously it was prefixed).
   * @returns The resolved image URL, or null if unresolvable.
   */
  readonly resolveImage: (
    key: string,
    options?: { signal?: AbortSignal },
  ) => Promise<string | null>;
}

/**
 * Generic fetcher type for dependency injection.
 */
export interface Fetcher {
  <T = unknown>(url: string, options?: Omit<RequestOptions, 'raw'> & { raw?: false }): Promise<T>;
  (url: string, options: RequestOptions & { raw: true }): Promise<Response>;
}

/**
 * Represents an independent external service provider.
 * This is the top-level object registered in the application.
 *
 * Concrete classes narrow the `entities` type via their own annotations
 * (e.g. `readonly entities = [...] as const`), which TypeScript's structural
 * typing matches against this interface.
 */
export interface Provider {
  /** Unique provider ID (e.g., 'rawg', 'igdb', 'musicbrainz') */
  readonly id: string;
  /** Human readable name (e.g., 'RAWG') */
  readonly label: string;
  /** Optional description of what this provider provides */
  readonly description?: string;
  /** Optional icon representing the service provider */
  readonly icon?: LucideIcon;

  /** The list of entities this provider exposes to the user */
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
}
