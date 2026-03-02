/**
 * @file handlers.ts
 * @description MSW handlers for MusicBrainz API mock using faker and lucene evaluator.
 */

import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';

import { matchesQuery } from '@/lib/test/lucene-evaluator';

const MB_BASE = 'https://musicbrainz.org/ws/2';

// 1. Generate a "Realistic" Fake Database using Faker
const SEED = 123;
faker.seed(SEED);

const fakeDb = {
  recordings: Array.from({ length: 50 }, () => ({
    id: faker.string.uuid(),
    title: faker.music.songName(),
    artist: faker.person.fullName(),
    artistId: faker.string.uuid(),
    year: faker.date.past({ years: 40 }).getFullYear().toString(),
    albumId: faker.string.uuid(),
  })),
  // Add specific items we know we'll test for
  static: [
    {
      id: 'song-1',
      title: 'Fake Song 1',
      artist: 'Fake Artist',
      artistId: 'artist-123',
      year: '1995',
      albumId: 'album-123',
    },
    {
      id: 'song-2',
      title: 'Fake Song 2',
      artist: 'Another Artist',
      artistId: 'artist-456',
      year: '2020',
      albumId: 'album-789',
    },
  ],
};

const allRecordings = [...fakeDb.static, ...fakeDb.recordings];

/**
 * Mock MusicBrainz Handlers.
 */
export const handlers = [
  http.get(`${MB_BASE}/:type/`, ({ request, params }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const type = params.type as string;

    if (type === 'recording') {
      const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10);

      // Use our new robust evaluator!
      const matches = allRecordings.filter((song) => {
        // Special case for MusicBrainz complex fields
        // We map Lucene fields (arid, rgid, date) to our internal mock object keys
        return matchesQuery(query, song, {
          arid: 'artistId',
          rgid: 'albumId',
          firstreleasedate: 'year',
          recording: 'title',
        });
      });

      return HttpResponse.json({
        created: new Date().toISOString(),
        count: matches.length,
        offset,
        recordings: matches.slice(offset, offset + 15).map((m) => ({
          id: m.id,
          title: m.title,
          length: 240_000,
          'first-release-date': `${m.year}-01-01`,
          'artist-credit': [{ name: m.artist, artist: { id: m.artistId } }],
          releases: [
            {
              id: m.albumId,
              title: 'Some Release',
              'release-group': { id: m.albumId, title: 'Some Album' },
            },
          ],
        })),
      });
    }

    return HttpResponse.json({ count: 0, offset: 0, recordings: [], 'release-groups': [] });
  }),
];
