/**
 * @file MusicBrainz Provider Implementation
 * @description Provides support for Music (Albums and Artists) via the MusicBrainz API.
 */

import { Disc3, Mic2 } from 'lucide-react';
import { z } from 'zod';

import { toCompositeId } from '@/items/identity';
import { urlImage } from '@/items/images';
import { Item, ItemDetails, ItemDetailsSchema, ItemSchema } from '@/items/items';
import { secureFetch } from '@/providers/api-client';
import { ProviderStatus } from '@/providers/types';
import { Entity, Fetcher, nonEmpty, Provider } from '@/providers/types';
import { handleProviderError } from '@/providers/utils';
import { FilterDefinition } from '@/search/filter-schemas';
import { SearchParams, SearchResult, SearchResultSchema } from '@/search/search-schemas';
import { createSortSuite } from '@/search/sort-schemas';

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';
const MB_USER_AGENT = 'TierListApp/1.0.0 ( contact@example.com )';

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

export const MBArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullish(),
  country: z.string().nullish(),
  tags: z.array(MBTagSchema).nullish(),
});
export type MBArtist = z.infer<typeof MBArtistSchema>;

export const MBReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'primary-type': z.string().nullish(),
  'first-release-date': z.string().nullish(),
  'artist-credit': z.array(MBArtistCreditSchema).nullish(),
  tags: z.array(MBTagSchema).nullish(),
});
export type MBReleaseGroup = z.infer<typeof MBReleaseGroupSchema>;

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

const mbAlbumSorts = createSortSuite<MBReleaseGroup>();

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
  public readonly edgeShortQuery = 'zzzzzzzzzzzzz';

  public constructor(private provider: MusicBrainzDatabaseProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<MBReleaseGroup>> => {
    return this.provider.searchAlbums(params);
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
        { inc: 'artist-credits+tags' },
        { signal: options?.signal },
      );
      const album = MBReleaseGroupSchema.parse(rawData);

      const item = mapAlbumToItem(album, this.provider.id);
      const tags = (album.tags || []).map((t) => t.name).slice(0, 10);

      const details: ItemDetails = {
        ...item,
        tags,
        urls: [{ type: 'musicbrainz', url: `https://musicbrainz.org/release-group/${album.id}` }],
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
  public readonly edgeShortQuery = 'zzzzzzzzzzzzz';

  public constructor(private provider: MusicBrainzDatabaseProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<MBArtist>> => {
    return this.provider.searchArtists(params);
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
        { inc: 'tags' },
        { signal: options?.signal },
      );
      const artist = MBArtistSchema.parse(rawData);

      const item = mapArtistToItem(artist, this.provider.id);
      const tags = (artist.tags || []).map((t) => t.name).slice(0, 10);

      const details: ItemDetails = {
        ...item,
        tags,
        urls: [{ type: 'musicbrainz', url: `https://musicbrainz.org/artist/${artist.id}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

function mapArtistToItem(artist: MBArtist, databaseId: string): Item {
  const identity = { dbId: artist.id, databaseId, entityId: 'artist' };

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: artist.name,
    images: [], // MB API does not provide artist images easily without wikidata linkage
    subtitle: artist.country || undefined,
    tertiaryText: artist.type || undefined,
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

  public readonly testImageKeys = nonEmpty(ALBUM_THRILLER_ID);

  public resolveImage = async (key: string): Promise<string | null> => {
    try {
      // Cover Art Archive provides redirects to images, we can check if it exists by a simple HEAD request,
      // but for resolution we can just return the constructed URL.
      return `https://coverartarchive.org/release-group/${key}/front`;
    } catch {
      return null;
    }
  };

  public async searchAlbums(params: SearchParams): Promise<SearchResult<MBReleaseGroup>> {
    try {
      const queryStr = params.query ? `"${params.query}"` : '"rock"';

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

  public async searchArtists(params: SearchParams): Promise<SearchResult<MBArtist>> {
    try {
      const queryStr = params.query ? `"${params.query}"` : '"pop"';

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

  public readonly entities = [
    new MusicBrainzAlbumEntity(this),
    new MusicBrainzArtistEntity(this),
  ] as const;
}
