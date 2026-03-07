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
   * Search method: Fetches and maps raw API data directly into Items.
   */
  search: (params: SearchParams) => Promise<SearchResult>;
  
  /** 
   * Detail method: Fetches and maps deep metadata for a single item.
   */
  getDetails: (dbId: string, options?: { signal?: AbortSignal }) => Promise<ItemDetails>;
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
