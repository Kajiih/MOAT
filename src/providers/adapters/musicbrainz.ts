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

import { Disc3, Mic2 } from 'lucide-react';
import { z } from 'zod';

import { toCompositeId } from '@/items/identity';
import { referenceImage, urlImage } from '@/items/images';
import { Item, ItemDetails, ItemDetailsSchema, ItemSchema } from '@/items/items';
import { secureFetch } from '@/providers/api-client';
import { RateLimiter } from '@/providers/rate-limiter';
import { ProviderStatus } from '@/providers/types';
import { Entity, Fetcher, nonEmpty, Provider } from '@/providers/types';
import { applyFilters, handleProviderError } from '@/providers/utils';
import { createFilterSuite, FilterDefinition, mapTo } from '@/search/filter-schemas';
import { SearchParams, SearchResult, SearchResultSchema } from '@/search/search-schemas';
import { createSortSuite, SortDirection } from '@/search/sort-schemas';
import { logger } from '@/lib/logger';

const SECONDARY_TYPES = [
  'Compilation',
  'Live',
  'Soundtrack',
  'Spokenword',
  'Interview',
  'Audiobook',
  'Demo',
  'DJ-mix',
  'Mixtape/Street',
];

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
const escapeLucene = (str: string) => str.replaceAll(/(["\\/;:!^()[\]{}~*?+\-&|])/g, String.raw`\$1`);

/**
 * Wraps a term in double quotes only if it contains a space.
 * @param str - The string to format
 * @returns The formatted string
 */
const formatLuceneTerm = (str: string) => {
  const escaped = escapeLucene(str.trim());
  return escaped.includes(' ') ? `"${escaped}"` : escaped;
};

/**
 * Helper to build a Lucene type clause with exclusions
 * @param field - The lucene field name
 * @param values - A single value or array of values
 * @param defaultExclusions - Optional fallback NOT clauses
 * @returns A formatted clause or null
 */
function buildTypeClause(field: string, values: string | string[] | undefined, defaultExclusions?: readonly string[]): string | null {
  if (!values) {
    if (defaultExclusions) {
      const types = defaultExclusions.map((t) => formatLuceneTerm(t)).join(' OR ');
      return `NOT ${field}:(${types})`;
    }
    return null;
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

  if (values.trim()) {
    return `${field}:${formatLuceneTerm(values)}`;
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
    parts.push(`release:${formatLuceneTerm(query.term)}`);
  }

  if (query.artistId?.trim()) {
    parts.push(`arid:${query.artistId.trim()}`);
  } else if (query.artist?.trim()) {
    parts.push(`artist:${formatLuceneTerm(query.artist)}`);
  }

  const primaryClause = buildTypeClause('primarytype', query.primarytype);
  if (primaryClause) parts.push(primaryClause);

  const secondaryClause = buildTypeClause('secondarytype', query.secondarytype, SECONDARY_TYPES);
  if (secondaryClause) parts.push(secondaryClause);

  if (query.status?.trim()) parts.push(`status:${formatLuceneTerm(query.status)}`);
  if (query.tag?.trim()) parts.push(`tag:${formatLuceneTerm(query.tag)}`);

  addLuceneRange(parts, 'firstreleasedate', { min: query.firstreleasedate_min, max: query.firstreleasedate_max });

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

  if (query.term?.trim()) parts.push(`${formatLuceneTerm(query.term)}`);
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

  if (query.term?.trim()) parts.push(`${formatLuceneTerm(query.term)}`);
  if (query.artistId?.trim()) parts.push(`arid:${query.artistId.trim()}`);
  else if (query.artist?.trim()) parts.push(`artist:${formatLuceneTerm(query.artist)}`);
  if (query.releaseGroupId?.trim()) parts.push(`rgid:\"${query.releaseGroupId.trim()}\"`);
  if (query.release?.trim()) parts.push(`release:${formatLuceneTerm(query.release)}`);
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

export const MusicBrainzArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullish(),
  country: z.string().nullish(),
  'life-span': z.object({
    begin: z.string().nullish(),
    end: z.string().nullish(),
  }).nullish(),
  tags: z.array(MusicBrainzTagSchema).nullish(),
  relations: z.array(MusicBrainzUrlRelationSchema).nullish(),
});
export type MusicBrainzArtist = z.infer<typeof MusicBrainzArtistSchema>;

export const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'primary-type': z.string().nullish(),
  'secondary-types': z.array(z.string()).nullish(),
  'first-release-date': z.string().nullish(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).nullish(),
  releases: z.array(z.object({
    status: z.string().nullish(),
  })).nullish(),
  tags: z.array(MusicBrainzTagSchema).nullish(),
  relations: z.array(MusicBrainzUrlRelationSchema).nullish(),
});
export type MusicBrainzReleaseGroup = z.infer<typeof MusicBrainzReleaseGroupSchema>;

export const MusicBrainzRecordingSchema = z.object({
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
export type MusicBrainzRecording = z.infer<typeof MusicBrainzRecordingSchema>;

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

const getMusicBrainzNextParams = (params: SearchParams, result: SearchResult): SearchParams | null => {
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
  public readonly searchOptions: FilterDefinition<MusicBrainzReleaseGroup>[] = [];
  public readonly filters: FilterDefinition<MusicBrainzReleaseGroup>[] = [];
  public readonly sortOptions = [mbAlbumSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Thriller', 'Abbey Road');
  public readonly testDetailsIds = nonEmpty(ALBUM_THRILLER_ID, ALBUM_ABBEY_ROAD_ID);
  public readonly edgeShortQuery = 'zzzzzzzzzzz';

  public constructor(private provider: MusicBrainzProvider) {

    this.filters = [
      mbAlbumFilters.multiselect({
        id: 'primarytype',
        label: 'Release Type',
        transform: mapTo('primarytype'),
        options: [
          { label: 'Album', value: 'album' },
          { label: 'Single', value: 'single' },
          { label: 'EP', value: 'ep' },
          { label: 'Broadcast', value: 'broadcast' },
          { label: 'Other', value: 'other' },
        ],
        testCases: [{
            value: ['ep'],
            expectAll: (album: MusicBrainzReleaseGroup) => {
              const matchesPrimary = album['primary-type']?.toLowerCase() === 'ep';
              if (matchesPrimary) return true;

              for (const type of album['secondary-types'] ?? []) {
                if (type.toLowerCase() === 'ep') return true;
              }
              return false;
            },
            expectAllMessage: 'have primary or secondary type "EP"',
          }],
      }),
      mbAlbumFilters.multiselect({
        id: 'secondarytype',
        label: 'Secondary Types',
        transform: mapTo('secondarytype'),
        options: SECONDARY_TYPES.map(t => ({ label: t, value: t.toLowerCase() })),
        testCases: [
          {
            value: ['live'],
            expectAll: (album: MusicBrainzReleaseGroup) => {
              for (const type of album['secondary-types'] ?? []) {
                if (type.toLowerCase() === 'live') return true;
              }
              return false;
            },
            expectAllMessage: 'have secondary type "live"',
          }
        ],
      }),
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
        id: 'status',
        label: 'Status',
        transform: mapTo('status'),
        options: [
          { label: 'Any Status', value: '' },
          { label: 'Official', value: 'official' },
          { label: 'Promotion', value: 'promotion' },
          { label: 'Bootleg', value: 'bootleg' },
          { label: 'Pseudo-Release', value: 'pseudo-release' },
        ],
        testCases: [
          {
            value: 'official',
            expectAll: (album: MusicBrainzReleaseGroup) => {
              const releases = album.releases;
              if (!releases) return true;

              for (const release of releases) {
                if (release.status?.toLowerCase() === 'official') return true;
              }
              return false;
            },
            expectAllMessage: 'have official status in one of their releases',
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
          }
        ]
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams =>
    getMusicBrainzInitialParams(config, this.sortOptions[0]?.id, this.sortOptions[0]?.defaultDirection, { primarytype: ['album'] });

  public readonly search = async (params: SearchParams): Promise<SearchResult<MusicBrainzReleaseGroup>> => {
    return this.provider.searchAlbums(params, this.filters);
  };

  public readonly getNextParams = getMusicBrainzNextParams;
  public readonly getPreviousParams = getMusicBrainzPreviousParams;

  public readonly testImageResolution = nonEmpty({
    key: '2c55f39d-9cb3-401c-b218-2fc600d26ec5',
    description: 'Resolves primary album art successfully via CoverArtArchive',
    expectUrlContains: 'ca.archive.org/',
  });

  public readonly resolveImage = async (key: string): Promise<string | null> => {
    try {
      const caaRes = await fetch(`https://coverartarchive.org/release-group/${key}/front-500`, { method: 'HEAD' });
      if (caaRes.ok) return caaRes.url;
    } catch {
      // Ignore
    }
    return null;
  };

  public readonly getDetails = async (
    providerItemId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMusicBrainz<unknown>(
        `/release-group/${providerItemId}`,
        { inc: 'artist-credits+tags+url-rels' },
        { signal: options?.signal },
      );
      const album = MusicBrainzReleaseGroupSchema.parse(rawData);

      const item = mapAlbumToItem(album, this.provider.id);
      const tags = (album.tags || []).map((t) => t.name).slice(0, 10);

      // Extract official homepage, wikipedia, etc if available over the URL-rels
      const urls: { type: string; url: string }[] = [
        { type: 'musicbrainz', url: `https://musicbrainz.org/release-group/${album.id}` },
      ];

      if (album.relations) {
        for (const rel of album.relations) {
          if (rel.url?.resource) {
            if (rel.type === 'wikipedia') {
              urls.push({ type: 'wikipedia', url: rel.url.resource });
            } else if (rel.type === 'wikidata') {
              urls.push({ type: 'wikidata', url: rel.url.resource });
            }
          }
        }
      }

      const relatedEntities =
        album['artist-credit']
          ?.filter((c) => c.artist?.id)
          .map((c) => ({
            label: 'Artist',
            name: c.artist!.name,
            identity: {
              providerItemId: c.artist!.id,
              providerId: this.provider.id,
              entityId: 'artist',
            },
          })) || [];

      const details: ItemDetails = {
        ...item,
        tags,
        relatedEntities,
        urls,
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

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: album.title,
    images,
    subtitle: [artistName, year].filter(Boolean).join(' • '),
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
    colorClass: 'text-rose-500',
  };
  public readonly searchOptions: FilterDefinition<MusicBrainzArtist>[] = [];
  public readonly filters: FilterDefinition<MusicBrainzArtist>[] = [];
  public readonly sortOptions = [mbArtistSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Daft Punk', 'Radiohead');
  public readonly testDetailsIds = nonEmpty(ARTIST_DAFT_PUNK_ID, ARTIST_RADIOHEAD_ID);
  public readonly edgeShortQuery = 'zzzzzzz';

  public constructor(private provider: MusicBrainzProvider) {
    this.filters = [
      musicBrainzArtistFilters.select({
        id: 'type',
        label: 'Artist Type',
        transform: mapTo('type'),
        options: [
          { label: 'All Types', value: '' },
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
          }
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
          }
        ]
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams =>
    getMusicBrainzInitialParams(config, this.sortOptions[0]?.id, this.sortOptions[0]?.defaultDirection);

  public readonly search = async (params: SearchParams): Promise<SearchResult<MusicBrainzArtist>> => {
    return this.provider.searchArtists(params, this.filters);
  };

  public readonly getNextParams = getMusicBrainzNextParams;
  public readonly getPreviousParams = getMusicBrainzPreviousParams;

  public readonly testImageResolution = nonEmpty({
    key: '076caf66-1bb1-4486-8f46-910c83441eab',
    description: 'Resolves secondary fallback for artist image via Wikidata SPARQL',
    expectUrlContains: 'fanart.tv',
  });

  public readonly resolveImage = async (key: string): Promise<string | null> => {
    const fromFanart = await this.provider.resolveImageFromFanart(key);
    if (fromFanart) return fromFanart;
    return await this.provider.resolveImageFromWikidata(key);
  };

  public readonly getDetails = async (
    providerItemId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMusicBrainz<unknown>(
        `/artist/${providerItemId}`,
        { inc: 'tags+url-rels' },
        { signal: options?.signal },
      );
      const artist = MusicBrainzArtistSchema.parse(rawData);

      const item = mapArtistToItem(artist, this.provider.id);
      const tags = (artist.tags || []).map((t) => t.name).slice(0, 10);

      // Extract official homepage, wikipedia, etc if available over the URL-rels
      const urls: { type: string; url: string }[] = [
        { type: 'musicbrainz', url: `https://musicbrainz.org/artist/${artist.id}` },
      ];

      if (artist.relations) {
        for (const rel of artist.relations) {
          if (rel.url?.resource) {
            if (rel.type === 'official homepage') {
              urls.push({ type: 'homepage', url: rel.url.resource });
            } else if (rel.type === 'wikipedia') {
              urls.push({ type: 'wikipedia', url: rel.url.resource });
            }
          }
        }
      }

      const details: ItemDetails = {
        ...item,
        tags,
        urls,
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
    icon: Disc3, // We can reuse Disc3 or conceptually AudioLines if we had it, but Disc3 works for now
    colorClass: 'text-rose-500',
  };
  public readonly searchOptions: FilterDefinition<MusicBrainzRecording>[] = [];
  public readonly filters: FilterDefinition<MusicBrainzRecording>[];
  public readonly sortOptions = [mbRecordingSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Creep', 'Billie Jean');
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
      musicBrainzRecordingFilters.boolean({
        id: 'video',
        label: 'Is Video',
        transform: mapTo('video'),
        defaultValue: false,
        testCases: [
          {
            value: true,
            query: 'Thriller',
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
          }
        ]
      }),
      musicBrainzRecordingFilters.asyncSelect({
        id: 'releaseGroupId',
        label: 'Album (Release Group ID)',
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
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams =>
    getMusicBrainzInitialParams(config, this.sortOptions[0]?.id, this.sortOptions[0]?.defaultDirection);

  public readonly search = async (params: SearchParams): Promise<SearchResult<MusicBrainzRecording>> => {
    return this.provider.searchRecordings(params, this.filters);
  };

  public readonly getNextParams = getMusicBrainzNextParams;
  public readonly getPreviousParams = getMusicBrainzPreviousParams;

  public readonly resolveImage = async (): Promise<string | null> => null;

  public readonly getDetails = async (
    providerItemId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMusicBrainz<unknown>(
        `/recording/${providerItemId}`,
        { inc: 'artist-credits+tags+releases' },
        { signal: options?.signal },
      );
      const recording = MusicBrainzRecordingSchema.parse(rawData);

      const item = mapRecordingToItem(recording, this.provider.id);
      const tags = (recording.tags || []).map((t) => t.name).slice(0, 10);

      const relatedEntities: NonNullable<ItemDetails['relatedEntities']> = [];

      // Link to artists
      if (recording['artist-credit']) {
        recording['artist-credit']
          .filter((c) => c.artist?.id)
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

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: recording.title,
    images: images,
    subtitle: [artistName, albumTitle].filter(Boolean).join(' • '),
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
      console.warn(`[MusicBrainz] No FANART_TV_API_KEY found in environment. Artist image resolution will fallback to Wikidata.`);
    }
  };

  public async searchAlbums(
    params: SearchParams,
    searchOptions: FilterDefinition<MusicBrainzReleaseGroup>[],
  ): Promise<SearchResult<MusicBrainzReleaseGroup>> {
    try {
      const appliedFilters = applyFilters(params.filters, searchOptions);

      const queryStr = buildAlbumLuceneQuery({
        term: params.query,
        artistId: appliedFilters.artistId as string | undefined,
        artist: appliedFilters.artist as string | undefined,
        primarytype: appliedFilters.primarytype as string | undefined,
        secondarytype: appliedFilters.secondarytype as string | string[] | undefined,
        status: appliedFilters.status as string | undefined,
        firstreleasedate_min: appliedFilters.firstreleasedate_min as string | undefined,
        firstreleasedate_max: appliedFilters.firstreleasedate_max as string | undefined,
        tag: appliedFilters.tag as string | undefined,
      });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMusicBrainz<MusicBrainzReleaseGroupListResponse>('/release-group', apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(MusicBrainzReleaseGroupSchema).parse(data['release-groups'] ?? []);
      const items = parsedResults.map((item) => mapAlbumToItem(item, this.id));

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

      return result as SearchResult<MusicBrainzReleaseGroup>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public async searchArtists(
    params: SearchParams,
    searchOptions: FilterDefinition<MusicBrainzArtist>[],
  ): Promise<SearchResult<MusicBrainzArtist>> {
    try {
      const appliedFilters = applyFilters(params.filters, searchOptions);
      
      const queryStr = buildArtistLuceneQuery({
        term: params.query,
        type: appliedFilters.type as string | undefined,
        country: appliedFilters.country as string | undefined,
        begin_min: appliedFilters.begin_min as string | undefined,
        begin_max: appliedFilters.begin_max as string | undefined,
        tag: appliedFilters.tag as string | undefined,
      });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMusicBrainz<MusicBrainzArtistListResponse>('/artist', apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(MusicBrainzArtistSchema).parse(data.artists ?? []);
      const items = parsedResults.map((item) => mapArtistToItem(item, this.id));

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

      return result as SearchResult<MusicBrainzArtist>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
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
    try {
      const appliedFilters = applyFilters(params.filters, searchOptions);

      const queryStr = buildRecordingLuceneQuery({
        term: params.query,
        artistId: appliedFilters.artistId as string | undefined,
        artist: appliedFilters.artist as string | undefined,
        releaseGroupId: appliedFilters.releaseGroupId as string | undefined,
        release: appliedFilters.release as string | undefined,
        video: appliedFilters.video !== undefined ? Boolean(appliedFilters.video) : undefined,
        duration_min: appliedFilters.duration_min as string | undefined,
        duration_max: appliedFilters.duration_max as string | undefined,
        tag: appliedFilters.tag as string | undefined,
      });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMusicBrainz<MusicBrainzRecordingListResponse>('/recording', apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(MusicBrainzRecordingSchema).parse(data.recordings ?? []);
      const items = parsedResults.map((item) => mapRecordingToItem(item, this.id));

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

      return result as SearchResult<MusicBrainzRecording>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public readonly entities = [
    new MusicBrainzAlbumEntity(this),
    new MusicBrainzArtistEntity(this),
    new MusicBrainzRecordingEntity(this),
  ] as const;
  public async resolveImageFromWikidata(id: string): Promise<string | null> {
    try {
      const query = `SELECT ?image WHERE { ?item wdt:P434 "${id}" . ?item wdt:P18 ?image . } LIMIT 1`;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;

      const wdData = await this.externalFetcher<{ results?: { bindings?: { image?: { value: string } }[] } }>(
        url,
        {
          headers: {
            'User-Agent': MUSICBRAINZ_USER_AGENT,
            Accept: 'application/sparql-results+json',
          },
        }
      );

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

  public async resolveImageFromFanart(id: string): Promise<string | null> {
    const fanartKey = typeof process !== 'undefined' ? process.env?.FANART_TV_API_KEY : null;
    
    if (!fanartKey) {
      return null;
    }

    try {
      const data = await this.externalFetcher<{ artistthumb?: [{ url?: string }] }>(`https://webservice.fanart.tv/v3/music/${id}`, {
        headers: { 'api-key': fanartKey, Accept: 'application/json' },
      });
      const url = data?.artistthumb?.[0]?.url;
      if (url) return url;
    } catch (error) {
      logger.debug(`[MusicBrainz] Fanart.tv lookup failed for ${id} (expected if the artist is not in Fanart.tv): ${error}`);
    }
    
    return null;
  }
}
