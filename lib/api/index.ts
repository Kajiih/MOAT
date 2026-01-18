/**
 * @file api.ts
 * @description Shared client-side API utilities.
 * Currently primarily handles the construction of search URLs for SWR.
 * @module APIUtils
 */

import { MediaType } from '../types';

/**
 * Parameters for generating a search URL.
 */
export interface SearchParams {
  /** The media type to search for (album, artist, song). */
  type: MediaType;
  /** The text query. */
  query?: string;
  /** Optional artist MusicBrainz ID to scope search. */
  artistId?: string;
  /** Optional album (release-group) MusicBrainz ID to scope search. */
  albumId?: string;
  /** Minimum release or birth year. */
  minYear?: string;
  /** Maximum release or birth year. */
  maxYear?: string;
  /** Array of primary album types (Album, Single, EP). */
  albumPrimaryTypes?: string[];
  /** Array of secondary album types (Live, Compilation). */
  albumSecondaryTypes?: string[];
  /** The type of artist (Person, Group). */
  artistType?: string;
  /** The 2-letter country code for an artist. */
  artistCountry?: string;
  /** A specific tag or genre to filter by. */
  tag?: string;
  /** Minimum duration in seconds (for songs). */
  minDuration?: number;
  /** Maximum duration in seconds (for songs). */
  maxDuration?: number;
  /** Result page number (1-based). */
  page?: number;
  /** Whether to use fuzzy typo matching. */
  fuzzy?: boolean;
  /** Whether to use wildcard partial matching. */
  wildcard?: boolean;
}

/**
 * Generates a normalized URL for search requests.
 * Ensures consistent parameter order and handles defaults for SWR cache hits.
 */
export function getSearchUrl(params: SearchParams): string {
  const urlParams = new URLSearchParams();

  // 1. Essential params in fixed order
  urlParams.append('type', params.type);
  urlParams.append('page', (params.page || 1).toString());

  // 2. Simple Optional params
  const simpleParams: (keyof SearchParams)[] = [
    'query',
    'artistId',
    'albumId',
    'minYear',
    'maxYear',
    'artistType',
    'artistCountry',
    'tag',
  ];

  for (const key of simpleParams) {
    if (params[key]) {
      urlParams.append(key, params[key] as string);
    }
  }

  // 3. Array params (Sorted for cache consistency)
  if (params.albumPrimaryTypes && params.albumPrimaryTypes.length > 0) {
    [...params.albumPrimaryTypes].sort().forEach((t) => urlParams.append('albumPrimaryTypes', t));
  }

  if (params.albumSecondaryTypes && params.albumSecondaryTypes.length > 0) {
    [...params.albumSecondaryTypes]
      .sort()
      .forEach((t) => urlParams.append('albumSecondaryTypes', t));
  }

  // 4. Numeric/Boolean params
  if (params.minDuration !== undefined)
    urlParams.append('minDuration', params.minDuration.toString());
  if (params.maxDuration !== undefined)
    urlParams.append('maxDuration', params.maxDuration.toString());
  if (params.fuzzy !== undefined) urlParams.append('fuzzy', params.fuzzy.toString());
  if (params.wildcard !== undefined) urlParams.append('wildcard', params.wildcard.toString());

  return `/api/search?${urlParams.toString()}`;
}

export * from './fetcher';
