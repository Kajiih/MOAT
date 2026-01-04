import { NextResponse } from 'next/server';
import { z } from 'zod';
import { 
    MusicBrainzSearchResponseSchema, 
    MusicBrainzArtistCreditSchema,
    MediaItem, 
    MediaType, 
    SECONDARY_TYPES 
} from '@/lib/types';
import { getArtistThumbnail, MB_BASE_URL, USER_AGENT } from '@/lib/server/images';

const SEARCH_CACHE_TTL = 3600; // 1 hour
const SEARCH_LIMIT = 15;
const COVER_ART_ARCHIVE_BASE_URL = 'https://coverartarchive.org';

interface SearchOptions {
    fuzzy: boolean;
    wildcard: boolean;
}

/**
 * Constructs a flexible Lucene query string for MusicBrainz.
 * Converts "michael j" into `field:((michael* OR michael~) AND (j* OR j~))` to support partial matches and fuzzy search (typos).
 */
function constructLuceneQuery(field: string, term: string, options: SearchOptions): string {
  if (!term) return '';
  
  // Remove special characters that might break Lucene syntax, keep alphanumeric and spaces
  const cleanTerm = term.replace(/[^\w\s]/g, '').trim();
  if (!cleanTerm) return '';

  const words = cleanTerm.split(/\s+/);
  
  if (words.length === 0) return '';

  const queryParts = words.map(word => {
      const parts = [];
      
      // 1. Wildcard (Prefix) Strategy
      if (options.wildcard) {
          parts.push(`${word}*`);
      }

      // 2. Fuzzy Strategy
      // Don't apply fuzzy to very short words to avoid noise
      if (options.fuzzy && word.length >= 3) {
          parts.push(`${word}~`);
      }

      // If no advanced strategies, fallback to exact match
      if (parts.length === 0) {
          return word;
      }

      // If only one strategy, return it directly
      if (parts.length === 1) {
          return parts[0];
      }

      // If multiple, OR them together
      return `(${parts.join(' OR ')})`;
  });

  const query = queryParts.join(' AND ');
  
  return `${field}:(${query})`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || ''; 
  const artistParam = searchParams.get('artist');
  const artistIdParam = searchParams.get('artistId');
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');
  
  const albumPrimaryTypes = searchParams.getAll('albumPrimaryTypes');
  const albumSecondaryTypes = searchParams.getAll('albumSecondaryTypes');
  
  // Read Search Configuration (default to true if not specified)
  const fuzzy = searchParams.get('fuzzy') !== 'false';
  const wildcard = searchParams.get('wildcard') !== 'false';
  
  const options: SearchOptions = { fuzzy, wildcard };

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = SEARCH_LIMIT;
  const offset = (page - 1) * limit;

  // If no main filters, return empty
  if (!queryParam && !artistParam && !artistIdParam && !minYear && !maxYear && albumPrimaryTypes.length === 0 && albumSecondaryTypes.length === 0) {
    return NextResponse.json({ results: [], page, totalPages: 0 });
  }

  let endpoint = '';
  const queryParts: string[] = [];
  let dateField = 'firstreleasedate'; 
  if (type === 'artist') dateField = 'begin';

  switch (type) {
    case 'artist':
      endpoint = 'artist';
      if (queryParam) {
          queryParts.push(constructLuceneQuery('artist', queryParam, options));
      }
      break;
      
    case 'song':
      endpoint = 'recording';
      if (queryParam) {
          queryParts.push(constructLuceneQuery('recording', queryParam, options));
      }
      if (artistIdParam) {
          queryParts.push(`arid:${artistIdParam}`);
      } else if (artistParam) {
          queryParts.push(`artist:"${artistParam}"`);
      }
      break;

    case 'album':
    default:
      endpoint = 'release-group';
      if (queryParam) {
          queryParts.push(constructLuceneQuery('release-group', queryParam, options));
      }
      if (artistIdParam) {
          queryParts.push(`arid:${artistIdParam}`);
      } else if (artistParam) {
          queryParts.push(`artist:"${artistParam}"`);
      }
      
      if (albumPrimaryTypes.length > 0) {
          const typeQuery = albumPrimaryTypes.map(t => `"${t}"`).join(' OR ');
          queryParts.push(`primarytype:(${typeQuery})`);
      }
      
      // Secondary Types Logic
      if (albumSecondaryTypes.length > 0) {
          // Exclusive Mode: If types are selected, show ONLY items matching those types.
          // This allows drilling down (e.g., "Show me only Live albums").
          const typeQuery = albumSecondaryTypes.map(t => `"${t}"`).join(' OR ');
          queryParts.push(`secondarytype:(${typeQuery})`);
      } else {
          // Default (Clean) Mode: If no types are selected, exclude ALL known secondary types.
          // This ensures we only see "Standard" items (no secondary type) by default.
          const forbiddenQuery = SECONDARY_TYPES.map(t => `"${t}"`).join(' OR ');
          queryParts.push(`NOT secondarytype:(${forbiddenQuery})`);
      }
      break;
  }

  if (minYear || maxYear) {
      const start = minYear || '*';
      const end = maxYear || '*';
      queryParts.push(`${dateField}:[${start} TO ${end}]`); 
  }

  if (queryParts.length === 0 && queryParam) {
      // Fallback if type logic didn't catch it
      queryParts.push(queryParam);
  }

  // Remove empty parts just in case
  const finalQuery = queryParts.filter(Boolean).join(' AND ');

  try {
    const response = await fetch(
      `${MB_BASE_URL}/${endpoint}/?query=${encodeURIComponent(finalQuery)}&fmt=json&limit=${limit}&offset=${offset}`,
      {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: SEARCH_CACHE_TTL } 
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

    const formatArtistCredit = (credits: z.infer<typeof MusicBrainzArtistCreditSchema>[] | undefined) => {
        if (!credits || credits.length === 0) return 'Unknown';
        return credits.map(c => (c.name + (c.joinphrase || ''))).join('');
    };

    let results: MediaItem[] = [];

    if (type === 'album' && parsed.data['release-groups']) {
        results = parsed.data['release-groups'].map((item) => ({
            id: item.id,
            type: 'album',
            title: item.title,
            artist: formatArtistCredit(item['artist-credit']),
            year: item['first-release-date']?.split('-')[0] || '',
            date: item['first-release-date'],
            imageUrl: `${COVER_ART_ARCHIVE_BASE_URL}/release-group/${item.id}/front`,
            primaryType: item['primary-type'],
            secondaryTypes: item['secondary-types']
        }));
    } else if (type === 'artist' && parsed.data.artists) {
        results = await Promise.all(parsed.data.artists.map(async (item) => {
            const thumb = await getArtistThumbnail(item.id);
            return {
                id: item.id,
                type: 'artist',
                title: item.name, 
                year: item['life-span']?.begin?.split('-')[0] || '',
                date: item['life-span']?.begin,
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
                artist: formatArtistCredit(item['artist-credit']),
                album: item.releases?.[0]?.title, 
                year: item['first-release-date']?.split('-')[0] || '',
                date: item['first-release-date'],
                imageUrl: releaseId ? `${COVER_ART_ARCHIVE_BASE_URL}/release/${releaseId}/front` : undefined
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