/**
 * @file MusicBrainz Provider Implementation
 * @description Provides support for Music (Albums and Artists) via the MusicBrainz API.
 *
 * Useful links:
 *   - https://musicbrainz.org/doc/Indexed_Search_Syntax
 *   - https://musicbrainz.org/doc/Search_Server
 *   - https://musicbrainz.org/doc/MusicBrainz_API/Search
 *   - https://musicbrainz.org/doc/Development/Search_Architecture
 *   - https://lucene.apache.org/core/7_7_2/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package.description
 */

import { Disc3, Mic2, Music } from 'lucide-react';
import { z } from 'zod';

import { toCompositeId } from '@/domain/items/identity';
import { referenceImage, urlImage } from '@/domain/items/images';
import {
  Item,
  ItemDetails,
  ItemDetailsSchema,
  ItemSchema,
  ItemSection,
  Subtitle,
  SubtitleToken,
} from '@/domain/items/items';
import { ProviderStatus } from '@/domain/providers/types';
import { Entity, Fetcher, nonEmpty, Provider } from '@/domain/providers/types';
import { createFilterSuite, FilterDefinition, mapTo } from '@/features/search/filter-schemas';
import { SearchParams, SearchResult, SearchResultSchema } from '@/features/search/search-schemas';
import { createSortSuite, SortDirection } from '@/features/search/sort-schemas';
import { logger } from '@/infra/logger';
import { secureFetch } from '@/infra/providers/api-client';
import { RateLimiter } from '@/infra/providers/rate-limiter';
import { applyFilters, handleProviderError } from '@/infra/providers/utils';

export const ALBUM_FILTER_DEFAULTS = {
  primaryType: 'album',
  status: 'official',
  excludedSecondaryTypes: [
    'Compilation',
    'Live',
    'Soundtrack',
    'Spokenword',
    'Interview',
    'Audiobook',
    'Demo',
    'DJ-mix',
    'Mixtape/Street',
  ],
};

const SECONDARY_TYPES = ALBUM_FILTER_DEFAULTS.excludedSecondaryTypes;

/**
 * Predicate to determine if a release group is a Studio Album.
 * Aligns with default search exclusions.
 * @param rg - The release group to test.
 * @returns True if it qualifies as a Studio Album.
 */
export const isStudioAlbum = (rg: MusicBrainzReleaseGroup): boolean => {
  const isAlbum = rg['primary-type']?.toLowerCase() === ALBUM_FILTER_DEFAULTS.primaryType;
  const secondaryTypes = rg['secondary-types'] || [];
  const excludedLower = new Set(
    ALBUM_FILTER_DEFAULTS.excludedSecondaryTypes.map((t) => t.toLowerCase()),
  );
  const isOk = !secondaryTypes.some((t) => excludedLower.has(t.toLowerCase()));

  // If releases data is loaded, ensure at least one is "Official" index equivalence
  if (rg.releases && rg.releases.length > 0) {
    const hasOfficial = rg.releases.some(
      (r) => r.status?.toLowerCase() === ALBUM_FILTER_DEFAULTS.status,
    );
    return isAlbum && isOk && hasOfficial;
  }

  return isAlbum && isOk;
};

const musicBrainzArtistFilters = createFilterSuite<MusicBrainzArtist, ArtistLuceneQuery>();

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_USER_AGENT = 'MOAT/1.0.0 ( itskajih@gmail.com )';

/**
 * Helper to add a Lucene range to parts array
 * @param parts - Array of query string parts to mutate
 * @param field - Lucene field name
 * @param range - Object containing min and max string values
 * @param range.min - Minimum value
 * @param range.max - Maximum value
 */
const addLuceneRange = (parts: string[], field: string, range?: { min?: string; max?: string }) => {
  if (range && (range.min || range.max)) {
    const min = range.min || (field === 'dur' ? '0' : '0001');
    const max = range.max || (field === 'dur' ? '999999999' : '9999');
    parts.push(`${field}:[${min} TO ${max}]`);
  }
};

/**
 * Format milliseconds into M:SS string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export const formatDuration = (ms: number): string => {
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/** Album search query model */
export type AlbumLuceneQuery = {
  term?: string;
  artist?: string;
  artistId?: string;
  primarytype?: string | string[];
  secondarytype?: string | string[];
  status?: string;
  firstreleasedate_min?: string;
  firstreleasedate_max?: string;
  tag?: string;
};

/**
 * Escape a string for Lucene query parser to perform literal searches.
 * Escapes all Lucene special characters: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
 * @param str - The string to escape
 * @returns The escaped string
 */
const escapeLucene = (str: string) =>
  str.replaceAll(/(["\\/;:!^()[\]{}~*?+\-&|])/g, String.raw`\$1`);

/**
 * Wraps a term in double quotes only if it contains a space.
 * @param str - The string to format
 * @param options - Configuration options
 * @param options.fuzzy - Whether to allow fuzzy matching
 * @returns The formatted string
 */
const formatLuceneTerm = (str: string, options: { fuzzy?: boolean } = {}) => {
  const trimmed = str.trim();
  if (!trimmed) return '';

  // Tokenize by spaces to support multi-word queries
  const parts = trimmed.split(/\s+/);
  const escapedParts = parts.map((p) => {
    const escaped = escapeLucene(p);
    // Only apply hybrid expansion if requested AND it doesn't already have wildcards/fuzzy
    if (options.fuzzy && !escaped.endsWith('*') && !escaped.endsWith('~')) {
      return `(${escaped}*) OR (${escaped}~)`;
    }
    return escaped;
  });

  // If not fuzzy, we still quote multi-word terms for phrase matching standardly
  if (!options.fuzzy && parts.length > 1) {
    const fullyEscaped = escapeLucene(trimmed);
    return `"${fullyEscaped}"`;
  }

  // Join multiple words with AND for fuzzy/prefix match tolerance
  if (escapedParts.length > 1) {
    return escapedParts.join(' AND ');
  }
  return escapedParts[0];
};

/**
 * Helper to build a Lucene type clause with exclusions
 * @param field - The lucene field name
 * @param values - A single value or array of values
 * @param defaultExclusions - Optional fallback NOT clauses
 * @returns A formatted clause or null
 */
function buildTypeClause(
  field: string,
  values: string | string[] | undefined,
  defaultExclusions?: readonly string[],
): string | null {
  if (values === 'any') {
    return null;
  }

  if (values === 'none' || !values) {
    if (defaultExclusions) {
      const types = defaultExclusions.map((t) => formatLuceneTerm(t)).join(' OR ');
      return `NOT ${field}:(${types})`;
    }
    return null;
  }

  if (typeof values === 'string' && values.trim()) {
    return `${field}:${formatLuceneTerm(values)}`;
  }

  if (Array.isArray(values)) {
    if (values.length > 0) {
      const types = values.map((t) => formatLuceneTerm(t)).join(' OR ');
      return `${field}:(${types})`;
    }
    if (defaultExclusions) {
      const types = defaultExclusions.map((t) => formatLuceneTerm(t)).join(' OR ');
      return `NOT ${field}:(${types})`;
    }
    return null;
  }

  return null;
}

/**
 * Build an album-specific lucene string
 * @param query - The album search query model
 * @returns The compiled Lucene query string
 */
export function buildAlbumLuceneQuery(query: AlbumLuceneQuery): string {
  const parts: string[] = [];

  if (query.term?.trim()) {
    parts.push(`release:${formatLuceneTerm(query.term, { fuzzy: true })}`);
  }

  if (query.artistId?.trim()) {
    parts.push(`arid:${query.artistId.trim()}`);
  } else if (query.artist?.trim()) {
    parts.push(`artist:${formatLuceneTerm(query.artist, { fuzzy: true })}`);
  }

  const primaryClause = buildTypeClause('primarytype', query.primarytype);
  if (primaryClause) parts.push(primaryClause);

  const secondaryClause = buildTypeClause('secondarytype', query.secondarytype, SECONDARY_TYPES);
  if (secondaryClause) parts.push(secondaryClause);

  if (query.status?.trim()) parts.push(`status:${formatLuceneTerm(query.status)}`);
  if (query.tag?.trim()) parts.push(`tag:${formatLuceneTerm(query.tag)}`);

  addLuceneRange(parts, 'firstreleasedate', {
    min: query.firstreleasedate_min,
    max: query.firstreleasedate_max,
  });

  // If no positive filter or term is present except exclusions, we should ensure the query doesn't become a broad NOT-only search
  if (parts.length === 0 || (parts.length === 1 && parts[0].startsWith('NOT '))) {
    return '*:*';
  }

  return parts.join(' AND ');
}

/** Artist search query model */
export type ArtistLuceneQuery = {
  term?: string;
  country?: string;
  type?: string;
  begin_min?: string;
  begin_max?: string;
  tag?: string;
};

/**
 * Build an artist-specific lucene string
 * @param query - The artist search query model
 * @returns The compiled Lucene query string
 */
export function buildArtistLuceneQuery(query: ArtistLuceneQuery): string {
  const parts: string[] = [];

  if (query.term?.trim()) parts.push(`${formatLuceneTerm(query.term, { fuzzy: true })}`);
  if (query.country?.trim()) parts.push(`country:${formatLuceneTerm(query.country)}`);
  if (query.type?.trim()) parts.push(`type:${formatLuceneTerm(query.type)}`);
  if (query.tag?.trim()) parts.push(`tag:${formatLuceneTerm(query.tag)}`);

  addLuceneRange(parts, 'begin', { min: query.begin_min, max: query.begin_max });

  // If no positive filter or term is present except exclusions, we should ensure the query doesn't become a broad NOT-only search
  if (parts.length === 0 || (parts.length === 1 && parts[0].startsWith('NOT '))) {
    return '*:*';
  }

  return parts.join(' AND ');
}

/** Recording search query model */
export type RecordingLuceneQuery = {
  term?: string;
  artist?: string;
  release?: string;
  video?: boolean;
  artistId?: string;
  releaseGroupId?: string;
  duration_min?: string;
  duration_max?: string;
  tag?: string;
};

/**
 * Build a recording-specific lucene string
 * @param query - The recording search query model
 * @returns The compiled Lucene query string
 */
export function buildRecordingLuceneQuery(query: RecordingLuceneQuery): string {
  const parts: string[] = [];

  if (query.term?.trim()) parts.push(`${formatLuceneTerm(query.term, { fuzzy: true })}`);
  if (query.artistId?.trim()) parts.push(`arid:${query.artistId.trim()}`);
  else if (query.artist?.trim())
    parts.push(`artist:${formatLuceneTerm(query.artist, { fuzzy: true })}`);
  if (query.releaseGroupId?.trim()) parts.push(`rgid:\"${query.releaseGroupId.trim()}\"`);
  if (query.release?.trim())
    parts.push(`release:${formatLuceneTerm(query.release, { fuzzy: true })}`);
  if (query.video !== undefined) parts.push(`video:${query.video}`);
  if (query.tag?.trim()) parts.push(`tag:${formatLuceneTerm(query.tag)}`);

  addLuceneRange(parts, 'dur', { min: query.duration_min, max: query.duration_max });

  // If no positive filter or term is present except exclusions, we should ensure the query doesn't become a broad NOT-only search
  if (parts.length === 0 || (parts.length === 1 && parts[0].startsWith('NOT '))) {
    return '*:*';
  }

  return parts.join(' AND ');
}

/**
 * MusicBrainz API Types
 */
const MusicBrainzTagSchema = z.object({
  name: z.string(),
  count: z.number().nullish(),
});

const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
  artist: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullish(),
});

const MusicBrainzUrlRelationSchema = z.object({
  type: z.string().nullish(),
  url: z
    .object({
      id: z.string(),
      resource: z.string(),
    })
    .nullish(),
});

const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'primary-type': z.string().nullish(),
  'secondary-types': z.array(z.string()).nullish(),
  'first-release-date': z.string().nullish(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).nullish(),
  releases: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().nullish(),
        status: z.string().nullish(),
        country: z.string().nullish(),
        date: z.string().nullish(),
      }),
    )
    .nullish(),
  tags: z.array(MusicBrainzTagSchema).nullish(),
  relations: z.array(MusicBrainzUrlRelationSchema).nullish(),
});
type MusicBrainzReleaseGroup = z.infer<typeof MusicBrainzReleaseGroupSchema>;

const MusicBrainzArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullish(),
  country: z.string().nullish(),
  'life-span': z
    .object({
      begin: z.string().nullish(),
      end: z.string().nullish(),
      ended: z.boolean().nullish(),
    })
    .nullish(),
  'begin-area': z
    .object({
      name: z.string(),
    })
    .nullish(),
  area: z
    .object({
      name: z.string(),
    })
    .nullish(),
  tags: z.array(MusicBrainzTagSchema).nullish(),
  relations: z.array(MusicBrainzUrlRelationSchema).nullish(),
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).nullish(),
});
type MusicBrainzArtist = z.infer<typeof MusicBrainzArtistSchema>;

const MusicBrainzTrackSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  length: z.number().nullish(),
  position: z.number().nullish(),
  recording: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .nullish(),
});

const MusicBrainzReleaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().nullish(),
  date: z.string().nullish(),
  country: z.string().nullish(),
  media: z
    .array(
      z.object({
        format: z.string().nullish(),
        'track-count': z.number().nullish(),
        tracks: z.array(MusicBrainzTrackSchema).nullish(),
      }),
    )
    .nullish(),
});
type MusicBrainzRelease = z.infer<typeof MusicBrainzReleaseSchema>;

const MusicBrainzRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  length: z.number().nullish(),
  video: z.boolean().nullish(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).nullish(),
  releases: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        'release-group': z
          .object({
            id: z.string(),
            title: z.string(),
          })
          .nullish(),
      }),
    )
    .nullish(),
  tags: z.array(MusicBrainzTagSchema).nullish(),
});
type MusicBrainzRecording = z.infer<typeof MusicBrainzRecordingSchema>;

/**
 * Extracts standard external URLs (Wikipedia, Wikidata, Homepage) from MusicBrainz relation items.
 * @param relations - Array of UrlRelation nodes from API payload
 * @returns Array of typed URL objects
 */
export const extractUrlsFromRelations = (
  relations?: z.infer<typeof MusicBrainzUrlRelationSchema>[] | null,
): { type: string; url: string }[] => {
  const urls: { type: string; url: string }[] = [];
  if (!relations) return urls;

  for (const rel of relations) {
    if (rel.url?.resource) {
      switch (rel.type) {
        case 'official homepage': {
          urls.push({ type: 'homepage', url: rel.url.resource });

          break;
        }
        case 'wikipedia': {
          urls.push({ type: 'wikipedia', url: rel.url.resource });

          break;
        }
        case 'wikidata': {
          urls.push({ type: 'wikidata', url: rel.url.resource });

          break;
        }
        // No default
      }
    }
  }
  return urls;
};

/**
 * Extracts and trims tag lists up to a specified limit.
 * @param tags - Array of tag objects from API
 * @param limit - Maximum number of tags to return
 * @returns Array of tag strings
 */
export const extractTags = (
  tags?: z.infer<typeof MusicBrainzTagSchema>[] | null,
  limit = 10,
): string[] => {
  if (!tags) return [];
  return tags.map((t) => t.name).slice(0, limit);
};

// --- Shared Pagination Utilities ---
const getMusicBrainzInitialParams = (
  config: { limit: number },
  defaultSortId?: string,
  defaultDirection?: SortDirection,
  defaultFilters: Record<string, string | string[]> = {},
): SearchParams => ({
  query: '',
  filters: defaultFilters,
  sort: defaultSortId,
  sortDirection: defaultDirection,
  limit: config.limit,
  page: 1,
});

const getMusicBrainzNextParams = (
  params: SearchParams,
  result: SearchResult,
): SearchParams | null => {
  if (!result.pagination.hasNextPage) return null;
  return { ...params, page: (params.page || 1) + 1 };
};

const getMusicBrainzPreviousParams = (params: SearchParams): SearchParams | null => {
  const currentPage = params.page || 1;
  if (currentPage <= 1) return null;
  return { ...params, page: currentPage - 1 };
};

interface MBListResponse {
  count: number;
  offset: number;
}
interface MusicBrainzReleaseGroupListResponse extends MBListResponse {
  'release-groups': MusicBrainzReleaseGroup[];
}
interface MusicBrainzArtistListResponse extends MBListResponse {
  artists: MusicBrainzArtist[];
}
interface MusicBrainzRecordingListResponse extends MBListResponse {
  recordings: MusicBrainzRecording[];
}

const mbAlbumSorts = createSortSuite<MusicBrainzReleaseGroup>();
const mbAlbumFilters = createFilterSuite<MusicBrainzReleaseGroup, AlbumLuceneQuery>();

// --- Helpers for MusicBrainzAlbumEntity ---

function extractTracklistFromRelease(
  release: MusicBrainzRelease,
  providerId: string,
): SubtitleToken[] {
  const tracks: SubtitleToken[] = [];
  if (!release.media) return tracks;

  release.media.forEach((medium) => {
    if (!medium.tracks) return;

    medium.tracks.forEach((track) => {
      const duration = track.length ? formatDuration(track.length) : '';
      const durationStr = duration ? ` (${duration})` : '';
      tracks.push({
        label: 'Song',
        name: `${track.number}. ${track.title}${durationStr}`,
        identity: {
          providerItemId: track.recording?.id || track.id,
          providerId,
          entityId: 'song',
        },
      });
    });
  });
  return tracks;
}

async function fetchTracklistForRelease(
  provider: MusicBrainzProvider,
  releaseId: string,
  signal?: AbortSignal,
): Promise<{ tracks: SubtitleToken[]; date?: string; country?: string }> {
  try {
    const releaseData = await provider.fetchMusicBrainz<unknown>(
      `/release/${releaseId}`,
      { inc: 'recordings' },
      { signal },
    );
    const release = MusicBrainzReleaseSchema.parse(releaseData);
    const tracks = extractTracklistFromRelease(release, provider.id);
    return {
      tracks,
      date: release.date || undefined,
      country: release.country || undefined,
    };
  } catch (error) {
    logger.warn(`[MusicBrainz] Failed to fetch tracklist for release ${releaseId}: ${error}`);
    return { tracks: [] };
  }
}

// --- Helpers for MusicBrainzArtistEntity ---

function buildArtistAlbumsSection(
  releaseGroups: MusicBrainzReleaseGroup[],
  providerId: string,
): ItemSection | null {
  if (!releaseGroups?.length) return null;

  const topReleases = [...releaseGroups]
    .filter((rg) => isStudioAlbum(rg))
    .toSorted((a, b) => {
      const dateA = a['first-release-date'] || '9999';
      const dateB = b['first-release-date'] || '9999';
      return dateA.localeCompare(dateB);
    });

  if (topReleases.length === 0) return null;

  return {
    title: 'Albums',
    type: 'list',
    content: topReleases.map((rg) => {
      const year = rg['first-release-date'] ? ` (${rg['first-release-date'].split('-')[0]})` : '';
      return {
        label: 'Album',
        name: `${rg.title}${year}`,
        identity: {
          providerItemId: rg.id,
          providerId,
          entityId: 'album',
        },
      };
    }),
  };
}

// --- Helpers for MusicBrainz Album details ---
function isArtistNotInSubtitle(artistId: string, subtitle?: Subtitle): boolean {
  if (!Array.isArray(subtitle)) return true;
  return !subtitle.some((l) => typeof l !== 'string' && l.identity.providerItemId === artistId);
}

async function processReleasesForAlbum(
  provider: MusicBrainzProvider,
  releases: NonNullable<z.infer<typeof MusicBrainzReleaseGroupSchema>['releases']>,
  signal?: AbortSignal,
): Promise<{ sections: ItemSection[]; extendedData: Record<string, unknown> }> {
  const sections: ItemSection[] = [];
  const extendedData: Record<string, unknown> = {};

  const officialReleases = releases.filter((r) => r.status?.toLowerCase() === 'official');
  const bestRelease = officialReleases.find((r) => r.date) || officialReleases[0] || releases[0];

  if (bestRelease?.id) {
    const { tracks, date, country } = await fetchTracklistForRelease(
      provider,
      bestRelease.id,
      signal,
    );
    if (tracks.length > 0) {
      sections.push({
        title: 'Tracklist',
        type: 'list',
        content: tracks,
      });
    }
    if (date) extendedData['Release Date'] = date;
    if (country) extendedData['Country'] = country;
  }
  return { sections, extendedData };
}

// --- Album Entity ---
// IDs for integration tests (e.g., Thriller, Abbey Road)
const ALBUM_THRILLER_ID = 'f32fab67-77dd-3937-addc-9062e28e4c37'; // Thriller
const ALBUM_ABBEY_ROAD_ID = '9162580e-5df4-32de-80cc-f45a8d8a9b1d'; // Abbey Road

export class MusicBrainzAlbumEntity implements Entity<MusicBrainzReleaseGroup> {
  public readonly id = 'album';
  public readonly branding = {
    label: 'Album',
    labelPlural: 'Albums',
    icon: Disc3,
    colorClass: 'text-rose-500',
  };
  public readonly capabilities = { supportsEmptyQueryBrowsing: false };
  public readonly searchOptions: FilterDefinition<MusicBrainzReleaseGroup>[] = [];
  public readonly filters: FilterDefinition<MusicBrainzReleaseGroup>[] = [];
  public readonly sortOptions = [mbAlbumSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Thriller', 'Abbey Road');
  public readonly emptyTestQuery = 'musicbrainz_unlikely_albums_zxyv';
  public readonly testDetailsIds = nonEmpty(ALBUM_THRILLER_ID, ALBUM_ABBEY_ROAD_ID);
  public readonly edgeShortQuery = 'zzzzzzzzzzz';

  public constructor(private provider: MusicBrainzProvider) {
    this.filters = [
      mbAlbumFilters.asyncSelect({
        id: 'artistId',
        label: 'Artist',
        transform: mapTo('artistId'),
        targetEntityId: 'artist',
        testCases: [
          {
            value: ARTIST_RADIOHEAD_ID,
            query: 'OK Computer',
            expectAll: (album: MusicBrainzReleaseGroup) => {
              for (const credit of album['artist-credit'] ?? []) {
                if (credit.artist?.id === ARTIST_RADIOHEAD_ID) return true;
              }
              return false;
            },
            expectAllMessage: 'be by Radiohead',
          },
        ],
      }),
      mbAlbumFilters.select({
        id: 'primarytype',
        label: 'Release Type',
        defaultValue: ALBUM_FILTER_DEFAULTS.primaryType,
        transform: mapTo('primarytype'),
        options: [
          { label: 'Album', value: 'album' },
          { label: 'Single', value: 'single' },
          { label: 'EP', value: 'ep' },
          { label: 'Broadcast', value: 'broadcast' },
          { label: 'Other', value: 'other' },
        ],
        testCases: [
          {
            value: 'ep',
            expectAll: (album: MusicBrainzReleaseGroup) => {
              const matchesPrimary = album['primary-type']?.toLowerCase() === 'ep';
              if (matchesPrimary) return true;

              for (const type of album['secondary-types'] ?? []) {
                if (type.toLowerCase() === 'ep') return true;
              }
              return false;
            },
            expectAllMessage: 'have primary or secondary type "EP"',
          },
        ],
      }),
      mbAlbumFilters.select({
        id: 'secondarytype',
        label: 'Secondary Types',
        emptyLabel: 'None',
        transform: mapTo('secondarytype'),
        options: [
          { label: 'Any', value: 'any' },
          ...SECONDARY_TYPES.map((t) => ({ label: t, value: t.toLowerCase() })),
        ],
        testCases: [
          {
            value: 'live',
            expectAll: (album: MusicBrainzReleaseGroup) => {
              for (const type of album['secondary-types'] ?? []) {
                if (type.toLowerCase() === 'live') return true;
              }
              return false;
            },
            expectAllMessage: 'have secondary type "live"',
          },
        ],
      }),
      mbAlbumFilters.select({
        id: 'status',
        label: 'Status',
        defaultValue: ALBUM_FILTER_DEFAULTS.status,
        transform: mapTo('status'),
        options: [
          { label: 'Official', value: 'official' },
          { label: 'Promotion', value: 'promotion' },
          { label: 'Bootleg', value: 'bootleg' },
          { label: 'Pseudo-Release', value: 'pseudo-release' },
        ],
        testCases: [
          {
            value: 'promotion',
            expectAll: (album: MusicBrainzReleaseGroup) => {
              const releases = album.releases;
              if (!releases) return true;

              for (const release of releases) {
                if (release.status?.toLowerCase() === 'promotion') return true;
              }
              return false;
            },
            expectAllMessage: 'have promotion status in one of their releases',
          },
        ],
      }),
      mbAlbumFilters.range({
        id: 'firstreleasedate',
        label: 'Release Year Range',
        transform: (val) => {
          return {
            ...(val.min && { firstreleasedate_min: val.min }),
            ...(val.max && { firstreleasedate_max: val.max }),
          };
        },
        minPlaceholder: 'From YYYY',
        maxPlaceholder: 'To YYYY',
        testCases: [
          {
            value: { min: '1980', max: '1989' },
            skipQueryDifferenceTest: true,
            expectAll: (album: MusicBrainzReleaseGroup) => {
              if (!album['first-release-date']) return false;
              const year = Number.parseInt(album['first-release-date'].split('-')[0], 10);
              return year >= 1980 && year <= 1989;
            },
            expectAllMessage: 'be released in the 1980s',
          },
        ],
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams =>
    getMusicBrainzInitialParams(
      config,
      this.sortOptions[0]?.id,
      this.sortOptions[0]?.defaultDirection,
    );

  public readonly search = async (
    params: SearchParams,
  ): Promise<SearchResult<MusicBrainzReleaseGroup>> => {
    return this.provider.searchAlbums(params, this.filters);
  };

  public readonly getNextParams = getMusicBrainzNextParams;
  public readonly getPreviousParams = getMusicBrainzPreviousParams;

  public readonly testImageResolution = nonEmpty({
    key: '2c55f39d-9cb3-401c-b218-2fc600d26ec5',
    description: 'Resolves primary album art successfully via CoverArtArchive',
    expectUrlContains: 'ca.archive.org/',
  });

  public readonly resolveImage = async (
    key: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string | null> => {
    try {
      const caaRes = await fetch(`https://coverartarchive.org/release-group/${key}/front-500`, {
        method: 'HEAD',
        signal,
      });
      if (caaRes.ok) return caaRes.url;
    } catch {
      // Ignore
    }
    return null;
  };

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMusicBrainz<unknown>(
        `/release-group/${providerItemId}`,
        { inc: 'artist-credits+tags+url-rels+releases' },
        { signal },
      );
      const album = MusicBrainzReleaseGroupSchema.parse(rawData);

      const item = mapAlbumToItem(album, this.provider.id);
      const tags = extractTags(album.tags);

      // Extract official homepage, wikipedia, etc if available over the URL-rels
      const urls: { type: string; url: string }[] = [
        { type: 'musicbrainz', url: `https://musicbrainz.org/release-group/${album.id}` },
        ...extractUrlsFromRelations(album.relations),
      ];

      const relatedEntities =
        album['artist-credit']
          ?.filter((c) => c.artist?.id && isArtistNotInSubtitle(c.artist.id, item.subtitle))
          .map((c) => ({
            label: 'Artist',
            name: c.artist!.name,
            identity: {
              providerItemId: c.artist!.id,
              providerId: this.provider.id,
              entityId: 'artist',
            },
          })) || [];

      const sections: ItemSection[] = [];
      const extendedData: Record<string, unknown> = {};

      if (album.releases && album.releases.length > 0) {
        const { sections: s, extendedData: e } = await processReleasesForAlbum(
          this.provider,
          album.releases,
          signal,
        );
        sections.push(...s);
        Object.assign(extendedData, e);
      }

      const details: ItemDetails = {
        ...item,
        tags,
        relatedEntities,
        urls,
        sections: sections.length > 0 ? sections : undefined,
        extendedData: Object.keys(extendedData).length > 0 ? extendedData : undefined,
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

function mapAlbumToItem(album: MusicBrainzReleaseGroup, providerId: string): Item {
  const identity = { providerItemId: album.id, providerId, entityId: 'album' };

  // Try to use coverartarchive for the image
  const images = [urlImage(`https://coverartarchive.org/release-group/${album.id}/front`)];

  const artistName = album['artist-credit']?.[0]?.name;
  const year = album['first-release-date']?.split('-')[0];

  const subtitle: Subtitle = [];
  const primaryArtist = album['artist-credit']?.[0]?.artist;
  if (primaryArtist?.id) {
    subtitle.push({
      label: 'Artist',
      name: primaryArtist.name,
      identity: {
        providerItemId: primaryArtist.id,
        providerId,
        entityId: 'artist',
      },
    });
  } else if (artistName) {
    subtitle.push(artistName);
  }

  if (year) {
    subtitle.push(year);
  }

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: album.title,
    images,
    subtitle,
    tertiaryText: album['primary-type'] || undefined,
  };

  return ItemSchema.parse(item);
}

// --- Artist Entity ---
const mbArtistSorts = createSortSuite<MusicBrainzArtist>();

const ARTIST_DAFT_PUNK_ID = '056e4f3e-d505-4dad-8ec1-d04f521cbb56'; // Daft Punk
const ARTIST_RADIOHEAD_ID = 'a74b1b7f-71a5-4011-9441-d0b5e4122711'; // Radiohead

export class MusicBrainzArtistEntity implements Entity<MusicBrainzArtist> {
  public readonly id = 'artist';
  public readonly branding = {
    label: 'Artist',
    labelPlural: 'Artists',
    icon: Mic2,
    colorClass: 'text-cyan-500',
  };
  public readonly capabilities = { supportsEmptyQueryBrowsing: false };
  public readonly searchOptions: FilterDefinition<MusicBrainzArtist>[] = [];
  public readonly filters: FilterDefinition<MusicBrainzArtist>[] = [];
  public readonly sortOptions = [mbArtistSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Daft Punk', 'Radiohead');
  public readonly emptyTestQuery = 'musicbrainz_unlikely_artists_zxyv';
  public readonly testDetailsIds = nonEmpty(ARTIST_DAFT_PUNK_ID, ARTIST_RADIOHEAD_ID);
  public readonly edgeShortQuery = 'zzzzzzz';

  public constructor(private provider: MusicBrainzProvider) {
    this.filters = [
      musicBrainzArtistFilters.select({
        id: 'type',
        label: 'Artist Type',
        emptyLabel: 'All Types',
        transform: mapTo('type'),
        options: [
          { label: 'Person', value: 'person' },
          { label: 'Group / Band', value: 'group' },
          { label: 'Choir', value: 'choir' },
          { label: 'Orchestra', value: 'orchestra' },
          { label: 'Character', value: 'character' },
          { label: 'Other', value: 'other' },
        ],
        testCases: [
          {
            value: 'group',
            expectAll: (artist: MusicBrainzArtist) => artist.type?.toLowerCase() === 'group',
            expectAllMessage: 'have type "group"',
          },
        ],
      }),
      musicBrainzArtistFilters.text({
        id: 'country',
        label: 'Country (2-letter Code)',
        transform: mapTo('country'),
        placeholder: 'e.g. US, GB, JP',
        testCases: [
          {
            value: 'GB',
            query: 'Radiohead',
            expectAll: (artist: MusicBrainzArtist) => artist.country?.toLowerCase() === 'gb',
            expectAllMessage: 'be from country GB',
          },
        ],
      }),
      musicBrainzArtistFilters.range({
        id: 'begin',
        label: 'Active Year Range',
        transform: (val) => {
          return {
            ...(val.min && { begin_min: val.min }),
            ...(val.max && { begin_max: val.max }),
          };
        },
        minPlaceholder: 'From YYYY',
        maxPlaceholder: 'To YYYY',
        testCases: [
          {
            value: { min: '1990', max: '1999' },
            skipQueryDifferenceTest: true,
            expectAll: (artist: MusicBrainzArtist) => {
              const beginStr = artist['life-span']?.begin;
              if (!beginStr) return false;

              const yearMatch = beginStr.match(/^(\d{4})/);
              if (!yearMatch) return false;

              const year = Number.parseInt(yearMatch[1], 10);
              return year >= 1990 && year <= 1999;
            },
            expectAllMessage: 'be active in the 1990s',
          },
        ],
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams =>
    getMusicBrainzInitialParams(
      config,
      this.sortOptions[0]?.id,
      this.sortOptions[0]?.defaultDirection,
    );

  public readonly search = async (
    params: SearchParams,
  ): Promise<SearchResult<MusicBrainzArtist>> => {
    return this.provider.searchArtists(params, this.filters);
  };

  public readonly getNextParams = getMusicBrainzNextParams;
  public readonly getPreviousParams = getMusicBrainzPreviousParams;

  public readonly testImageResolution = nonEmpty({
    key: '076caf66-1bb1-4486-8f46-910c83441eab',
    description: 'Resolves secondary fallback for artist image via Wikidata SPARQL',
    expectUrlContains: 'fanart.tv',
  });

  public readonly resolveImage = async (
    key: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string | null> => {
    const fromFanart = await this.provider.resolveImageFromFanart(key, { signal });
    if (fromFanart) return fromFanart;
    return await this.provider.resolveImageFromWikidata(key, { signal });
  };

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMusicBrainz<unknown>(
        `/artist/${providerItemId}`,
        { inc: 'tags+url-rels+release-groups' },
        { signal },
      );
      const artist = MusicBrainzArtistSchema.parse(rawData);

      const item = mapArtistToItem(artist, this.provider.id);
      const tags = extractTags(artist.tags);

      // Extract official homepage, wikipedia, etc if available over the URL-rels
      const urls: { type: string; url: string }[] = [
        { type: 'musicbrainz', url: `https://musicbrainz.org/artist/${artist.id}` },
        ...extractUrlsFromRelations(artist.relations),
      ];

      const extendedData: Record<string, unknown> = {};

      if (artist.type) {
        extendedData['Type'] = artist.type;
      }

      const originParts: string[] = [];
      if (artist['begin-area']?.name) originParts.push(artist['begin-area'].name);
      if (artist.area?.name) originParts.push(artist.area.name);
      if (artist.country) originParts.push(artist.country);

      if (originParts.length > 0) {
        extendedData['Origin'] = [...new Set(originParts)].join(', ');
      }

      if (artist['life-span']?.begin) {
        const begin = artist['life-span'].begin.split('-')[0];
        let end = 'Present';
        if (artist['life-span'].end) {
          end = artist['life-span'].end.split('-')[0];
        } else if (artist['life-span'].ended) {
          end = 'Past';
        }
        extendedData['Active'] = `${begin} - ${end}`;
      }

      const sections: ItemSection[] = [];

      if (artist['release-groups']) {
        const albumSection = buildArtistAlbumsSection(artist['release-groups'], this.provider.id);
        if (albumSection) {
          sections.push(albumSection);
        }
      }

      const details: ItemDetails = {
        ...item,
        tags,
        urls,
        extendedData: Object.keys(extendedData).length > 0 ? extendedData : undefined,
        sections: sections.length > 0 ? sections : undefined,
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

function mapArtistToItem(artist: MusicBrainzArtist, providerId: string): Item {
  const identity = { providerItemId: artist.id, providerId, entityId: 'artist' };

  // Resolve image order: Fanart.tv -> Wikidata P18 extraction
  const images = [referenceImage(providerId, 'artist', artist.id)];

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: artist.name,
    images: images,
    subtitle: artist.country || undefined,
    tertiaryText: artist.type || undefined,
  };

  return ItemSchema.parse(item);
}

// --- Recording Entity (Song) ---
const mbRecordingSorts = createSortSuite<MusicBrainzRecording>();
const musicBrainzRecordingFilters = createFilterSuite<MusicBrainzRecording, RecordingLuceneQuery>();

const SONG_CREEP_ID = '8ea89714-3742-4dce-8940-510480ae1372'; // A valid Radiohead - Creep recording MBID
const SONG_BILLIE_JEAN_ID = '494c5a79-bc87-4a9f-8847-55122c7817b8'; // A valid Michael Jackson - Billie Jean recording MBID

export class MusicBrainzRecordingEntity implements Entity<MusicBrainzRecording> {
  public readonly id = 'song';
  public readonly branding = {
    label: 'Song',
    labelPlural: 'Songs',
    icon: Music,
    colorClass: 'text-purple-500',
  };
  public readonly capabilities = { supportsEmptyQueryBrowsing: false };
  public readonly searchOptions: FilterDefinition<MusicBrainzRecording>[] = [];
  public readonly filters: FilterDefinition<MusicBrainzRecording>[];
  public readonly sortOptions = [mbRecordingSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Creep', 'Billie Jean');
  public readonly emptyTestQuery = 'musicbrainz_unlikely_recordings_zxyv';
  public readonly testDetailsIds = nonEmpty(SONG_CREEP_ID, SONG_BILLIE_JEAN_ID);
  public readonly edgeShortQuery = 'zzzzzzzzzzzzzzzz';

  public constructor(private provider: MusicBrainzProvider) {
    this.filters = [
      musicBrainzRecordingFilters.asyncSelect({
        id: 'artistId',
        label: 'Artist',
        transform: mapTo('artistId'),
        targetEntityId: 'artist',
        testCases: [
          {
            value: ARTIST_RADIOHEAD_ID,
            query: 'Creep',
            expectAll: (recording: MusicBrainzRecording) => {
              for (const credit of recording['artist-credit'] ?? []) {
                if (
                  credit.name.toLowerCase().includes('radiohead') ||
                  credit.artist?.name.toLowerCase().includes('radiohead') ||
                  credit.artist?.id === ARTIST_RADIOHEAD_ID
                ) {
                  return true;
                }
              }
              return false;
            },
            expectAllMessage: 'have Radiohead as artist',
          },
        ],
      }),
      musicBrainzRecordingFilters.asyncSelect({
        id: 'releaseGroupId',
        label: 'Album',
        dependsOn: ['artistId'],
        transform: mapTo('releaseGroupId'),
        targetEntityId: 'album',
        testCases: [
          {
            value: ALBUM_THRILLER_ID,
            query: 'Billie Jean',
            skipQueryDifferenceTest: true,
            expectSome: (recording: MusicBrainzRecording) => {
              for (const release of recording.releases ?? []) {
                if (release['release-group']?.id === ALBUM_THRILLER_ID) return true;
              }
              return false;
            },
            expectSomeMessage: 'belong to Thriller release group',
          },
        ],
      }),
      musicBrainzRecordingFilters.boolean({
        id: 'video',
        label: 'Is Video',
        transform: mapTo('video'),
        defaultValue: false,
        testCases: [
          {
            value: true,
            query: 'Creep',
            expectAll: (recording: MusicBrainzRecording) => recording.video === true,
            expectAllMessage: 'be video=true',
          },
        ],
      }),
      musicBrainzRecordingFilters.range({
        id: 'duration',
        label: 'Duration (ms)',
        transform: (val) => {
          return {
            ...(val.min && { duration_min: val.min }),
            ...(val.max && { duration_max: val.max }),
          };
        },
        minPlaceholder: 'Min ms',
        maxPlaceholder: 'Max ms',
        testCases: [
          {
            value: { min: '180000', max: '240000' },
            skipQueryDifferenceTest: true,
            // TODO(P2): Check if we can remove the check that the length is provided.
            expectAll: (recording: MusicBrainzRecording) => {
              if (!recording.length) return false;
              return recording.length >= 180_000 && recording.length <= 240_000;
            },
            expectAllMessage: 'be between 3 and 4 minutes long',
          },
        ],
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams =>
    getMusicBrainzInitialParams(
      config,
      this.sortOptions[0]?.id,
      this.sortOptions[0]?.defaultDirection,
    );

  public readonly search = async (
    params: SearchParams,
  ): Promise<SearchResult<MusicBrainzRecording>> => {
    return this.provider.searchRecordings(params, this.filters);
  };

  public readonly getNextParams = getMusicBrainzNextParams;
  public readonly getPreviousParams = getMusicBrainzPreviousParams;

  public readonly resolveImage = async (
    _key?: string,
    _options: { signal?: AbortSignal } = {},
  ): Promise<string | null> => null;

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMusicBrainz<unknown>(
        `/recording/${providerItemId}`,
        { inc: 'artist-credits+tags+releases+release-groups' },
        { signal },
      );
      const recording = MusicBrainzRecordingSchema.parse(rawData);

      const item = mapRecordingToItem(recording, this.provider.id);
      const tags = (recording.tags || []).map((t) => t.name).slice(0, 10);

      const relatedEntities: NonNullable<ItemDetails['relatedEntities']> = [];

      // Link to artists (skip subtitle links)
      if (recording['artist-credit']) {
        recording['artist-credit']
          .filter(
            (c) =>
              c.artist?.id &&
              !(
                Array.isArray(item.subtitle) &&
                item.subtitle.some(
                  (l) => typeof l !== 'string' && l.identity.providerItemId === c.artist!.id,
                )
              ),
          )
          .forEach((c) => {
            relatedEntities.push({
              label: 'Artist',
              name: c.artist!.name,
              identity: {
                providerItemId: c.artist!.id,
                providerId: this.provider.id,
                entityId: 'artist',
              },
            });
          });
      }

      // Link to albums (Release Groups)
      if (recording.releases) {
        // Find unique release groups from the releases
        const groupedReleases = new Map();
        recording.releases.forEach((r) => {
          if (r['release-group']?.id && !groupedReleases.has(r['release-group'].id)) {
            groupedReleases.set(r['release-group'].id, r['release-group'].title);
          }
        });

        groupedReleases.forEach((title, id) => {
          // Skip the ones already in item.subtitle to prevent duplication
          if (
            Array.isArray(item.subtitle) &&
            item.subtitle.some((l) => typeof l !== 'string' && l.identity.providerItemId === id)
          )
            return;

          relatedEntities.push({
            label: 'Album',
            name: title,
            identity: {
              providerItemId: id,
              providerId: this.provider.id,
              entityId: 'album',
            },
          });
        });
      }

      const details: ItemDetails = {
        ...item,
        tags,
        relatedEntities,
        urls: [{ type: 'musicbrainz', url: `https://musicbrainz.org/recording/${recording.id}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

function mapRecordingToItem(recording: MusicBrainzRecording, providerId: string): Item {
  const identity = { providerItemId: recording.id, providerId, entityId: 'song' };

  // For images, we try to use the first release-group associated with the recording
  const images: NonNullable<Item['images']> = [];

  if (recording.releases && recording.releases.length > 0) {
    const firstReleaseGroupId = recording.releases.find((r) => r['release-group']?.id)?.[
      'release-group'
    ]?.id;
    if (firstReleaseGroupId) {
      // Create a reference via the album to hit the coverartarchive
      images.push(referenceImage(providerId, 'album', firstReleaseGroupId));
    }
  }

  const artistName = recording['artist-credit']?.[0]?.name;

  // Try to find the first release title for the subtitle, fallback to length info
  const albumTitle = recording.releases?.[0]?.title;
  let tertiaryText = recording.video ? 'Video' : 'Audio';

  if (recording.length) {
    const mins = Math.floor(recording.length / 60_000);
    const secs = Math.floor((recording.length % 60_000) / 1000);
    tertiaryText += ` • ${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const subtitle: Subtitle = [];
  const primaryArtist = recording['artist-credit']?.[0]?.artist;
  if (primaryArtist?.id) {
    subtitle.push({
      label: 'Artist',
      name: primaryArtist.name,
      identity: {
        providerItemId: primaryArtist.id,
        providerId,
        entityId: 'artist',
      },
    });
  } else if (artistName) {
    subtitle.push(artistName);
  }

  const primaryAlbum = recording.releases?.[0]?.['release-group'];
  if (primaryAlbum?.id) {
    subtitle.push({
      label: 'Album',
      name: primaryAlbum.title,
      identity: {
        providerItemId: primaryAlbum.id,
        providerId,
        entityId: 'album',
      },
    });
  } else if (albumTitle) {
    subtitle.push(albumTitle);
  }

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: recording.title,
    images: images,
    subtitle,
    tertiaryText: tertiaryText,
  };

  return ItemSchema.parse(item);
}

export class MusicBrainzProvider implements Provider {
  public readonly id = 'musicbrainz';
  public readonly label = 'MusicBrainz';
  public readonly icon = Disc3;
  public status: ProviderStatus = ProviderStatus.IDLE;

  private fetcher: Fetcher = secureFetch;
  private rateLimiter = new RateLimiter(700); //685 not fine
  public externalFetcher: Fetcher = secureFetch;

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
    this.externalFetcher = fetcher;
    this.status = ProviderStatus.READY;

    // Validate Fanart.tv key on startup
    const fanartKey = typeof process !== 'undefined' ? process.env?.FANART_TV_API_KEY : null;
    if (!fanartKey) {
      console.warn(
        `[MusicBrainz] No FANART_TV_API_KEY found in environment. Artist image resolution will fallback to Wikidata.`,
      );
    }
  };

  private async searchEntity<TListResponse extends { count: number }, TSchema extends z.ZodTypeAny>(
    endpoint: string,
    listKey: string,
    params: SearchParams,
    options: {
      filters: FilterDefinition<z.infer<TSchema>>[];
      buildQuery: (appliedFilters: Record<string, unknown>) => string;
      schema: TSchema;
      mapItem: (item: z.infer<TSchema>) => Item;
    },
  ): Promise<SearchResult<z.infer<TSchema>>> {
    try {
      const appliedFilters = applyFilters(params.filters, options.filters);
      const queryStr = options.buildQuery({ ...appliedFilters, term: params.query });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMusicBrainz<TListResponse>(endpoint, apiParams, {
        signal: params.signal,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawItems = (data as any)[listKey] ?? [];
      const parsedResults = z.array(options.schema).parse(rawItems);
      const items = parsedResults.map((item) => options.mapItem(item));

      const currentPage = params.page || 1;
      const totalPages = Math.ceil(data.count / limit);

      const result = SearchResultSchema.parse({
        items,
        raw: parsedResults,
        pagination: {
          currentPage,
          totalPages,
          totalCount: data.count,
          hasNextPage: currentPage < totalPages,
        },
      });

      return result as SearchResult<z.infer<TSchema>>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public async searchAlbums(
    params: SearchParams,
    searchOptions: FilterDefinition<MusicBrainzReleaseGroup>[],
  ): Promise<SearchResult<MusicBrainzReleaseGroup>> {
    return this.searchEntity<
      MusicBrainzReleaseGroupListResponse,
      typeof MusicBrainzReleaseGroupSchema
    >('/release-group', 'release-groups', params, {
      filters: searchOptions,
      buildQuery: (applied) => buildAlbumLuceneQuery(applied as AlbumLuceneQuery),
      schema: MusicBrainzReleaseGroupSchema,
      mapItem: (item) => mapAlbumToItem(item, this.id),
    });
  }

  public async searchArtists(
    params: SearchParams,
    searchOptions: FilterDefinition<MusicBrainzArtist>[],
  ): Promise<SearchResult<MusicBrainzArtist>> {
    return this.searchEntity<MusicBrainzArtistListResponse, typeof MusicBrainzArtistSchema>(
      '/artist',
      'artists',
      params,
      {
        filters: searchOptions,
        buildQuery: (applied) => buildArtistLuceneQuery(applied as ArtistLuceneQuery),
        schema: MusicBrainzArtistSchema,
        mapItem: (item) => mapArtistToItem(item, this.id),
      },
    );
  }

  public async fetchMusicBrainz<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const query = new URLSearchParams({ ...params, fmt: 'json' });
    const queryString = query.toString();
    const url = `${MUSICBRAINZ_BASE_URL}${endpoint}?${queryString}`;

    // Respect the 1 req/sec limit before making the HTTP fetch
    await this.rateLimiter.acquire(options?.signal);

    return this.fetcher<T>(url, {
      ...options,
      headers: {
        'User-Agent': MUSICBRAINZ_USER_AGENT,
        Accept: 'application/json',
      },
    });
  }

  public async searchRecordings(
    params: SearchParams,
    searchOptions: FilterDefinition<MusicBrainzRecording>[],
  ): Promise<SearchResult<MusicBrainzRecording>> {
    return this.searchEntity<MusicBrainzRecordingListResponse, typeof MusicBrainzRecordingSchema>(
      '/recording',
      'recordings',
      params,
      {
        filters: searchOptions,
        buildQuery: (applied) => {
          let video: boolean | undefined;
          if (applied.video === 'true') video = true;
          else if (applied.video === 'false') video = false;

          return buildRecordingLuceneQuery({
            ...applied,
            video,
          } as RecordingLuceneQuery);
        },
        schema: MusicBrainzRecordingSchema,
        mapItem: (item) => mapRecordingToItem(item, this.id),
      },
    );
  }

  public readonly entities = [
    new MusicBrainzRecordingEntity(this),
    new MusicBrainzAlbumEntity(this),
    new MusicBrainzArtistEntity(this),
  ] as const;
  public async resolveImageFromWikidata(
    id: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string | null> {
    try {
      const query = `SELECT ?image WHERE { ?item wdt:P434 "${id}" . ?item wdt:P18 ?image . } LIMIT 1`;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;

      const wdData = await this.externalFetcher<{
        results?: { bindings?: { image?: { value: string } }[] };
      }>(url, {
        headers: {
          'User-Agent': MUSICBRAINZ_USER_AGENT,
          Accept: 'application/sparql-results+json',
        },
        signal,
      });

      const imageUrl = wdData?.results?.bindings?.[0]?.image?.value;
      if (imageUrl && typeof imageUrl === 'string') {
        const urlObj = new URL(imageUrl);
        urlObj.protocol = 'https:';
        urlObj.searchParams.set('width', '800');
        return urlObj.toString();
      }
    } catch {
      // Fallthrough
    }
    return null;
  }

  public async resolveImageFromFanart(
    id: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string | null> {
    const fanartKey = typeof process !== 'undefined' ? process.env?.FANART_TV_API_KEY : null;

    if (!fanartKey) {
      return null;
    }

    try {
      const data = await this.externalFetcher<{ artistthumb?: [{ url?: string }] }>(
        `https://webservice.fanart.tv/v3/music/${id}`,
        {
          headers: { 'api-key': fanartKey, Accept: 'application/json' },
          signal,
        },
      );
      const url = data?.artistthumb?.[0]?.url;
      if (url) return url;
    } catch (error) {
      logger.debug(
        `[MusicBrainz] Fanart.tv lookup failed for ${id} (expected if the artist is not in Fanart.tv): ${error}`,
      );
    }

    return null;
  }
}
