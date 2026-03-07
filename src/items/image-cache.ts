/**
 * @file image-cache.ts
 * @description Shared cache for tracking failed image URLs across the application.
 * This allows components to avoid repeated 404 requests and helps the screenshot
 * engine differentiate between expected failures (already broken) and unexpected ones.
 * @module image-cache
 */

/**
 * Global cache for failed image URLs.
 * When an image fails to load in the UI, its URL is added here to prevent
 * repeated fetch attempts during the session.
 */
export const failedImages = new Set<string>();
