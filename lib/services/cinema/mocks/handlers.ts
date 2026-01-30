/**
 * @file handlers.ts
 * @description MSW handlers for TMDB API mock.
 */

import { http, HttpResponse } from 'msw';

const TMDB_BASE = 'https://api.themoviedb.org/3';

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
    { id: 2, title: 'Interstellar', release_date: '2014-11-07', poster_path: '/interstellar.jpg' },
  ],
  tv: [
    { id: 101, name: 'Breaking Bad', first_air_date: '2008-01-20', poster_path: '/bb.jpg' },
  ],
  person: [
    { id: 500, name: 'Christopher Nolan', poster_path: '/nolan.jpg' },
  ]
};

/**
 * Mock TMDB Handlers.
 */
export const handlers = [
  // Search handlers
  http.get(`${TMDB_BASE}/search/:type`, ({ request, params }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.toLowerCase() || '';
    const type = params.type as string; // 'movie', 'tv', 'person'
    
    const items = mockDb[type] || [];
    const matches = items.filter(item => 
      (item.title || item.name || '').toLowerCase().includes(query)
    );

    return HttpResponse.json({
      page: 1,
      results: matches,
      total_pages: 1,
      total_results: matches.length
    });
  }),

  // Details handlers
  http.get(`${TMDB_BASE}/:type/:id`, ({ params }) => {
    const type = params.type as string;
    const id = Number.parseInt(params.id as string, 10);
    const items = mockDb[type] || [];
    const item = items.find(i => i.id === id);

    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      ...item,
      overview: 'Mock overview',
      tagline: 'Mock tagline'
    });
  })
];
