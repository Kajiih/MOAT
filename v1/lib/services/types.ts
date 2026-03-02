/**
 * @file types.ts
 * @description Core interfaces and types for the MediaService architecture.
 */

import { LucideIcon } from 'lucide-react';

import {
  BoardCategory,
  MediaDetails,
  MediaItem,
  MediaType,
  SearchResult,
  SortOption,
} from '@/lib/types';

import { CategoryFilters } from '../media-types/filters';

/**
 * Options passed to the search method.
 */
export interface SearchOptions<F = Record<string, unknown>> {
  fuzzy?: boolean;
  wildcard?: boolean;
  limit?: number;
  page?: number;
  sort?: SortOption;
  // Specific filters (can be expanded)
  filters?: Partial<F>;
}

/**
 * Supported filter input types.
 */
export type FilterType = 'text' | 'range' | 'select' | 'picker' | 'toggle-group';

/**
 * Definition of a filter field for a specific media type.
 */
export interface FilterDefinition<F extends string = string> {
  id: F;
  /** The key used in the URL query string (defaults to id). */
  paramName?: string;
  label: string;
  type: FilterType;
  placeholder?: string;
  options?: { label: string; value: string; icon?: LucideIcon }[];
  pickerType?: MediaType; // for 'picker' type
  default?: unknown;
}

/**
 * Configuration for how a media type is displayed in the UI.
 */
export interface MediaUIConfig {
  label: string;
  Icon: LucideIcon;
  colorClass: string;
  getSubtitle: (item: MediaItem) => string;
  getTertiaryText: (item: MediaItem) => string;
}

/**
 * Core interface for any media provider (Music, Cinema, etc.).
 * Focused purely on data fetching - all configuration comes from the media type registry.
 */
export interface MediaService<F = Record<string, unknown>> {
  /**
   * The category this service handles (music, cinema, book, etc.).
   */
  readonly category: BoardCategory;

  /**
   * Unique identifier for this service (e.g., 'rawg', 'igdb', 'musicbrainz').
   */
  readonly id: string;

  /**
   * Human-readable label for UI display (e.g., 'RAWG', 'IGDB').
   */
  readonly label: string;

  /**
   * Searches for items in the provider's database.
   */
  search(query: string, type: MediaType, options?: SearchOptions<F>): Promise<SearchResult>;

  /**
   * Retrieves detailed metadata for a specific item.
   */
  getDetails(id: string, type: MediaType): Promise<MediaDetails>;

  /**
   * Returns the list of media types supported by this service.
   * Used to populate the SearchPanel tabs.
   */
  getSupportedTypes(): MediaType[];
}

/**
 * Universal type for any registered media service.
 */
export type AnyMediaService = MediaService<CategoryFilters>;
