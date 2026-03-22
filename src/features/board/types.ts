/**
 * @file types.ts
 * @description Central definition of all domain types and Zod schemas used across the application.
 * Focuses on native types and shared primitives.
 * @module Types
 */

import { z } from 'zod';

import {
  Item as DbItem,
  ItemDetails as DbItemDetails,
  ItemSchema as DbItemSchema,
} from '@/domain/items/items';

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
/** Branded identifier for an Item (usually a provider identity or standard UUID) */
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
 * Valid attributes that can be updated on a Tier.
 */
export type TierUpdate = Partial<Omit<TierDefinition, 'id'>>;

/**
 * Represents the state of the tier list board.
 */
export interface TierListState {
  /** The user-defined title of the board. */
  title: string;
  /** Array defining the order and appearance of tiers. */
  tierDefs: TierDefinition[];
  /** Single Source of Truth for Item data. Maps Item ID -> Item object. */
  itemEntities: Record<string, Item>;
  /** Positional layout referencing Item IDs. Maps Tier ID -> Array of Item IDs. */
  tierLayout: Record<string, string[]>;
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
  itemEntities: z.record(z.string(), DbItemSchema),
  tierLayout: z.record(z.string(), z.array(z.string())),
});

// --- Drag and Drop Types ---

export type DragItemData = {
  type: 'item';
  item: Item;
};

export type DragTierData = {
  type: 'tier';
  tier: TierDefinition;
};

export type DragData = DragItemData | DragTierData;

export function isDragItemData(data: Record<string, unknown>): data is DragItemData {
  return data.type === 'item' && 'item' in data;
}

export function isDragTierData(data: Record<string, unknown>): data is DragTierData {
  return data.type === 'tier' && 'tier' in data;
}

// --- Utilities ---

/**
 * Helper to ensure exhaustive switches in TypeScript.
 * @param x - The value that should have been handled exhaustively.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
