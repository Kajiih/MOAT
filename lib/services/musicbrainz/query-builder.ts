/**
 * @file query-builder.ts
 * @description Helper logic for constructing complex MusicBrainz API queries.
 * Maps internal search parameters (year, duration, tags) to the specific
 * Lucene field syntax required by each MusicBrainz entity type (Artist, Release Group, Recording).
 * @module MusicBrainzQueryBuilder
 */

import { MediaType, SECONDARY_TYPES } from '@/lib/types';
import { constructLuceneQuery, escapeLucene, SearchOptions } from '@/lib/utils/search';

/**
 * Input parameters for the MusicBrainz query builder.
 */
export interface QueryBuilderParams {
  /** The type of media entity being queried. */
  type: MediaType;
  /** The primary search query (e.g., entity name). */
  query: string;
  /** Optional literal artist name for filtering. */
  artist: string | null;
  /** Optional MusicBrainz ID for the artist to scope results. */
  artistId: string | null;
  /** Optional MusicBrainz ID for the album to scope results. */
  albumId: string | null;
  /** Minimum release or birth year. */
  minYear: string | null;
  /** Maximum release or birth year. */
  maxYear: string | null;
  /** Array of primary album types (Album, Single). */
  albumPrimaryTypes: string[];
  /** Array of secondary album types (Live, Compilation). */
  albumSecondaryTypes: string[];
  /** The specific type of artist (Person, Group). */
  artistType: string | null;
  /** 2-letter country code for filtering artists. */
  artistCountry: string | null;
  /** Specific tag or genre filter. */
  tag: string | null;
  /** Minimum duration in milliseconds (for songs). */
  minDuration: number | null;
  /** Maximum duration in milliseconds (for songs). */
  maxDuration: number | null;
  /** Global search configuration (fuzzy, wildcard). */
  options: SearchOptions;
}

const DATE_FIELD_MAP: Record<MediaType, string> = {
  artist: 'begin',
  album: 'firstreleasedate',
  song: 'firstreleasedate',
};

const LUCENE_FIELD_MAP: Record<MediaType, string> = {
  artist: 'artist',
  album: 'releasegroup',
  song: 'recording',
};

const ENDPOINT_MAP: Record<MediaType, string> = {
  artist: 'artist',
  album: 'release-group',
  song: 'recording',
};

interface BuiltQuery {
  endpoint: string;
  query: string;
}

function buildArtistSpecificFilters(params: QueryBuilderParams): string[] {
  const parts: string[] = [];
  const { artistType, artistCountry } = params;
  if (artistType) {
    parts.push(`type:"${artistType.toLowerCase()}"`);
  }
  if (artistCountry) {
    parts.push(`country:"${escapeLucene(artistCountry)}"`);
  }
  return parts;
}

function buildAlbumSpecificFilters(params: QueryBuilderParams): string[] {
  const parts: string[] = [];
  const { albumPrimaryTypes, albumSecondaryTypes } = params;

  if (albumPrimaryTypes.length > 0) {
    const typeQuery = albumPrimaryTypes.map((t) => `"${t}"`).join(' OR ');
    parts.push(`primarytype:(${typeQuery})`);
  }

  if (albumSecondaryTypes.length > 0) {
    const typeQuery = albumSecondaryTypes.map((t) => `"${t}"`).join(' OR ');
    parts.push(`secondarytype:(${typeQuery})`);
  } else {
    const forbiddenQuery = SECONDARY_TYPES.map((t) => `"${t}"`).join(' OR ');
    parts.push(`NOT secondarytype:(${forbiddenQuery})`);
  }
  return parts;
}

function buildSongSpecificFilters(params: QueryBuilderParams): string[] {
  const parts: string[] = [];
  const { albumId, minDuration, maxDuration } = params;
  if (albumId) {
    parts.push(`rgid:${albumId}`);
  }
  if (minDuration !== null || maxDuration !== null) {
    const start = minDuration !== null ? minDuration : '*';
    const end = maxDuration !== null ? maxDuration : '*';
    parts.push(`dur:[${start} TO ${end}]`);
  }
  return parts;
}

function buildCommonFilters(params: QueryBuilderParams, dateField: string): string[] {
  const parts: string[] = [];
  const {
    type,
    artist,
    artistId,
    tag,
    minYear,
    maxYear,
  } = params;

  // Artist grouping for music entities
  if (type !== 'artist') {
    if (artistId) {
      parts.push(`arid:${artistId}`);
    } else if (artist) {
      parts.push(`artist:"${artist}"`);
    }
  }

  // Tag filter
  if (tag) {
    parts.push(`tag:"${escapeLucene(tag)}"`);
  }

  // Year/Date filter
  if (minYear || maxYear) {
    const start = minYear || '*';
    const end = maxYear || '*';
    parts.push(`${dateField}:[${start} TO ${end}]`);
  }

  return parts;
}

/**
 * Constructs the final MusicBrainz API endpoint and Lucene query string based on search parameters.
 *
 * Combines multiple filter conditions into a single Lucene query string using AND/OR logic.
 * Handles entity-specific fields (e.g., `arid` for artists, `rgid` for albums) and generic filters
 * like year ranges and tags.
 * @param params - The complex search parameters object.
 * @returns An object containing the target `endpoint` and the constructed `query` string.
 */
export function buildMusicBrainzQuery(params: QueryBuilderParams): BuiltQuery {
  const {
    type,
    query,
    options,
  } = params;

  const endpoint = ENDPOINT_MAP[type];
  const dateField = DATE_FIELD_MAP[type];
  const luceneField = LUCENE_FIELD_MAP[type];

  const queryParts: string[] = [];

  if (query) {
    queryParts.push(constructLuceneQuery(luceneField, query, options));
  }

  queryParts.push(...buildCommonFilters(params, dateField));

  switch (type) {
    case 'artist':
      queryParts.push(...buildArtistSpecificFilters(params));
      break;
    case 'album':
      queryParts.push(...buildAlbumSpecificFilters(params));
      break;
    case 'song':
      queryParts.push(...buildSongSpecificFilters(params));
      break;
  }

  if (queryParts.length === 0 && query) {
    // Fallback if type logic didn't catch it
    queryParts.push(escapeLucene(query));
  }

  // Remove empty parts just in case
  const joinedQuery = queryParts.filter(Boolean).join(' AND ');
  const finalQuery = joinedQuery;

  return { endpoint, query: finalQuery };
}