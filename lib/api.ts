import { MediaType } from './types';

export interface SearchParams {
  type: MediaType;
  query?: string;
  artistId?: string;
  minYear?: string;
  maxYear?: string;
  page?: number;
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
  if (params.minYear) urlParams.append('minYear', params.minYear);
  if (params.maxYear) urlParams.append('maxYear', params.maxYear);

  return `/api/search?${urlParams.toString()}`;
}
