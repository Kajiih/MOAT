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
    ...Array.from({ length: 10 }, (_, i) => ({
      id: 10 + i,
      title: faker.commerce.productName(),
      release_date: faker.date.past({ years: 20 }).toISOString().split('T')[0],
      poster_path: `/${faker.string.alphanumeric(10)}.jpg`,
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
