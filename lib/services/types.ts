/**
 * @file types.ts
 * @description Core interfaces and types for the MediaService architecture.
 */

import { LucideIcon } from 'lucide-react';

import { MediaDetails, MediaItem, MediaType, SearchResult } from '@/lib/types';

/**
 * Options passed to the search method.
 */
export interface SearchOptions {
  fuzzy?: boolean;
  wildcard?: boolean;
  limit?: number;
  page?: number;
  // Specific filters (can be expanded)
  filters?: Record<string, unknown>;
}

/**
 * Supported filter input types.
 */
export type FilterType = 'text' | 'range' | 'select' | 'picker' | 'toggle-group';

/**
 * Definition of a filter field for a specific media type.
 */
export interface FilterDefinition {
  id: string;
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
 */
export interface MediaService {
  /**
   * Searches for items in the provider's database.
   */
  search(query: string, type: MediaType, options?: SearchOptions): Promise<SearchResult>;

  /**
   * Retrieves detailed metadata for a specific item.
   */
  getDetails(id: string, type: MediaType): Promise<MediaDetails>;

  /**
   * Returns the list of media types supported by this service.
   * Used to populate the SearchPanel tabs.
   */
  getSupportedTypes(): MediaType[];

  /**
   * Returns the UI configuration (icon, color, text formatters) for a type.
   */
  getUIConfig(type: MediaType): MediaUIConfig;

  /**
   * Returns the available filters for a specific media type.
   */
  getFilters(type: MediaType): FilterDefinition[];
}
