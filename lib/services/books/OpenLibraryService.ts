/**
 * @file OpenLibraryService.ts
 * @description Service provider for Open Library integration (Books).
 */

import { AuthorItem, BookItem, MediaDetails, MediaItem, MediaType, SearchResult } from '@/lib/types';

import { FilterDefinition, MediaService, MediaUIConfig, SearchOptions } from '../types';
import { getMediaUI } from '@/lib/media-defs';

const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org/b/id';

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
      // Pagination not strictly supported by search/authors.json in the same way? 
      // Docs say it returns docs. Limit might not work, but let's try or just slice.
      // Actually standard search API supports q=...&page=...
      
      const response = await fetch(searchUrl.toString());
      if (!response.ok) throw new Error(`Open Library API Error: ${response.status}`);
      
      const data = await response.json();
      const results: MediaItem[] = (data.docs || []).map((doc: any) => {
         // doc.key is usually "OL123A"
         const item: AuthorItem = {
           id: doc.key,
           mbid: doc.key,
           type: 'author',
           title: doc.name,
           year: doc.birth_date ? doc.birth_date.slice(-4) : undefined, // loose parsing
           imageUrl: `https://covers.openlibrary.org/a/olid/${doc.key}-M.jpg`
         };
         return item;
      });

      return {
        results,
        page: 1, 
        totalPages: 1, // Author search pagination is flaky in OL
        totalCount: data.numFound || results.length
      };
    }

    if (type !== 'book') {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }
    
    // ... Book Search Logic ...
    // Build query
    const searchUrl = new URL(`${OPEN_LIBRARY_BASE_URL}/search.json`);
    
    // Handle filters
    const author = options.filters?.author as string | undefined;
    const minYear = options.filters?.minYear as string | undefined;
    const maxYear = options.filters?.maxYear as string | undefined;
    
    if (author) {
      searchUrl.searchParams.set('author', author);
    }

    let yearQuery = '';
    if (minYear || maxYear) {
       const min = minYear || '*';
       const max = maxYear || '*';
       yearQuery = `first_publish_year:[${min} TO ${max}]`;
    }

    let finalQuery = query;
    if (yearQuery) {
       finalQuery = finalQuery ? `${finalQuery} ${yearQuery}` : yearQuery;
    }

    // Main query (if empty and we have an author filter, OpenLibrary handles it fine)
    if (finalQuery) {
      searchUrl.searchParams.set('q', finalQuery);
    } else if (!author) {
       // If no query and no author, return empty (standard behavior)
       return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('limit', limit.toString());
    // Request specific fields to minimize payload
    searchUrl.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i,edition_count');

    try {
      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        throw new Error(`Open Library API Error: ${response.status}`);
      }

      const data = await response.json();
      
      const results: MediaItem[] = (data.docs || []).map((doc: any) => {
        const id = doc.key.replace('/works/', ''); // Remove prefix for ID
        const author = doc.author_name ? doc.author_name[0] : 'Unknown Author';
        const year = doc.first_publish_year ? doc.first_publish_year.toString() : undefined;
        const imageUrl = doc.cover_i 
          ? `${COVERS_BASE_URL}/${doc.cover_i}-M.jpg` 
          : undefined;

        // Construct BookItem
        const item: BookItem = {
          id: id,
          mbid: id, // Treating 'mbid' as generic external ID
          type: 'book',
          title: doc.title,
          author,
          year,
          date: year ? `${year}-01-01` : undefined, // Approximate
          imageUrl,
        };
        return item;
      });

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
    // Basic implementation for details - strictly speaking we might need a separate endpoint
    // For now, we return a minimal detail object since search gives us most info used in the card.
    // In a full implementation, we would query https://openlibrary.org/works/{id}.json
    
    if (type !== 'book') {
      throw new Error(`Type ${type} not supported by OpenLibraryService`);
    }

    try {
        const response = await fetch(`${OPEN_LIBRARY_BASE_URL}/works/${id}.json`);
        if (!response.ok) {
           // Fallback if not found or error
           return {
             id,
             mbid: id,
             type: 'book',
           };
        }
        
        const data = await response.json();
        const imageUrl = data.covers && data.covers.length > 0 
           ? `${COVERS_BASE_URL}/${data.covers[0]}-L.jpg` 
           : undefined;

        const description = typeof data.description === 'string' 
          ? data.description 
          : data.description?.value;

        const tags = Array.isArray(data.subjects) ? data.subjects.slice(0, 8) : undefined;
        const urls = Array.isArray(data.links) ? data.links.map((l: any) => ({ type: l.title, url: l.url })) : undefined;

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
        label: 'Filter by Author',
        type: 'picker',
        pickerType: 'author',
      },
      {
        id: 'yearRange',
        label: 'First Publish Year',
        type: 'range',
      },
    ];
  }
}
