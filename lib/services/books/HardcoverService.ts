/**
 * @file HardcoverService.ts
 * @description Service provider for Hardcover.app integration using GraphQL.
 * @module HardcoverService
 */

import { GraphQLClient } from 'graphql-request';

import { logger } from '@/lib/logger';
import { BookFilters } from '@/lib/media-types/filters';
import {
  AuthorItem,
  BookItem,
  MediaDetails,
  MediaType,
  SearchResult,
  SeriesItem,
} from '@/lib/types';

import { secureFetch } from '../shared/api-client';
import { MediaService, SearchOptions } from '../types';

const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql';

/**
 * Service adapter for Hardcover.app integration.
 */
export class HardcoverService implements MediaService<BookFilters> {
  readonly category = 'book' as const;
  readonly id = 'hardcover';
  readonly label = 'Hardcover';

  private client: GraphQLClient;

  constructor() {
    this.client = new GraphQLClient(HARDCOVER_API_URL, {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        secureFetch(input.toString(), { ...init, raw: true }) as Promise<Response>,
      headers: () => {
        const token = (process.env.HARDCOVER_TOKEN ?? '') as string;
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = authHeader;
        }
        return headers;
      },
    });
  }

  async search(query: string, type: MediaType, options: SearchOptions = {}): Promise<SearchResult> {
    switch (type) {
      case 'series': {
        return this.searchSeries(query, options);
      }
      case 'author': {
        return this.searchAuthors(query, options);
      }
      default: {
        return this.searchBooks(query, options);
      }
    }
  }

  private async searchSeries(query: string, _options: SearchOptions): Promise<SearchResult> {
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const gql = `
      query SearchSeries($query: String!, $query_type: String!) {
        search(query: $query, query_type: $query_type, per_page: 20) {
          results
        }
      }
    `;

    try {
      const data = await this.client.request<{ search: { results: any } }>(gql, {
        query,
        query_type: 'Series',
      });

      let resultsObj = data.search?.results;
      // Handle potential double-encoding or stringified results
      if (typeof resultsObj === 'string') {
        try {
          resultsObj = JSON.parse(resultsObj);
        } catch (e) {
          logger.error({ error: e, results: resultsObj }, 'Failed to parse Hardcover results string');
          resultsObj = { hits: [] };
        }
      }

      // Handle nested hits if Typesense structure is present
      const hits = resultsObj?.hits || (Array.isArray(resultsObj) ? resultsObj : []);
      const results: SeriesItem[] = hits.map((hit: any) => {
        const s = hit.document || hit;
        return {
          id: s.id?.toString() || s.slug,
          mbid: s.slug,
          type: 'series',
          title: s.name,
          imageUrl: s.image_url || s.image?.url || s.document?.image_url || s.document?.image?.url || s.author?.image?.url,
          bookCount: s.books_count,
        };
      });

      return {
        results,
        page: 1,
        totalPages: 1,
        totalCount: results.length,
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, query },
        'Hardcover Series Search Error',
      );
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }
  }

  private async searchBooks(query: string, options: SearchOptions): Promise<SearchResult> {
    const bookFilters = options.filters as BookFilters | undefined;
    const authorSlug = bookFilters?.selectedAuthor;

    if (!query.trim() && !authorSlug) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const searchQuery = query.trim() ? query : authorSlug!;

    const gql = `
      query SearchBooks($query: String!, $query_type: String!) {
        search(
          query: $query, 
          query_type: $query_type, 
          per_page: 20
        ) {
          results
        }
      }
    `;

    try {
      const variables = {
        query: searchQuery,
        query_type: 'Book',
      };

      const data = await this.client.request<{ search: { results: any } }>(gql, variables);

      const searchData = data.search;
      let resultsObj = searchData?.results;
      
      // Handle potential double-encoding or stringified results
      if (typeof resultsObj === 'string') {
        try {
          resultsObj = JSON.parse(resultsObj);
        } catch (e) {
          logger.error({ error: e, results: resultsObj }, 'Failed to parse Hardcover results string');
          resultsObj = { hits: [] };
        }
      }

      // Handle nested hits if Typesense structure is present
      let hits = resultsObj?.hits || (Array.isArray(resultsObj) ? resultsObj : []);

      // Apply in-memory filtering as the search endpoint has limited filter support
      // We filter RAW hits before mapping to have access to all original fields (like contributions)
      if (bookFilters) {
        if (bookFilters.selectedAuthor) {
          const authorIdRaw = bookFilters.selectedAuthor.toLowerCase();
          hits = hits.filter((hit: any) => {
            const b = hit.document || hit;
            // Robust match: check contributions, author_id, slugs and URLs in author_url
            return (
              b.author_ids?.some((id: any) => id.toString() === authorIdRaw) || 
              (b.author_id?.toString() === authorIdRaw) ||
              (b.author_url?.toLowerCase().includes(authorIdRaw)) ||
              (b.contributions?.some((c: any) => 
                c.author?.id?.toString() === authorIdRaw || 
                c.author?.slug?.toLowerCase() === authorIdRaw
              )) ||
              (b.author_names?.some((n: string) => n.toLowerCase().includes(authorIdRaw))) ||
              (b.author?.toLowerCase().includes(authorIdRaw))
            );
          });
        }
        if (bookFilters.excludeCompilations?.includes('true')) {
          hits = hits.filter((hit: any) => {
            const b = hit.document || hit;
            return b.compilation !== true;
          });
        }
        if (bookFilters.minYear) {
          const min = parseInt(bookFilters.minYear, 10);
          hits = hits.filter((hit: any) => {
            const b = hit.document || hit;
            const yearNum = b.release_year || b.release_date_i;
            return yearNum && yearNum >= min;
          });
        }
        if (bookFilters.maxYear) {
          const max = parseInt(bookFilters.maxYear, 10);
          hits = hits.filter((hit: any) => {
            const b = hit.document || hit;
            const yearNum = b.release_year || b.release_date_i;
            return yearNum && yearNum <= max;
          });
        }
      }

      const results: BookItem[] = hits.map((hit: any) => {
        const b = hit.document || hit;
        return {
          id: b.id?.toString() || b.slug,
          mbid: b.id?.toString() || b.slug,
          type: 'book',
          title: b.title,
          author: b.author_names?.join(', ') || 'Unknown Author',
          year: (b.release_year || b.release_date_i)?.toString(),
          imageUrl: b.image_url || b.image?.url,
          rating: b.rating,
          reviewCount: b.ratings_count,
        } as BookItem;
      });

      return {
        results,
        page: 1,
        totalPages: 1,
        totalCount: results.length,
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, query },
        'Hardcover Books Search Error',
      );
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }
  }

  private async searchAuthors(query: string, _options: SearchOptions): Promise<SearchResult> {
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const gql = `
      query SearchAuthors($query: String!, $query_type: String!) {
        search(query: $query, query_type: $query_type, per_page: 20) {
          results
        }
      }
    `;

    try {
      const data = await this.client.request<{ search: { results: any } }>(gql, {
        query,
        query_type: 'Author',
      });

      let resultsObj = data.search?.results;
      // Handle potential double-encoding or stringified results
      if (typeof resultsObj === 'string') {
        try {
          resultsObj = JSON.parse(resultsObj);
        } catch (e) {
          logger.error({ error: e, results: resultsObj }, 'Failed to parse Hardcover results string');
          resultsObj = { hits: [] };
        }
      }

      // Handle nested hits if Typesense structure is present
      const hits = resultsObj?.hits || (Array.isArray(resultsObj) ? resultsObj : []);
      const results: AuthorItem[] = hits.map((hit: any) => {
        const a = hit.document || hit;
        return {
          id: a.id?.toString() || a.slug,
          mbid: a.slug,
          type: 'author',
          title: a.name,
          imageUrl: a.image_url || a.image?.url,
        };
      });

      return {
        results,
        page: 1,
        totalPages: 1,
        totalCount: results.length,
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, query },
        'Hardcover Authors Search Error',
      );
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    // Basic details implementation - can be expanded later
    return {
      id,
      mbid: id,
      type: type as MediaType,
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['book', 'series', 'author'];
  }
}
