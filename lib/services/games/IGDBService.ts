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
  games?: number[];
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

      const data = await secureFetch<TwitchToken>(`${TWITCH_AUTH_URL}?${params.toString()}`, {
        method: 'POST',
      });

      cachedToken = data.access_token;
      // Expire 1 minute early for safety
      tokenExpiry = now + (data.expires_in - 60) * 1000;
      return cachedToken;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch IGDB access token');
      return null;
    }
  }

  private async fetch<T>(
    endpoint: string,
    query: string,
  ): Promise<T[] | null> {
    const token = await this.getAccessToken();
    const clientId = this.getClientId();

    if (!token || !clientId) return null;

    try {
      return await secureFetch<T[]>(`${IGDB_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: query,
      });
    } catch (error) {
      logger.error({ error, endpoint, query }, 'IGDB API Call failed');
      return null;
    }
  }

  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
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

    const results = data.map(game => this.mapToGameItem(game));

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
    const escapedQuery = query.replace(/"/g, '\\"');
    let igdbQuery = `fields name, games; limit ${limit}; offset ${offset};`;
    
    // TODO(P1): Add support for fuzzy search, wildcard search, etc.
    if (escapedQuery) {
      // The franchises endpoint does not support the 'search' keyword directly.
      // We must use a where clause with a case-insensitive wildcard text match.
      // Note: '~' is the case-insensitive operator in APICalypse.
      igdbQuery += ` where name ~ *"${escapedQuery}"*;`;
    }

    // Always apply a sort for consistency. For franchises, alphabetical is the logical default.
    const sort = (options.sort as string) || 'title_asc';
    const order = this.getSortOrdering(sort, true);
    if (order) igdbQuery += ` sort ${order};`;

    const data = await this.fetch<IGDBFranchise>('/franchises', igdbQuery);

    if (!data) {
      return { results: [], page: options.page || 1, totalPages: 0, totalCount: 0 };
    }

    const results = data.map(franchise => this.mapToFranchiseItem(franchise));

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
      const data = await this.fetch<IGDBFranchise>('/franchises', `fields name, games, url; where id = ${id};`);
      if (!data || data.length === 0) throw new Error(`Franchise not found: ${id}`);
      
      const franchise = data[0];
      return {
        id,
        mbid: id,
        type: 'franchise',
        description: `Video game franchise with ${franchise.games?.length || 0} games.`,
        urls: [{ type: 'IGDB', url: franchise.url }],
      };
    }

    const data = await this.fetch<IGDBGame>('/games', `fields name, first_release_date, cover.image_id, summary, total_rating, total_rating_count, involved_companies.company.name, involved_companies.developer, platforms.name, genres.name, themes.name, url; where id = ${id};`);
    if (!data || data.length === 0) throw new Error(`Game not found: ${id}`);

    const game = data[0];
    const developer = game.involved_companies?.find(c => c.developer)?.company.name;
    const publisher = game.involved_companies?.find(c => !c.developer)?.company.name;

    return {
      id,
      mbid: id,
      type: 'game',
      imageUrl: game.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` : undefined,
      date: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().split('T')[0] : undefined,
      description: game.summary,
      developer,
      publisher,
      platforms: game.platforms?.map(p => p.name),
      tags: [
        ...(game.genres?.map(g => g.name) || []),
        ...(game.themes?.map(t => t.name) || []),
      ],
      urls: [{ type: 'IGDB', url: game.url }],
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['game', 'franchise'];
  }

  private getSortOrdering(sort: string, isFranchise = false): string | undefined {
    switch (sort) {
      case 'relevance': {
        return isFranchise ? 'name asc' : undefined;
      }
      case 'rating_desc': {
        return 'total_rating desc';
      }
      case 'rating_asc': {
        return 'total_rating asc';
      }
      case 'date_desc': {
        return isFranchise ? 'created_at desc' : 'first_release_date desc';
      }
      case 'date_asc': {
        return isFranchise ? 'created_at asc' : 'first_release_date asc';
      }
      case 'title_asc': {
        return 'name asc';
      }
      case 'title_desc': {
        return 'name desc';
      }
      default: {
        return undefined;
      }
    }
  }

  private mapToGameItem(game: IGDBGame): GameItem {
    const developer = game.involved_companies?.find(c => c.developer)?.company.name;
    return {
      id: `igdb-${game.id}`,
      mbid: game.id.toString(),
      type: 'game',
      title: game.name,
      year: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear().toString() : undefined,
      imageUrl: game.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` : undefined,
      rating: game.total_rating ? game.total_rating / 10 : undefined,
      reviewCount: game.total_rating_count,
      developer,
      platforms: game.platforms?.map(p => p.name),
    } as GameItem;
  }

  private mapToFranchiseItem(franchise: IGDBFranchise): FranchiseItem {
    return {
      id: `igdb-franchise-${franchise.id}`,
      mbid: franchise.id.toString(),
      type: 'franchise',
      title: franchise.name,
      gameCount: franchise.games?.length,
    } as FranchiseItem;
  }
}
