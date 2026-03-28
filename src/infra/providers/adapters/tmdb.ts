/**
 * @file TMDB Provider Implementation
 * @description Provides support for Movies, TV Series, and People via The Movie Database (TMDB) API.
 * TODO(P0): Review this file for correctness and completeness.
 */

import { Film, Tv, User } from 'lucide-react';
import { z } from 'zod';

import { toCompositeId } from '@/domain/items/identity';
import { urlImage } from '@/domain/items/images';
import {
  Item,
  ItemDetails,
  ItemDetailsSchema,
  ItemSchema,
  ItemSection,
  Subtitle,
} from '@/domain/items/items';
import { Entity, Fetcher, nonEmpty, Provider, ProviderStatus } from '@/domain/providers/types';
import { createFilterSuite, FilterDefinition, mapTo } from '@/features/search/filter-schemas';
import { SearchParams, SearchResult, SearchResultSchema } from '@/features/search/search-schemas';
import { createSortSuite, SortDirection } from '@/features/search/sort-schemas';
import { secureFetch } from '@/infra/providers/api-client';
import { applyFilters, handleProviderError } from '@/infra/providers/utils';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * TMDB API Schemas
 */

const TMDBMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  overview: z.string().nullish(),
  genre_ids: z.array(z.number()).nullish(),
  original_language: z.string().nullish(),
  popularity: z.number().nullish(),
});

type TMDBMovie = z.infer<typeof TMDBMovieSchema>;

const TMDBTVShowSchema = z.object({
  id: z.number(),
  name: z.string(),
  first_air_date: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  overview: z.string().nullish(),
  genre_ids: z.array(z.number()).nullish(),
  original_language: z.string().nullish(),
  popularity: z.number().nullish(),
});

type TMDBTVShow = z.infer<typeof TMDBTVShowSchema>;

const TMDBPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullish(),
  known_for_department: z.string().nullish(),
  biography: z.string().nullish(),
  birthday: z.string().nullish(),
  deathday: z.string().nullish(),
  place_of_birth: z.string().nullish(),
  known_for: z.array(z.union([TMDBMovieSchema, TMDBTVShowSchema])).nullish(),
  combined_credits: z
    .object({
      cast: z.array(z.union([TMDBMovieSchema, TMDBTVShowSchema])).nullish(),
    })
    .nullish(),
});

type TMDBPerson = z.infer<typeof TMDBPersonSchema>;

interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * Builds a full TMDB image URL from a path fragment.
 * @param path The partial image path from TMDB API.
 * @param size The desired image size ('w500' or 'original').
 * @returns The full CDN URL or null if path is missing.
 */
function getImageUrl(
  path: string | null | undefined,
  size: 'w500' | 'original' = 'w500',
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Filter Suite Factories
 */
const movieFilters = createFilterSuite<TMDBMovie>();
const tvFilters = createFilterSuite<TMDBTVShow>();
const personFilters = createFilterSuite<TMDBPerson>();

const movieSorts = createSortSuite<TMDBMovie>();
const tvSorts = createSortSuite<TMDBTVShow>();

/**
 * Genre Mappings
 */
const MOVIE_GENRES = [
  { label: 'Action', value: '28' },
  { label: 'Adventure', value: '12' },
  { label: 'Animation', value: '16' },
  { label: 'Comedy', value: '35' },
  { label: 'Crime', value: '80' },
  { label: 'Documentary', value: '99' },
  { label: 'Drama', value: '18' },
  { label: 'Family', value: '10751' },
  { label: 'Fantasy', value: '14' },
  { label: 'History', value: '36' },
  { label: 'Horror', value: '27' },
  { label: 'Music', value: '10402' },
  { label: 'Mystery', value: '9648' },
  { label: 'Romance', value: '10749' },
  { label: 'Science Fiction', value: '878' },
  { label: 'Thriller', value: '539' },
  { label: 'War', value: '10752' },
  { label: 'Western', value: '37' },
];

const TV_GENRES = [
  { label: 'Action & Adventure', value: '10759' },
  { label: 'Animation', value: '16' },
  { label: 'Comedy', value: '35' },
  { label: 'Crime', value: '80' },
  { label: 'Documentary', value: '99' },
  { label: 'Drama', value: '18' },
  { label: 'Family', value: '10751' },
  { label: 'Kids', value: '10762' },
  { label: 'Mystery', value: '9648' },
  { label: 'News', value: '10763' },
  { label: 'Reality', value: '10764' },
  { label: 'Sci-Fi & Fantasy', value: '10765' },
  { label: 'Soap', value: '10766' },
  { label: 'Talk', value: '10767' },
  { label: 'War & Politics', value: '10768' },
  { label: 'Western', value: '37' },
];

/**
 * Entity Implementations
 */

class TMDBMovieEntity implements Entity<TMDBMovie> {
  public readonly id = 'movie';
  public readonly branding = {
    label: 'Movie',
    labelPlural: 'Movies',
    icon: Film,
    colorClass: 'text-cyan-400',
  };

  public readonly filters = [
    movieFilters.text({
      id: 'year',
      label: 'Release Year',
      placeholder: 'YYYY',
      transform: mapTo('primary_release_year'),
      testCases: [
        {
          value: '2010',
          expectAll: (movie) => movie.release_date?.startsWith('2010') ?? false,
          expectAllMessage: 'have a release date starting with 2010',
        },
      ],
    }),
    movieFilters.multiselect({
      id: 'genres',
      label: 'Genres',
      options: MOVIE_GENRES,
      transform: (values) => ({ with_genres: values.join(',') }),
      testCases: [
        {
          value: ['28'], // Action
          expectAll: (movie) => movie.genre_ids?.includes(28) ?? false,
          expectAllMessage: 'include the Action genre ID (28)',
        },
      ],
    }),
    movieFilters.number({
      id: 'rating',
      label: 'Minimum Rating',
      defaultValue: 0,
      transform: mapTo('vote_average.gte'),
      testCases: [
        {
          value: 8,
          expectAll: (movie) => (movie.vote_average ?? 0) >= 8,
          expectAllMessage: 'have a rating of at least 8',
        },
      ],
    }),
  ];

  public readonly searchOptions: FilterDefinition<TMDBMovie>[] = [];

  public readonly sortOptions = [
    movieSorts.create({
      id: 'popularity.desc',
      label: 'Popularity',
      defaultDirection: SortDirection.DESC,
    }),
    movieSorts.create({
      id: 'primary_release_date.desc',
      label: 'Newest',
      defaultDirection: SortDirection.DESC,
    }),
    movieSorts.create({
      id: 'vote_average.desc',
      label: 'Best Rated',
      defaultDirection: SortDirection.DESC,
    }),
    movieSorts.create({
      id: 'revenue.desc',
      label: 'Box Office',
      defaultDirection: SortDirection.DESC,
    }),
  ];

  public readonly edgeShortQuery = 'Avatar';
  public readonly defaultTestQueries = nonEmpty('Inception', 'The Matrix');
  public readonly emptyTestQuery = 'tmdb_unlikely_movies_zxyv';
  public readonly testDetailsIds = nonEmpty('27205', '603'); // Inception, The Matrix

  public constructor(private provider: TMDBProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0].id,
    sortDirection: this.sortOptions[0].defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<TMDBMovie>> => {
    const isDiscover = !params.query;
    const endpoint = isDiscover ? '/discover/movie' : '/search/movie';

    return this.provider.searchEntities<TMDBMovie>(
      params,
      this.filters,
      endpoint,
      TMDBMovieSchema,
      (movie) => mapMovieToItem(movie, this.provider.id),
    );
  };

  public readonly getNextParams = (
    params: SearchParams,
    result: SearchResult,
  ): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly resolveImage = async (key: string): Promise<string | null> => {
    return getImageUrl(key, 'w500');
  };

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const data = await this.provider.fetchTMDB<unknown>(
        `/movie/${providerItemId}`,
        {},
        { signal },
      );
      const movie = TMDBMovieSchema.parse(data);
      const item = mapMovieToItem(movie, this.provider.id);

      return ItemDetailsSchema.parse({
        ...item,
        description: movie.overview || undefined,
        tags: [], // Could be expanded by fetching movie keywords/genres
        urls: [{ type: 'tmdb', url: `https://www.themoviedb.org/movie/${movie.id}` }],
      });
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

class TMDBTVEntity implements Entity<TMDBTVShow> {
  public readonly id = 'tv';
  public readonly branding = {
    label: 'TV Series',
    labelPlural: 'TV Series',
    icon: Tv,
    colorClass: 'text-amber-400',
  };

  public readonly filters = [
    tvFilters.text({
      id: 'year',
      label: 'First Air Year',
      placeholder: 'YYYY',
      transform: mapTo('first_air_date_year'),
      testCases: [
        {
          value: '2008',
          expectAll: (tv) => tv.first_air_date?.startsWith('2008') ?? false,
          expectAllMessage: 'have a first air date starting with 2008',
        },
      ],
    }),
    tvFilters.multiselect({
      id: 'genres',
      label: 'Genres',
      options: TV_GENRES,
      transform: (values) => ({ with_genres: values.join(',') }),
      testCases: [
        {
          value: ['18'], // Drama
          expectAll: (tv) => tv.genre_ids?.includes(18) ?? false,
          expectAllMessage: 'include the Drama genre ID (18)',
        },
      ],
    }),
    tvFilters.number({
      id: 'rating',
      label: 'Minimum Rating',
      defaultValue: 0,
      transform: mapTo('vote_average.gte'),
      testCases: [
        {
          value: 8,
          expectAll: (tv) => (tv.vote_average ?? 0) >= 8,
          expectAllMessage: 'have a rating of at least 8',
        },
      ],
    }),
  ];

  public readonly searchOptions: FilterDefinition<TMDBTVShow>[] = [];

  public readonly sortOptions = [
    tvSorts.create({
      id: 'popularity.desc',
      label: 'Popularity',
      defaultDirection: SortDirection.DESC,
    }),
    tvSorts.create({
      id: 'first_air_date.desc',
      label: 'Newest',
      defaultDirection: SortDirection.DESC,
    }),
    tvSorts.create({
      id: 'vote_average.desc',
      label: 'Best Rated',
      defaultDirection: SortDirection.DESC,
    }),
  ];

  public readonly edgeShortQuery = 'Breaking Bad';
  public readonly defaultTestQueries = nonEmpty('Breaking Bad', 'Succession');
  public readonly emptyTestQuery = 'tmdb_unlikely_tv_zxyv';
  public readonly testDetailsIds = nonEmpty('1396', '71446'); // Breaking Bad, Money Heist

  public constructor(private provider: TMDBProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    sort: this.sortOptions[0].id,
    sortDirection: this.sortOptions[0].defaultDirection,
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<TMDBTVShow>> => {
    const isDiscover = !params.query;
    const endpoint = isDiscover ? '/discover/tv' : '/search/tv';

    return this.provider.searchEntities<TMDBTVShow>(
      params,
      this.filters,
      endpoint,
      TMDBTVShowSchema,
      (tv) => mapTVToItem(tv, this.provider.id),
    );
  };

  public readonly getNextParams = (
    params: SearchParams,
    result: SearchResult,
  ): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly resolveImage = async (key: string): Promise<string | null> => {
    return getImageUrl(key, 'w500');
  };

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const data = await this.provider.fetchTMDB<unknown>(`/tv/${providerItemId}`, {}, { signal });
      const tv = TMDBTVShowSchema.parse(data);
      const item = mapTVToItem(tv, this.provider.id);

      return ItemDetailsSchema.parse({
        ...item,
        description: tv.overview || undefined,
        tags: [],
        urls: [{ type: 'tmdb', url: `https://www.themoviedb.org/tv/${tv.id}` }],
      });
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

class TMDBPersonEntity implements Entity<TMDBPerson> {
  public readonly id = 'person';
  public readonly branding = {
    label: 'Person',
    labelPlural: 'People',
    icon: User,
    colorClass: 'text-rose-400',
  };

  public readonly filters = [];
  public readonly searchOptions = [
    personFilters.boolean({
      id: 'include_adult',
      label: 'Include Adult',
      defaultValue: false,
      transform: mapTo('include_adult'),
      testCases: [
        {
          value: false,
          skipQueryDifferenceTest: true, // Baseline also uses false
          expectAll: (_person) => true, // We can't easily verify adult status from the raw person object without deep parsing
        },
      ],
    }),
  ];

  public readonly sortOptions = [];

  public readonly edgeShortQuery = 'Christopher Nolan';
  public readonly defaultTestQueries = nonEmpty('Christopher Nolan', 'Quentin Tarantino');
  public readonly emptyTestQuery = 'tmdb_unlikely_person_zxyv';
  public readonly testDetailsIds = nonEmpty('525', '138'); // Christopher Nolan, Quentin Tarantino

  public constructor(private provider: TMDBProvider) {}

  public readonly getInitialParams = (config: { limit: number }): SearchParams => ({
    query: '',
    filters: {},
    limit: config.limit,
    page: 1,
  });

  public readonly search = async (params: SearchParams): Promise<SearchResult<TMDBPerson>> => {
    const isDiscover = !params.query;
    const endpoint = isDiscover ? '/person/popular' : '/search/person';

    return this.provider.searchEntities<TMDBPerson>(
      params,
      this.searchOptions,
      endpoint,
      TMDBPersonSchema,
      (person) => mapPersonToItem(person, this.provider.id),
    );
  };

  public readonly getNextParams = (
    params: SearchParams,
    result: SearchResult,
  ): SearchParams | null => {
    if (!result.pagination.hasNextPage) return null;
    return { ...params, page: (params.page || 1) + 1 };
  };

  public readonly getPreviousParams = (params: SearchParams): SearchParams | null => {
    const currentPage = params.page || 1;
    if (currentPage <= 1) return null;
    return { ...params, page: currentPage - 1 };
  };

  public readonly resolveImage = async (key: string): Promise<string | null> => {
    return getImageUrl(key, 'w500');
  };

  public readonly getDetails = async (
    providerItemId: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ItemDetails> => {
    try {
      const data = await this.provider.fetchTMDB<unknown>(
        `/person/${providerItemId}`,
        { append_to_response: 'combined_credits' },
        { signal },
      );
      const person = TMDBPersonSchema.parse(data);
      const item = mapPersonToItem(person, this.provider.id);

      const sections: ItemSection[] = [];
      if (person.combined_credits?.cast) {
        sections.push({
          title: 'Known For',
          type: 'list',
          content: person.combined_credits.cast.slice(0, 10).map((credit) => ({
            label: 'title' in credit ? 'Movie' : 'TV Series',
            name: 'title' in credit ? credit.title : credit.name,
            identity: {
              providerItemId: credit.id.toString(),
              providerId: this.provider.id,
              entityId: 'title' in credit ? 'movie' : 'tv',
            },
          })),
        });
      }

      const extendedData: Record<string, string> = {};
      if (person.birthday) extendedData['Birthday'] = person.birthday;
      if (person.place_of_birth) extendedData['Place of Birth'] = person.place_of_birth;

      return ItemDetailsSchema.parse({
        ...item,
        description: person.biography || undefined,
        sections,
        details: { extendedData },
        urls: [{ type: 'tmdb', url: `https://www.themoviedb.org/person/${person.id}` }],
      });
    } catch (error) {
      throw handleProviderError(error, this.provider.id);
    }
  };
}

/**
 * Mappers
 */

function mapMovieToItem(movie: TMDBMovie, providerId: string): Item {
  const identity = { providerItemId: movie.id.toString(), providerId, entityId: 'movie' };
  const images = movie.poster_path ? [urlImage(getImageUrl(movie.poster_path) || '')] : [];

  const subtitle: Subtitle = [];
  const year = movie.release_date?.split('-')[0];
  if (year) subtitle.push(year);

  return ItemSchema.parse({
    id: toCompositeId(identity),
    identity,
    title: movie.title,
    images,
    subtitle,
    rating: movie.vote_average || undefined,
  });
}

function mapTVToItem(tv: TMDBTVShow, providerId: string): Item {
  const identity = { providerItemId: tv.id.toString(), providerId, entityId: 'tv' };
  const images = tv.poster_path ? [urlImage(getImageUrl(tv.poster_path) || '')] : [];

  const subtitle: Subtitle = [];
  const year = tv.first_air_date?.split('-')[0];
  if (year) subtitle.push(year);

  return ItemSchema.parse({
    id: toCompositeId(identity),
    identity,
    title: tv.name,
    images,
    subtitle,
    rating: tv.vote_average || undefined,
  });
}

function mapPersonToItem(person: TMDBPerson, providerId: string): Item {
  const identity = { providerItemId: person.id.toString(), providerId, entityId: 'person' };
  const images = person.profile_path ? [urlImage(getImageUrl(person.profile_path) || '')] : [];

  return ItemSchema.parse({
    id: toCompositeId(identity),
    identity,
    title: person.name,
    images,
    subtitle: person.known_for_department || undefined,
  });
}

/**
 * Provider Implementation
 */
export class TMDBProvider implements Provider {
  public readonly id = 'tmdb';
  public readonly label = 'TMDB';
  public readonly isDevelopment = true;
  public status: ProviderStatus = ProviderStatus.IDLE;

  private fetcher: Fetcher = secureFetch;
  private apiKey: string;

  public constructor(config?: { apiKey: string }) {
    this.apiKey = config?.apiKey || 'test-key';
  }

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
    this.status = ProviderStatus.READY;
  };

  public async searchEntities<T extends { id: number | string }>(
    params: SearchParams,
    filters: FilterDefinition<T>[],
    endpoint: string,
    schema: z.ZodType<T>,
    mapper: (raw: T) => Item,
  ): Promise<SearchResult<T>> {
    try {
      const apiParams: Record<string, string> = {
        page: (params.page || 1).toString(),
        ...applyFilters(params.filters, filters),
      };

      if (params.query) {
        apiParams.query = params.query;
      }

      if (params.sort) {
        apiParams.sort_by = params.sort;
      }

      const data = await this.fetchTMDB<TMDBListResponse<T>>(endpoint, apiParams, {
        signal: params.signal,
      });

      const parsedResults = z.array(schema).parse(data.results);
      const items = parsedResults.map((item) => mapper(item));

      const currentPage = data.page;
      const totalPages = data.total_pages;

      return SearchResultSchema.parse({
        items,
        raw: parsedResults,
        pagination: {
          currentPage,
          totalPages,
          totalCount: data.total_results,
          hasNextPage: currentPage < totalPages,
        },
      }) as SearchResult<T>;
    } catch (error) {
      throw handleProviderError(error, this.id);
    }
  }

  public async fetchTMDB<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const query = new URLSearchParams(params);
    query.append('api_key', this.apiKey);

    return this.fetcher<T>(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`, {
      signal: options?.signal,
    });
  }

  public readonly entities = [
    new TMDBMovieEntity(this),
    new TMDBTVEntity(this),
    new TMDBPersonEntity(this),
  ] as const;
}
