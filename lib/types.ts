/**
 * @file types.ts
 * @description Central definition of all domain types and Zod schemas used across the application.
 * Focuses on V2-native types and shared primitives.
 * @module Types
 */

import { z } from 'zod';

import { Item as DbItem, ItemDetails as DbItemDetails, ItemSchema as DbItemSchema } from '@/lib/database/types';

export type Item = DbItem;
export type ItemDetails = DbItemDetails;

// --- Branding Helpers ---

/**
 * Branded type helper.
 */
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };

/** Branded identifier for a Board */
export type BoardId = Brand<string, 'BoardId'>;
/** Branded identifier for a Tier */
export type TierId = Brand<string, 'TierId'>;
/** Branded identifier for an Item (usually a database identity or standard UUID) */
export type ItemId = Brand<string, 'ItemId'>;

// --- Domain Types ---

/**
 * Common entity categories for V2.
 */
export type ItemType =
  | 'album'
  | 'artist'
  | 'song'
  | 'movie'
  | 'tv'
  | 'person'
  | 'game'
  | 'book'
  | 'author'
  | 'developer'
  | 'franchise'
  | 'series';

/**
 * Broad category for a board, determining which database/registry to use.
 */
export type BoardCategory = 'music' | 'cinema' | 'game' | 'book';

/**
 * Standardized search result wrapper.
 */
export interface SearchResult {
  results: Item[];
  page: number;
  totalPages: number;
  totalCount: number;
  isServerSorted?: boolean;
}

/**
 * Available sorting options for search results.
 */
export type SortOption =
  | 'relevance'
  | 'date_desc'
  | 'date_asc'
  | 'title_asc'
  | 'title_desc'
  | 'duration_desc'
  | 'duration_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'reviews_desc'
  | 'reviews_asc';

/**
 * Defines the metadata for a single tier row.
 */
export interface TierDefinition {
  /** Unique ID for the tier. */
  id: string;
  /** Label text (e.g., 'S', 'A'). */
  label: string;
  /** Semantic Color ID (e.g., 'red', 'blue'), mapped in lib/colors.ts. */
  color: string;
}

/**
 * Represents the state of the tier list board.
 */
export interface TierListState {
  /** The user-defined title of the board. */
  title: string;
  /** Array defining the order and appearance of tiers. */
  tierDefs: TierDefinition[];
  /** Map mapping tier IDs to their list of items. */
  items: Record<string, Item[]>;
  /** Broad category for the board. */
  category?: BoardCategory;
  /**
   * Optimized lookup map for item locations (itemId -> tierId).
   */
  itemLookup?: Record<string, string>;
}

/**
 * Represents a simplified item for the dashboard preview.
 */
export interface PreviewItem {
  type: string;
  title: string;
  imageUrl?: string;
}

/**
 * Simplified tier data for the dashboard preview.
 */
export interface TierPreview {
  id: string;
  label: string;
  color: string;
  items: PreviewItem[];
}

/**
 * Metadata for a single board in the registry.
 */
export interface BoardMetadata {
  /** Unique board ID. */
  id: string;
  /** Board title. */
  title: string;
  /** Creation timestamp. */
  createdAt: number;
  /** Last modification timestamp. */
  lastModified: number;
  /** Optional preview image URL. */
  thumbnail?: string;
  /** Structure for rendering a miniature tier list. */
  previewData?: TierPreview[];
  /** Total number of items on the board. */
  itemCount: number;
  /** Broad category. */
  category?: BoardCategory;
}

// --- Zod Schemas for State Validation ---

export const TierDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
});

/**
 * Strictly validated TierList schema for persistence and sharing.
 */
export const TierListSchema = z.object({
  title: z.string(),
  tierDefs: z.array(TierDefinitionSchema),
  items: z.record(z.string(), z.array(DbItemSchema)),
  itemLookup: z.record(z.string(), z.string()).optional(),
  category: z.enum(['music', 'cinema', 'game', 'book']).optional(),
});

// --- Utilities ---

/**
 * Helper to ensure exhaustive switches in TypeScript.
 * @param x - The value that should have been handled exhaustively.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
