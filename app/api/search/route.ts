import { NextResponse } from 'next/server';
import { MusicBrainzSearchResponseSchema, MediaItem, MediaType } from '@/lib/types';

// Rate Limiting constants
const USER_AGENT = 'JulianTierList/1.0.0 ( contact@yourdomain.com )';
const MB_BASE_URL = 'https://musicbrainz.org/ws/2';
const FANART_API_KEY = process.env.FANART_API_KEY;

/**
 * Fetches an artist thumbnail from Fanart.tv if available.
 */
async function getFanartImage(mbid: string): Promise<string | undefined> {
  if (!FANART_API_KEY) return undefined;
  try {
    const res = await fetch(`https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}`, {
        next: { revalidate: 86400 } 
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.artistthumb?.[0]?.url;
  } catch (e) {
    console.error(`Fanart.tv fetch failed for mbid ${mbid}:`, e);
    return undefined;
  }
}

/**
 * Fetches an artist thumbnail from Wikidata via MusicBrainz relations.
 */
async function getWikidataImage(mbid: string): Promise<string | undefined> {
  try {
    // 1. Get Wikidata ID from MusicBrainz
    const mbRes = await fetch(`${MB_BASE_URL}/artist/${mbid}?inc=url-rels&fmt=json`, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 86400 }
    });
    if (!mbRes.ok) return undefined;
    const mbData = await mbRes.json();
    
    // Find relation type 'wikidata'
    const wikidataRel = mbData.relations?.find((r: { type: string; url?: { resource: string } }) => r.type === 'wikidata');
    if (!wikidataRel?.url?.resource) return undefined;

    // Extract QID (e.g. Q12345 from url)
    const qid = wikidataRel.url.resource.split('/').pop();
    if (!qid) return undefined;

    // 2. Get Image from Wikidata
    // P18 is the "image" property
    const wdRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${qid}&format=json`, {
        next: { revalidate: 86400 }
    });
    if (!wdRes.ok) return undefined;
    const wdData = await wdRes.json();

    const fileName = wdData.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!fileName) return undefined;

    // 3. Convert Wiki Filename to URL (MD5 Hash method for Wikimedia Commons)
    // Actually, simpler is to use the Special:FilePath redirect
    // BUT we need to encode it properly.
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;

  } catch (e) {
    console.error(`Wikidata fetch failed for mbid ${mbid}:`, e);
    return undefined;
  }
}

async function getArtistThumbnail(mbid: string): Promise<string | undefined> {
    // Priority 1: Fanart.tv (Best quality)
    const fanart = await getFanartImage(mbid);
    if (fanart) return fanart;

    // Priority 2: Wikidata (Best coverage)
    return await getWikidataImage(mbid);
}

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