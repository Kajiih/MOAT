/**
 * @file handlers.ts
 * @description MSW handlers for TMDB API mock using faker.
 */

import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';

import { matchesQuery } from '@/lib/test/lucene-evaluator';

const TMDB_BASE = 'https://api.themoviedb.org/3';

const SEED = 789;
faker.seed(SEED);

interface TMDBMockItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
}

const mockDb: Record<string, TMDBMockItem[]> = {
  movie: [
    { id: 1, title: 'Inception', release_date: '2010-07-16', poster_path: '/inception.jpg' },
    { id: 2, title: 'A Movie', release_date: '2020-01-01', poster_path: '/a.jpg' },
    { id: 3, title: 'B Movie', release_date: '2021-01-01', poster_path: '/b.jpg' },
    { id: 4, title: 'C Movie', release_date: '2022-01-01', poster_path: '/c.jpg' },
    { id: 5, title: 'Z Movie', release_date: '2023-01-01', poster_path: '/z.jpg' },
    ...Array.from({ length: 5 }, (_, i) => ({
      id: 10 + i,
      title: 'Mock Movie ' + i,
      release_date: '2000-01-01',
      poster_path: `/mock${i}.jpg`,
    })),
  ],
  tv: [{ id: 101, name: 'Breaking Bad', first_air_date: '2008-01-20', poster_path: '/bb.jpg' }],
  person: [{ id: 500, name: 'Christopher Nolan', poster_path: '/nolan.jpg' }],
};

/**
 * Mock TMDB Handlers.
 */
export const handlers = [
  http.get(`${TMDB_BASE}/search/:type`, ({ request, params }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const type = params.type as string;

    const items = mockDb[type] || [];
    const matches = items.filter((item) =>
      matchesQuery(query, item, {
        query: 'title', // Simple mapping
        name: 'name',
      }),
    );

    return HttpResponse.json({
      page: 1,
      results: matches,
      total_pages: 1,
      total_results: matches.length,
    });
  }),

  http.get(`${TMDB_BASE}/discover/:type`, ({ request, params }) => {
    const url = new URL(request.url);
    const type = params.type as string;
    const items = [...(mockDb[type] || [])];

    // Filter by year if present
    const minDate =
      url.searchParams.get('primary_release_date.gte') ||
      url.searchParams.get('first_air_date.gte');
    const maxDate =
      url.searchParams.get('primary_release_date.lte') ||
      url.searchParams.get('first_air_date.lte');

    let filtered = items;
    if (minDate) {
      filtered = filtered.filter((i) => (i.release_date || i.first_air_date || '') >= minDate);
    }
    if (maxDate) {
      filtered = filtered.filter((i) => (i.release_date || i.first_air_date || '') <= maxDate);
    }

    // Handle dummy sorting for title in mock
    const sortBy = url.searchParams.get('sort_by');
    if (sortBy === 'original_title.asc' || sortBy === 'name.asc') {
      filtered.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    } else if (sortBy === 'original_title.desc' || sortBy === 'name.desc') {
      filtered.sort((a, b) => (b.title || b.name || '').localeCompare(a.title || a.name || ''));
    }

    return HttpResponse.json({
      page: 1,
      results: filtered,
      total_pages: 1,
      total_results: filtered.length,
    });
  }),

  http.get(`${TMDB_BASE}/person/popular`, () => {
    return HttpResponse.json({
      page: 1,
      results: mockDb.person,
      total_pages: 1,
      total_results: mockDb.person.length,
    });
  }),

  http.get(`${TMDB_BASE}/:type/:id`, ({ params }) => {
    const type = params.type as string;
    const id = Number.parseInt(params.id as string, 10);
    const items = mockDb[type] || [];
    const item = items.find((i) => i.id === id);

    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      ...item,
      overview: 'Mock overview',
      tagline: 'Mock tagline',
    });
  }),
];
