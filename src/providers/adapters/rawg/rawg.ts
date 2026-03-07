/**
 * @file RAWG Database Provider Implementation
 * @description Provides support for Video Games and Developers via the RAWG API.
 */

import { Building2, Gamepad2 } from 'lucide-react';

import { applyFilters, handleDatabaseError } from '@/providers/utils';
import { createSort,SortDirection } from '@/search/schemas';
import { FilterDefinition } from '@/search/schemas';

import { toCompositeId } from '@/items/schemas';
import { referenceImage,urlImage } from '@/items/schemas';
import { Item, ItemDetails, ItemDetailsSchema, ItemSchema } from '@/items/schemas';
import { ProviderStatus } from '@/providers/types';
import { DatabaseEntity, DatabaseProvider, Fetcher } from '@/providers/types';
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

import { createBooleanFilter, createRangeFilter, createSelectFilter } from '@/search/schemas';

// --- Game Entity Configuration ---

const GAME_SEARCH_OPTIONS: FilterDefinition[] = [
  createBooleanFilter({
    id: 'precise',
    label: 'Precise Search',
    defaultValue: true,
    mapTo: 'search_precise',
    helperText: 'Disable fuzzy matching for exact results',
  }),
];

const GAME_FILTERS: FilterDefinition[] = [
  createRangeFilter({
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
    }
  }),
  createSelectFilter({
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
    createSort({ id: 'relevance', label: 'Relevance' }),
    createSort({ 
      id: 'rating', 
      label: 'Rating (Highest)', 
      defaultDirection: SortDirection.DESC,
      getTestValue: (raw: RAWGGame) => raw.rating ?? 0
    }),
    createSort({ 
      id: 'released', 
      label: 'Release Date', 
      defaultDirection: SortDirection.DESC,
      getTestValue: (raw: RAWGGame) => raw.released ?? ''
    }),
  ];

  public constructor(private provider: RAWGDatabaseProvider) {}

  public async search(params: SearchParams): Promise<SearchResult> {
    try {
      const apiParams: Record<string, string> = {
        page: (params.page || 1).toString(),
        page_size: params.limit.toString(),
      };

      if (params.query) {
        apiParams.search = params.query;
      }

      // --- Declarative Filter Mapping ---
      // Apply both panel filters and search options using constants directly
      applyFilters(apiParams, params.filters, GAME_FILTERS);
      applyFilters(apiParams, params.filters, GAME_SEARCH_OPTIONS);

      if (params.sort && params.sort !== 'relevance') {
        apiParams.ordering = params.sortDirection === SortDirection.DESC ? `-${params.sort}` : params.sort;
      }

      const data = await this.provider.fetchRawg<RAWGListResponse<RAWGGame>>('/games', apiParams, { signal: params.signal });
      const items = data.results.map(game => mapGameToItem(game, this.provider.id));

      const currentPage = params.page || 1;
      const totalPages = Math.ceil(data.count / params.limit);

      return {
        items,
        raw: data.results,
        pagination: {
          currentPage,
          totalPages,
          totalCount: data.count,
          hasNextPage: currentPage < totalPages,
        },
      };
    } catch (error) {
      throw handleDatabaseError(error, this.provider.id);
    }
  }

  public async getDetails(dbId: string, options?: { signal?: AbortSignal }): Promise<ItemDetails> {
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
  }
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

export class RAWGDeveloperEntity implements DatabaseEntity<RAWGDeveloper> {
  public readonly id = 'developer';
  public readonly branding = {
    label: 'Developer',
    labelPlural: 'Developers',
    icon: Building2,
    colorClass: 'text-blue-400',
  };
  public readonly searchOptions = [
    createBooleanFilter({
      id: 'precise',
      label: 'Precise Search',
      defaultValue: false, // Developers search is not precise by default
      mapTo: 'search_precise',
      helperText: 'Disable fuzzy matching for exact results',
    }),
  ];
  public readonly filters = [];
  public readonly sortOptions = [
    createSort({ id: 'relevance', label: 'Relevance' }),
    createSort({ 
      id: 'name', 
      label: 'Name', 
      defaultDirection: SortDirection.ASC,
      getTestValue: (raw: RAWGDeveloper) => raw.name
    }),
    createSort({ 
      id: 'games_count', 
      label: 'Games Count', 
      defaultDirection: SortDirection.DESC,
      getTestValue: (raw: RAWGDeveloper) => raw.games_count
    }),
  ];

  public constructor(private provider: RAWGDatabaseProvider) {}

  public async search(params: SearchParams): Promise<SearchResult> {
    try {
      const apiParams: Record<string, string> = {
        page: (params.page || 1).toString(),
        page_size: params.limit.toString(),
      };

      if (params.query) {
        apiParams.search = params.query;
      }

      applyFilters(apiParams, params.filters, [
        { id: 'precise', label: 'Precise', mapTo: 'search_precise' } as any
      ]);

      if (params.sort && params.sort !== 'relevance') {
        apiParams.ordering = params.sortDirection === SortDirection.DESC ? `-${params.sort}` : params.sort;
      }

      const data = await this.provider.fetchRawg<RAWGListResponse<RAWGDeveloper>>('/developers', apiParams, { signal: params.signal });
      const items = data.results.map(dev => mapDeveloperToItem(dev, this.provider.id));

      const currentPage = params.page || 1;
      const totalPages = Math.ceil(data.count / params.limit);

      return {
        items,
        raw: data.results,
        pagination: {
          currentPage,
          totalPages,
          totalCount: data.count,
          hasNextPage: currentPage < totalPages,
        },
      };
    } catch (error) {
      throw handleDatabaseError(error, this.provider.id);
    }
  }

  public async getDetails(dbId: string, options?: { signal?: AbortSignal }): Promise<ItemDetails> {
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
  }
}

/**
 * RAWG Database Provider Implementation
 */
export class RAWGDatabaseProvider implements DatabaseProvider<[RAWGGameEntity, RAWGDeveloperEntity]> {
  public id = 'rawg';
  public label = 'RAWG';
  public icon = Gamepad2;
  public status: ProviderStatus = ProviderStatus.IDLE;
  private fetcher: Fetcher = secureFetch as unknown as Fetcher;

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
  };

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

  public entities: [RAWGGameEntity, RAWGDeveloperEntity] = [
    new RAWGGameEntity(this),
    new RAWGDeveloperEntity(this)
  ];
}

// Export a singleton instance
export const RAWGDatabase = new RAWGDatabaseProvider();
