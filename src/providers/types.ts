import { LucideIcon } from 'lucide-react';

import { FilterDefinition } from '@/search/schemas';
import { ItemDetails } from '@/items/schemas';
import { SearchParams, SearchResult } from '@/search/schemas';
import { SortDefinition } from '@/search/schemas';

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
 * Represents an entity within a database (e.g., "Game", "Developer").
 * Generic TRaw allows integration tests to access provider-specific raw results safely.
 */
export interface DatabaseEntity<TRaw = any> {
  /** Unique ID for the entity within the provider */
  readonly id: string;
  /** UI branding for the entity */
  readonly branding: EntityBranding;
  /** Filters available for searching this entity */
  readonly filters: FilterDefinition[];
  /** Search-specific options (e.g. "Precise Search") */
  readonly searchOptions?: FilterDefinition[];
  /** Sort options available for this entity */
  readonly sortOptions: SortDefinition<TRaw>[];

  /** Optional general queries that return multiple results for sorting tests */
  readonly testQueries?: string[];

  /**
   * Search for items within the entity.
   */
  readonly search: (params: SearchParams) => Promise<SearchResult<TRaw>>;
  
  /** 
   * Detail method: Fetches and maps deep metadata for a single item.
   */
  readonly getDetails: (dbId: string, options?: { signal?: AbortSignal }) => Promise<ItemDetails>;
}

/**
 * Generic fetcher type for dependency injection.
 */
export type Fetcher = <T>(url: string, options?: RequestInit) => Promise<T>;

/**
 * Represents an independent external database service provider.
 * This is the top-level object registered in the application.
 */
export interface DatabaseProvider<TEntities extends readonly DatabaseEntity<any>[] = DatabaseEntity<any>[]> {
  /** Unique provider ID (e.g., 'rawg', 'igdb', 'musicbrainz') */
  id: string;
  /** Human readable name (e.g., 'RAWG Database') */
  label: string;
  /** Optional description of what this database provides */
  description?: string;
  /** Optional icon representing the service provider */
  icon?: LucideIcon;

  /** The list of entities this database exposes to the user */
  entities: TEntities;
  
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
