/**
 * @file RAWGService.ts
 * @description Service provider for the RAWG Video Games Database API.
 * Implements the MediaService interface for searching and fetching game details.
 * @see https://rawg.io/apidocs
 * @module RAWGService
 */

import { logger } from '@/lib/logger';
import { GameFilters } from '@/lib/media-types/filters';
import { secureFetch } from '@/lib/services/shared/api-client';
import { MediaService, SearchOptions } from '@/lib/services/types';
import { GameItem, MediaDetails, MediaItem, MediaType, SearchResult } from '@/lib/types';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

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
  platforms?: { platform: { id: number; name: string; slug: string } }[];
  genres?: { id: number; name: string; slug: string }[];
  developers?: { id: number; name: string; slug: string }[];
  publishers?: { id: number; name: string; slug: string }[];
  description?: string;
  description_raw?: string;
  tags?: { id: number; name: string; slug: string; language: string }[];
}

interface RAWGDeveloper {
  id: number;
  name: string;
  slug: string;
  image_background?: string;
  description?: string;
}

interface RAWGListResponse {
  count: number;
  results: RAWGGame[];
}

interface RAWGDeveloperListResponse {
  count: number;
  results: RAWGDeveloper[];
}

export class RAWGService implements MediaService<GameFilters> {
  readonly category = 'game' as const;

  private getApiKey(): string {
    return process.env.RAWG_API_KEY || '';
  }

  private async fetch<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      logger.warn('RAWG_API_KEY is missing.');
      return null;
    }

    const query = new URLSearchParams(params);
    query.append('key', apiKey);

    return secureFetch<T>(`${RAWG_BASE_URL}${endpoint}?${query.toString()}`);
  }

  private buildSearchParams(
    query: string,
    options: SearchOptions,
  ): Record<string, string> {
    const params: Record<string, string> = {
      page: (options.page || 1).toString(),
      page_size: '20',
    };

    if (query) {
      params.search = query;
      params.search_precise = 'true';
    }

    const ordering = this.getSortOrdering((options.sort as string) || 'relevance');
    if (ordering) {
      params.ordering = ordering;
    }

    return params;
  }

  private applyGameFilters(params: Record<string, string>, filters: GameFilters): void {
    const minYear = filters.minYear as string | undefined;
    const maxYear = filters.maxYear as string | undefined;
    if (minYear || maxYear) {
      const start = minYear ? `${minYear}-01-01` : '1970-01-01';
      const end = maxYear ? `${maxYear}-12-31` : '2030-12-31';
      params.dates = `${start},${end}`;
    }

    const platform = filters.platform as string | undefined;
    if (platform) {
      params.platforms = platform;
    }

    const tag = filters.tag as string | undefined;
    if (tag) {
      params.genres = tag.toLowerCase();
    }
  }

  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    if (!this.getApiKey()) {
      throw new Error('RAWG_API_KEY is missing');
    }

    const filters = (options.filters || {}) as unknown as GameFilters;
    const params = this.buildSearchParams(query, options);
    const endpoint = type === 'developer' ? '/developers' : '/games';

    if (endpoint === '/games') {
      this.applyGameFilters(params, filters);
    }

    const data = await this.fetch<RAWGListResponse | RAWGDeveloperListResponse>(
      endpoint,
      params,
    );

    if (!data) {
      return { results: [], page: options.page || 1, totalPages: 0, totalCount: 0 };
    }

    const totalPages = Math.ceil(data.count / 20);
    const results = (data.results as (RAWGGame | RAWGDeveloper)[]).map((res) => {
      if (type === 'developer') return this.mapToDeveloperItem(res as RAWGDeveloper);
      return this.mapToMediaItem(res as RAWGGame);
    });

    return {
      results,
      page: options.page || 1,
      totalPages,
      totalCount: data.count,
      isServerSorted: (options.sort as string) !== 'relevance',
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (!this.getApiKey()) {
      throw new Error('RAWG_API_KEY is missing');
    }

    const endpoint = type === 'developer' ? `/developers/${id}` : `/games/${id}`;
    const data = await this.fetch<RAWGGame | RAWGDeveloper>(endpoint);

    if (!data) {
      throw new Error(`Details not found for ${type} ${id}`);
    }

    if (type === 'developer') {
      const dev = data as RAWGDeveloper;
      return {
        id,
        mbid: id,
        type: 'developer',
        imageUrl: dev.image_background,
        description: dev.description,
        urls: [{ type: 'RAWG', url: `https://rawg.io/developers/${dev.slug}` }],
      };
    }

    const game = data as RAWGGame;
    const platforms =
      game.parent_platforms?.map((p) => p.platform.name) ??
      game.platforms?.map((p) => p.platform.name);

    const tags = [
      ...(game.genres?.map((g) => g.name) ?? []),
      ...(game.tags?.filter((t) => t.language === 'eng').map((t) => t.name) ?? []).slice(0, 10),
    ];

    return {
      id,
      mbid: id,
      type: 'game',
      imageUrl: game.background_image,
      date: game.released,
      description: game.description_raw,
      developer: game.developers?.[0]?.name,
      publisher: game.publishers?.[0]?.name,
      platforms,
      metacritic: game.metacritic,
      tags: tags.length > 0 ? tags : undefined,
      urls: [{ type: 'RAWG', url: `https://rawg.io/games/${game.slug}` }],
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['game', 'developer'];
  }

  private getSortOrdering(sort: string): string | undefined {
    switch (sort) {
      case 'rating_desc': {
        return '-rating';
      }
      case 'rating_asc': {
        return 'rating';
      }
      case 'reviews_desc': {
        return '-ratings_count';
      }
      case 'reviews_asc': {
        return 'ratings_count';
      }
      case 'date_desc': {
        return '-released';
      }
      case 'date_asc': {
        return 'released';
      }
      case 'title_asc': {
        return 'name';
      }
      case 'title_desc': {
        return '-name';
      }
      default: {
        return undefined;
      }
    }
  }

  private mapToMediaItem(game: RAWGGame): MediaItem {
    const platforms = game.parent_platforms?.map((p) => p.platform.name);

    return {
      id: game.id.toString(),
      mbid: game.id.toString(),
      type: 'game',
      title: game.name,
      year: game.released?.split('-')[0],
      imageUrl: game.background_image,
      rating: game.rating,
      reviewCount: game.ratings_count,
      developer: game.developers?.[0]?.name,
      platforms,
    } as GameItem;
  }

  private mapToDeveloperItem(dev: RAWGDeveloper): MediaItem {
    return {
      id: dev.id.toString(),
      mbid: dev.id.toString(),
      type: 'developer',
      title: dev.name || 'Unknown',
      imageUrl: dev.image_background,
    };
  }
}
