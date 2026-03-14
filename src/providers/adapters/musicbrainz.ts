/**
 * @file MusicBrainz Provider Implementation
 * @description Provides support for Music (Albums and Artists) via the MusicBrainz API.
 */

import { Disc3, Mic2 } from 'lucide-react';
import { z } from 'zod';

import { toCompositeId } from '@/items/identity';
import { referenceImage, urlImage } from '@/items/images';
import { Item, ItemDetails, ItemDetailsSchema, ItemSchema } from '@/items/items';
import { secureFetch } from '@/providers/api-client';
import { ProviderStatus } from '@/providers/types';
import { Entity, Fetcher, nonEmpty, Provider } from '@/providers/types';
import { applyFilters, handleProviderError } from '@/providers/utils';
import { createFilterSuite, FilterDefinition } from '@/search/filter-schemas';
import { SearchParams, SearchResult, SearchResultSchema } from '@/search/search-schemas';
import { createSortSuite } from '@/search/sort-schemas';

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

const mbArtistFilters = createFilterSuite<MBArtist>();

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';
const MB_USER_AGENT = 'MOAT/1.0.0 ( itskajih@gmail.com )';


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
    const min = range.min || '*';
    const max = range.max || '*';
    parts.push(`${field}:[${min} TO ${max}]`);
  }
};

/** Album search query model */
export interface AlbumLuceneQuery {
  term?: string;
  artist?: string;
  artistId?: string;
  primarytype?: string | string[];
  secondarytype?: string | string[];
  status?: string;
  firstreleasedate?: { min?: string; max?: string };
  tag?: string;
}

/**
 * Escape a string for Lucene query parser, preserving wildcards (*) and fuzzy modifiers (~).
 * Note: Lucene does not support wildcards or fuzzy operators inside double-quoted phrases.
 * @param str - The string to escape
 * @returns The escaped string
 */
const escapeLucene = (str: string) => str.replaceAll(/(["\\/;:!^()[\]{}])/g, String.raw`\$1`);

/**
 * Wraps a term in double quotes only if it contains a space, allowing single words
 * to freely use wildcard (*) and fuzzy (~) operators in the Lucene engine.
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
    parts.push(`${formatLuceneTerm(query.term)}`);
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

  addLuceneRange(parts, 'firstreleasedate', query.firstreleasedate);

  return parts.length > 0 ? parts.join(' AND ') : '*:*';
}

/** Artist search query model */
export interface ArtistLuceneQuery {
  term?: string;
  country?: string;
  type?: string;
  begin?: { min?: string; max?: string };
  tag?: string;
}

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

  addLuceneRange(parts, 'begin', query.begin);

  return parts.length > 0 ? parts.join(' AND ') : '*:*';
}

/** Recording search query model */
export interface RecordingLuceneQuery {
  term?: string;
  artist?: string;
  release?: string;
  video?: boolean;
  artistId?: string;
  releaseGroupId?: string;
  dur?: { min?: string; max?: string };
  tag?: string;
}

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
  if (query.releaseGroupId?.trim()) parts.push(`rgid:${query.releaseGroupId.trim()}`);
  if (query.release?.trim()) parts.push(`release:${formatLuceneTerm(query.release)}`);
  if (query.video !== undefined) parts.push(`video:${query.video}`);
  if (query.tag?.trim()) parts.push(`tag:${formatLuceneTerm(query.tag)}`);

  addLuceneRange(parts, 'dur', query.dur);

  return parts.length > 0 ? parts.join(' AND ') : '*:*';
}

/**
 * MusicBrainz API Types
 */
const MBTagSchema = z.object({
  name: z.string(),
  count: z.number().nullish(),
});

const MBArtistCreditSchema = z.object({
  name: z.string(),
  artist: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullish(),
});

const MBUrlRelationSchema = z.object({
  type: z.string().nullish(),
  url: z
    .object({
      id: z.string(),
      resource: z.string(),
    })
    .nullish(),
});

export const MBArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullish(),
  country: z.string().nullish(),
  tags: z.array(MBTagSchema).nullish(),
  relations: z.array(MBUrlRelationSchema).nullish(),
});
export type MBArtist = z.infer<typeof MBArtistSchema>;

export const MBReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'primary-type': z.string().nullish(),
  'secondary-types': z.array(z.string()).nullish(),
  'first-release-date': z.string().nullish(),
  'artist-credit': z.array(MBArtistCreditSchema).nullish(),
  tags: z.array(MBTagSchema).nullish(),
  relations: z.array(MBUrlRelationSchema).nullish(),
});
export type MBReleaseGroup = z.infer<typeof MBReleaseGroupSchema>;

export const MBRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  length: z.number().nullish(),
  video: z.boolean().nullish(),
  'artist-credit': z.array(MBArtistCreditSchema).nullish(),
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
  tags: z.array(MBTagSchema).nullish(),
});
export type MBRecording = z.infer<typeof MBRecordingSchema>;

interface MBListResponse {
  count: number;
  offset: number;
}
interface MBReleaseGroupListResponse extends MBListResponse {
  'release-groups': MBReleaseGroup[];
}
interface MBArtistListResponse extends MBListResponse {
  artists: MBArtist[];
}
interface MBRecordingListResponse extends MBListResponse {
  recordings: MBRecording[];
}

const mbAlbumSorts = createSortSuite<MBReleaseGroup>();
const mbAlbumFilters = createFilterSuite<MBReleaseGroup>();

// --- Album Entity ---
// IDs for integration tests (e.g., Thriller, Abbey Road)
const ALBUM_THRILLER_ID = '3a7817b5-22cb-32c3-a31b-2c8309fbf92e'; // Thriller
const ALBUM_ABBEY_ROAD_ID = '9162580e-5df4-32de-80cc-f45a8d8a9b1d'; // Abbey Road

export class MusicBrainzAlbumEntity implements Entity<MBReleaseGroup> {
  public readonly id = 'album';
  public readonly branding = {
    label: 'Album',
    labelPlural: 'Albums',
    icon: Disc3,
    colorClass: 'text-rose-500',
  };
  public readonly searchOptions: FilterDefinition<MBReleaseGroup>[] = [];
  public readonly filters: FilterDefinition<MBReleaseGroup>[] = [];
  public readonly sortOptions = [mbAlbumSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Thriller', 'Abbey Road');
  public readonly testDetailsIds = nonEmpty(ALBUM_THRILLER_ID, ALBUM_ABBEY_ROAD_ID);
  public readonly edgeShortQuery = 'zzzzzzzzzzz';

  public constructor(private provider: MusicBrainzDatabaseProvider) {

    this.filters = [
      mbAlbumFilters.multiselect({
        id: 'primarytype',
        label: 'Release Type',
        mapTo: 'primarytype',
        options: [
          { label: 'Album', value: 'album' },
          { label: 'Single', value: 'single' },
          { label: 'EP', value: 'ep' },
          { label: 'Broadcast', value: 'broadcast' },
          { label: 'Other', value: 'other' },
        ],
        testCases: [{
            value: ['ep'],
            expectAll: (album: MBReleaseGroup) => {
              const matchesPrimary = album['primary-type']?.toLowerCase() === 'ep';
              const matchesSecondary = album['secondary-types']?.some(t => t.toLowerCase() === 'ep') ?? false;
              return matchesPrimary || matchesSecondary;
            },
            expectAllMessage: 'have primary or secondary type "EP"',
          }],
      }),
      mbAlbumFilters.multiselect({
        id: 'secondarytype',
        label: 'Secondary Types',
        mapTo: 'secondarytype',
        options: SECONDARY_TYPES.map(t => ({ label: t, value: t.toLowerCase() })),
        testCases: [
          {
            value: ['live'],
            expectAll: (album: MBReleaseGroup) => {
              return album['secondary-types']?.some((t) => t.toLowerCase() === 'live') ?? false;
            },
            expectAllMessage: 'have secondary type "live"',
          }
        ],
      }),
      mbAlbumFilters.asyncSelect({
        id: 'artistId',
        label: 'Artist',
        mapTo: 'artistId',
        targetEntityId: 'artist',
        testCases: [
          {
            value: ARTIST_RADIOHEAD_ID,
            query: 'OK Computer',
            expectAll: (album: MBReleaseGroup) => {
              return album['artist-credit']?.some((c) => c.artist?.id === ARTIST_RADIOHEAD_ID) ?? false;
            },
            expectAllMessage: 'be by Radiohead',
          },
        ],
      }),
      mbAlbumFilters.select({
        id: 'status',
        label: 'Status',
        mapTo: 'status',
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
            expectAll: (album: MBReleaseGroup) => {
              const releases = (album as MBReleaseGroup & { releases?: { status?: string | null }[] }).releases;
              return releases?.some((r) => r.status?.toLowerCase() === 'official') ?? true;
            },
            expectAllMessage: 'have official status in one of their releases',
          },
        ],
      }),
      mbAlbumFilters.range({
        id: 'firstreleasedate',
        label: 'Release Year Range',
        mapTo: 'firstreleasedate',
        minPlaceholder: 'From YYYY',
        maxPlaceholder: 'To YYYY',
        testCases: [
          {
            value: { min: '1980', max: '1989' },
            expectAll: (album: MBReleaseGroup) => {
              if (!album['first-release-date']) return true;
              const year = Number.parseInt(album['first-release-date'].split('-')[0], 10);
              return year >= 1980 && year <= 1989;
            },
            expectAllMessage: 'be released in the 1980s if date is available',
          }
        ]
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: { primarytype: ['album'] },
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<MBReleaseGroup>> => {
    return this.provider.searchAlbums(params, this.filters);
  };

  public readonly getNextParams = (
    params: SearchParams,
    result: SearchResult,
  ): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly getDetails = async (
    dbId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMB<unknown>(
        `/release-group/${dbId}`,
        { inc: 'artist-credits+tags+url-rels' },
        { signal: options?.signal },
      );
      const album = MBReleaseGroupSchema.parse(rawData);

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
              dbId: c.artist!.id,
              databaseId: this.provider.id,
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

function mapAlbumToItem(album: MBReleaseGroup, databaseId: string): Item {
  const identity = { dbId: album.id, databaseId, entityId: 'album' };

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
const mbArtistSorts = createSortSuite<MBArtist>();

const ARTIST_DAFT_PUNK_ID = '056e4f3e-d505-4dad-8ec1-d04f521cbb56'; // Daft Punk
const ARTIST_RADIOHEAD_ID = 'a74b1b7f-71a5-4011-9441-d0b5e4122711'; // Radiohead

export class MusicBrainzArtistEntity implements Entity<MBArtist> {
  public readonly id = 'artist';
  public readonly branding = {
    label: 'Artist',
    labelPlural: 'Artists',
    icon: Mic2,
    colorClass: 'text-rose-500',
  };
  public readonly searchOptions: FilterDefinition<MBArtist>[] = [];
  public readonly filters: FilterDefinition<MBArtist>[] = [];
  public readonly sortOptions = [mbArtistSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Daft Punk', 'Radiohead');
  public readonly testDetailsIds = nonEmpty(ARTIST_DAFT_PUNK_ID, ARTIST_RADIOHEAD_ID);
  public readonly edgeShortQuery = 'zzzzzzz';

  public constructor(private provider: MusicBrainzDatabaseProvider) {
    this.filters = [
      mbArtistFilters.select({
        id: 'type',
        label: 'Artist Type',
        mapTo: 'type',
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
            expectAll: (artist: MBArtist) => artist.type?.toLowerCase() === 'group',
            expectAllMessage: 'have type "group"',
          }
        ],
      }),
      mbArtistFilters.text({
        id: 'country',
        label: 'Country (2-letter Code)',
        mapTo: 'country',
        placeholder: 'e.g. GB, US, FR',
        testCases: [
          {
            value: 'GB',
            query: 'Radiohead',
            expectAll: (artist: MBArtist) => artist.country?.toLowerCase() === 'gb',
            expectAllMessage: 'be from country GB',
          },
        ],
      }),
      mbArtistFilters.range({
        id: 'begin',
        label: 'Active Year Range',
        mapTo: 'begin',
        minPlaceholder: 'From YYYY',
        maxPlaceholder: 'To YYYY',
        testCases: [
          {
            value: { min: '1990', max: '1999' },
            // TODO(P2): Check if we can remove the check that the date is available.
            expectAll: (artist: MBArtist) => {
              const beginStr = (artist as any)['life-span']?.begin;
              if (!beginStr) return true;
              
              const yearMatch = beginStr.match(/^(\d{4})/);
              if (!yearMatch) return true;
              
              const year = parseInt(yearMatch[1], 10);
              return year >= 1990 && year <= 1999;
            },
            expectAllMessage: 'be active in the 1990s if date is available',
          }
        ]
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<MBArtist>> => {
    return this.provider.searchArtists(params, this.filters);
  };

  public readonly getNextParams = (
    params: SearchParams,
    result: SearchResult,
  ): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly getDetails = async (
    dbId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMB<unknown>(
        `/artist/${dbId}`,
        { inc: 'tags+url-rels' },
        { signal: options?.signal },
      );
      const artist = MBArtistSchema.parse(rawData);

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

function mapArtistToItem(artist: MBArtist, databaseId: string): Item {
  const identity = { dbId: artist.id, databaseId, entityId: 'artist' };

  // Resolve image order: Fanart.tv -> Wikidata P18 extraction
  const images = [referenceImage(databaseId, `artist:${artist.id}`)];

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
const mbRecordingSorts = createSortSuite<MBRecording>();
const mbRecordingFilters = createFilterSuite<MBRecording>();

const SONG_CREEP_ID = '8ea89714-3742-4dce-8940-510480ae1372'; // A valid Radiohead - Creep recording MBID
const SONG_BILLIE_JEAN_ID = '494c5a79-bc87-4a9f-8847-55122c7817b8'; // A valid Michael Jackson - Billie Jean recording MBID

export class MusicBrainzRecordingEntity implements Entity<MBRecording> {
  public readonly id = 'song';
  public readonly branding = {
    label: 'Song',
    labelPlural: 'Songs',
    icon: Disc3, // We can reuse Disc3 or conceptually AudioLines if we had it, but Disc3 works for now
    colorClass: 'text-rose-500',
  };
  public readonly searchOptions: FilterDefinition<MBRecording>[] = [];
  public readonly filters: FilterDefinition<MBRecording>[];
  public readonly sortOptions = [mbRecordingSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Creep', 'Billie Jean');
  public readonly testDetailsIds = nonEmpty(SONG_CREEP_ID, SONG_BILLIE_JEAN_ID);
  public readonly edgeShortQuery = 'zzzzzzzzzzzzzzzz';

  public constructor(private provider: MusicBrainzDatabaseProvider) {
    this.filters = [
      mbRecordingFilters.asyncSelect({
        id: 'artistId',
        label: 'Artist',
        mapTo: 'artistId',
        targetEntityId: 'artist',
        testCases: [
          {
            value: ARTIST_RADIOHEAD_ID,
            query: 'Creep',
            expectAll: (recording: MBRecording) => {
              if (!recording['artist-credit']) return false;
              return recording['artist-credit'].some((credit) => 
                credit.name.toLowerCase().includes('radiohead') || 
                credit.artist?.name.toLowerCase().includes('radiohead') ||
                credit.artist?.id === ARTIST_RADIOHEAD_ID
              );
            },
            expectAllMessage: 'have Radiohead as artist',
          },
        ],
      }),
      mbRecordingFilters.asyncSelect({
        id: 'albumId',
        label: 'Album',
        mapTo: 'releaseGroupId',
        targetEntityId: 'album',
        testCases: [
          {
            value: ALBUM_THRILLER_ID,
            query: 'Billie Jean',
            expectAll: (recording: MBRecording) => {
              const rels = (recording as any).releases;
              return rels.some((r: any) => r['release-group']?.id === ALBUM_THRILLER_ID);
            },
            expectAllMessage: 'belong to Thriller release group',
          },
        ],
      }),
      mbRecordingFilters.boolean({
        id: 'video',
        label: 'Is Video',
        defaultValue: false,
        mapTo: 'video',
        testCases: [
          {
            value: true,
            query: 'Thriller',
            expectAll: (recording: MBRecording) => recording.video === true,
            expectAllMessage: 'be video=true',
          },
        ],
      }),
      mbRecordingFilters.range({
        id: 'dur',
        label: 'Duration (ms)',
        mapTo: 'dur',
        minPlaceholder: 'Min ms',
        maxPlaceholder: 'Max ms',
        testCases: [
          {
            value: { min: '180000', max: '240000' },
            // TODO(P2): Check if we can remove the check that the length is provided.
            expectAll: (recording: MBRecording) => {
              if (!recording.length) return true;
              return recording.length >= 180_000 && recording.length <= 240_000;
            },
            expectAllMessage: 'be between 3 and 4 minutes long if length is provided',
          }
        ]
      }),
    ];
  }

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<MBRecording>> => {
    return this.provider.searchRecordings(params, this.filters);
  };

  public readonly getNextParams = (
    params: SearchParams,
    result: SearchResult,
  ): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly getDetails = async (
    dbId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchMB<unknown>(
        `/recording/${dbId}`,
        { inc: 'artist-credits+tags+releases' },
        { signal: options?.signal },
      );
      const recording = MBRecordingSchema.parse(rawData);

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
                dbId: c.artist!.id,
                databaseId: this.provider.id,
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
              dbId: id,
              databaseId: this.provider.id,
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

function mapRecordingToItem(recording: MBRecording, databaseId: string): Item {
  const identity = { dbId: recording.id, databaseId, entityId: 'song' };

  // For images, we try to use the first release-group associated with the recording
  const images: NonNullable<Item['images']> = [];
  
  if (recording.releases && recording.releases.length > 0) {
    const firstReleaseGroupId = recording.releases.find((r) => r['release-group']?.id)?.[
      'release-group'
    ]?.id;
    if (firstReleaseGroupId) {
      // Create a reference via the album to hit the coverartarchive
      images.push(referenceImage('album', firstReleaseGroupId));
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

export class MusicBrainzDatabaseProvider implements Provider {
  public readonly id = 'musicbrainz';
  public readonly label = 'MusicBrainz';
  public readonly icon = Disc3;
  public status: ProviderStatus = ProviderStatus.IDLE;

  private fetcher: Fetcher = secureFetch;

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
    this.externalFetcher = fetcher;
    this.status = ProviderStatus.READY;
  };

  public readonly testImageKeys = nonEmpty(ALBUM_THRILLER_ID, ARTIST_DAFT_PUNK_ID);

  private externalFetcher: Fetcher = secureFetch;

  public resolveImage = async (key: string): Promise<string | null> => {
    try {
      if (key.startsWith('album:')) {
        const id = key.replace('album:', '');
        return `https://coverartarchive.org/release-group/${id}/front`;
      }

      if (key.startsWith('artist:')) {
        const id = key.replace('artist:', '');

        // Tier 1: Fanart.tv (Optional)
        const fanartRes = await this.resolveImageFromFanart(id);
        if (fanartRes) return fanartRes;

        // Tier 2: Wikidata Fallback
        const wikidataRes = await this.resolveImageFromWikidata(id);
        if (wikidataRes) return wikidataRes;
      }
    } catch {
      return null;
    }
  };

  public async searchAlbums(
    params: SearchParams,
    searchOptions: FilterDefinition<MBReleaseGroup>[],
  ): Promise<SearchResult<MBReleaseGroup>> {
    try {
      const appliedFilters = applyFilters(params.filters, searchOptions);

      const queryStr = buildAlbumLuceneQuery({
        term: params.query,
        artistId: appliedFilters.artistId as string | undefined,
        artist: appliedFilters.artist as string | undefined,
        primarytype: appliedFilters.primarytype as string | undefined,
        secondarytype: appliedFilters.secondarytype as string | string[] | undefined,
        status: appliedFilters.status as string | undefined,
        firstreleasedate: appliedFilters.firstreleasedate as { min?: string; max?: string } | undefined,
        tag: appliedFilters.tag as string | undefined,
      });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMB<MBReleaseGroupListResponse>('/release-group', apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(MBReleaseGroupSchema).parse(data['release-groups']);
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

      return result as SearchResult<MBReleaseGroup>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public async searchArtists(
    params: SearchParams,
    searchOptions: FilterDefinition<MBArtist>[],
  ): Promise<SearchResult<MBArtist>> {
    try {
      const appliedFilters = applyFilters(params.filters, searchOptions);
      
      const queryStr = buildArtistLuceneQuery({
        term: params.query,
        type: appliedFilters.type as string | undefined,
        country: appliedFilters.country as string | undefined,
        begin: appliedFilters.begin as { min?: string; max?: string } | undefined,
        tag: appliedFilters.tag as string | undefined,
      });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMB<MBArtistListResponse>('/artist', apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(MBArtistSchema).parse(data.artists);
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

      return result as SearchResult<MBArtist>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public async fetchMB<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const query = new URLSearchParams({ ...params, fmt: 'json' });
    const queryString = query.toString();
    const url = `${MB_BASE_URL}${endpoint}?${queryString}`;

    return this.fetcher<T>(url, {
      ...options,
      headers: {
        'User-Agent': MB_USER_AGENT,
        Accept: 'application/json',
      },
    });
  }

  public async searchRecordings(
    params: SearchParams,
    searchOptions: FilterDefinition<MBRecording>[],
  ): Promise<SearchResult<MBRecording>> {
    try {
      const appliedFilters = applyFilters(params.filters, searchOptions);

      const queryStr = buildRecordingLuceneQuery({
        term: params.query,
        artistId: appliedFilters.artistId as string | undefined,
        artist: appliedFilters.artist as string | undefined,
        releaseGroupId: appliedFilters.albumId as string | undefined,
        release: appliedFilters.release as string | undefined,
        video: appliedFilters.video !== undefined ? Boolean(appliedFilters.video) : undefined,
        dur: appliedFilters.dur as { min?: string; max?: string } | undefined,
        tag: appliedFilters.tag as string | undefined,
      });

      const limit = params.limit || 20;
      const offset = ((params.page || 1) - 1) * limit;

      const apiParams: Record<string, string> = {
        query: queryStr,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      const data = await this.fetchMB<MBRecordingListResponse>('/recording', apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(MBRecordingSchema).parse(data.recordings || []);
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

      return result as SearchResult<MBRecording>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public readonly entities = [
    new MusicBrainzAlbumEntity(this),
    new MusicBrainzArtistEntity(this),
    new MusicBrainzRecordingEntity(this),
  ] as const;
  private async resolveImageFromWikidata(id: string): Promise<string | null> {
    try {
      const mbRes = await this.fetchMB<{ relations?: { type: string; url: { resource: string } }[] }>(
        `/artist/${id}`,
        { inc: 'url-rels' }
      );

      const wikidataUrl = mbRes.relations?.find((r) => r.type === 'wikidata')?.url?.resource;
      if (!wikidataUrl) return null;

      const QID = wikidataUrl.split('/').pop();
      if (!QID) return null;

      const wdData = await this.externalFetcher<{ claims?: { P18?: [{ mainsnak?: { datavalue?: { value?: string } } }] } }>(
        `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${QID}&property=P18&format=json`,
        { headers: { 'User-Agent': MB_USER_AGENT } }
      );

      const fileClaim = wdData?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (fileClaim && typeof fileClaim === 'string') {
        const fileName = fileClaim.replaceAll(' ', '_');
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=800`;
      }
    } catch {
      // Fallthrough
    }
    return null;
  }

  private async resolveImageFromFanart(id: string): Promise<string | null> {
    const fanartKey = typeof process !== 'undefined' ? process.env?.FANART_TV_API_KEY : null;
    if (fanartKey) {
      try {
        const data = await this.externalFetcher<{ artistthumb?: [{ url?: string }] }>(`https://webservice.fanart.tv/v3/music/${id}`, {
          headers: { 'api-key': fanartKey, Accept: 'application/json' },
        });
        const url = data?.artistthumb?.[0]?.url;
        if (url) return url;
      } catch {
        // Silently fallback on failure
      }
    }
    return null;
  }
}
