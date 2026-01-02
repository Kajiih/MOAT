import { NextResponse } from 'next/server';
import { MusicBrainzSearchResponseSchema, MediaItem, MediaType } from '@/lib/types';

// Rate Limiting constants
const USER_AGENT = 'JulianTierList/1.0.0 ( contact@yourdomain.com )';
const MB_BASE_URL = 'https://musicbrainz.org/ws/2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || ''; 
  const artistParam = searchParams.get('artist');
  const artistIdParam = searchParams.get('artistId');
  
  // Year params
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');

  // Basic validation
  if (!queryParam && !artistParam && !artistIdParam && !minYear && !maxYear) {
    return NextResponse.json({ results: [] });
  }

  // 1. Construct Lucene Query
  let endpoint = '';
  const queryParts: string[] = [];

  // Determine correct date field based on type
  // album -> firstreleasedate
  // artist -> begin (birth/founding date)
  // song -> firstreleasedate (or date)
  let dateField = 'firstreleasedate'; 
  if (type === 'artist') dateField = 'begin';
  // for song, firstreleasedate is often reliable for "when was this song released"

  switch (type) {
    case 'artist':
      endpoint = 'artist';
      if (queryParam) queryParts.push(`artist:"${queryParam}"`);
      break;
      
    case 'song':
      endpoint = 'recording';
      if (queryParam) queryParts.push(`recording:"${queryParam}"`);
      if (artistIdParam) {
          queryParts.push(`arid:${artistIdParam}`);
      } else if (artistParam) {
          queryParts.push(`artist:"${artistParam}"`);
      }
      break;

    case 'album':
    default:
      endpoint = 'release-group';
      if (queryParam) queryParts.push(`release-group:"${queryParam}"`);
      if (artistIdParam) {
          queryParts.push(`arid:${artistIdParam}`);
      } else if (artistParam) {
          queryParts.push(`artist:"${artistParam}"`);
      }
      break;
  }

  // Date Range Logic
  if (minYear || maxYear) {
      const start = minYear || '*';
      const end = maxYear || '*';
      queryParts.push(`${dateField}:[${start} TO ${end}]`); 
  }

  // Fallback
  if (queryParts.length === 0 && queryParam) {
      queryParts.push(queryParam);
  }

  const query = queryParts.join(' AND ');

  try {
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

    const parsed = MusicBrainzSearchResponseSchema.safeParse(rawData);
    
    if (!parsed.success) {
      console.error("Validation Failed", parsed.error);
      return NextResponse.json({ error: 'Invalid data from upstream' }, { status: 502 });
    }

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
            title: item.name, 
            year: item['life-span']?.begin?.split('-')[0] || '',
            imageUrl: undefined 
        }));
    } else if (type === 'song' && parsed.data.recordings) {
        results = parsed.data.recordings.map((item) => ({
            id: item.id,
            type: 'song',
            title: item.title,
            artist: item['artist-credit']?.[0]?.name || 'Unknown',
            album: item.releases?.[0]?.title, 
            year: item['first-release-date']?.split('-')[0] || '',
            imageUrl: undefined 
        }));
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}