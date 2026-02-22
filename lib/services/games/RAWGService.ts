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

/** Response shape for a single game from the RAWG API. */
interface RAWGGame {
  id: number;
  slug: string;
  name: string;
  released?: string;
  background_image?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number;
  /** Simplified parent platforms (e.g., PC, PlayStation, Xbox). */
  parent_platforms?: { platform: { id: number; name: string; slug: string } }[];
  /** Full platform list. */
  platforms?: { platform: { id: number; name: string; slug: string } }[];
  genres?: { id: number; name: string; slug: string }[];
  developers?: { id: number; name: string; slug: string }[];
  publishers?: { id: number; name: string; slug: string }[];
  /** HTML-formatted description (full details only). */
  description?: string;
  /** Plain-text description (full details only). */
  description_raw?: string;
  tags?: { id: number; name: string; slug: string; language: string }[];
}

/** RAWG paginated list response. */
interface RAWGListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: RAWGGame[];
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

  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    const page = options.page || 1;
    const filters = options.filters || {};
    const sort = (options.sort as string) || 'relevance';

    if (!this.getApiKey()) {
      throw new Error('RAWG_API_KEY is missing');
    }

    const params: Record<string, string> = {
      page: page.toString(),
      page_size: '20',
    };

    if (query) {
      params.search = query;
      params.search_precise = 'true';
    }

    let endpoint = '/games';
    if (type === 'developer') {
      endpoint = '/developers';
    }

    // Apply filters (only for games)
    if (endpoint === '/games') {
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

    // Apply sorting
    const isServerSorted = sort !== 'relevance';
    const ordering = this.getSortOrdering(sort);
    if (ordering) {
      params.ordering = ordering;
    }

    const data = await this.fetch<RAWGListResponse>(endpoint, params);

    if (!data) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const totalPages = Math.ceil(data.count / 20);

    return {
      results: data.results.map((res: any) => {
        if (type === 'developer') return this.mapToDeveloperItem(res);
        return this.mapToMediaItem(res);
      }),
      page,
      totalPages,
      totalCount: data.count,
      isServerSorted,
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (!this.getApiKey()) {
      throw new Error('RAWG_API_KEY is missing');
    }

    let endpoint = `/games/${id}`;
    if (type === 'developer') {
      endpoint = `/developers/${id}`;
    }

    const data = await this.fetch<any>(endpoint);

    if (!data) {
      throw new Error(`Details not found for ${type} ${id}`);
    }

    if (type === 'developer') {
      return {
        id,
        mbid: id,
        type: 'developer',
        imageUrl: data.image_background ?? undefined,
        description: data.description ?? undefined,
        urls: [
          { type: 'RAWG', url: `https://rawg.io/developers/${data.slug}` },
        ],
      };
    }

    const platforms =
      data.parent_platforms?.map((p: any) => p.platform.name) ??
      data.platforms?.map((p: any) => p.platform.name);

    const tags = [
      ...(data.genres?.map((g: any) => g.name) ?? []),
      ...(data.tags?.filter((t: any) => t.language === 'eng').map((t: any) => t.name) ?? []).slice(0, 10),
    ];

    // Build external links
    const urls: { type: string; url: string }[] = [
      { type: 'RAWG', url: `https://rawg.io/games/${data.slug}` },
    ];

    return {
      id,
      mbid: id,
      type: 'game',
      imageUrl: data.background_image ?? undefined,
      date: data.released ?? undefined,
      description: data.description_raw ?? undefined,
      developer: data.developers?.[0]?.name,
      publisher: data.publishers?.[0]?.name,
      platforms,
      metacritic: data.metacritic ?? undefined,
      tags: tags.length > 0 ? tags : undefined,
      urls,
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['game', 'developer'];
  }

  /**
   * Maps RAWG sort option strings to RAWG API ordering parameter values.
   * @param sort - The sort option string from the search UI.
   * @returns The RAWG API ordering parameter, or undefined for relevance (default).
   */
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

    const item: GameItem = {
      id: game.id.toString(),
      mbid: game.id.toString(),
      type: 'game',
      title: game.name,
      year: game.released?.split('-')[0],
      imageUrl: game.background_image ?? undefined,
      rating: game.rating,
      reviewCount: game.ratings_count,
      developer: game.developers?.[0]?.name,
      platforms,
    };

    return item;
  }

  private mapToDeveloperItem(dev: Record<string, any>): MediaItem {
    return {
      id: String(dev.id),
      mbid: String(dev.id),
      type: 'developer',
      title: String(dev.name || 'Unknown'),
      imageUrl: (dev.image_background as string) || undefined,
    };
  }

}
