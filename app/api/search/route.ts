import { NextResponse } from 'next/server';
import { MusicBrainzSearchResponseSchema, MediaItem, MediaType } from '@/lib/types';

// Rate Limiting constants
const USER_AGENT = 'JulianTierList/1.0.0 ( contact@yourdomain.com )';
const MB_BASE_URL = 'https://musicbrainz.org/ws/2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || ''; // General query
  const artistParam = searchParams.get('artist');
  const yearParam = searchParams.get('year');

  // Basic validation
  if (!queryParam && !artistParam && !yearParam) {
    return NextResponse.json({ results: [] });
  }

  // 1. Construct Lucene Query & Determine Endpoint
  let endpoint = '';
  const queryParts: string[] = [];

  switch (type) {
    case 'artist':
      endpoint = 'artist';
      if (queryParam) queryParts.push(`artist:"${queryParam}"`);
      // Artists don't really have "artist" filter in the same way, but could filter by country etc if needed
      break;
      
    case 'song':
      endpoint = 'recording';
      if (queryParam) queryParts.push(`recording:"${queryParam}"`);
      if (artistParam) queryParts.push(`artist:"${artistParam}"`);
      break;

    case 'album':
    default:
      endpoint = 'release-group';
      if (queryParam) queryParts.push(`release-group:"${queryParam}"`);
      if (artistParam) queryParts.push(`artist:"${artistParam}"`);
      break;
  }

  // Common filters
  if (yearParam) {
     // MusicBrainz date query syntax
     queryParts.push(`date:${yearParam}`); 
  }

  // Fallback if structured query failed but we have a generic query
  if (queryParts.length === 0 && queryParam) {
      // Just search everything
      queryParts.push(queryParam);
  }

  const query = queryParts.join(' AND ');

  try {
    // 2. Fetch from MusicBrainz
    // limit=15 to keep it light
    const response = await fetch(
      `${MB_BASE_URL}/${endpoint}/?query=${encodeURIComponent(query)}&fmt=json&limit=15`,
      {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 3600 } 
      }
    );

    if (!response.ok) {
      throw new Error(`MusicBrainz API Error: ${response.status}`);
    }

    const rawData = await response.json();

    // 3. Validate Data with Zod
    const parsed = MusicBrainzSearchResponseSchema.safeParse(rawData);
    
    if (!parsed.success) {
      console.error("Validation Failed", parsed.error);
      return NextResponse.json({ error: 'Invalid data from upstream' }, { status: 502 });
    }

    // 4. Transform to our Domain Model
    let results: MediaItem[] = [];

    if (type === 'album' && parsed.data['release-groups']) {
        results = parsed.data['release-groups'].map((item) => ({
            id: item.id,
            type: 'album',
            title: item.title,
            artist: item['artist-credit']?.[0]?.name || 'Unknown',
            year: item['first-release-date']?.split('-')[0] || '',
            imageUrl: `https://coverartarchive.org/release-group/${item.id}/front`,
        }));
    } else if (type === 'artist' && parsed.data.artists) {
        results = parsed.data.artists.map((item) => ({
            id: item.id,
            type: 'artist',
            title: item.name, // Artist name as title
            year: item['life-span']?.begin?.split('-')[0] || '',
            // MusicBrainz doesn't provide artist images directly easily without fanart.tv or wikidata
            // We'll leave it undefined and handle placeholder in UI
            imageUrl: undefined 
        }));
    } else if (type === 'song' && parsed.data.recordings) {
        results = parsed.data.recordings.map((item) => ({
            id: item.id,
            type: 'song',
            title: item.title,
            artist: item['artist-credit']?.[0]?.name || 'Unknown',
            // Try to grab the first release title as the album
            album: item.releases?.[0]?.title, 
            year: item['first-release-date']?.split('-')[0] || '',
            // Songs don't strictly have cover art, usually use the album's
            // But getting that requires another lookup or using the release ID if available.
            // For now, we'll try to use placeholder or if we had release ID we could try coverartarchive
            imageUrl: undefined 
        }));
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}