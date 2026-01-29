/**
 * @file media-types/types.ts
 * @description Core type definitions for the media type abstraction system.
 * Defines the complete specification for a media type independent of backing services.
 */

import { LucideIcon } from 'lucide-react';

import { BoardCategory, MediaItem, MediaType, SortOption } from '@/lib/types';

/**
 * Filter configuration with clear separation of concerns.
 */
export interface FilterConfig {
  /** Unique identifier for this filter */
  id: string;
  /** Human-readable label */
  label: string;
  /** Type of filter input */
  type: 'text' | 'range' | 'select' | 'picker' | 'toggle-group';
  
  /** URL parameter name (defaults to id) */
  paramName?: string;
  
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Helper text shown below the filter */
  helperText?: string;
  
  /** Options for select/toggle-group types */
  options?: Array<{ label: string; value: string; icon?: LucideIcon }>;
  /** Media type for picker type */
  pickerType?: MediaType;
  
  /** Default value for this filter */
  defaultValue?: unknown;
  /** Alias for defaultValue (backward compatibility) */
  default?: unknown;
}

/**
 * Sort option configuration.
 */
export interface SortOptionConfig {
  /** The standardized sort value */
  value: SortOption;
  /** Human-readable label */
  label: string;
  /** Optional API-specific parameter mapping */
  apiValue?: string;
}

/**
 * Complete definition of a media type.
 * This is the single source of truth for everything related to a media type.
 */
export interface MediaTypeDefinition {
  // ===== Identity =====
  /** Unique type identifier */
  id: MediaType;
  /** Category this type belongs to */
  category: BoardCategory;
  
  // ===== UI Presentation =====
  /** Singular label (e.g., "Album") */
  label: string;
  /** Plural label (e.g., "Albums") */
  labelPlural: string;
  /** Icon component */
  icon: LucideIcon;
  /** Tailwind color class */
  colorClass: string;
  
  /** Extract subtitle from an item (e.g., artist name for album) */
  getSubtitle: (item: MediaItem) => string;
  /** Extract tertiary text from an item (e.g., year) */
  getTertiaryText: (item: MediaItem) => string;
  
  // ===== Search & Filters =====
  /** Available filters for this type */
  filters: FilterConfig[];
  /** Available sort options */
  sortOptions: SortOptionConfig[];
  /** Default filter values */
  defaultFilters: Record<string, unknown>;
  
  // ===== Capabilities =====
  /** Whether this type can be searched */
  searchable: boolean;
  /** Whether this type supports detailed metadata */
  supportsDetails: boolean;
}

/**
 * Configuration for a media type category (e.g., "music", "cinema").
 */
export interface CategoryConfig {
  /** Category identifier */
  id: BoardCategory;
  /** Human-readable name */
  label: string;
  /** Plural form */
  labelPlural: string;
  /** Primary media types in this category */
  primaryTypes: MediaType[];
  /** Secondary/supporting types */
  secondaryTypes: MediaType[];
}
