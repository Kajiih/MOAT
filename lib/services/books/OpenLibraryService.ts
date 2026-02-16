/**
 * @file OpenLibraryService.ts
 * @description Service provider for Open Library integration.
 * @module OpenLibraryService
 */

import { logger } from '@/lib/logger';
import { BookFilters } from '@/lib/media-types/filters';
import { AuthorItem, BookItem, MediaDetails, MediaType, SearchResult } from '@/lib/types';
import { constructLuceneQueryBasis, escapeLucene } from '@/lib/utils/search';

import { secureFetch } from '../shared/api-client';
import { MediaService, SearchOptions } from '../types';

const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org/b/id';

interface OpenLibraryAuthorDoc {
  key: string;
  name: string;
  birth_date?: string;
}

interface OpenLibraryBookDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  ratings_average?: number;
  review_count?: number;
}

interface OpenLibraryWorkDetails {
  key: string;
  covers?: number[];
  description?: string | { value: string };
  subjects?: string[];
  subject_places?: string[];
  subject_people?: string[];
  links?: { title: string; url: string }[];
  excerpts?: { excerpt: string; author?: { key: string } }[];
  first_publish_date?: string;
}

/**
 * Service adapter for Open Library integration.
 */
export class OpenLibraryService implements MediaService<BookFilters> {
  readonly category = 'book' as const;

  async search(query: string, type: MediaType, options: SearchOptions = {}): Promise<SearchResult> {
    if (type === 'author') {
      return this.searchAuthors(query);
    }

    if (type !== 'book') {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    return this.searchBooks(query, options);
  }

  private async searchAuthors(query: string): Promise<SearchResult> {
    const searchUrl = new URL(`${OPEN_LIBRARY_BASE_URL}/search/authors.json`);
    searchUrl.searchParams.set('q', query);

    const data = await secureFetch<{ docs?: OpenLibraryAuthorDoc[]; numFound?: number }>(
      searchUrl.toString(),
    );
    const results: AuthorItem[] = (data.docs || [])
      .map((doc) => {
        if (!doc.key || !doc.name) return null;
        const item: AuthorItem = {
          id: doc.key,
          mbid: doc.key,
          type: 'author',
          title: doc.name,
          year: doc.birth_date ? doc.birth_date.slice(-4) : undefined,
          imageUrl: `https://covers.openlibrary.org/a/olid/${doc.key}-M.jpg`,
        };
        return item;
      })
      .filter((item): item is AuthorItem => item !== null);

    return {
      results,
      page: 1,
      totalPages: 1,
      totalCount: data.numFound || results.length,
    };
  }

  private async searchBooks(query: string, options: SearchOptions): Promise<SearchResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const finalQuery = this.buildSearchQuery(query, options);
    const isShortQuery = finalQuery && finalQuery.length < 3;

    if (!finalQuery || isShortQuery) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const searchUrl = new URL(`${OPEN_LIBRARY_BASE_URL}/search.json`);
    searchUrl.searchParams.set('q', finalQuery);
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('limit', limit.toString());

    const sort = options.sort;
    let isServerSorted = false;

    if (sort && sort !== 'relevance') {
      let apiSort: string | null = null;
      switch (sort) {
        case 'rating_desc': {
          apiSort = 'rating';
          break;
        }
        case 'reviews_desc': {
          apiSort = 'editions';
          break;
        }
        case 'date_desc': {
          apiSort = 'new';
          break;
        }
        case 'date_asc': {
          apiSort = 'old';
          break;
        }
      }

      if (apiSort) {
        searchUrl.searchParams.set('sort', apiSort);
        isServerSorted = true;
      }
    }
    searchUrl.searchParams.set(
      'fields',
      'key,title,author_name,first_publish_year,cover_i,edition_count,subject,ratings_average,review_count',
    );

    const data = await secureFetch<{ docs?: OpenLibraryBookDoc[]; numFound?: number }>(
      searchUrl.toString(),
    );

    const results: BookItem[] = (data.docs || [])
      .map((doc) => {
        if (!doc.key || !doc.title) return null;

        const id = doc.key.replace('/works/', '');
        const authorName = doc.author_name ? doc.author_name[0] : 'Unknown Author';
        const year = doc.first_publish_year ? doc.first_publish_year.toString() : undefined;
        const imageUrl = doc.cover_i ? `${COVERS_BASE_URL}/${doc.cover_i}-M.jpg` : undefined;

        const item: BookItem = {
          id: id,
          mbid: id,
          type: 'book',
          title: doc.title,
          author: authorName,
          year,
          date: year ? `${year}-01-01` : undefined,
          imageUrl,
          rating: doc.ratings_average,
          reviewCount: doc.review_count || doc.edition_count,
        };
        return item;
      })
      .filter((item): item is BookItem => item !== null);

    const totalCount = data.numFound || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      results,
      page,
      totalPages,
      totalCount,
      isServerSorted,
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (type !== 'book') {
      throw new Error(`Type ${type} not supported by OpenLibraryService`);
    }

    try {
      const data = await secureFetch<OpenLibraryWorkDetails>(
        `${OPEN_LIBRARY_BASE_URL}/works/${id}.json`,
      );
      const imageUrl =
        data.covers && data.covers.length > 0
          ? `${COVERS_BASE_URL}/${data.covers[0]}-L.jpg`
          : undefined;

      let description: string | undefined;
      if (typeof data.description === 'string') {
        description = data.description;
      } else if (
        data.description &&
        typeof data.description === 'object' &&
        'value' in data.description
      ) {
        description = data.description.value;
      }

      const tags = Array.isArray(data.subjects) ? data.subjects.slice(0, 8) : undefined;
      const places = Array.isArray(data.subject_places)
        ? data.subject_places.slice(0, 5)
        : undefined;
      const firstSentence =
        data.excerpts && data.excerpts.length > 0 ? data.excerpts[0].excerpt : undefined;
      const urls = Array.isArray(data.links)
        ? data.links.map((l) => ({ type: l.title, url: l.url }))
        : undefined;

      return {
        id,
        mbid: id,
        type: 'book',
        imageUrl,
        tags,
        places,
        firstSentence,
        date: data.first_publish_date,
        urls,
        description,
      };
    } catch (error) {
      logger.error({ error, id }, 'Open Library Details Error');
      return { id, mbid: id, type: 'book' };
    }
  }

  getSupportedTypes(): MediaType[] {
    return ['book', 'author'];
  }

  /**
   * Builds a Lucene-style search query for the Open Library API.
   * Logic extracted to reduce cognitive complexity.
   * @param query - The search query string.
   * @param options - The search options including filters.
   * @returns A formatted Lucene query string.
   */
  private buildSearchQuery(query: string, options: SearchOptions): string {
    const { fuzzy, wildcard, filters } = options;
    const author = filters?.selectedAuthor as string | undefined;
    const minYear = filters?.minYear as string | undefined;
    const maxYear = filters?.maxYear as string | undefined;
    const bookType = filters?.bookType as string | undefined;
    const language = filters?.language as string | undefined;
    const publisher = filters?.publisher as string | undefined;
    const person = filters?.person as string | undefined;
    const place = filters?.place as string | undefined;

    const queryParts: string[] = [];

    let processedQuery = query.trim();
    if (processedQuery && (fuzzy || wildcard)) {
      processedQuery = constructLuceneQueryBasis(processedQuery, {
        fuzzy: !!fuzzy,
        wildcard: !!wildcard,
      });
    } else if (processedQuery) {
      processedQuery = processedQuery
        .split(/\s+/)
        .map((q) => escapeLucene(q))
        .join(' ');
    }

    if (processedQuery) queryParts.push(processedQuery);
    if (author) queryParts.push(`author:"${escapeLucene(author)}"`);
    if (minYear || maxYear) {
      const min = minYear || '*';
      const max = maxYear || '*';
      queryParts.push(`first_publish_year:[${min} TO ${max}]`);
    }
    if (bookType) queryParts.push(`subject:${bookType}`);
    if (language) queryParts.push(`language:${language}`);
    if (publisher) queryParts.push(`publisher:"${escapeLucene(publisher)}"`);
    if (person) queryParts.push(`person:"${escapeLucene(person)}"`);
    if (place) queryParts.push(`place:"${escapeLucene(place)}"`);

    return queryParts.join(' AND ');
  }
}
