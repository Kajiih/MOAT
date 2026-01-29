/**
 * @file api.ts
 * @description Shared client-side API utilities.
 * Currently primarily handles the construction of search URLs for SWR.
 * @module APIUtils
 */

import { BoardCategory, MediaType } from '../types';


/**
 * Generates a normalized URL for search requests.
 * Ensures consistent parameter order and handles defaults for SWR cache hits.
 * @param category - The board category.
 * @param type - The media type.
 * @param params - A record of search parameters/filters.
 * @returns A normalized URL string for the search API endpoint.
 */
export function getSearchUrl(
  category: BoardCategory,
  type: MediaType,
  params: Record<string, unknown>,
): string {
  const urlParams = new URLSearchParams();

  // 1. Mandatory base params
  urlParams.append('category', category);
  urlParams.append('type', type);

  // 2. Add all other params, sorted by key for cache consistency
  Object.keys(params)
    .toSorted()
    .forEach((key) => {
      const value = params[key];
      if (value === null || value === undefined || value === '') return;

      if (Array.isArray(value)) {
        // Values are also sorted for consistency
        [...value].toSorted().forEach((v) => urlParams.append(key, v.toString()));
      } else {
        urlParams.append(key, value.toString());
      }
    });

  return `/api/search?${urlParams.toString()}`;
}

export * from './fetcher';
