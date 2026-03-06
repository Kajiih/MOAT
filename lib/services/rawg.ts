/**
 * @file RAWG Database Provider Implementation
 * @description Provides support for Video Games and Developers via the RAWG API.
 */

import { Building2, Gamepad2 } from 'lucide-react';

import { 
  DatabaseEntity, 
  DatabaseProvider, 
  Fetcher,
  FilterDefinition,
  Item, 
  ItemDetails, 
  ItemDetailsSchema, 
  ItemSchema,
  ProviderStatus,
  referenceImage, 
  SearchParams, 
  SearchResult, 
  SearchResultSchema,
  toCompositeId,
  urlImage
} from '@/lib/database/types';
import { applyFilters, handleDatabaseError } from '@/lib/database/utils';

import { secureFetch } from './shared/api-client';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * RAWG API Types (Internal to the provider)
 */
interface RAWGGame {
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

interface RAWGListResponse<T> {
  count: number;
  results: T[];
}

// --- Game Entity Configuration ---

const GAME_SEARCH_OPTIONS: FilterDefinition[] = [
  {
    id: 'precise',
    label: 'Precise Search',
    type: 'boolean',
    defaultValue: true,
    mapTo: 'search_precise',
    helperText: 'Disable fuzzy matching for exact results',
  } as FilterDefinition<boolean, string>,
];

const GAME_FILTERS: FilterDefinition[] = [
  { 
    id: 'yearRange', 
    label: 'Release Year', 
    type: 'range', 
    placeholder: 'YYYY',
    mapTo: 'dates',
    transform: (val: { min?: string, max?: string }) => {
      if (!val.min && !val.max) return;
      const start = val.min ? `${val.min}-01-01` : '1970-01-01';
      const end = val.max ? `${val.max}-12-31` : '2030-12-31';
      return `${start},${end}`;
    }
  } as FilterDefinition<{ min?: string, max?: string }, string | undefined>,
  {
    id: 'platform',
    label: 'Platform',
    type: 'select',
    mapTo: 'platforms',
    options: [
      { label: 'All Platforms', value: '' },
      { label: 'PC', value: '4' },
      { label: 'PlayStation 5', value: '187' },
      { label: 'Xbox Series S/X', value: '186' },
      { label: 'Nintendo Switch', value: '7' },
    ],
  } as FilterDefinition<string, string>
];

const createGameEntity = (provider: RAWGDatabaseProvider): DatabaseEntity => ({
  id: 'game',
  branding: {
    label: 'Video Game',
    labelPlural: 'Video Games',
    icon: Gamepad2,
    colorClass: 'text-purple-400',
  },
  searchOptions: GAME_SEARCH_OPTIONS,
  filters: GAME_FILTERS,
  sortOptions: [
    { id: 'relevance', label: 'Relevance' },
    { id: 'rating', label: 'Rating (Highest)', defaultDirection: 'desc' },
    { id: 'released', label: 'Release Date', defaultDirection: 'desc' },
  ],
  search: async (params: SearchParams): Promise<SearchResult> => {
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
        apiParams.ordering = params.sortDirection === 'desc' ? `-${params.sort}` : params.sort;
      }

      const data = await provider.fetchRawg<RAWGListResponse<RAWGGame>>('/games', apiParams, { signal: params.signal });
      
      const items = data.results.map(game => {
        const identity = { dbId: game.id.toString(), databaseId: provider.id, entityId: 'game' };
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
        return ItemSchema.parse(item);
      });

      const currentPage = params.page || 1;
      const totalPages = Math.ceil(data.count / params.limit);

      return SearchResultSchema.parse({
        items,
        pagination: {
          currentPage,
          totalPages,
          totalCount: data.count,
          hasNextPage: currentPage < totalPages,
        },
      });
    } catch (error) {
      throw handleDatabaseError(error, provider.id);
    }
  },
  getDetails: async (dbId: string, options?: { signal?: AbortSignal }): Promise<ItemDetails> => {
    try {
      const game = await provider.fetchRawg<RAWGGame>(`/games/${dbId}`, {}, { signal: options?.signal });

      const tags = [
        ...(game.genres?.map(g => g.name) ?? []),
        ...(game.tags?.filter(t => t.language === 'eng').map(t => t.name) ?? []).slice(0, 10),
      ];

      const relatedEntities = game.developers?.map(dev => ({
        label: 'Developer',
        name: dev.name,
        identity: { dbId: dev.id.toString(), databaseId: provider.id, entityId: 'developer' },
      }));

      const identity = { dbId: game.id.toString(), databaseId: provider.id, entityId: 'game' };
      const details: ItemDetails = {
        id: toCompositeId(identity),
        identity,
        title: game.name,
        images: game.background_image ? [urlImage(game.background_image)] : [],
        subtitle: [game.developers?.[0]?.name, game.released?.split('-')[0]].filter(Boolean).join(' • '),
        tertiaryText: game.parent_platforms?.map(p => p.platform.name).join(', '),
        rating: game.rating,
        description: game.description_raw,
        tags: tags.length > 0 ? tags : undefined,
        relatedEntities: relatedEntities && relatedEntities.length > 0 ? relatedEntities : undefined,
        urls: [{ type: 'rawg', url: `https://rawg.io/games/${game.slug}` }],
      };

      return ItemDetailsSchema.parse(details);
    } catch (error) {
      throw handleDatabaseError(error, provider.id);
    }
  }
});

// --- Developer Entity Configuration ---

const createDeveloperEntity = (_provider: RAWGDatabaseProvider): DatabaseEntity => ({
  id: 'developer',
  branding: {
    label: 'Developer',
    labelPlural: 'Developers',
    icon: Building2,
    colorClass: 'text-blue-400',
  },
  searchOptions: [],
  filters: [],
  sortOptions: [],      
  search: async (params: SearchParams): Promise<SearchResult> => {
    return { items: [], pagination: { currentPage: params.page || 1, totalPages: 0, totalCount: 0, hasNextPage: false } };
  },
  getDetails: async (_dbId: string, _options?: { signal?: AbortSignal }): Promise<ItemDetails> => {
    throw new Error('Not implemented');
  }
});

/**
 * RAWG Database Provider Implementation
 */
export class RAWGDatabaseProvider implements DatabaseProvider {
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

  public entities: DatabaseEntity[] = [
    createGameEntity(this),
    createDeveloperEntity(this)
  ];
}

// Export a singleton instance
export const RAWGDatabase = new RAWGDatabaseProvider();
