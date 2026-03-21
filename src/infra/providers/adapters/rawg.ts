/**
 * @file RAWG Provider Implementation
 * @description Provides support for Video Games and Developers via the RAWG API.
 */

import { Building2, Gamepad2 } from 'lucide-react';

import { toCompositeId } from '@/domain/items/identity';
import { referenceImage, urlImage, UrlImageSource } from '@/domain/items/images';
import { Item, ItemDetails, ItemDetailsSchema, ItemSchema, Subtitle } from '@/domain/items/items';
import { ProviderStatus } from '@/domain/providers/types';
import { Entity, Fetcher, nonEmpty, Provider } from '@/domain/providers/types';
import { secureFetch } from '@/infra/providers/api-client';
import {
  applyFilters,
  extractRelatedEntities,
  extractTags,
  handleProviderError,
} from '@/infra/providers/utils';
import { FilterDefinition } from '@/presentation/search/filter-schemas';
import {
  SearchParams,
  SearchResult,
  SearchResultSchema,
} from '@/presentation/search/search-schemas';
import { createSortSuite, SortDirection } from '@/presentation/search/sort-schemas';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * RAWG API Types (Internal to the provider)
 */
import { z } from 'zod';

const RAWGPlatformSchema = z.object({ id: z.number(), name: z.string(), slug: z.string() });
const RAWGNamedEntitySchema = z.object({ name: z.string() });
const RAWGTaggableEntitySchema = z.object({ name: z.string(), language: z.string() });

const RAWGGameSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  released: z.string().nullish(),
  background_image: z.string().nullish(),
  rating: z.number().nullish(),
  ratings_count: z.number().nullish(),
  metacritic: z.number().nullish(),
  added: z.number().nullish(),
  created: z.string().nullish(),
  updated: z.string().nullish(),
  platforms: z.array(z.object({ platform: RAWGPlatformSchema })).nullish(),
  parent_platforms: z.array(z.object({ platform: RAWGPlatformSchema })).nullish(),
  developers: z.array(RAWGPlatformSchema).nullish(),
  description_raw: z.string().nullish(),
  genres: z.array(RAWGNamedEntitySchema).nullish(),
  tags: z.array(RAWGTaggableEntitySchema).nullish(),
});

type RAWGGame = z.infer<typeof RAWGGameSchema>;

const RAWGDeveloperSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  games_count: z.number(),
  image_background: z.string().nullish(),
  description: z.string().nullish(),
});

export type RAWGDeveloper = z.infer<typeof RAWGDeveloperSchema>;

interface RAWGListResponse<T> {
  count: number;
  results: T[];
}

import { createFilterSuite, mapTo } from '@/presentation/search/filter-schemas';

const rawgGameFilters = createFilterSuite<RAWGGame>();
const rawgGameSorts = createSortSuite<RAWGGame>();

// --- Game Entity Configuration ---
const THE_WITCHER_3_ID = '3328';
const ELDEN_RING_ID = '326243';

const GAME_SEARCH_OPTIONS: FilterDefinition<RAWGGame>[] = [
  rawgGameFilters.boolean({
    id: 'precise',
    label: 'Precise Search',
    defaultValue: true,
    transform: mapTo('search_precise'),
    helperText: 'Disable fuzzy matching for exact results',
    testCases: [
      {
        value: true,
        query: 'The Watcher 3',
        expectNone: (item: RAWGGame) => item.id.toString() === THE_WITCHER_3_ID,
        expectNoneMessage: `be Witcher 3 (${THE_WITCHER_3_ID}) for typo "The Watcher 3"`,
      },
      {
        value: false,
        query: 'The Watcher 3',
        expectSome: (item: RAWGGame) => item.id.toString() === THE_WITCHER_3_ID,
        expectSomeMessage: `be Witcher 3 (${THE_WITCHER_3_ID}) in fuzzy results for typo "The Watcher 3"`,
      },
      {
        value: true,
        query: 'Elder Ring',
        expectNone: (item: RAWGGame) => item.id.toString() === ELDEN_RING_ID,
        expectNoneMessage: `be Elden Ring (${ELDEN_RING_ID}) for typo "Elder Ring"`,
      },
      {
        value: false,
        query: 'Elder Ring',
        expectSome: (item: RAWGGame) => item.id.toString() === ELDEN_RING_ID,
        expectSomeMessage: `be Elden Ring (${ELDEN_RING_ID}) in fuzzy results for typo "Elder Ring"`,
      },
    ],
  }),
];

const GAME_FILTERS: FilterDefinition<RAWGGame>[] = [
  rawgGameFilters.range({
    id: 'yearRange',
    label: 'Release Year',
    minPlaceholder: 'From YYYY',
    maxPlaceholder: 'To YYYY',
    transform: (val: { min?: string; max?: string }): Record<string, string> => {
      if (!val.min && !val.max) return {};
      const start = val.min ? `${val.min}-01-01` : '1970-01-01';
      const end = val.max ? `${val.max}-12-31` : '2030-12-31';
      return { dates: `${start},${end}` };
    },
    testCases: [
      {
        value: { min: '2020', max: '2022' },
        expectAll: (item: RAWGGame) => {
          if (!item.released) return false;
          const year = Number.parseInt(item.released.split('-')[0]);
          return year >= 2020 && year <= 2022;
        },
      },
    ],
  }),
  rawgGameFilters.select({
    id: 'platform',
    label: 'Platform',
    emptyLabel: 'All Platforms',
    transform: mapTo('platforms'),
    options: [
      { label: 'PC', value: '4' },
      { label: 'PlayStation 5', value: '187' },
      { label: 'Xbox Series S/X', value: '186' },
      { label: 'Nintendo Switch', value: '7' },
    ],
    testCases: [
      {
        value: '7', // Switch
        expectAll: (item: RAWGGame) =>
          item.platforms?.some((p: { platform: { id: number } }) => p.platform.id === 7) ?? false,
      },
    ],
  }),
];

class RAWGGameEntity implements Entity<RAWGGame> {
  public readonly id = 'game';
  public readonly branding = {
    label: 'Video Game',
    labelPlural: 'Video Games',
    icon: Gamepad2,
    colorClass: 'text-purple-400',
  };
  public readonly searchOptions = GAME_SEARCH_OPTIONS;
  public readonly filters = GAME_FILTERS;
  public readonly sortOptions = [
    rawgGameSorts.create({ id: 'relevance', label: 'Relevance' }),
    rawgGameSorts.create({
      id: 'name',
      label: 'Name',
      defaultDirection: SortDirection.ASC,
      // Name sorting is functional but we don't test it the RAWG API uses a custom collation (dealing with symbols and non-latin scripts) that doesn't match standard JS string comparison.
      // extractValue: (raw) => raw.name ?? '' //
    }),
    rawgGameSorts.create({
      id: 'rating',
      label: 'Rating (Highest)',
      defaultDirection: SortDirection.DESC,
      extractValue: (raw: RAWGGame) => raw.rating ?? 0,
    }),
    rawgGameSorts.create({
      id: 'released',
      label: 'Release Date',
      defaultDirection: SortDirection.DESC,
      extractValue: (raw: RAWGGame) => raw.released ?? '',
    }),
    rawgGameSorts.create({
      id: 'added',
      label: 'Popularity (Added count)',
      defaultDirection: SortDirection.DESC,
      extractValue: (raw: RAWGGame) => raw.added ?? 0,
    }),
    rawgGameSorts.create({
      id: 'created',
      label: 'Creation Date',
      defaultDirection: SortDirection.DESC,
      extractValue: (raw: RAWGGame) => raw.created ?? '',
    }),
    rawgGameSorts.create({
      id: 'updated',
      label: 'Update Date',
      defaultDirection: SortDirection.DESC,
      extractValue: (raw: RAWGGame) => raw.updated ?? '',
    }),
    rawgGameSorts.create({
      id: 'metacritic',
      label: 'Metacritic Score',
      defaultDirection: SortDirection.DESC,
      extractValue: (raw: RAWGGame) => raw.metacritic ?? 0,
    }),
  ];

  public readonly defaultTestQueries = nonEmpty("Baldur's Gate", 'Clair Obscur');
  public readonly testDetailsIds = nonEmpty(THE_WITCHER_3_ID, ELDEN_RING_ID);
  public readonly edgeShortQuery = 'zzzzzzzzz';

  public constructor(private provider: RAWGProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<RAWGGame>> => {
    return this.provider.searchEntities<RAWGGame>(
      params,
      [...GAME_FILTERS, ...GAME_SEARCH_OPTIONS],
      '/games',
      RAWGGameSchema,
      (game: RAWGGame) => mapGameToItem(game, this.provider.id),
    );
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

  public readonly testImageResolution = nonEmpty({
    key: '3328', // The Witcher 3 ID
    description: 'Resolves game screenshot from RAWG media CDN',
    expectUrlContains: 'media.rawg.io/media/',
  });

  public readonly resolveImage = async (
    key: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string | null> => {
    try {
      const details = await this.getDetails(key, { signal });
      const urlSource = details.images?.find((img): img is UrlImageSource => img.type === 'url');
      if (urlSource?.url) {
        return urlSource.url;
      }
      return null;
    } catch {
      return null;
    }
  };

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchRawg<unknown>(
        `/games/${providerItemId}`,
        {},
        { signal },
      );
      const game = RAWGGameSchema.parse(rawData);

      const tags = [
        ...extractTags(game.genres, (g) => g.name),
        ...extractTags(
          game.tags,
          (t) => t.name,
          (t) => t.language === 'eng',
        ),
      ].slice(0, 10);

      const primaryDev = game.developers?.[0];
      const filteredDevelopers = game.developers?.filter((d) => d.id !== primaryDev?.id) || [];
      const relatedEntities = extractRelatedEntities(filteredDevelopers, (dev) => ({
        label: 'Developer',
        name: dev.name,
        identity: {
          providerItemId: dev.id.toString(),
          providerId: this.provider.id,
          entityId: 'developer',
        },
      }));

      const item = mapGameToItem(game, this.provider.id);
      const details: ItemDetails = {
        ...item,
        description: game.description_raw || undefined,
        tags,
        relatedEntities,
        urls: [{ type: 'rawg', url: `https://rawg.io/games/${game.slug}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

/**
 * Maps a RAWG Game API response to our internal Item model.
 * @param game - The raw game object from the RAWG API.
 * @param providerId - The provider ID this item belongs to.
 * @returns The standardized application Item representation.
 */
function mapGameToItem(game: RAWGGame, providerId: string): Item {
  const identity = { providerItemId: game.id.toString(), providerId, entityId: 'game' };

  const images = [
    ...(game.background_image ? [urlImage(game.background_image)] : []),
    ...(game.slug ? [referenceImage(providerId, 'game', game.slug)] : []),
  ];

  const subtitle: Subtitle = [];
  const primaryDev = game.developers?.[0];
  if (primaryDev) {
    subtitle.push({
      label: 'Developer',
      name: primaryDev.name,
      identity: {
        providerItemId: primaryDev.id.toString(),
        providerId,
        entityId: 'developer',
      },
    });
  }

  const year = game.released?.split('-')[0];
  if (year) {
    subtitle.push(year);
  }

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: game.name,
    images,
    subtitle,
    tertiaryText: game.parent_platforms?.map((p) => p.platform.name).join(', '),
    rating: game.rating || undefined,
  };

  if (game.metacritic) {
    item.details = {
      extendedData: {
        metacritic: game.metacritic.toString(),
      },
    };
  }

  return ItemSchema.parse(item);
}

/**
 * Maps a RAWG Developer API object to our internal Item format.
 * @param dev - The raw developer object from the RAWG API.
 * @param providerId - The provider ID this item belongs to.
 * @returns The standardized application Item representation.
 */
function mapDeveloperToItem(dev: RAWGDeveloper, providerId: string): Item {
  const identity = {
    providerId,
    entityId: 'developer',
    providerItemId: dev.id.toString(),
  };

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: dev.name,
    images: dev.image_background ? [urlImage(dev.image_background)] : [],
    subtitle: `${dev.games_count} games`,
  };

  return ItemSchema.parse(item);
}

// --- Developer Entity Configuration ---
const UBISOFT_ID = '405';
const NINTENDO_ID = '11';

const rawgDevSorts = createSortSuite<RAWGDeveloper>();

class RAWGDeveloperEntity implements Entity<RAWGDeveloper> {
  public readonly id = 'developer';
  public readonly branding = {
    label: 'Developer',
    labelPlural: 'Developers',
    icon: Building2,
    colorClass: 'text-primary',
  };
  public readonly searchOptions: FilterDefinition<RAWGDeveloper>[] = [];
  public readonly filters: FilterDefinition<RAWGDeveloper>[] = [];
  public readonly sortOptions = [rawgDevSorts.create({ id: 'relevance', label: 'Relevance' })];

  public readonly defaultTestQueries = nonEmpty('Ubisoft', 'Nintendo');
  public readonly testDetailsIds = nonEmpty(UBISOFT_ID, NINTENDO_ID);
  public readonly edgeShortQuery = 'zzzzzzzzz';

  public constructor(private provider: RAWGProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<RAWGDeveloper>> => {
    return this.provider.searchEntities<RAWGDeveloper>(
      params,
      this.searchOptions,
      '/developers',
      RAWGDeveloperSchema,
      (dev) => mapDeveloperToItem(dev, this.provider.id),
    );
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

  public readonly resolveImage = async (
    _key?: string,
    _options: { signal?: AbortSignal } = {},
  ): Promise<string | null> => null;

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const rawData = await this.provider.fetchRawg<unknown>(
        `/developers/${providerItemId}`,
        {},
        { signal },
      );
      const dev = RAWGDeveloperSchema.parse(rawData);

      const item = mapDeveloperToItem(dev, this.provider.id);

      const details: ItemDetails = {
        ...item,
        description: dev.description || undefined,
        tags: [], // RAWG Developer API does not provide tags directly
        relatedEntities: [], // RAWG Developer API does not provide related entities directly
        urls: [{ type: 'rawg', url: `https://rawg.io/developers/${dev.slug}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

/**
 * RAWG Provider Implementation
 */
export class RAWGProvider implements Provider {
  public readonly id = 'rawg';
  public readonly label = 'RAWG';
  public readonly icon = Gamepad2;
  public status: ProviderStatus = ProviderStatus.IDLE;

  private fetcher: Fetcher = secureFetch;
  private apiKey: string;

  public constructor(config?: { apiKey: string }) {
    this.apiKey = config?.apiKey || 'test-key';
  }

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
  };

  /**
   * Generic helper to search for entities of any type
   * @param params - The unified SearchParams from the client.
   * @param searchOptions - The list of FilterDefinition available for the query build.
   * @param endpoint - The specific relative RAWG endpoint (e.g. '/games').
   * @param schema - The Zod schema to strictly parse the incoming RAWG array payload.
   * @param mapper - The function that maps RAWG entity types into our internal Item representation.
   * @returns A Promise resolving to the generic SearchResult matching the internal application contract.
   */
  public async searchEntities<T extends { id: number | string }>(
    params: SearchParams,
    searchOptions: FilterDefinition<T>[],
    endpoint: string,
    schema: z.ZodType<T>,
    mapper: (raw: T) => Item,
  ): Promise<SearchResult<T>> {
    try {
      const apiParams: Record<string, string> = {
        page: (params.page || 1).toString(),
        page_size: params.limit.toString(),
        ...applyFilters(params.filters, searchOptions),
      };

      if (params.query) {
        apiParams.search = params.query;
      }

      if (params.sort && params.sort !== 'relevance') {
        apiParams.ordering =
          params.sortDirection === SortDirection.DESC ? `-${params.sort}` : params.sort;
      }

      const data = await this.fetchRawg<RAWGListResponse<unknown>>(endpoint, apiParams, {
        signal: params.signal,
      });
      const parsedResults = z.array(schema).parse(data.results);
      const items = parsedResults.map((item) => mapper(item));

      const currentPage = params.page || 1;
      const totalPages = Math.ceil(data.count / params.limit);

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

      return result as SearchResult<T>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  /**
   * Helper to fetch from RAWG using the injected fetcher
   * Made internal to the file but accessible to entities
   * @param endpoint - The API endpoint to fetch from.
   * @param params - The query parameters.
   * @param options - Optional fetch options (e.g., abort signal).
   * @param options.signal - The abort signal for cancellation.
   * @returns The parsed JSON response.
   */
  public async fetchRawg<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const query = new URLSearchParams(params);
    query.append('key', this.apiKey);

    return this.fetcher<T>(`${RAWG_BASE_URL}${endpoint}?${query.toString()}`, {
      signal: options?.signal,
    });
  }

  public readonly entities = [new RAWGGameEntity(this), new RAWGDeveloperEntity(this)] as const;
}
