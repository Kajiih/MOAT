/**
 * @file search.ts
 * @description Implements the search functionality for the MusicBrainz Service.
 * @module MusicBrainzSearch
 */

import { z } from 'zod';

import { logger } from '@/lib/logger';
import { MusicFilters } from '@/lib/media-types/filters';
import { serverItemCache } from '@/lib/server/item-cache';
import { MediaItem, MediaType, MusicBrainzSearchResponseSchema, SearchResult } from '@/lib/types';
import {
  mapArtistToMediaItem,
  mapRecordingToMediaItem,
  mapReleaseGroupToMediaItem,
} from '@/lib/utils/mappers';

import { SearchOptions } from '../types';
import { mbFetch } from './client';
import { SEARCH_CACHE_TTL, SEARCH_LIMIT } from './config';
import { buildMusicBrainzQuery } from './query-builder';

/**
 * Parameters for the MusicBrainz search.
 */
export interface SearchParams extends Partial<MusicFilters> {
  type: MediaType;
  query: string;
  // Config
  page: number;
  fuzzy?: boolean;
  wildcard?: boolean;
  options: SearchOptions<MusicFilters>;
}

/**
 * Performs a search against the MusicBrainz API.
 * @param params - Search parameters including query and filters.
 * @returns A paginated SearchResult.
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
    artistId: params.selectedArtist || null,
    albumId: params.selectedAlbum || null,
    minYear: params.minYear || null,
    maxYear: params.maxYear || null,
    albumPrimaryTypes: params.albumPrimaryTypes || [],
    albumSecondaryTypes: params.albumSecondaryTypes || [],
    artistType: params.artistType || null,
    artistCountry: params.artistCountry || null,
    tag: params.tag || null,
    minDuration: params.minDuration ? Number.parseInt(params.minDuration, 10) : null,
    maxDuration: params.maxDuration ? Number.parseInt(params.maxDuration, 10) : null,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { next: { revalidate: SEARCH_CACHE_TTL } } as any,
  );

  const parsed = MusicBrainzSearchResponseSchema.safeParse(rawData);

  if (!parsed.success) {
    logger.error({ error: z.prettifyError(parsed.error) }, 'MusicBrainz Validation Failed');
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
    parsed.data.count ||
    parsed.data['release-groups']?.length || // Fallback if count is missing
    parsed.data.artists?.length ||
    parsed.data.recordings?.length ||
    0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    results,
    page,
    totalPages,
    totalCount,
    isServerSorted: false,
  };
}
