/**
 * @file igdb-handlers.ts
 * @description MSW handlers for mocking the IGDB API in tests.
 */

import { http, HttpResponse } from 'msw';

export const igdbHandlers = [
  // Auth
  http.post('https://id.twitch.tv/oauth2/token', () => {
    return HttpResponse.json({
      access_token: 'fake-access-token',
      expires_in: 3600,
      token_type: 'bearer',
    });
  }),

  // Search Games
  http.post('https://api.igdb.com/v4/games', async ({ request }) => {
    const body = await request.text();

    if (body.includes('search "Witcher"')) {
      return HttpResponse.json([
        {
          id: 1942,
          name: 'The Witcher 3: Wild Hunt',
          first_release_date: 1_431_993_600,
          cover: { image_id: 'co1p98' },
          total_rating: 94.8,
          total_rating_count: 5000,
          involved_companies: [{ company: { name: 'CD PROJEKT RED' }, developer: true }],
          platforms: [{ name: 'PC' }, { name: 'PlayStation 4' }],
        },
      ]);
    }

    if (body.includes('where id = 1942')) {
      return HttpResponse.json([
        {
          id: 1942,
          name: 'The Witcher 3: Wild Hunt',
          summary: 'The best game ever.',
          first_release_date: 1_431_993_600,
          cover: { image_id: 'co1p98' },
          involved_companies: [{ company: { name: 'CD PROJEKT RED' }, developer: true }],
          platforms: [{ name: 'PC' }],
          genres: [{ name: 'RPG' }],
          url: 'https://www.igdb.com/games/the-witcher-3-wild-hunt',
        },
      ]);
    }

    return HttpResponse.json([]);
  }),

  // Search Franchises
  http.post('https://api.igdb.com/v4/franchises', async ({ request }) => {
    const body = await request.text();

    if (body.includes('where name ~ *"The"* & name ~ *"Witcher"*')) {
      return HttpResponse.json([
        {
          id: 1,
          name: 'The Witcher',
          games: [1942, 1, 2],
        },
      ]);
    }

    if (body.includes('where id = 1')) {
      return HttpResponse.json([
        {
          id: 1,
          name: 'The Witcher',
          games: [1942, 1, 2],
          url: 'https://www.igdb.com/franchises/the-witcher',
        },
      ]);
    }

    return HttpResponse.json([]);
  }),
];
