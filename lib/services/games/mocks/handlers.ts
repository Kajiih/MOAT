/**
 * @file handlers.ts
 * @description MSW handlers for RAWG API mock.
 */

import { http, HttpResponse } from 'msw';

import { matchesQuery } from '@/lib/test/lucene-evaluator';

const RAWG_BASE = 'https://api.rawg.io/api';

interface RAWGMockGame {
  id: number;
  name: string;
  slug: string;
  released?: string;
  background_image?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number;
  parent_platforms?: { platform: { id: number; name: string; slug: string } }[];
  genres?: { id: number; name: string; slug: string }[];
  developers?: { id: number; name: string; slug: string }[];
  publishers?: { id: number; name: string; slug: string }[];
  description_raw?: string;
  tags?: { id: number; name: string; slug: string; language: string }[];
  [key: string]: unknown;
}

const mockGames: RAWGMockGame[] = [
  {
    id: 3498,
    name: 'Grand Theft Auto V',
    slug: 'grand-theft-auto-v',
    released: '2013-09-17',
    background_image: '/gta5.jpg',
    rating: 4.47,
    ratings_count: 6500,
    metacritic: 92,
    parent_platforms: [
      { platform: { id: 1, name: 'PC', slug: 'pc' } },
      { platform: { id: 2, name: 'PlayStation', slug: 'playstation' } },
      { platform: { id: 3, name: 'Xbox', slug: 'xbox' } },
    ],
    genres: [
      { id: 4, name: 'Action', slug: 'action' },
      { id: 3, name: 'Adventure', slug: 'adventure' },
    ],
    developers: [{ id: 10, name: 'Rockstar North', slug: 'rockstar-north' }],
    publishers: [{ id: 11, name: 'Rockstar Games', slug: 'rockstar-games' }],
    description_raw: 'An open-world action-adventure game.',
    tags: [
      { id: 1, name: 'Open World', slug: 'open-world', language: 'eng' },
      { id: 2, name: 'Multiplayer', slug: 'multiplayer', language: 'eng' },
    ],
  },
  {
    id: 3328,
    name: 'The Witcher 3: Wild Hunt',
    slug: 'the-witcher-3-wild-hunt',
    released: '2015-05-19',
    background_image: '/witcher3.jpg',
    rating: 4.66,
    ratings_count: 6400,
    metacritic: 93,
    parent_platforms: [
      { platform: { id: 1, name: 'PC', slug: 'pc' } },
      { platform: { id: 2, name: 'PlayStation', slug: 'playstation' } },
      { platform: { id: 3, name: 'Xbox', slug: 'xbox' } },
      { platform: { id: 7, name: 'Nintendo', slug: 'nintendo' } },
    ],
    genres: [
      { id: 5, name: 'RPG', slug: 'role-playing-games-rpg' },
      { id: 4, name: 'Action', slug: 'action' },
    ],
    developers: [{ id: 9, name: 'CD Projekt Red', slug: 'cd-projekt-red' }],
    publishers: [{ id: 12, name: 'CD Projekt', slug: 'cd-projekt' }],
    description_raw: 'An epic open-world RPG.',
    tags: [
      { id: 1, name: 'Open World', slug: 'open-world', language: 'eng' },
      { id: 3, name: 'Singleplayer', slug: 'singleplayer', language: 'eng' },
    ],
  },
  {
    id: 4200,
    name: 'Portal 2',
    slug: 'portal-2',
    released: '2011-04-18',
    background_image: '/portal2.jpg',
    rating: 4.62,
    ratings_count: 3800,
    metacritic: 95,
    parent_platforms: [{ platform: { id: 1, name: 'PC', slug: 'pc' } }],
    genres: [{ id: 7, name: 'Puzzle', slug: 'puzzle' }],
    developers: [{ id: 1, name: 'Valve Software', slug: 'valve-software' }],
    publishers: [{ id: 1, name: 'Valve Software', slug: 'valve-software' }],
    description_raw: 'A first-person puzzle-platform game.',
    tags: [
      { id: 4, name: 'Co-op', slug: 'co-op', language: 'eng' },
      { id: 5, name: 'Puzzle', slug: 'puzzle', language: 'eng' },
    ],
  },
  {
    id: 5000,
    name: 'A Game',
    slug: 'a-game',
    released: '2020-01-01',
    rating: 3,
    ratings_count: 100,
    parent_platforms: [{ platform: { id: 1, name: 'PC', slug: 'pc' } }],
    genres: [],
    developers: [],
  },
  {
    id: 5001,
    name: 'Z Game',
    slug: 'z-game',
    released: '2023-06-15',
    rating: 4,
    ratings_count: 500,
    parent_platforms: [{ platform: { id: 7, name: 'Nintendo', slug: 'nintendo' } }],
    genres: [],
    developers: [],
  },
];

/**
 * Mock RAWG API handlers.
 */
export const handlers = [
  http.get(`${RAWG_BASE}/games`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const ordering = url.searchParams.get('ordering');
    const dates = url.searchParams.get('dates');

    let filtered = [...mockGames];

    // Filter by search query
    if (search) {
      filtered = filtered.filter((game) =>
        matchesQuery(search, game, { name: 'name' }),
      );
    }

    // Filter by date range
    if (dates) {
      const [startDate, endDate] = dates.split(',');
      filtered = filtered.filter((game) => {
        if (!game.released) return false;
        return game.released >= startDate && game.released <= endDate;
      });
    }

    // Apply ordering
    if (ordering) {
      const desc = ordering.startsWith('-');
      const field = desc ? ordering.slice(1) : ordering;

      filtered.sort((a, b) => {
        let aVal: string | number, bVal: string | number;
        switch (field) {
          case 'name': {
            aVal = a.name;
            bVal = b.name;
            break;
          }
          case 'released': {
            aVal = a.released || '';
            bVal = b.released || '';
            break;
          }
          case 'rating': {
            aVal = a.rating || 0;
            bVal = b.rating || 0;
            break;
          }
          default: {
            return 0;
          }
        }
        const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : aVal - (bVal as number);
        return desc ? -cmp : cmp;
      });
    }

    return HttpResponse.json({
      count: filtered.length,
      next: null,
      previous: null,
      results: filtered,
    });
  }),

  http.get(`${RAWG_BASE}/games/:id`, ({ params }) => {
    const id = Number.parseInt(params.id as string, 10);
    const game = mockGames.find((g) => g.id === id);

    if (!game) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(game);
  }),

  http.get(`${RAWG_BASE}/developers`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    let filtered = [
      { id: 10, name: 'Rockstar North', slug: 'rockstar-north', image_background: '/rockstar.jpg' },
      { id: 1, name: 'Valve Software', slug: 'valve-software', image_background: '/valve.jpg' },
    ];

    if (search) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    }

    return HttpResponse.json({
      count: filtered.length,
      results: filtered,
    });
  }),

  http.get(`${RAWG_BASE}/developers/:id`, ({ params }) => {
    const id = Number.parseInt(params.id as string, 10);
    const devs = [
      { id: 10, name: 'Rockstar North', slug: 'rockstar-north', image_background: '/rockstar.jpg', description: 'Makers of GTA' },
      { id: 1, name: 'Valve Software', slug: 'valve-software', image_background: '/valve.jpg', description: 'Makers of Portal' },
    ];
    const dev = devs.find(d => d.id === id);
    if (!dev) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(dev);
  }),
];
