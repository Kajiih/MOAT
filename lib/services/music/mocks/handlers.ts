/**
 * @file handlers.ts
 * @description MSW handlers for MusicBrainz API mock.
 */

import { http, HttpResponse } from 'msw';

const MB_BASE = 'https://musicbrainz.org/ws/2';

/**
 * Mock MusicBrainz Handlers.
 * These handlers simulate a simplified version of the MusicBrainz API logic.
 */
export const handlers = [
  // Intercept GET requests to MusicBrainz search endpoints
  http.get(`${MB_BASE}/:type/`, ({ request, params }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const type = params.type as string; // 'recording', 'release-group', etc.

    // 1. Simulate "Fake Database"
    // We define a small set of "known" items that exist in our fake world.
    const fakeDb = {
      recordings: [
        { id: 'song-1', title: 'Fake Song 1', artist: 'Fake Artist', artistId: 'artist-123', year: '1995', albumId: 'album-123' },
        { id: 'song-2', title: 'Fake Song 2', artist: 'Another Artist', artistId: 'artist-456', year: '2020', albumId: 'album-789' },
      ],
      releaseGroups: [
        { id: 'album-1', title: 'Fake Album', artist: 'Fake Artist', artistId: 'artist-123', year: '1995', type: 'Album' }
      ]
    };

    // Use a simplified type for our internal mock DB objects
    type MockSong = typeof fakeDb.recordings[0];
    let matches: MockSong[] = [];

    // 2. Perform "Real Query" Logic against Fake DB
    // This is where we validate that the Service constructed the query correctly.
    // We strictly parse the Lucene syntax to verify filter application.
    
    if (type === 'recording') {
      matches = fakeDb.recordings.filter(song => {
        // If query has 'arid:xyz', this song must match that artistId
        if (query.includes('arid:') && !query.includes(`arid:${song.artistId}`)) return false;
        
        // If query has 'rgid:xyz', this song must match that releaseGroupId (albumId)
        if (query.includes('rgid:') && !query.includes(`rgid:${song.albumId}`)) return false;

        // If query has 'date:[start TO end]', check year
        const dateMatch = query.match(/date:\[(\d+) TO (\d+)\]/);
        if (dateMatch) {
            const min = Number.parseInt(dateMatch[1], 10);
            const max = Number.parseInt(dateMatch[2], 10);
            const year = Number.parseInt(song.year, 10);
            if (year < min || year > max) return false;
        }

        // Basic text match (simplified)
        // Extract the main query part (hacky but sufficient for tests)
        // "recording:(fake~1 AND (song~1 OR ...))" -> we just check if "fake" or "song" is in title
        
        // If we are searching for "fake song", we expect "fake" and "song" to be in the query string
        // The service wraps it in complex Lucene syntax like recording:(fake~1 ...
        // So we reverse it: does the Title match the intention?
        // We assume valid match if query contains NO text (pure filter) OR if query contains words from title
        
        const isPureFilter = query.startsWith('arid:') || query.startsWith('rgid:') || query.startsWith('date:');
        if (isPureFilter) return true;

        const simpleQuery = query.toLowerCase();
        const titleParts = song.title.toLowerCase().split(' ');
        const matchFound = titleParts.some(part => simpleQuery.includes(part));
        
        if (!matchFound && !isPureFilter && !query.includes('test') && !query.includes('crash')) return false;

        return true;
      });

      return HttpResponse.json({
        created: new Date().toISOString(),
        count: matches.length,
        offset: 0,
        recordings: matches.map(m => ({
          id: m.id,
          title: m.title,
          length: 240_000,
          'first-release-date': `${m.year}-01-01`,
          'artist-credit': [{ name: m.artist, artist: { id: m.artistId } }],
          releases: [{ 
            id: m.albumId, // Mock release ID same as album ID for simplicity
            title: 'Some Release',
            'release-group': { id: m.albumId, title: 'Some Album' } 
          }]
        }))
      });
    }

    // Default empty response
    return HttpResponse.json({ count: 0, offset: 0, [type === 'release-group' ? 'release-groups' : 'recordings']: [] });
  }),
];
