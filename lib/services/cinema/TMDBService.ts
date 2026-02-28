/**
 * @file TMDBService.ts
 * @description Service provider for The Movie Database (TMDB) integration.
 * @module TMDBService
 */

import { logger } from '@/lib/logger';
import { CinemaFilters } from '@/lib/media-types/filters';
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

export class TMDBService implements MediaService<CinemaFilters> {
  readonly category = 'cinema' as const;
  readonly id = 'tmdb';
  readonly label = 'TMDB';

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
    const sort = (options.sort as string) || 'relevance';

    if (!this.getApiKey()) {
      throw new Error('TMDB_API_KEY is missing');
    }

    const params: Record<string, string> = { page: page.toString() };
    const { endpoint, isServerSorted } = query
      ? this.prepareSearchRequest(type, query, filters, params)
      : this.prepareDiscoverRequest(type, sort, filters, params);

    if (!endpoint) {
      return { results: [], page: 1, totalPages: 0, totalCount: 0 };
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
      isServerSorted,
    };
  }

  private prepareSearchRequest(
    type: MediaType,
    query: string,
    filters: Record<string, unknown>,
    params: Record<string, string>,
  ): { endpoint: string; isServerSorted: boolean } {
    params.query = query;
    const minYear = filters.minYear as string | undefined;

    switch (type) {
      case 'movie': {
        if (minYear) params.primary_release_year = minYear;
        return { endpoint: '/search/movie', isServerSorted: false };
      }
      case 'tv': {
        if (minYear) params.first_air_date_year = minYear;
        return { endpoint: '/search/tv', isServerSorted: false };
      }
      case 'person': {
        return { endpoint: '/search/person', isServerSorted: false };
      }
      default: {
        return { endpoint: '', isServerSorted: false };
      }
    }
  }

  private prepareDiscoverRequest(
    type: MediaType,
    sort: string,
    filters: Record<string, unknown>,
    params: Record<string, string>,
  ): { endpoint: string; isServerSorted: boolean } {
    const isServerSorted = sort !== 'relevance';
    const minYear = filters.minYear as string | undefined;
    const maxYear = filters.maxYear as string | undefined;

    switch (type) {
      case 'movie': {
        if (minYear) params['primary_release_date.gte'] = `${minYear}-01-01`;
        if (maxYear) params['primary_release_date.lte'] = `${maxYear}-12-31`;
        params.sort_by = this.getMovieSortBy(sort, params);
        return { endpoint: '/discover/movie', isServerSorted };
      }
      case 'tv': {
        if (minYear) params['first_air_date.gte'] = `${minYear}-01-01`;
        if (maxYear) params['first_air_date.lte'] = `${maxYear}-12-31`;
        params.sort_by = this.getTvSortBy(sort, params);
        return { endpoint: '/discover/tv', isServerSorted };
      }
      case 'person': {
        return { endpoint: '/person/popular', isServerSorted: false };
      }
      default: {
        return { endpoint: '', isServerSorted: false };
      }
    }
  }

  private getMovieSortBy(sort: string, params: Record<string, string>): string {
    switch (sort) {
      case 'date_desc': {
        return 'release_date.desc';
      }
      case 'date_asc': {
        return 'release_date.asc';
      }
      case 'rating_desc': {
        params['vote_count.gte'] = '50';
        return 'vote_average.desc';
      }
      case 'rating_asc': {
        params['vote_count.gte'] = '50';
        return 'vote_average.asc';
      }
      case 'reviews_desc': {
        return 'vote_count.desc';
      }
      case 'reviews_asc': {
        return 'vote_count.asc';
      }
      case 'title_asc': {
        return 'original_title.asc';
      }
      case 'title_desc': {
        return 'original_title.desc';
      }
      default: {
        return 'popularity.desc';
      }
    }
  }

  private getTvSortBy(sort: string, params: Record<string, string>): string {
    switch (sort) {
      case 'date_desc': {
        return 'first_air_date.desc';
      }
      case 'date_asc': {
        return 'first_air_date.asc';
      }
      case 'rating_desc': {
        params['vote_count.gte'] = '20';
        return 'vote_average.desc';
      }
      case 'rating_asc': {
        return 'vote_average.asc';
      }
      case 'reviews_desc': {
        return 'vote_count.desc';
      }
      case 'reviews_asc': {
        return 'vote_count.asc';
      }
      case 'title_asc': {
        return 'name.asc';
      }
      case 'title_desc': {
        return 'name.desc';
      }
      default: {
        return 'popularity.desc';
      }
    }
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

    // Build external links
    const urls: { type: string; url: string }[] = [
      { type: 'TMDB', url: `https://www.themoviedb.org/${pathType}/${id}` },
    ];
    if ('homepage' in data && typeof data.homepage === 'string' && data.homepage) {
      urls.push({ type: 'Official Website', url: data.homepage });
    }

    return {
      id,
      mbid: id,
      type,
      imageUrl: rawImageUrl ? `${IMAGE_BASE_URL}${rawImageUrl}` : undefined,
      date: data.release_date || data.first_air_date,
      description: data.overview,
      tags: data.genres?.map((g) => g.name),
      urls,
      serviceId: this.id,
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
      serviceId: this.id,
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
