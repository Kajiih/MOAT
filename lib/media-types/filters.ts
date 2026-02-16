/**
 * @file media-types/filters.ts
 * @description Concrete filter type definitions for each media category.
 * These types ensure end-to-end type safety from the UI definitions to the service layer.
 */

import { SortOption } from '../types';

/**
 * Base filter properties shared by all categories.
 */
export interface BaseFilters {
  /** The active search query */
  query: string;
  /** The selected sort option */
  sort: SortOption;
}

/**
 * Filter state for Music-related media types.
 */
export interface MusicFilters extends BaseFilters {
  yearRange?: { min: string; max: string };
  minYear?: string;
  maxYear?: string;
  tag?: string;
  artistType?: string;
  artistCountry?: string;
  selectedArtist?: string | null;
  selectedAlbum?: string | null;
  albumPrimaryTypes?: string[];
  albumSecondaryTypes?: string[];
  durationRange?: { min: string; max: string };
  minDuration?: string;
  maxDuration?: string;
}

/**
 * Filter state for Cinema-related media types.
 */
export interface CinemaFilters extends BaseFilters {
  yearRange?: { min: string; max: string };
  minYear?: string;
  maxYear?: string;
  tag?: string;
}

/**
 * Filter state for Book-related media types.
 */
export interface BookFilters extends BaseFilters {
  selectedAuthor?: string | null;
  yearRange?: { min: string; max: string };
  minYear?: string;
  maxYear?: string;
  bookType?: string;
  language?: string;
  publisher?: string;
  person?: string;
  place?: string;
}

/**
 * Discriminanted union or helper type to get filter type by category.
 */
export type CategoryFilters = MusicFilters | CinemaFilters | BookFilters;
