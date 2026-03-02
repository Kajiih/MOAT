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

  private async searchSeries(query: string, options: SearchOptions): Promise<SearchResult> {
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const page = options.page || 1;
    const perPage = options.limit || 20;

    const gql = `
      query SearchSeries($query: String!, $query_type: String!, $page: Int!, $per_page: Int!) {
        search(query: $query, query_type: $query_type, page: $page, per_page: $per_page) {
          results
        }
      }
    `;

    try {
      const data = await this.client.request<{ search: { results: any } }>(gql, {
        query,
        query_type: 'Series',
        page,
        per_page: perPage,
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
      
      const seriesItems: SeriesItem[] = hits.map((hit: any) => {
        const s = hit.document || hit;
        return {
          id: s.id?.toString() || s.slug,
          mbid: s.slug,
          type: 'series',
          title: s.name,
          imageUrl: s.image_url || s.image?.url || s.document?.image_url || s.document?.image?.url || s.author?.image?.url,
          bookCount: s.books_count,
          serviceId: this.id,
        } as SeriesItem;
      });

      // Enhance series images if possible
      const seriesIds = seriesItems
        .map(s => parseInt(s.id, 10))
        .filter(id => !isNaN(id));

      if (seriesIds.length > 0) {
        const imageMap = await this.fetchSeriesBookImages(seriesIds);
        seriesItems.forEach(item => {
          const id = parseInt(item.id, 10);
          if (!isNaN(id) && imageMap.has(id)) {
            item.imageUrl = imageMap.get(id);
          }
        });
      }

      const totalCount = resultsObj?.found || seriesItems.length;
      const totalPages = Math.ceil(totalCount / perPage);

      return {
        results: seriesItems,
        page,
        totalPages,
        totalCount,
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
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const page = options.page || 1;
    const perPage = options.limit || 20;

    const gql = `
      query SearchBooks($query: String!, $query_type: String!, $page: Int!, $per_page: Int!) {
        search(
          query: $query, 
          query_type: $query_type, 
          page: $page,
          per_page: $per_page
        ) {
          results
        }
      }
    `;

    try {
      const variables = {
        query: query.trim(),
        query_type: 'Book',
        page,
        per_page: perPage,
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
      const bookFilters = options.filters as BookFilters | undefined;
      if (bookFilters) {
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
          serviceId: this.id,
        } as BookItem;
      });

      const totalCount = resultsObj?.found || results.length;
      const totalPages = Math.ceil(totalCount / perPage);

      return {
        results,
        page,
        totalPages,
        totalCount,
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, query },
        'Hardcover Books Search Error',
      );
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }
  }

  private async searchAuthors(query: string, options: SearchOptions): Promise<SearchResult> {
    if (!query.trim()) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const page = options.page || 1;
    const perPage = options.limit || 20;

    const gql = `
      query SearchAuthors($query: String!, $query_type: String!, $page: Int!, $per_page: Int!) {
        search(query: $query, query_type: $query_type, page: $page, per_page: $per_page) {
          results
        }
      }
    `;

    try {
      const data = await this.client.request<{ search: { results: any } }>(gql, {
        query,
        query_type: 'Author',
        page,
        per_page: perPage,
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
          serviceId: this.id,
        };
      });

      const totalCount = resultsObj?.found || results.length;
      const totalPages = Math.ceil(totalCount / perPage);

      return {
        results,
        page,
        totalPages,
        totalCount,
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
    try {
      const numericId = parseInt(id, 10);
      const isNumeric = !isNaN(numericId) && /^\d+$/.test(id);

      switch (type) {
        case 'book':
          return await this.getBookDetails(id, isNumeric ? numericId : undefined);
        case 'series':
          return await this.getSeriesDetails(id, isNumeric ? numericId : undefined);
        case 'author':
          return await this.getAuthorDetails(id, isNumeric ? numericId : undefined);
        default:
          return { id, mbid: id, type };
      }
    } catch (error) {
      logger.error({ error, id, type }, 'Hardcover getDetails error');
      return { id, mbid: id, type };
    }
  }

  private async getBookDetails(id: string, numericId?: number): Promise<MediaDetails> {
    const query = numericId !== undefined
      ? `query GetBook($id: Int!) {
          books_by_pk(id: $id) {
            id title slug description release_date rating ratings_count
            image { url }
            taggings { tag { tag } }
          }
        }`
      : `query GetBook($slug: String!) {
          books(where: {slug: {_eq: $slug}}, limit: 1) {
            id title slug description release_date rating ratings_count
            image { url }
            taggings { tag { tag } }
          }
        }`;

    const variables = numericId !== undefined ? { id: numericId } : { slug: id };
    const data = await this.client.request<any>(query, variables);
    const b = numericId !== undefined ? data.books_by_pk : data.books?.[0];
    
    if (!b) return { id, mbid: id, type: 'book' };

    return {
      id: b.id.toString(),
      mbid: b.slug || b.id.toString(),
      type: 'book',
      title: b.title,
      imageUrl: b.image?.url,
      description: b.description || undefined,
      date: b.release_date,
      rating: b.rating != null ? parseFloat(b.rating.toString()) : undefined,
      reviewCount: b.ratings_count,
      tags: b.taggings?.map((t: any) => t.tag?.tag).filter(Boolean),
      serviceId: this.id,
    };
  }

  private async getSeriesDetails(id: string, numericId?: number): Promise<MediaDetails> {
    const query = numericId !== undefined
      ? `query GetSeries($id: Int!) {
          series_by_pk(id: $id) {
            id name slug description books_count
            book_series(order_by: {position: asc}) {
              book { title id }
            }
          }
        }`
      : `query GetSeries($slug: String!) {
          series(where: {slug: {_eq: $slug}}, limit: 1) {
            id name slug description books_count
            book_series(order_by: {position: asc}) {
              book { title id }
            }
          }
        }`;

    const variables = numericId !== undefined ? { id: numericId } : { slug: id };
    const data = await this.client.request<any>(query, variables);
    const s = numericId !== undefined ? data.series_by_pk : data.series?.[0];
    
    if (!s) return { id, mbid: id, type: 'series' };

    return {
      id: s.id.toString(),
      mbid: s.slug || s.id.toString(),
      type: 'series',
      title: s.name,
      description: s.description || undefined,
      tags: s.book_series?.map((bs: any) => bs.book?.title).filter(Boolean),
      length: s.books_count != null ? `${s.books_count} books` : undefined,
      serviceId: this.id,
    };
  }

  private async getAuthorDetails(id: string, numericId?: number): Promise<MediaDetails> {
    const query = numericId !== undefined
      ? `query GetAuthor($id: Int!) {
          authors_by_pk(id: $id) {
            id name slug bio born_date death_date location links
            image { url }
          }
        }`
      : `query GetAuthor($slug: String!) {
          authors(where: {slug: {_eq: $slug}}, limit: 1) {
            id name slug bio born_date death_date location links
            image { url }
          }
        }`;

    const variables = numericId !== undefined ? { id: numericId } : { slug: id };
    const data = await this.client.request<any>(query, variables);
    const a = numericId !== undefined ? data.authors_by_pk : data.authors?.[0];
    
    if (!a) return { id, mbid: id, type: 'author' };

    let links: { type: string, url: string }[] | undefined;
    if (Array.isArray(a.links)) {
      links = a.links
        .filter((l: any) => l.url && (l.url.startsWith('http') || l.url.startsWith('/')))
        .map((l: any) => ({
          type: l.title || l.type?.key?.replace('/type/', '') || 'Link',
          url: l.url.startsWith('/') ? `https://openlibrary.org${l.url}` : l.url
        }));
    }

    return {
      id: a.id.toString(),
      mbid: a.slug || a.id.toString(),
      type: 'author',
      title: a.name,
      imageUrl: a.image?.url,
      description: a.bio || undefined,
      area: a.location || undefined,
      lifeSpan: {
        begin: a.born_date || undefined,
        end: a.death_date || undefined,
        ended: !!a.death_date
      },
      urls: links,
      serviceId: this.id,
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['book', 'series', 'author'];
  }

  /**
   * Fetches the first book's cover image for a list of series IDs.
   */
  private async fetchSeriesBookImages(seriesIds: number[]): Promise<Map<number, string>> {
    if (seriesIds.length === 0) return new Map();

    const gql = `
      query GetSeriesBooks($ids: [Int!]!) {
        book_series(where: {series_id: {_in: $ids}, position: {_eq: 1}}) {
          series_id
          book {
            image {
              url
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request<{ book_series: any[] }>(gql, { ids: seriesIds });
      const imageMap = new Map<number, string>();
      data.book_series.forEach((bs) => {
        const url = bs.book?.image?.url;
        if (url) {
          imageMap.set(bs.series_id, url);
        }
      });
      return imageMap;
    } catch (error) {
      logger.error({ error, seriesIds }, 'Failed to fetch series book images');
      return new Map();
    }
  }
}
