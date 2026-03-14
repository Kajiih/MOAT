/**
 * @file useResolvedImage.ts
 * @description Hook and utilities for resolving declarative ImageSource
 * references into playable URLs using SWR for caching and deduplication.
 */
import useSWR from 'swr';

import type { ImageSource } from '@/items/images';

/**
 * Resolves an ordered list of ImageSource entries to the first working image URL.
 *
 * For 'url' sources: attempts to load the image directly.
 * For 'reference' sources: calls the registry to resolve the reference before loading.
 * @param sources - Ordered list of image sources to try
 * @returns The first successfully resolved image URL, or undefined
 */
export function useResolvedImage(sources: ImageSource[]): string | undefined {
  // SWR automatically hashes the array into a stable string key.
  // We use null to prevent fetching if there are no sources.
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
          } else {
            const res = await fetch(
              `/api/resolve-image?providerId=${encodeURIComponent(source.provider)}&key=${encodeURIComponent(source.key)}`,
            );
            
            if (res.ok) {
              const data = await res.json();
              targetUrl = data.url;
            }
          }

          if (targetUrl) {
            const loaded = await loadImage(targetUrl);
            if (loaded) return targetUrl;
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
      shouldRetryOnError: false, // Don't spam retries if all sources genuinely failed
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
