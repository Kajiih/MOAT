/**
 * @file IGDBService.ts
 * @description Service provider for the IGDB API.
 * Implements the MediaService interface for searching and fetching game and franchise details.
 * @see https://api-docs.igdb.com/
 * @module IGDBService
 */

import { logger } from '@/lib/logger';
import { GameFilters } from '@/lib/media-types/filters';
import { secureFetch } from '@/lib/services/shared/api-client';
import { MediaService, SearchOptions } from '@/lib/services/types';
import { FranchiseItem, GameItem, MediaDetails, MediaType, SearchResult } from '@/lib/types';

const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token';

interface IGDBGame {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: { image_id: string };
  summary?: string;
  total_rating?: number;
  total_rating_count?: number;
  involved_companies?: { company: { name: string }; developer: boolean }[];
  platforms?: { name: string }[];
  genres?: { name: string }[];
  themes?: { name: string }[];
  url: string;
}

interface IGDBFranchise {
  id: number;
  name: string;
  games?: (number | { id: number; cover?: { id: number; image_id: string } })[];
  url: string;
}

interface TwitchToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export class IGDBService implements MediaService<GameFilters> {
  readonly category = 'game' as const;
  readonly id = 'igdb';
  readonly label = 'IGDB';

  private getClientId(): string {
    return process.env.IGDB_CLIENT_ID || '';
  }

  private getClientSecret(): string {
    return process.env.IGDB_CLIENT_SECRET || '';
  }

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
      return cachedToken;
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      logger.warn('IGDB_CLIENT_ID or IGDB_CLIENT_SECRET is missing.');
      return null;
    }

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      });

      const data = (await secureFetch<TwitchToken>(`${TWITCH_AUTH_URL}?${params.toString()}`, {
        method: 'POST',
      })) as TwitchToken;

      cachedToken = data.access_token;
      // Expire 1 minute early for safety
      tokenExpiry = now + (data.expires_in - 60) * 1000;
      return cachedToken;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch IGDB access token');
      return null;
    }
  }

  private async fetch<T>(endpoint: string, query: string): Promise<T[] | null> {
    const token = await this.getAccessToken();
    const clientId = this.getClientId();

    if (!token || !clientId) return null;

    try {
      return (await secureFetch<T[]>(`${IGDB_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: query,
      })) as T[];
    } catch (error) {
      logger.error({ error, endpoint, query }, 'IGDB API Call failed');
      return null;
    }
  }

  async search(query: string, type: MediaType, options: SearchOptions = {}): Promise<SearchResult> {
    const limit = 20;
    const offset = ((options.page || 1) - 1) * limit;

    if (type === 'franchise') {
      return this.searchFranchises(query, options, limit, offset);
    }

    return this.searchGames(query, options, limit, offset);
  }

  private async searchGames(
    query: string,
    options: SearchOptions,
    limit: number,
    offset: number,
  ): Promise<SearchResult> {
    const filters = (options.filters || {}) as unknown as GameFilters;

    // Build IGDB query
    let igdbQuery = `fields name, first_release_date, cover.image_id, total_rating, total_rating_count, involved_companies.company.name, involved_companies.developer, platforms.name; limit ${limit}; offset ${offset};`;

    if (query) {
      igdbQuery += ` search "${query}";`;
    } else {
      // Discovery mode or sorted search
      const order = this.getSortOrdering((options.sort as string) || 'relevance');
      if (order) igdbQuery += ` sort ${order};`;
    }

    // Apply filters (simplified for now)
    const filters_clauses: string[] = [];
    if (filters.minYear) {
      const timestamp = Math.floor(new Date(`${filters.minYear}-01-01`).getTime() / 1000);
      filters_clauses.push(`first_release_date >= ${timestamp}`);
    }
    if (filters.maxYear) {
      const timestamp = Math.floor(new Date(`${filters.maxYear}-12-31`).getTime() / 1000);
      filters_clauses.push(`first_release_date <= ${timestamp}`);
    }

    if (filters_clauses.length > 0) {
      igdbQuery += ` where ${filters_clauses.join(' & ')};`;
    }

    const data = await this.fetch<IGDBGame>('/games', igdbQuery);

    if (!data) {
      return { results: [], page: options.page || 1, totalPages: 0, totalCount: 0 };
    }

    const results = data.map((game) => this.mapToGameItem(game));

    return {
      results,
      page: options.page || 1,
      totalPages: 100, // IGDB doesn't return count easily in one request without 'count' keyword
      totalCount: 2000,
      isServerSorted: true,
    };
  }

  private async searchFranchises(
    query: string,
    options: SearchOptions,
    limit: number,
    offset: number,
  ): Promise<SearchResult> {
    const isWildcard = options.wildcard !== false;
    const isFuzzy = options.fuzzy !== false;

    let igdbQuery = `fields name, games.cover.image_id; limit ${limit}; offset ${offset};`;

    if (query) {
      const sanitized = query.replaceAll(String.raw`"`, '');
      const words = sanitized.split(/\s+/).filter((w) => w.length > 0);

      // Enhanced search: If multiple words are provided, we require all of them (AND logic).
      // This provides a more predictable and flexible search than a simple substring match.
      if (isFuzzy || words.length > 1) {
        // Advanced search: split into words and require all of them (AND logic)
        // using case-insensitive substring matching.
        const conditions = words.map((word) => `name ~ *"${word}"*`);
        if (words.length > 0) {
          igdbQuery += ` where ${conditions.join(' & ')};`;
        }
      } else if (isWildcard) {
        // Simple substring search
        igdbQuery += ` where name ~ *"${sanitized}"*;`;
      } else {
        // Exact name match
        igdbQuery += ` where name = "${sanitized}";`;
      }
    }

    // Always apply a sort for consistency. For franchises, alphabetical is the logical default.
    const sort = (options.sort as string) || 'title_asc';
    const order = this.getSortOrdering(sort, true);
    if (order) igdbQuery += ` sort ${order};`;

    const data = await this.fetch<IGDBFranchise>('/franchises', igdbQuery);

    if (!data) {
      return { results: [], page: options.page || 1, totalPages: 0, totalCount: 0 };
    }

    const results = data.map((franchise) => this.mapToFranchiseItem(franchise));

    return {
      results,
      page: options.page || 1,
      totalPages: 100,
      totalCount: 2000,
      isServerSorted: true,
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (type === 'franchise') {
      const data = await this.fetch<IGDBFranchise>(
        '/franchises',
        `fields name, games.cover.image_id, url; where id = ${id};`,
      );
      if (!data || data.length === 0) throw new Error(`Franchise not found: ${id}`);

      const franchise = data[0];
      const imageUrl = this.getFranchiseImage(franchise);

      return {
        id,
        mbid: id,
        type: 'franchise',
        imageUrl,
        description: `Video game franchise with ${franchise.games?.length || 0} games.`,
        urls: [{ type: 'IGDB', url: franchise.url }],
        serviceId: this.id,
      };
    }

    const data = await this.fetch<IGDBGame>(
      '/games',
      `fields name, first_release_date, cover.image_id, summary, total_rating, total_rating_count, involved_companies.company.name, involved_companies.developer, platforms.name, genres.name, themes.name, url; where id = ${id};`,
    );
    if (!data || data.length === 0) throw new Error(`Game not found: ${id}`);

    const game = data[0];
    const developer = game.involved_companies?.find((c) => c.developer)?.company.name;
    const publisher = game.involved_companies?.find((c) => !c.developer)?.company.name;

    return {
      id,
      mbid: id,
      type: 'game',
      imageUrl: game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : undefined,
      date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : undefined,
      description: game.summary,
      developer,
      publisher,
      platforms: game.platforms?.map((p) => p.name),
      tags: [
        ...(game.genres?.map((g) => g.name) || []),
        ...(game.themes?.map((t) => t.name) || []),
      ],
      urls: [{ type: 'IGDB', url: game.url }],
      serviceId: this.id,
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['game', 'franchise'];
  }

  private getSortOrdering(sort: string, isFranchise = false): string | undefined {
    const dateField = isFranchise ? 'created_at' : 'first_release_date';
    const mapping: Record<string, string> = {
      rating_desc: 'total_rating desc',
      rating_asc: 'total_rating asc',
      reviews_desc: 'total_rating_count desc',
      reviews_asc: 'total_rating_count asc',
      date_desc: `${dateField} desc`,
      date_asc: `${dateField} asc`,
      title_asc: 'name asc',
      title_desc: 'name desc',
    };

    return mapping[sort];
  }

  private mapToGameItem(game: IGDBGame): GameItem {
    const developer = game.involved_companies?.find((c) => c.developer)?.company.name;
    return {
      id: `igdb-${game.id}`,
      mbid: game.id.toString(),
      type: 'game',
      title: game.name,
      year: game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear().toString()
        : undefined,
      imageUrl: game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : undefined,
      rating: game.total_rating ? game.total_rating / 10 : undefined,
      reviewCount: game.total_rating_count,
      developer,
      platforms: game.platforms?.map((p) => p.name),
      serviceId: this.id,
    } as GameItem;
  }

  private mapToFranchiseItem(franchise: IGDBFranchise): FranchiseItem {
    return {
      id: `igdb-franchise-${franchise.id}`,
      mbid: franchise.id.toString(),
      type: 'franchise',
      title: franchise.name,
      gameCount: franchise.games?.length,
      imageUrl: this.getFranchiseImage(franchise),
      serviceId: this.id,
    } as FranchiseItem;
  }

  private getFranchiseImage(franchise: IGDBFranchise): string | undefined {
    // Find the first game in the franchise that has a cover
    const gameWithCover = franchise.games?.find((g) => typeof g !== 'number' && g.cover?.image_id);
    if (gameWithCover && typeof gameWithCover !== 'number' && gameWithCover.cover) {
      return `https://images.igdb.com/igdb/image/upload/t_cover_big/${gameWithCover.cover.image_id}.jpg`;
    }
    return undefined;
  }
}
