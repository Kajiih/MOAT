/**
 * @file useResolvedImage.ts
 * @description Hook and utilities for resolving declarative ImageSource
 * references into playable URLs using SWR for caching and deduplication.
 */
import useSWR from 'swr';

import type { ImageSource } from '@/domain/items/images';
import { failedImages } from '@/features/items/image-cache';

import { batchResolver } from './batch-resolver';

/**
 * Resolves an ordered list of ImageSource entries to the first working image URL.
 *
 * For 'url' sources: attempts to load the image directly.
 * For 'reference' sources: calls the registry to resolve the reference before loading.
 * @param sources - Ordered list of image sources to try
 * @returns The first successfully resolved image URL, or undefined
 */
export function useResolvedImage(sources: ImageSource[]): string | undefined {
  const cacheKey = sources.length > 0 ? JSON.stringify(sources) : null;

  const { data: resolvedUrl } = useSWR<string | undefined>(
    cacheKey,
    async (key: string) => {
      const activeSources: ImageSource[] = JSON.parse(key);

      for (const source of activeSources) {
        try {
          let targetUrl: string | undefined;

          if (source.type === 'url') {
            targetUrl = source.url;
            // Trust standard URLs (Next.js Image Optimization handles hotlinking/CORS better)
            return targetUrl;
          } else {
            targetUrl = await batchResolver.load(source.provider, source.entityId, source.key);
          }

          if (!targetUrl) continue;

          if (failedImages.has(targetUrl)) {
            continue; // Skip known broken URL candidates instantly
          }

          const loaded = await loadImage(targetUrl);
          if (loaded) {
            return targetUrl;
          } else {
            failedImages.add(targetUrl); // Proactively blacklist asset
          }
        } catch {
          // Source failed, try the next one
          continue;
        }
      }
    },
    {
      revalidateOnFocus: false, // Don't refetch simply because window gained focus
      dedupingInterval: 86_400_000, // Keep cached results alive for 24 hours
      shouldRetryOnError: false,
    },
  );

  return resolvedUrl;
}

/**
 * Attempts to load an image URL and returns whether it succeeded.
 * @param url - The URL of the image to load.
 * @returns A promise resolving to true if successful, false otherwise.
 */
function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
