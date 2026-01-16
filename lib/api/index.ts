/**
 * @file api.ts
 * @description Shared client-side API utilities.
 * Currently primarily handles the construction of search URLs for SWR.
 * @module APIUtils
 */

import { MediaType } from '../types';

export interface SearchParams {
  type: MediaType;
  query?: string;
  artistId?: string;
  albumId?: string;
  minYear?: string;
  maxYear?: string;
  albumPrimaryTypes?: string[];
  albumSecondaryTypes?: string[];
  // New filters
  artistType?: string;
  artistCountry?: string;
  tag?: string;
  minDuration?: number;
  maxDuration?: number;
  // Pagination & config
  page?: number;
  fuzzy?: boolean;
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

  // 2. Optional params in fixed order
  if (params.query) urlParams.append('query', params.query);
  if (params.artistId) urlParams.append('artistId', params.artistId);
  if (params.albumId) urlParams.append('albumId', params.albumId);
  if (params.minYear) urlParams.append('minYear', params.minYear);
  if (params.maxYear) urlParams.append('maxYear', params.maxYear);
  
  if (params.albumPrimaryTypes && params.albumPrimaryTypes.length > 0) {
      // Sort to ensure cache consistency regardless of selection order
      [...params.albumPrimaryTypes].sort().forEach(t => urlParams.append('albumPrimaryTypes', t));
  }
  
  if (params.albumSecondaryTypes && params.albumSecondaryTypes.length > 0) {
      [...params.albumSecondaryTypes].sort().forEach(t => urlParams.append('albumSecondaryTypes', t));
  }
  
  // 3. New filters
  if (params.artistType) urlParams.append('artistType', params.artistType);
  if (params.artistCountry) urlParams.append('artistCountry', params.artistCountry);
  if (params.tag) urlParams.append('tag', params.tag);
  if (params.minDuration !== undefined) urlParams.append('minDuration', params.minDuration.toString());
  if (params.maxDuration !== undefined) urlParams.append('maxDuration', params.maxDuration.toString());
  
  // 4. Search Config
  if (params.fuzzy !== undefined) urlParams.append('fuzzy', params.fuzzy.toString());
  if (params.wildcard !== undefined) urlParams.append('wildcard', params.wildcard.toString());

  return `/api/search?${urlParams.toString()}`;
}

export * from './fetcher';
