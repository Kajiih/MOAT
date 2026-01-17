/**
 * @file search.ts
 * @description Implements the search functionality for the MusicBrainz Service.
 * @module MusicBrainzSearch
 */

import { z } from 'zod';
import { MusicBrainzSearchResponseSchema, MediaItem, MediaType } from '@/lib/types';
import { SearchOptions } from '@/lib/utils/search';
import {
  mapArtistToMediaItem,
  mapRecordingToMediaItem,
  mapReleaseGroupToMediaItem,
} from '@/lib/utils/mappers';
import { serverItemCache } from '@/lib/server/item-cache';
import { mbFetch } from './client';
import { buildMusicBrainzQuery } from './query-builder';
import { SEARCH_LIMIT, SEARCH_CACHE_TTL } from './config';

export interface SearchParams {
  type: MediaType;
  query: string;
  artist: string | null;
  artistId: string | null;
  albumId: string | null;
  minYear: string | null;
  maxYear: string | null;
  albumPrimaryTypes: string[];
  albumSecondaryTypes: string[];
  // New filters
  artistType?: string;
  artistCountry?: string;
  tag?: string;
  minDuration?: number;
  maxDuration?: number;
  // Config
  page: number;
  fuzzy?: boolean;
  wildcard?: boolean;
  options: SearchOptions;
}

export interface SearchResult {
  results: MediaItem[];
  page: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Performs a search against the MusicBrainz API.
 *
 * Orchestration Flow:
 * 1. Delegates query construction to `buildMusicBrainzQuery`.
 * 2. Fetches data using `mbFetch` (with retry logic).
 * 3. Validates response against Zod schema (`MusicBrainzSearchResponseSchema`).
 * 4. Maps raw API results to internal `MediaItem` domain objects.
 * 5. Caches transformed items in `serverItemCache` to speed up future lookups.
 *
 * @param params - Search filters and pagination options.
 * @returns A paginated `SearchResult` containing mapped `MediaItem`s.
 * @throws Error if validation fails or upstream API errors occur.
 */
export async function searchMusicBrainz(params: SearchParams): Promise<SearchResult> {
  const { type, page } = params;

  const limit = SEARCH_LIMIT;
  const offset = (page - 1) * limit;

  // Delegate query construction to helper
  const { endpoint, query: finalQuery } = buildMusicBrainzQuery({
    type,
    query: params.query || '',
    artist: null, // Artist name is handled via artistId
    artistId: params.artistId || null,
    albumId: params.albumId || null,
    minYear: params.minYear || null,
    maxYear: params.maxYear || null,
    albumPrimaryTypes: params.albumPrimaryTypes || [],
    albumSecondaryTypes: params.albumSecondaryTypes || [],
    artistType: params.artistType || null,
    artistCountry: params.artistCountry || null,
    tag: params.tag || null,
    minDuration: params.minDuration || null,
    maxDuration: params.maxDuration || null,
    options: {
      fuzzy: params.fuzzy ?? true,
      wildcard: params.wildcard ?? true,
    },
  });

  if (!finalQuery.trim()) {
    return { results: [], page: 1, totalPages: 0, totalCount: 0 };
  }

  type MBSearchResponse = z.infer<typeof MusicBrainzSearchResponseSchema>;

  // Use the robust mbFetch client
  const rawData = await mbFetch<MBSearchResponse>(
    endpoint,
    `query=${encodeURIComponent(finalQuery)}&limit=${limit}&offset=${offset}`,
    { next: { revalidate: SEARCH_CACHE_TTL } },
  );

  const parsed = MusicBrainzSearchResponseSchema.safeParse(rawData);

  if (!parsed.success) {
    console.error('MusicBrainz Validation Failed:', z.prettifyError(parsed.error));
    throw new Error('Invalid data from upstream');
  }

  let results: MediaItem[] = [];

  if (type === 'album' && parsed.data['release-groups']) {
    results = parsed.data['release-groups'].map((item) => {
      const cached = serverItemCache.get(item.id);
      if (cached) return cached;
      const mapped = mapReleaseGroupToMediaItem(item);
      serverItemCache.set(mapped);
      return mapped;
    });
  } else if (type === 'artist' && parsed.data.artists) {
    results = await Promise.all(
      parsed.data.artists.map(async (item) => {
        const cached = serverItemCache.get(item.id);
        if (cached) return cached;
        const mapped = await mapArtistToMediaItem(item);
        serverItemCache.set(mapped);
        return mapped;
      }),
    );
  } else if (type === 'song' && parsed.data.recordings) {
    results = parsed.data.recordings.map((item) => {
      const cached = serverItemCache.get(item.id);
      if (cached) return cached;
      const mapped = mapRecordingToMediaItem(item);
      serverItemCache.set(mapped);
      return mapped;
    });
  }

  const totalCount =
    rawData.count ||
    rawData['release-group-count'] ||
    rawData['artist-count'] ||
    rawData['recording-count'] ||
    0;
  const totalPages = Math.ceil(totalCount / limit);

  return { results, page, totalPages, totalCount };
}
