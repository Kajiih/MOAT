/**
 * @file Item Images
 * @description Zod schemas and utility functions covering media resolution.
 */

import { z } from 'zod';

/** A direct image URL */
export const UrlImageSourceSchema = z.object({
  type: z.literal('url'),
  url: z.string().url(),
});

/** A reference to an image that needs async resolution via a provider */
export const ReferenceImageSourceSchema = z.object({
  type: z.literal('reference'),
  /** The image provider (e.g. 'rawg', 'musicbrainz') */
  provider: z.string(),
  /** The semantic domain entity within the provider (e.g. 'game', 'album') */
  entityId: z.string(),
  /** Provider-specific lookup key (e.g. '3328', '2c55f39d-...') */
  key: z.string(),
});

/** Discriminated union of image source strategies */
export const ImageSourceSchema = z.discriminatedUnion('type', [
  UrlImageSourceSchema,
  ReferenceImageSourceSchema,
]);

export type UrlImageSource = z.infer<typeof UrlImageSourceSchema>;
export type ReferenceImageSource = z.infer<typeof ReferenceImageSourceSchema>;
export type ImageSource = z.infer<typeof ImageSourceSchema>;

/**
 * Helper to create a URL image source
 * @param url - The direct HTTP string pointing to the image source.
 * @returns A strongly typed UrlImageSource variant payload.
 */
export function urlImage(url: string): UrlImageSource {
  return { type: 'url', url };
}

/**
 * Helper to create a reference image source
 * @param provider - The upstream metadata provider containing the source reference.
 * @param entityId - The specific semantic entity within the provider.
 * @param key - The unique sub-key referencing the image payload via backend adapters.
 * @returns A strongly typed ReferenceImageSource variant payload.
 */
export function referenceImage(provider: string, entityId: string, key: string): ReferenceImageSource {
  return { type: 'reference', provider, entityId, key };
}
