/**
 * @file client.ts
 * @description HTTP Client for interacting with the MusicBrainz API.
 * Handles headers (User-Agent), error checking, and rate-limit retries.
 * @module MusicBrainzClient
 */

import { logger } from '@/lib/logger';

import { MB_BASE_URL, USER_AGENT } from './config';

/**
 * Performs a fetch request to the MusicBrainz API with automatic retry for 503 Service Unavailable errors.
 *
 * Implements a simple exponential backoff strategy:
 * - 1st valid 503: waits 1000ms
 * - 2nd valid 503: waits 2000ms
 * - 3rd valid 503: throws Error
 * @template T - The expected return type of the JSON response. Defaults to `unknown`.
 * @param endpoint - The API endpoint (e.g., 'artist', 'release-group').
 * @param queryParams - URLSearchParams object or string.
 * @param options - Fetch options (next.revalidate, etc.).
 * @param retryCount - Internal retry counter (do not set manually).
 * @returns Promise resolving to the JSON response.
 * @throws {Error} if the response is not OK (and not a handled 503) or if retries are exhausted.
 */
export async function mbFetch<T = unknown>(
  endpoint: string,
  queryParams: string,
  options: RequestInit = {},
  retryCount = 0,
): Promise<T> {
  const url = `${MB_BASE_URL}/${endpoint}/?${queryParams}&fmt=json`;

  const headers = {
    'User-Agent': USER_AGENT,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if ((response.status === 503 || response.status === 504) && retryCount < 2) {
    // Wait for 1-2 seconds before retrying (simple exponential-ish backoff)
    await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
    return mbFetch(endpoint, queryParams, options, retryCount + 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`MusicBrainz API Error (${response.status}) for ${url}: ${errorText}`);
    throw new Error(`MusicBrainz API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
