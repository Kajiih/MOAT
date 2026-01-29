/**
 * @file OpenLibraryService.ts
 * @description Service provider for Open Library integration (Books).
 */

import { getMediaUI } from '@/lib/media-defs';
import { AuthorItem, BookItem, MediaDetails, MediaType, SearchResult } from '@/lib/types';
import { constructLuceneQueryBasis, escapeLucene } from '@/lib/utils/search';

import { FilterDefinition, MediaService, MediaUIConfig, SearchOptions } from '../types';

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
}

interface OpenLibraryWorkDetails {
  key: string;
  covers?: number[];
  description?: string | { value: string };
  subjects?: string[];
  links?: { title: string; url: string }[];
  first_publish_date?: string;
}

/**
 * Service adapter for Open Library integration.
 */
export class OpenLibraryService implements MediaService {
  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    if (type === 'author') {
      const searchUrl = new URL(`${OPEN_LIBRARY_BASE_URL}/search/authors.json`);
      searchUrl.searchParams.set('q', query);
      
      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Open Library Author API Error ${response.status}:`, errorText);
        throw new Error(`Open Library API Error: ${response.status}`);
      }
      
      const data = await response.json() as { docs?: OpenLibraryAuthorDoc[]; numFound?: number };
      const results: AuthorItem[] = (data.docs || []).map((doc) => {
         if (!doc.key || !doc.name) return null;
         const item: AuthorItem = {
           id: doc.key,
           mbid: doc.key,
           type: 'author',
           title: doc.name,
           year: doc.birth_date ? doc.birth_date.slice(-4) : undefined, 
           imageUrl: `https://covers.openlibrary.org/a/olid/${doc.key}-M.jpg`
         };
         return item;
      }).filter((item): item is AuthorItem => item !== null);

      return {
        results,
        page: 1, 
        totalPages: 1,
        totalCount: data.numFound || results.length
      };
    }

    if (type !== 'book') {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }
    
    // ... Book Search Logic ...
    const searchUrl = new URL(`${OPEN_LIBRARY_BASE_URL}/search.json`);
    
    const author = options.filters?.author as string | undefined;
    const minYear = options.filters?.minYear as string | undefined;
    const maxYear = options.filters?.maxYear as string | undefined;
    const bookType = options.filters?.bookType as string | undefined;

    const queryParts: string[] = [];
    
    let processedQuery = query.trim();
    if (processedQuery && (options.fuzzy || options.wildcard)) {
      processedQuery = constructLuceneQueryBasis(processedQuery, {
        fuzzy: !!options.fuzzy,
        wildcard: !!options.wildcard,
      });
    } else if (processedQuery) {
       processedQuery = processedQuery.split(/\s+/).map((q) => escapeLucene(q)).join(' ');
    }

    if (processedQuery) {
       queryParts.push(processedQuery);
    }

    if (author) {
       queryParts.push(`author:"${escapeLucene(author)}"`);
    }

    if (minYear || maxYear) {
       const min = minYear || '*';
       const max = maxYear || '*';
       queryParts.push(`first_publish_year:[${min} TO ${max}]`);
    }

    if (bookType) {
       queryParts.push(`subject:${bookType}`);
    }

    const finalQuery = queryParts.join(' AND ');

    const isShortQuery = finalQuery && finalQuery.length < 3;
    
    if (!finalQuery || isShortQuery) {
       return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    searchUrl.searchParams.set('q', finalQuery);
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('limit', limit.toString());
    searchUrl.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i,edition_count,subject');

    try {
      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Open Library API Error ${response.status}:`, errorText, 'URL:', searchUrl.toString());
        throw new Error(`Open Library API Error: ${response.status}`);
      }

      const data = await response.json() as { docs?: OpenLibraryBookDoc[]; numFound?: number };
      
      const results: BookItem[] = (data.docs || []).map((doc) => {
        if (!doc.key || !doc.title) return null;

        const id = doc.key.replace('/works/', ''); 
        const authorName = doc.author_name ? doc.author_name[0] : 'Unknown Author';
        const year = doc.first_publish_year ? doc.first_publish_year.toString() : undefined;
        const imageUrl = doc.cover_i 
          ? `${COVERS_BASE_URL}/${doc.cover_i}-M.jpg` 
          : undefined;

        const item: BookItem = {
          id: id,
          mbid: id,
          type: 'book',
          title: doc.title,
          author: authorName,
          year,
          date: year ? `${year}-01-01` : undefined,
          imageUrl,
        };
        return item;
      }).filter((item): item is BookItem => item !== null);

      const totalCount = data.numFound || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        results,
        page,
        totalPages,
        totalCount,
      };

    } catch (error) {
      console.error('Open Library Search Error:', error);
      throw error;
    }
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (type !== 'book') {
      throw new Error(`Type ${type} not supported by OpenLibraryService`);
    }

    try {
        const response = await fetch(`${OPEN_LIBRARY_BASE_URL}/works/${id}.json`);
        if (!response.ok) {
           return {
             id,
             mbid: id,
             type: 'book',
           };
        }
        
        const data = await response.json() as OpenLibraryWorkDetails;
        const imageUrl = data.covers && data.covers.length > 0 
           ? `${COVERS_BASE_URL}/${data.covers[0]}-L.jpg` 
           : undefined;

        let description: string | undefined;
        if (typeof data.description === 'string') {
          description = data.description;
        } else if (data.description && typeof data.description === 'object' && 'value' in data.description) {
          description = data.description.value;
        }

        const tags = Array.isArray(data.subjects) ? data.subjects.slice(0, 8) : undefined;
        const urls = Array.isArray(data.links) ? data.links.map((l) => ({ type: l.title, url: l.url })) : undefined;

        return {
            id,
            mbid: id,
            type: 'book',
            imageUrl,
            tags,
            date: data.first_publish_date,
            urls,
            description,
        };

    } catch (error) {
        console.error('Open Library Details Error:', error);
        return { id, mbid: id, type: 'book' };
    }
  }

  getSupportedTypes(): MediaType[] {
    return ['book', 'author'];
  }

  getUIConfig(type: MediaType): MediaUIConfig {
    return getMediaUI(type);
  }

  getFilters(type: MediaType): FilterDefinition[] {
    if (type !== 'book') return [];

    return [
      {
        id: 'selectedAuthor',
        paramName: 'author',
        label: 'Filter by Author',
        type: 'picker',
        pickerType: 'author',
      },
      {
        id: 'yearRange',
        label: 'First Publish Year',
        type: 'range',
      },
      {
        id: 'bookType',
        label: 'Genre / Type',
        type: 'select',
        options: [
          { label: 'Any', value: '' },
          { label: 'Fiction', value: 'fiction' },
          { label: 'Non-Fiction', value: 'non-fiction' },
          { label: 'Compilation', value: 'compilation' },
          { label: 'Anthology', value: 'anthology' },
          { label: 'Textbook', value: 'textbook' },
          { label: 'Biography', value: 'biography' },
        ],
      },
    ];
  }

  getDefaultFilters(type: MediaType): Record<string, unknown> {
    const defaults: Record<string, unknown> = {
      query: '',
    };

    if (type === 'book') {
      defaults.selectedAuthor = null;
      defaults.minYear = '';
      defaults.maxYear = '';
      defaults.bookType = '';
    }

    return defaults;
  }

  parseSearchOptions(params: URLSearchParams): SearchOptions {
    const page = Number.parseInt(params.get('page') || '1', 10);
    const fuzzy = params.get('fuzzy') !== 'false';
    const wildcard = params.get('wildcard') !== 'false';

    const filters: Record<string, unknown> = {
      minYear: params.get('minYear'),
      maxYear: params.get('maxYear'),
      author: params.get('author') || undefined,
      bookType: params.get('bookType') || undefined,
    };

    return {
      page,
      fuzzy,
      wildcard,
      filters,
    };
  }
}
