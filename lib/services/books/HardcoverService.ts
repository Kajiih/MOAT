/**
 * @file HardcoverService.ts
 * @description Service provider for Hardcover.app integration using GraphQL.
 * @module HardcoverService
 */

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

interface HardcoverResponse<T> {
  data: T;
  errors?: { message: string }[];
}

interface HardcoverSeries {
  id: number;
  name: string;
  slug: string;
  books_count: number;
  image_url?: string;
  description?: string;
}

interface HardcoverBook {
  id: number;
  title: string;
  release_year?: number;
  image_url?: string;
  rating?: number;
  reviews_count?: number;
  contributions: {
    author: {
      name: string;
    };
  }[];
}

interface HardcoverAuthor {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
}

/**
 * Service adapter for Hardcover.app integration.
 */
export class HardcoverService implements MediaService<BookFilters> {
  readonly category = 'book' as const;
  readonly id = 'hardcover';
  readonly label = 'Hardcover';

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

  private async graphqlQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const authHeader = process.env.HARDCOVER_TOKEN
      ? (process.env.HARDCOVER_TOKEN.startsWith('Bearer ')
          ? process.env.HARDCOVER_TOKEN
          : `Bearer ${process.env.HARDCOVER_TOKEN}`)
      : undefined;

    const response = await secureFetch<HardcoverResponse<T>>(HARDCOVER_API_URL, {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (response.errors && response.errors.length > 0) {
      logger.error({ errors: response.errors, query: query.substring(0, 500) }, 'Hardcover GraphQL Error');
      throw new Error(`Hardcover API Error: ${response.errors[0].message}`);
    }

    if (!response.data) {
      logger.error({ response, query: query.substring(0, 500) }, 'Hardcover API Missing Data');
      throw new Error('Hardcover API returned no data');
    }

    return response.data;
  }

  private async searchSeries(query: string, _options: SearchOptions): Promise<SearchResult> {
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const gql = `
      query SearchSeries($query: String!, $type: String!) {
        search(query: $query, query_type: $type, per_page: 20) {
          results
        }
      }
    `;

    try {
      const data = await this.graphqlQuery<{ search: { results: any[] } }>(gql, {
        query,
        type: 'Series',
      });

      const searchData = data.search;
      const resultsArray =
        typeof searchData?.results === 'string'
          ? JSON.parse(searchData.results)
          : searchData?.results || [];

      const results: SeriesItem[] = resultsArray.map((s: any) => ({
        id: s.id?.toString() || s.slug,
        mbid: s.slug,
        type: 'series',
        title: s.name,
        imageUrl: s.image_url,
        bookCount: s.books_count,
      }));

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

  private async searchBooks(query: string, _options: SearchOptions): Promise<SearchResult> {
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const gql = `
      query SearchBooks($query: String!, $type: String!) {
        search(query: $query, query_type: $type, per_page: 20) {
          results
        }
      }
    `;

    try {
      const data = await this.graphqlQuery<{ search: { results: any[] } }>(gql, {
        query,
        type: 'Book',
      });

      const searchData = data.search;
      const resultsArray =
        typeof searchData?.results === 'string'
          ? JSON.parse(searchData.results)
          : searchData?.results || [];

      const results: BookItem[] = resultsArray.map((b: any) => ({
        id: b.id?.toString() || b.slug,
        mbid: b.id?.toString() || b.slug,
        type: 'book',
        title: b.title,
        author: b.author_names?.join(', ') || 'Unknown Author',
        year: (b.release_year || b.release_date_i)?.toString(),
        imageUrl: b.image_url,
        rating: b.rating,
        reviewCount: b.ratings_count,
      }));

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
      query SearchAuthors($query: String!, $type: String!) {
        search(query: $query, query_type: $type, per_page: 20) {
          results
        }
      }
    `;

    try {
      const data = await this.graphqlQuery<{ search: { results: any[] } }>(gql, {
        query,
        type: 'Author',
      });

      const searchData = data.search;
      const resultsArray =
        typeof searchData?.results === 'string'
          ? JSON.parse(searchData.results)
          : searchData?.results || [];

      const results: AuthorItem[] = resultsArray.map((a: any) => ({
        id: a.id?.toString() || a.slug,
        mbid: a.slug,
        type: 'author',
        title: a.name,
        imageUrl: a.image_url,
      }));

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
