/**
 * @file TMDBService.ts
 * @description Service provider for The Movie Database (TMDB) integration.
 * @module TMDBService
 */

import { getMediaUI } from '@/lib/media-defs';
import { logger } from '@/lib/logger';
import { FilterDefinition, MediaService, MediaUIConfig, SearchOptions } from '@/lib/services/types';
import { MediaDetails, MediaItem, MediaType, SearchResult } from '@/lib/types';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  profile_path?: string;
  release_date?: string;
  first_air_date?: string;
}

interface TMDBDetails extends TMDBResult {
  overview?: string;
  tagline?: string;
  genres?: { id: number; name: string }[];
}

export class TMDBService implements MediaService {
  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!TMDB_API_KEY) {
        logger.warn('TMDB_API_KEY is missing. Returning null to trigger mock fallback.');
        return null;
    }

    const query = new URLSearchParams(params);
    query.append('api_key', TMDB_API_KEY);
    
    const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`);
    if (!res.ok) throw new Error(`TMDB API Error: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    const page = options.page || 1;
    
    if (!TMDB_API_KEY) {
       return this.getMockSearch(query, type);
    }

    let endpoint = '';
    switch (type) {
      case 'movie': 
        endpoint = '/search/movie';
        break;
      case 'tv': 
        endpoint = '/search/tv';
        break;
      case 'person': 
        endpoint = '/search/person';
        break;
      default: 
        return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    const data = await this.fetch<{
      results: TMDBResult[];
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { query, page: page.toString() });
    
    if (!data) return this.getMockSearch(query, type);

    return {
      results: data.results.map((item) => this.mapToMediaItem(item, type)),
      page: data.page,
      totalPages: data.total_pages,
      totalCount: data.total_results,
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (!TMDB_API_KEY) {
        return this.getMockDetails(id, type);
    }
    
    let pathType: string;
    switch (type) {
      case 'movie': pathType = 'movie'; break;
      case 'tv': pathType = 'tv'; break;
      default: pathType = 'person';
    }

    const endpoint = `/${pathType}/${id}`;
    const data = await this.fetch<TMDBDetails>(endpoint);

    if (!data) return this.getMockDetails(id, type);

    const rawImageUrl = data.poster_path || data.profile_path;

    return {
        id,
        mbid: id,
        type,
        imageUrl: rawImageUrl ? `${IMAGE_BASE_URL}${rawImageUrl}` : undefined,
        date: data.release_date || data.first_air_date,
    };
  }

  getSupportedTypes(): MediaType[] {
    return ['movie', 'tv', 'person'];
  }

  getUIConfig(type: MediaType): MediaUIConfig {
    return getMediaUI(type);
  }

  getFilters(_type: MediaType): FilterDefinition[] {
    return [ {
      id: 'yearRange',
      label: 'Release Year',
      type: 'range',
    }, {
      id: 'tag',
      label: 'Genre / Keywords',
      type: 'text',
      placeholder: 'e.g. Sci-Fi, Horror...',
    }];
  }

  private mapToMediaItem(item: TMDBResult, type: MediaType): MediaItem {
    const rawImageUrl = item.poster_path || item.profile_path;
    const base = {
      id: item.id.toString(),
      mbid: item.id.toString(),
      title: item.title || item.name || 'Unknown',
      year: (item.release_date || item.first_air_date || '').split('-')[0],
      imageUrl: rawImageUrl ? `${IMAGE_BASE_URL}${rawImageUrl}` : undefined,
    };

    switch (type) {
      case 'movie': return { ...base, type: 'movie' };
      case 'tv': return { ...base, type: 'tv' };
      case 'person': return { ...base, type: 'person' };
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }

  // --- MOCKS ---
  private getMockSearch(query: string, type: MediaType): SearchResult {
      const mockResults: MediaItem[] = [];
      for(let i=1; i<=5; i++) {
          const base = {
              id: `mock-${type}-${i}`,
              mbid: `mock-${type}-${i}`,
              title: `${type === 'movie' ? 'Mock Movie' : type === 'tv' ? 'Mock Show' : 'Mock Person'} ${i} (${query})`,
              year: '2025',
              imageUrl: '' 
          };
          
          switch (type) {
            case 'movie': mockResults.push({ ...base, type: 'movie' }); break;
            case 'tv': mockResults.push({ ...base, type: 'tv' }); break;
            case 'person': mockResults.push({ ...base, type: 'person' }); break;
          }
      }
      return { results: mockResults, page: 1, totalPages: 1, totalCount: 5 };
  }

  private getMockDetails(id: string, type: MediaType): MediaDetails {
      return {
          id, 
          mbid: id,
          type,
          date: '2025-01-01',
      };
  }
}
