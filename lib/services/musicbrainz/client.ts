/**
 * @file client.ts
 * @description HTTP Client for interacting with the MusicBrainz API.
 * Handles headers (User-Agent), error checking, and rate-limit retries.
 * @module MusicBrainzClient
 */

import { MB_BASE_URL, USER_AGENT } from './config';

/**
 * Performs a fetch request to the MusicBrainz API with automatic retry for 503s.
 * 
 * @param endpoint - The API endpoint (e.g., 'artist', 'release-group').
 * @param queryParams - URLSearchParams object or string.
 * @param options - Fetch options (next.revalidate, etc.).
 * @param retryCount - Internal retry counter.
 */
export async function mbFetch<T = unknown>(
  endpoint: string, 
  queryParams: string, 
  options: RequestInit = {}, 
  retryCount = 0
): Promise<T> {
  const url = `${MB_BASE_URL}/${endpoint}/?${queryParams}&fmt=json`;
  
  const headers = {
    'User-Agent': USER_AGENT,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 503 && retryCount < 2) {
    // Wait for 1-2 seconds before retrying (simple exponential-ish backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
    return mbFetch(endpoint, queryParams, options, retryCount + 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`MusicBrainz API Error (${response.status}) for ${url}:`, errorText);
    throw new Error(`MusicBrainz API Error: ${response.status}`);
  }

  return response.json();
}
