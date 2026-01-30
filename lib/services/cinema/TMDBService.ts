/**
 * @file TMDBService.ts
 * @description Service provider for The Movie Database (TMDB) integration.
 * @module TMDBService
 */

import { logger } from '@/lib/logger';
import { secureFetch } from '@/lib/services/shared/api-client';
import { MediaService, SearchOptions } from '@/lib/services/types';
import { MediaDetails, MediaItem, MediaType, SearchResult } from '@/lib/types';

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
  vote_average?: number;
  vote_count?: number;
}

interface TMDBDetails extends TMDBResult {
  overview?: string;
  tagline?: string;
  genres?: { id: number; name: string }[];
}

export class TMDBService implements MediaService {
  readonly category = 'cinema' as const;
  
  private getApiKey(): string {
    return process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
        logger.warn('TMDB_API_KEY is missing.');
        return null;
    }

    const query = new URLSearchParams(params);
    query.append('api_key', apiKey);
    
    return secureFetch<T>(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`);
  }

  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    const page = options.page || 1;
    
    if (!this.getApiKey()) {
       throw new Error('TMDB_API_KEY is missing');
    }

    let endpoint = '';
    switch (type) {
      case 'movie': { 
        endpoint = '/search/movie';
        break;
      }
      case 'tv': { 
        endpoint = '/search/tv';
        break;
      }
      case 'person': { 
        endpoint = '/search/person';
        break;
      }
      default: { 
        return { results: [], page: 1, totalPages: 0, totalCount: 0 };
      }
    }

    const data = await this.fetch<{
      results: TMDBResult[];
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, { query, page: page.toString() });
    
    if (!data) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    return {
      results: data.results.map((item) => this.mapToMediaItem(item, type)),
      page: data.page,
      totalPages: data.total_pages,
      totalCount: data.total_results,
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (!this.getApiKey()) {
        throw new Error('TMDB_API_KEY is missing');
    }
    
    let pathType: string;
    switch (type) {
      case 'movie': { pathType = 'movie'; break; }
      case 'tv': { pathType = 'tv'; break; }
      case 'person': { pathType = 'person'; break; }
      default: { pathType = 'person'; }
    }

    const endpoint = `/${pathType}/${id}`;
    const data = await this.fetch<TMDBDetails>(endpoint);

    if (!data) {
      throw new Error(`Details not found for ${type} ${id}`);
    }

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

  private mapToMediaItem(item: TMDBResult, type: MediaType): MediaItem {
    const rawImageUrl = item.poster_path || item.profile_path;
    const base = {
      id: item.id.toString(),
      mbid: item.id.toString(),
      title: item.title || item.name || 'Unknown',
      year: (item.release_date || item.first_air_date || '').split('-')[0],
      imageUrl: rawImageUrl ? `${IMAGE_BASE_URL}${rawImageUrl}` : undefined,
      rating: item.vote_average,
      reviewCount: item.vote_count,
    };

    switch (type) {
      case 'movie': { return { ...base, type: 'movie' }; }
      case 'tv': { return { ...base, type: 'tv' }; }
      case 'person': { return { ...base, type: 'person' }; }
      default: {
        throw new Error(`Unsupported type: ${type}`);
      }
    }
  }

  getDefaultFilters(_type: MediaType): Record<string, unknown> {
    return {
      query: '',
      minYear: '',
      maxYear: '',
      tag: '',
      sort: 'relevance',
    };
  }

  parseSearchOptions(params: URLSearchParams): SearchOptions {
    const page = Number.parseInt(params.get('page') || '1', 10);
    const fuzzy = params.get('fuzzy') !== 'false';
    const wildcard = params.get('wildcard') !== 'false';

    const filters: Record<string, unknown> = {
      minYear: params.get('minYear'),
      maxYear: params.get('maxYear'),
      tag: params.get('tag') || undefined,
      sort: params.get('sort') || 'relevance',
    };

    return {
      page,
      fuzzy,
      wildcard,
      filters,
    };
  }
}
