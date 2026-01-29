/**
 * @file OpenLibraryService.ts
 * @description Service provider for Open Library integration (Books).
 */

import { BookItem, MediaDetails, MediaItem, MediaType, SearchResult } from '@/lib/types';

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
    if (type !== 'book') {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    
    // Build query
    const searchUrl = new URL(`${OPEN_LIBRARY_BASE_URL}/search.json`);
    searchUrl.searchParams.set('q', query);
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

        return {
            id,
            mbid: id,
            type: 'book',
            imageUrl,
            // We could parse description into tags or bio equivalent if we had stricter types
        };

    } catch (error) {
        console.error('Open Library Details Error:', error);
        return { id, mbid: id, type: 'book' };
    }
  }

  getSupportedTypes(): MediaType[] {
    return ['book'];
  }

  getUIConfig(type: MediaType): MediaUIConfig {
    return getMediaUI(type);
  }

  getFilters(type: MediaType): FilterDefinition[] {
    if (type !== 'book') return [];

    return [
      {
        id: 'author',
        label: 'Author',
        type: 'text',
        placeholder: 'Search by author...',
      },
      // Open Library supports more advanced filtering but simple query is usually enough
    ];
  }
}
