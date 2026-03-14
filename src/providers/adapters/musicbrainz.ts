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

const mbArtistFilters = createFilterSuite<MBArtist>();

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';
const MB_USER_AGENT = 'MOAT/1.0.0 ( itskajih@gmail.com )';

/**
 * Lucene Query Builder for MusicBrainz API
 */
export interface LuceneQuery {
  term?: string;
  artist?: string;
  release?: string;
  primarytype?: string;
  type?: string;
  status?: string;
  video?: boolean;
}

export function buildLuceneQuery(query: LuceneQuery): string {
  const parts: string[] = [];

  // Helper to escape Lucene special characters (e.g., +, -, &, ||, !, (, ), {, }, [, ], ^, ", ~, *, ?, :, \, /)
  // We only escape basic ones here that might break queries if users search with them
  const escape = (str: string) => {
    // Escape quotes, colons, and slashes that have special meaning in Lucene
    return str.replace(/(["\\/:])/g, '\\$1');
  };

  if (query.term?.trim()) {
    // If we have a general search term, wrap it in quotes for exact phrase matching
    // or leave it unquoted for generic keyword matching. We'll use quotes for better precision.
    parts.push(`"${escape(query.term.trim())}"`);
  }

  if (query.artist?.trim()) {
    parts.push(`artist:"${escape(query.artist.trim())}"`);
  }

  if (query.release?.trim()) {
    parts.push(`release:"${escape(query.release.trim())}"`);
  }

  if (query.primarytype?.trim()) {
    parts.push(`primarytype:"${escape(query.primarytype.trim())}"`);
  }

  if (query.type?.trim()) {
    parts.push(`type:"${escape(query.type.trim())}"`);
  }

  if (query.status?.trim()) {
    parts.push(`status:"${escape(query.status.trim())}"`);
  }

  if (query.video !== undefined) {
    parts.push(`video:${query.video}`);
  }

  // Combine conditions with AND
  return parts.length > 0 ? parts.join(' AND ') : '""';
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
    const typeCase = (label: string, value: string) => ({
      value,
      label,
    });

    this.filters = [
      mbAlbumFilters.select({
        id: 'primarytype',
        label: 'Release Type',
        options: [
          { label: 'All Types', value: '' },
          { label: 'Album', value: 'album' },
          { label: 'Single', value: 'single' },
          { label: 'EP', value: 'ep' },
          { label: 'Broadcast', value: 'broadcast' },
          { label: 'Other', value: 'other' },
        ],
        testCases: [typeCase('EP', 'ep')],
      }),
      mbAlbumFilters.text({
        id: 'artist',
        label: 'Artist Name',
        placeholder: 'e.g. Radiohead',
        testCases: [
          {
            value: 'Michael Jackson',
            query: 'Thriller',
          },
        ],
      }),
      mbAlbumFilters.select({
        id: 'status',
        label: 'Status',
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
          },
        ],
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
    // Support filtering by artist entity type (Person, Group, etc)
    const typeCase = (label: string, value: string) => ({
      value,
      label,
      match: (item: MBArtist) => item.type?.toLowerCase() === value.toLowerCase(),
    });

    this.filters = [
      mbArtistFilters.select({
        id: 'type',
        label: 'Artist Type',
        options: [
          { label: 'All Types', value: '' },
          { label: 'Person', value: 'person' },
          { label: 'Group / Band', value: 'group' },
          { label: 'Choir', value: 'choir' },
          { label: 'Orchestra', value: 'orchestra' },
          { label: 'Character', value: 'character' },
          { label: 'Other', value: 'other' },
        ],
        testCases: [{ value: 'group' }],
      }),
      mbArtistFilters.text({
        id: 'country',
        label: 'Country (2-letter Code)',
        placeholder: 'e.g. GB, US, FR',
        testCases: [
          {
            value: 'GB',
            query: 'Radiohead',
          },
        ],
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
  const images = [referenceImage('artist', artist.id)];

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
      mbRecordingFilters.text({
        id: 'artist',
        label: 'Artist Name',
        placeholder: 'e.g. Radiohead',
        testCases: [
          {
            value: 'Radiohead',
            query: 'Creep',
          },
        ],
      }),
      mbRecordingFilters.text({
        id: 'release',
        label: 'Album Name',
        placeholder: 'e.g. Pablo Honey',
        testCases: [
          {
            value: 'Pablo Honey',
            query: 'Creep',
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
          },
        ],
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
  let albumTitle = recording.releases?.[0]?.title;
  let tertiaryText = recording.video ? 'Video' : 'Audio';

  if (recording.length) {
    const mins = Math.floor(recording.length / 60000);
    const secs = Math.floor((recording.length % 60000) / 1000);
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
    this.status = ProviderStatus.READY;
  };

  public readonly testImageKeys = nonEmpty(ALBUM_THRILLER_ID, ARTIST_DAFT_PUNK_ID);

  private externalFetcher = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init);

  public resolveImage = async (key: string): Promise<string | null> => {
    try {
      if (key.startsWith('album:')) {
        const id = key.replace('album:', '');
        return `https://coverartarchive.org/release-group/${id}/front`;
      }

      if (key.startsWith('artist:')) {
        const id = key.replace('artist:', '');

        // Tier 1: Fanart.tv (Optional)
        // We will mock process.env since this relies on user API keys
        const fanartKey = typeof process !== 'undefined' ? process.env?.FANART_TV_API_KEY : null;
        if (fanartKey) {
          try {
            const res = await this.externalFetcher(`https://webservice.fanart.tv/v3/music/${id}`, {
              headers: { 'api-key': fanartKey, Accept: 'application/json' },
            });
            if (res.ok) {
              const data = await res.json();
              const url = data?.artistthumb?.[0]?.url;
              if (url) return url;
            }
          } catch {
            // Silently fallback on failure
          }
        }

        // Tier 2: Wikidata Fallback
        // First we must fetch the Wikidata ID from the Artist's MusicBrainz relations
        // To save an HTTP roundtrip if not cached, we use MusicBrainz directly
        try {
          const mbRes = await this.fetchMB<{ relations?: { type: string; url: { resource: string } }[] }>(
            `/artist/${id}`,
            { inc: 'url-rels' }
          );

          const wikidataUrl = mbRes.relations?.find((r) => r.type === 'wikidata')?.url?.resource;
          if (wikidataUrl) {
            const QID = wikidataUrl.split('/').pop();
            if (QID) {
              // Now query Wikidata for P18 (image)
              const wdRes = await this.externalFetcher(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${QID}&property=P18&format=json`);
              if (wdRes.ok) {
                const wdData = await wdRes.json();
                const fileClaim = wdData.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
                if (fileClaim) {
                  // Transform filename to wikimedia commons special URL
                  const fileName = fileClaim.replace(/ /g, '_');
                  // A rough commons direct link (usually requires MD5 hashing for absolute path, 
                  // but wikimedia's Special:FilePath router handles direct filenames perfectly)
                  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=800`;
                }
              }
            }
          }
        } catch {
          // Fallthrough
        }
      }

      // Legacy fallback exactly to release-group just in case
      return `https://coverartarchive.org/release-group/${key}/front`;
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

      const queryStr = buildLuceneQuery({
        term: params.query || 'rock',
        artist: appliedFilters.artist,
        primarytype: appliedFilters.primarytype,
        status: appliedFilters.status,
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
      
      const queryStr = buildLuceneQuery({
        term: params.query || 'pop',
        type: appliedFilters.type,
        // Country is not natively a lucene field in identical way always but MB supports country:"GB"
        ...(appliedFilters.country ? { term: `country:${appliedFilters.country} ${params.query || ''}`.trim() } : {})
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

      const queryStr = buildLuceneQuery({
        term: params.query || 'love',
        artist: appliedFilters.artist,
        release: appliedFilters.release,
        video: appliedFilters.video !== undefined ? Boolean(appliedFilters.video) : undefined,
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
}
