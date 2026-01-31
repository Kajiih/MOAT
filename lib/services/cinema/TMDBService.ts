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

  async search(query: string, type: MediaType, options: SearchOptions = {}): Promise<SearchResult> {
    const page = options.page || 1;
    const filters = options.filters || {};
    const sort = options.sort || 'relevance';

    if (!this.getApiKey()) {
      throw new Error('TMDB_API_KEY is missing');
    }

    let endpoint = '';
    const params: Record<string, string> = { page: page.toString() };

    // Common filters
    const minYear = filters.minYear as string | undefined;
    const maxYear = filters.maxYear as string | undefined;

    if (query) {
      // Use SEARCH endpoint if query is present (sort and complex filters not supported by TMDB search API)
      switch (type) {
        case 'movie': {
          endpoint = '/search/movie';
          if (minYear) params.primary_release_year = minYear;
          break;
        }
        case 'tv': {
          endpoint = '/search/tv';
          if (minYear) params.first_air_date_year = minYear;
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
      params.query = query;
    } else {
      // Use DISCOVER endpoint if query is empty (allows better sorting and filtering)
      switch (type) {
        case 'movie': {
          endpoint = '/discover/movie';
          if (minYear) params['primary_release_date.gte'] = `${minYear}-01-01`;
          if (maxYear) params['primary_release_date.lte'] = `${maxYear}-12-31`;

          // Handle sorting
          switch (sort) {
            case 'date_desc':
              params.sort_by = 'release_date.desc';
              break;
            case 'date_asc':
              params.sort_by = 'release_date.asc';
              break;
            case 'rating_desc':
              params.sort_by = 'vote_average.desc';
              params['vote_count.gte'] = '50'; // Filter out low-count noise for rating sort
              break;
            case 'rating_asc':
              params.sort_by = 'vote_average.asc';
              params['vote_count.gte'] = '10';
              break;
            case 'reviews_desc':
              params.sort_by = 'vote_count.desc';
              break;
            case 'reviews_asc':
              params.sort_by = 'vote_count.asc';
              break;
            case 'title_asc':
              params.sort_by = 'original_title.asc';
              break;
            case 'title_desc':
              params.sort_by = 'original_title.desc';
              break;
            default:
              params.sort_by = 'popularity.desc';
          }
          break;
        }
        case 'tv': {
          endpoint = '/discover/tv';
          if (minYear) params['first_air_date.gte'] = `${minYear}-01-01`;
          if (maxYear) params['first_air_date.lte'] = `${maxYear}-12-31`;

          // Handle sorting
          switch (sort) {
            case 'date_desc':
              params.sort_by = 'first_air_date.desc';
              break;
            case 'date_asc':
              params.sort_by = 'first_air_date.asc';
              break;
            case 'rating_desc':
              params.sort_by = 'vote_average.desc';
              params['vote_count.gte'] = '20';
              break;
            case 'rating_asc':
              params.sort_by = 'vote_average.asc';
              break;
            case 'reviews_desc':
              params.sort_by = 'vote_count.desc';
              break;
            case 'reviews_asc':
              params.sort_by = 'vote_count.asc';
              break;
            case 'title_asc':
              params.sort_by = 'name.asc';
              break;
            case 'title_desc':
              params.sort_by = 'name.desc';
              break;
            default:
              params.sort_by = 'popularity.desc';
          }
          break;
        }
        case 'person': {
          endpoint = '/person/popular'; // Best we can do for "popular people" without a query
          break;
        }
        default: {
          return { results: [], page: 1, totalPages: 0, totalCount: 0 };
        }
      }
    }

    const data = await this.fetch<{
      results: TMDBResult[];
      page: number;
      total_pages: number;
      total_results: number;
    }>(endpoint, params);

    if (!data) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
    }

    return {
      results: data.results.map((item) => this.mapToMediaItem(item, type)),
      page: data.page,
      totalPages: data.total_pages,
      totalCount: data.total_results,
      isServerSorted: !query && sort !== 'relevance',
    };
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    if (!this.getApiKey()) {
      throw new Error('TMDB_API_KEY is missing');
    }

    let pathType: string;
    switch (type) {
      case 'movie': {
        pathType = 'movie';
        break;
      }
      case 'tv': {
        pathType = 'tv';
        break;
      }
      case 'person': {
        pathType = 'person';
        break;
      }
      default: {
        pathType = 'person';
      }
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
      case 'movie': {
        return { ...base, type: 'movie' };
      }
      case 'tv': {
        return { ...base, type: 'tv' };
      }
      case 'person': {
        return { ...base, type: 'person' };
      }
      default: {
        throw new Error(`Unsupported type: ${type}`);
      }
    }
  }
}
