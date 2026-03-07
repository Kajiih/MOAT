/**
 * @file types.ts
 * @description Central definition of all domain types and Zod schemas used across the application.
 * Focuses on native types and shared primitives.
 * @module Types
 */

import { z } from 'zod';

import { Item as DbItem, ItemDetails as DbItemDetails, ItemSchema as DbItemSchema } from '@/items/schemas';

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
});

// --- Utilities ---

/**
 * Helper to ensure exhaustive switches in TypeScript.
 * @param x - The value that should have been handled exhaustively.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
