/**
 * @file image-logic.ts
 * @description Server-side utilities for validating and scrubbing image URLs.
 * Primarily used to prevent OG image generation from crashing on broken images.
 */

import { logger } from '@/lib/logger';
import { MediaItem, TierListState } from '@/lib/types';

/**
 * Validates if an image URL is reachable and returns an image content-type.
 * @param url - The image URL to validate.
 * @param timeoutMs - Timeout for the validation request (default 1500ms).
 * @returns A promise resolving to true if valid, false otherwise.
 */
export async function validateImageUrl(url: string, timeoutMs = 1500): Promise<boolean> {
  if (!url) return false;
  if (url.startsWith('data:')) return true;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'TierListApp/1.0',
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      logger.warn({ url, status: response.status }, 'Image validation failed: Non-OK response');
      return false;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      logger.warn({ url, contentType }, 'Image validation failed: Non-image content-type');
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn({ url }, 'Image validation timed out');
    } else {
      logger.error({ error, url }, 'Image validation error');
    }
    return false;
  }
}

/**
 * Scrubs broken image URLs from a board state.
 * Only validates the images that will actually be displayed in the OG board (top N per tier).
 * @param state - The board state to scrub.
 * @param itemsPerTier - Number of items per tier to validate (matches OGBoard limit).
 * @returns A new board state with broken images set to undefined.
 */
export async function scrubBoardImages(
  state: TierListState,
  itemsPerTier = 10,
): Promise<TierListState> {
  const newItems: Record<string, MediaItem[]> = {};
  
  // Collect all images to validate (unique URLs only to optimize)
  const imageUrlsToValidate = new Set<string>();
  
  for (const tier of state.tierDefs) {
    const tierItems = state.items[tier.id] || [];
    const displayedItems = tierItems.slice(0, itemsPerTier);
    for (const item of displayedItems) {
      if (item.imageUrl) {
        imageUrlsToValidate.add(item.imageUrl);
      }
    }
  }

  // Validate all unique URLs in parallel
  const validationResults = new Map<string, boolean>();
  await Promise.all(
    [...imageUrlsToValidate].map(async (url) => {
      const isValid = await validateImageUrl(url);
      validationResults.set(url, isValid);
    })
  );

  // Reconstruct items with scrubbed images
  for (const tierId in state.items) {
    newItems[tierId] = state.items[tierId].map((item) => {
      if (item.imageUrl && validationResults.has(item.imageUrl) && !validationResults.get(item.imageUrl)) {
        return { ...item, imageUrl: undefined };
      }
      return item;
    });
  }

  return {
    ...state,
    items: newItems,
  };
}
