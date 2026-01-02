import { NextResponse } from 'next/server';
import { MusicBrainzSearchResponseSchema, MediaItem, MediaType } from '@/lib/types';
import { getArtistThumbnail, MB_BASE_URL, USER_AGENT } from '@/lib/server/images';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || ''; 
  const artistParam = searchParams.get('artist');
  const artistIdParam = searchParams.get('artistId');
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 15;
  const offset = (page - 1) * limit;

  if (!queryParam && !artistParam && !artistIdParam && !minYear && !maxYear) {
    return NextResponse.json({ results: [], page, totalPages: 0 });
  }

  let endpoint = '';
  const queryParts: string[] = [];
  let dateField = 'firstreleasedate'; 
  if (type === 'artist') dateField = 'begin';

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

  if (minYear || maxYear) {
      const start = minYear || '*';
      const end = maxYear || '*';
      queryParts.push(`${dateField}:[${start} TO ${end}]`); 
  }

  if (queryParts.length === 0 && queryParam) {
      queryParts.push(queryParam);
  }

  const query = queryParts.join(' AND ');

  try {
    const response = await fetch(
      `${MB_BASE_URL}/${endpoint}/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&offset=${offset}`,
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
        results = await Promise.all(parsed.data.artists.map(async (item) => {
            const thumb = await getArtistThumbnail(item.id);
            return {
                id: item.id,
                type: 'artist',
                title: item.name, 
                year: item['life-span']?.begin?.split('-')[0] || '',
                imageUrl: thumb,
                disambiguation: item.disambiguation 
            };
        }));
    } else if (type === 'song' && parsed.data.recordings) {
        results = parsed.data.recordings.map((item) => {
            const releaseId = item.releases?.[0]?.id;
            return {
                id: item.id,
                type: 'song',
                title: item.title,
                artist: item['artist-credit']?.[0]?.name || 'Unknown',
                album: item.releases?.[0]?.title, 
                year: item['first-release-date']?.split('-')[0] || '',
                imageUrl: releaseId ? `https://coverartarchive.org/release/${releaseId}/front` : undefined
            };
        });
    }

    const totalCount = rawData.count || rawData['release-group-count'] || rawData['artist-count'] || rawData['recording-count'] || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({ results, page, totalPages, totalCount });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}