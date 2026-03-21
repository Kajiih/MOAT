/**
 * @file Item Schemas
 * @description Master Zod schemas capturing the fundamental data shapes.
 */

import { z } from 'zod';

import { EntityIdentitySchema } from './identity';
import { ImageSourceSchema } from './images';

/**
 * A link to another entity within the same provider.
 */
export const EntityLinkSchema = z.object({
  /** Singular label for the entity type (e.g., 'Developer') */
  label: z.string(),
  /** The display name of the target item (e.g., 'FromSoftware') */
  name: z.string(),
  /** Routing identity of the target entity */
  identity: EntityIdentitySchema,
});

export type EntityLink = z.infer<typeof EntityLinkSchema>;

export const SubtitleTokenSchema = z.union([z.string(), EntityLinkSchema]);

export type SubtitleToken = z.infer<typeof SubtitleTokenSchema>;

export const SubtitleSchema = z.union([z.string(), z.array(SubtitleTokenSchema)]);

export type Subtitle = z.infer<typeof SubtitleSchema>;

/**
 * Resolves a sequence of subtitle tokens into a flat display string.
 */
export function getSubtitleString(subtitle: Subtitle | undefined): string {
  if (!subtitle) return '';
  if (typeof subtitle === 'string') return subtitle;
  return subtitle.map((t) => (typeof t === 'string' ? t : t.name)).join(' • ');
}

/**
 * Base properties for any item.
 */
export const BaseItemSchema = z.object({
  /** Globally unique app ID (e.g. `${providerId}:${entityId}:${providerItemId}`) */
  id: z.string(),
  /** Routing identity — where this item comes from */
  identity: EntityIdentitySchema,

  /** Primary display title */
  title: z.string(),
  /** Ordered list of image sources to try — first working source wins */
  images: z.array(ImageSourceSchema).default([]),

  /** Pre-computed strings for the UI to avoid complex formatting logic in components */
  subtitle: SubtitleSchema.optional(),
  tertiaryText: z.string().optional(),

  /** Normalized rating (usually 0-10 or 0-100) */
  rating: z.number().optional(),

  /** User's personal custom notes for this specific item layout */
  notes: z.string().optional(),
});

export type BaseItem = z.infer<typeof BaseItemSchema>;

/**
 * A section of metadata for an item (e.g. "Tracks", "Awards").
 */
export const ItemSectionSchema = z.object({
  title: z.string(),
  type: z.enum(['text', 'list']),
  content: z.union([z.string(), z.array(SubtitleTokenSchema)]),
});

export type ItemSection = z.infer<typeof ItemSectionSchema>;

/**
 * Core detailed metadata fields specific to the details payload.
 */
export const ItemDetailsCoreSchema = z.object({
  /** A full description or biography */
  description: z.string().optional(),
  /** Descriptive tags or genres */
  tags: z.array(z.string()).optional(),
  /** Links to other entities in the same provider (e.g. Developer of a Game) */
  relatedEntities: z.array(EntityLinkSchema).optional(),
  /** External resource links (Wikipedia, Official Site, etc.) */
  urls: z
    .array(
      z.object({
        type: z.string(),
        url: z.string().url(),
      }),
    )
    .optional(),
  /** Flexible sections of data (Tracks, Cast, etc.) */
  sections: z.array(ItemSectionSchema).optional(),
  /** Flexible record for any extra data specific to a provider/entity */
  extendedData: z.record(z.string(), z.unknown()).optional(),
});

export type ItemDetailsCore = z.infer<typeof ItemDetailsCoreSchema>;

/**
 * Deep metadata fetched on demand for an item.
 * Extends the base item with additional metadata fields returned by provider.
 */
export const ItemDetailsSchema = BaseItemSchema.extend(ItemDetailsCoreSchema.shape);

export type ItemDetails = z.infer<typeof ItemDetailsSchema>;

/**
 * Item schema that the Board and UI components expect.
 * This is what gets returned by Search results.
 */
export const ItemSchema = BaseItemSchema.extend({
  /** Deep metadata (cached once resolved) */
  details: ItemDetailsCoreSchema.optional(),
});

export type Item = z.infer<typeof ItemSchema>;

/**
 * Strict payload for patching an item.
 * Explicitly removes the Primary Key (id) to prevent accidental mutation.
 */
export type ItemUpdate = Partial<Omit<Item, 'id'>>;
