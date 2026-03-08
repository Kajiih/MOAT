/**
 * @file RAWG Database Provider Implementation
 * @description Provides support for Video Games and Developers via the RAWG API.
 */

import { Building2, Gamepad2 } from 'lucide-react';

import { applyFilters, handleDatabaseError } from '@/providers/utils';
import { createSortSuite, SortDirection } from '@/search/schemas';
import { FilterDefinition } from '@/search/schemas';

import { toCompositeId } from '@/items/schemas';
import { referenceImage, urlImage } from '@/items/schemas';
import { Item, ItemDetails, ItemDetailsSchema, ItemSchema } from '@/items/schemas';
import { ProviderStatus } from '@/providers/types';
import { DatabaseEntity, DatabaseProvider, Fetcher, NonEmptyArray, nonEmpty } from '@/providers/types';
import { SearchParams, SearchResult, SearchResultSchema } from '@/search/schemas';
import { secureFetch } from '@/providers/api-client';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * RAWG API Types (Internal to the provider)
 */
export interface RAWGGame {
  id: number;
  slug: string;
  name: string;
  released?: string;
  background_image?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number;
  added?: number;
  created?: string;
  updated?: string;
  platforms?: { platform: { id: number; name: string; slug: string } }[];
  parent_platforms?: { platform: { id: number; name: string; slug: string } }[];
  developers?: { id: number; name: string; slug: string }[];
  description_raw?: string;
  genres?: { name: string }[];
  tags?: { name: string; language: string }[];
}

export interface RAWGDeveloper {
  id: number;
  name: string;
  slug: string;
  games_count: number;
  image_background: string;
  description?: string;
}

interface RAWGListResponse<T> {
  count: number;
  results: T[];
}

import { createFilterSuite } from '@/search/schemas';

const rawgGameFilters = createFilterSuite<RAWGGame>();
const rawgGameSorts = createSortSuite<RAWGGame>();

// --- Game Entity Configuration ---
const THE_WITCHER_3_ID = '3328';
const ELDEN_RING_ID = '326243';

const GAME_SEARCH_OPTIONS: FilterDefinition<any, RAWGGame>[] = [
  rawgGameFilters.boolean({
    id: 'precise',
    label: 'Precise Search',
    defaultValue: true,
    mapTo: 'search_precise',
    helperText: 'Disable fuzzy matching for exact results',
    testCases: [
      { 
        value: true, 
        query: 'The Watcher 3',
        verifyResults: (items) => {
          const ids = items.map(i => i.id.toString());
          // Precise: true should NOT return Witcher 3 for typo "The Watcher 3"
          if (ids.includes(THE_WITCHER_3_ID)) {
            throw new Error(`Found Witcher 3 (${THE_WITCHER_3_ID}) in precise results for typo "The Watcher 3"`);
          }
        },
      },
      { 
        value: false,
        query: 'The Watcher 3',
        verifyResults: (items) => {
          const ids = items.map(i => i.id.toString());
          // Precise: false SHOULD return Witcher 3
          if (!ids.includes(THE_WITCHER_3_ID)) {
            throw new Error(`Did NOT find Witcher 3 (${THE_WITCHER_3_ID}) in fuzzy results for typo "The Watcher 3"`);
          }
        },
      },
      {
        value: true,
        query: 'Elder Ring',
        verifyResults: (items) => {
          const ids = items.map(i => i.id.toString());
          // Elden Ring
          if (ids.includes(ELDEN_RING_ID)) {
            throw new Error(`Found Elden Ring (${ELDEN_RING_ID}) in precise results for typo "Elder Ring"`);
          }
        },
      },
      {
        value: false,
        query: 'Elder Ring',
        verifyResults: (items) => {
          const ids = items.map(i => i.id.toString());
          if (!ids.includes(ELDEN_RING_ID)) {
            throw new Error(`Did NOT find Elden Ring (${ELDEN_RING_ID}) in fuzzy results for typo "Elder Ring"`);
          }
        },
      }
    ]
  }),
];

const GAME_FILTERS: FilterDefinition<any, RAWGGame>[] = [
  rawgGameFilters.range({
    id: 'yearRange',
    label: 'Release Year',
    minPlaceholder: 'From YYYY',
    maxPlaceholder: 'To YYYY',
    mapTo: 'dates',
    transform: (val) => {
      if (!val.min && !val.max) return;
      const start = val.min ? `${val.min}-01-01` : '1970-01-01';
      const end = val.max ? `${val.max}-12-31` : '2030-12-31';
      return `${start},${end}`;
    },
    testCases: [
      { 
        value: { min: '2020', max: '2022' }, 
        match: (item) => {
          if (!item.released) return false;
          const year = parseInt(item.released.split('-')[0]);
          return year >= 2020 && year <= 2022;
        }
      }
    ]
  }),
  rawgGameFilters.select({
    id: 'platform',
    label: 'Platform',
    mapTo: 'platforms',
    options: [
      { label: 'All Platforms', value: '' },
      { label: 'PC', value: '4' },
      { label: 'PlayStation 5', value: '187' },
      { label: 'Xbox Series S/X', value: '186' },
      { label: 'Nintendo Switch', value: '7' },
    ],
    testCases: [
      {
        value: '7', // Switch
        match: (item) => item.platforms?.some(p => p.platform.id === 7) ?? false
      }
    ]
  })
];

export class RAWGGameEntity implements DatabaseEntity<RAWGGame> {
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
      extractValue: (raw) => raw.rating ?? 0
    }),
    rawgGameSorts.create({ 
      id: 'released', 
      label: 'Release Date', 
      defaultDirection: SortDirection.DESC,
      extractValue: (raw) => raw.released ?? ''
    }),
    rawgGameSorts.create({ 
      id: 'added', 
      label: 'Popularity (Added count)', 
      defaultDirection: SortDirection.DESC,
      extractValue: (raw) => raw.added ?? 0
    }),
    rawgGameSorts.create({ 
      id: 'created', 
      label: 'Creation Date', 
      defaultDirection: SortDirection.DESC,
      extractValue: (raw) => raw.created ?? ''
    }),
    rawgGameSorts.create({ 
      id: 'updated', 
      label: 'Update Date', 
      defaultDirection: SortDirection.DESC,
      extractValue: (raw) => raw.updated ?? ''
    }),
    rawgGameSorts.create({ 
      id: 'metacritic', 
      label: 'Metacritic Score', 
      defaultDirection: SortDirection.DESC,
      extractValue: (raw) => raw.metacritic ?? 0
    }),
  ];

  public readonly defaultTestQueries = nonEmpty("Baldur's Gate", 'Clair Obscur');
  public readonly testDetailsIds = nonEmpty(THE_WITCHER_3_ID, ELDEN_RING_ID);

  public constructor(private provider: RAWGDatabaseProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<RAWGGame>> => {
    return this.provider.searchEntities<RAWGGame>(params, [...GAME_FILTERS, ...GAME_SEARCH_OPTIONS], '/games', (game) => mapGameToItem(game, this.provider.id));
  };

  public readonly getNextParams = (params: SearchParams, result: SearchResult): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly getDetails = async (dbId: string, options?: { signal?: AbortSignal }): Promise<ItemDetails> => {
    try {
      const game = await this.provider.fetchRawg<RAWGGame>(`/games/${dbId}`, {}, { signal: options?.signal });

      const tags = [
        ...(game.genres?.map(g => g.name) ?? []),
        ...(game.tags?.filter(t => t.language === 'eng').map(t => t.name) ?? []).slice(0, 10),
      ];

      const relatedEntities = game.developers?.map(dev => ({
        label: 'Developer',
        name: dev.name,
        identity: { dbId: dev.id.toString(), databaseId: this.provider.id, entityId: 'developer' },
      })) ?? [];

      const item = mapGameToItem(game, this.provider.id);
      const details: ItemDetails = {
        ...item,
        description: game.description_raw,
        tags,
        relatedEntities,
        urls: [{ type: 'rawg', url: `https://rawg.io/games/${game.slug}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleDatabaseError(error, this.provider.id);
    }
  };
}

/**
 * Maps a RAWG Game API response to our internal Item model.
 * @param game
 * @param databaseId
 */
function mapGameToItem(game: RAWGGame, databaseId: string): Item {
  const identity = { dbId: game.id.toString(), databaseId, entityId: 'game' };
  
  const images = [
    ...(game.background_image ? [urlImage(game.background_image)] : []),
    ...(game.slug ? [referenceImage('wikidata', `slug:${game.slug}`)] : []),
  ];

  const item: Item = {
    id: toCompositeId(identity),
    identity,
    title: game.name,
    images,
    subtitle: [game.developers?.[0]?.name, game.released?.split('-')[0]].filter(Boolean).join(' • '),
    tertiaryText: game.parent_platforms?.map(p => p.platform.name).join(', '),
    rating: game.rating,
  };

  if (game.metacritic) {
    item.details = {
      extendedData: {
        metacritic: game.metacritic.toString(),
      }
    };
  }

  return ItemSchema.parse(item);
}

/**
 * Maps a RAWG Developer API object to our internal Item format.
 */
function mapDeveloperToItem(dev: RAWGDeveloper, databaseId: string): Item {
  const item: Item = {
    id: `${databaseId}:developer:${dev.id}`,
    identity: {
      databaseId,
      entityId: 'developer',
      dbId: dev.id.toString(),
    },
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

export class RAWGDeveloperEntity implements DatabaseEntity<RAWGDeveloper> {
  public readonly id = 'developer';
  public readonly branding = {
    label: 'Developer',
    labelPlural: 'Developers',
    icon: Building2,
    colorClass: 'text-blue-400',
  };
  public readonly searchOptions: FilterDefinition<any, RAWGDeveloper>[] = [];
  public readonly filters: FilterDefinition<any, RAWGDeveloper>[] = [];
  public readonly sortOptions = [
    rawgDevSorts.create({ id: 'relevance', label: 'Relevance' }),
  ];

  public readonly defaultTestQueries = nonEmpty('Ubisoft', 'Nintendo');
  public readonly testDetailsIds = nonEmpty(UBISOFT_ID, NINTENDO_ID);

  public constructor(private provider: RAWGDatabaseProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0]?.id,
    sortDirection: this.sortOptions[0]?.defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<RAWGDeveloper>> => {
    return this.provider.searchEntities<RAWGDeveloper>(params, this.searchOptions, '/developers', (dev) => mapDeveloperToItem(dev, this.provider.id));
  };

  public readonly getNextParams = (params: SearchParams, result: SearchResult): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly getDetails = async (dbId: string, options?: { signal?: AbortSignal }): Promise<ItemDetails> => {
    try {
      const dev = await this.provider.fetchRawg<RAWGDeveloper>(`/developers/${dbId}`, {}, { signal: options?.signal });
      const item = mapDeveloperToItem(dev, this.provider.id);

      const details: ItemDetails = {
        ...item,
        description: dev.description,
        tags: [], // RAWG Developer API does not provide tags directly
        relatedEntities: [], // RAWG Developer API does not provide related entities directly
        urls: [{ type: 'rawg', url: `https://rawg.io/developers/${dev.slug}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleDatabaseError(error, this.provider.id);
    }
  };
}

/**
 * RAWG Database Provider Implementation
 */
export class RAWGDatabaseProvider implements DatabaseProvider {
  public readonly id = 'rawg';
  public readonly label = 'RAWG';
  public readonly icon = Gamepad2;
  public status: ProviderStatus = ProviderStatus.IDLE;
  private fetcher: Fetcher = secureFetch as unknown as Fetcher;

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
  };

  public readonly testImageKeys = nonEmpty('3328'); // The Witcher 3 ID

  public resolveImage = async (key: string): Promise<string | null> => {
    try {
      // While RAWG provides absolute URLs immediately in search results,
      // we can implement resolveImage to fetch a game's main image by its ID or slug.
      const game = await this.fetchRawg<{ background_image: string | null }>(`/games/${key}`);
      return game.background_image || null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Generic helper to search for entities of any type
   */
  public async searchEntities<T extends { id: number | string }>(
    params: SearchParams,
    searchOptions: FilterDefinition<any, T>[],
    endpoint: string,
    mapper: (raw: T) => Item
  ): Promise<SearchResult<T>> {
    try {
      const apiParams: Record<string, string> = {
        page: (params.page || 1).toString(),
        page_size: params.limit.toString(),
      };

      if (params.query) {
        apiParams.search = params.query;
      }

      applyFilters(apiParams, params.filters, searchOptions);

      if (params.sort && params.sort !== 'relevance') {
        apiParams.ordering = params.sortDirection === SortDirection.DESC ? `-${params.sort}` : params.sort;
      }

      const data = await this.fetchRawg<RAWGListResponse<T>>(endpoint, apiParams, { signal: params.signal });
      const items = data.results.map(mapper);

      const currentPage = params.page || 1;
      const totalPages = Math.ceil(data.count / params.limit);

      const result = SearchResultSchema.parse({
        items,
        raw: data.results,
        pagination: {
          currentPage,
          totalPages,
          totalCount: data.count,
          hasNextPage: currentPage < totalPages,
        },
      });

      return result as SearchResult<T>;
    } catch (error) {
      throw handleDatabaseError(error, this.id);
    }
  }

  /**
   * Helper to fetch from RAWG using the injected fetcher
   * Made internal to the file but accessible to entities
   * @param endpoint - The API endpoint to fetch from.
   * @param params - The query parameters.
   * @param options - Optional fetch options (e.g., abort signal).
   * @param options.signal
   * @returns The parsed JSON response.
   */
  public async fetchRawg<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options?: { signal?: AbortSignal }
  ): Promise<T> {
    const apiKey = process.env.RAWG_API_KEY || 'test-key'; // Fallback for tests

    const query = new URLSearchParams(params);
    query.append('key', apiKey);

    return this.fetcher<T>(`${RAWG_BASE_URL}${endpoint}?${query.toString()}`, { signal: options?.signal });
  }

  public readonly entities = [
    new RAWGGameEntity(this),
    new RAWGDeveloperEntity(this)
  ] as const;
}

// Export a singleton instance
export const RAWGDatabase = new RAWGDatabaseProvider();
