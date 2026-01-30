/**
 * @file client.ts
 * @description HTTP Client for interacting with the MusicBrainz API.
 * Handles headers (User-Agent), error checking, and rate-limit retries.
 * @module MusicBrainzClient
 */

import { secureFetch } from '../shared/api-client';
import { MB_BASE_URL, USER_AGENT } from './config';

/**
 * Performs a fetch request to the MusicBrainz API using the shared secureFetch client.
 *
 * @template T - The expected return type of the JSON response.
 * @param endpoint - The API endpoint (e.g., 'artist', 'release-group').
 * @param queryParams - URLSearchParams object or string.
 * @param options - Fetch options (next.revalidate, etc.).
 * @returns Promise resolving to the JSON response.
 */
export async function mbFetch<T = unknown>(
  endpoint: string,
  queryParams: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${MB_BASE_URL}/${endpoint}/?${queryParams}&fmt=json`;

  const headers = {
    'User-Agent': USER_AGENT,
    ...options.headers,
  };

  return secureFetch<T>(url, { ...options, headers });
}
