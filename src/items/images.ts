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
  /** The image provider (e.g. 'wikidata', 'fanart', 'caa') */
  provider: z.string(),
  /** Provider-specific lookup key (e.g. 'elden-ring', 'album:123') */
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
 * @param url
 */
export function urlImage(url: string): UrlImageSource {
  return { type: 'url', url };
}

/**
 * Helper to create a reference image source
 * @param provider
 * @param key
 */
export function referenceImage(provider: string, key: string): ReferenceImageSource {
  return { type: 'reference', provider, key };
}
