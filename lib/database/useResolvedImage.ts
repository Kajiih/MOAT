import { useState, useEffect, useCallback } from 'react';
import type { ImageSource } from './types';

/**
 * Image reference resolver function type.
 * Given a reference provider and key, returns a URL or null.
 */
export type ImageReferenceResolver = (
  provider: string,
  key: string,
) => Promise<string | null>;

/** Default no-op resolver — reference sources are skipped */
const defaultResolver: ImageReferenceResolver = async () => null;

/**
 * Resolves an ordered list of ImageSource entries to the first working image URL.
 *
 * For 'url' sources: attempts to load the image directly.
 * For 'reference' sources: calls the provided resolver to get a URL, then loads it.
 *
 * Falls back to undefined if no source succeeds.
 *
 * @param sources - Ordered list of image sources to try
 * @param referenceResolver - Optional function to resolve reference sources to URLs
 * @returns The first successfully resolved image URL, or undefined
 */
export function useResolvedImage(
  sources: ImageSource[],
  referenceResolver: ImageReferenceResolver = defaultResolver,
): string | undefined {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(undefined);

  const resolve = useCallback(async () => {
    for (const source of sources) {
      try {
        if (source.type === 'url') {
          const loaded = await loadImage(source.url);
          if (loaded) {
            setResolvedUrl(source.url);
            return;
          }
        } else {
          const url = await referenceResolver(source.provider, source.key);
          if (url) {
            const loaded = await loadImage(url);
            if (loaded) {
              setResolvedUrl(url);
              return;
            }
          }
        }
      } catch {
        // Source failed, try the next one
        continue;
      }
    }

    // All sources exhausted
    setResolvedUrl(undefined);
  }, [sources, referenceResolver]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  return resolvedUrl;
}

/**
 * Attempts to load an image URL and returns whether it succeeded.
 */
function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
