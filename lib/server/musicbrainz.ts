import { 
    MusicBrainzSearchResponseSchema, 
    MediaItem, 
    MediaType, 
    SECONDARY_TYPES,
    MediaDetails
} from '@/lib/types';
import { MB_BASE_URL, USER_AGENT } from '@/lib/server/images';
import { constructLuceneQuery, SearchOptions } from '@/lib/utils/search';
import { mapArtistToMediaItem, mapRecordingToMediaItem, mapReleaseGroupToMediaItem } from '@/lib/utils/mappers';

const SEARCH_CACHE_TTL = 3600; // 1 hour
const SEARCH_LIMIT = 15;

interface SearchParams {
    type: MediaType;
    query: string;
    artist: string | null;
    artistId: string | null;
    minYear: string | null;
    maxYear: string | null;
    albumPrimaryTypes: string[];
    albumSecondaryTypes: string[];
    page: number;
    options: SearchOptions;
}

interface SearchResult {
    results: MediaItem[];
    page: number;
    totalPages: number;
    totalCount: number;
}

// Minimal interfaces for raw MusicBrainz details response
interface MBTrack {
    id: string;
    position: string;
    title: string;
    length?: number;
    recording?: {
        id: string;
    };
}

interface MBTag {
    name: string;
    count: number;
}

interface MBRelation {
    type: string;
    url?: {
        resource: string;
    };
}

export async function searchMusicBrainz(params: SearchParams): Promise<SearchResult> {
  const { 
      type, 
      query, 
      artist, 
      artistId, 
      minYear, 
      maxYear, 
      albumPrimaryTypes, 
      albumSecondaryTypes, 
      page, 
      options 
  } = params;

  const limit = SEARCH_LIMIT;
  const offset = (page - 1) * limit;

  let endpoint = '';
  const queryParts: string[] = [];
  let dateField = 'firstreleasedate'; 
  if (type === 'artist') dateField = 'begin';

  switch (type) {
    case 'artist':
      endpoint = 'artist';
      if (query) {
          queryParts.push(constructLuceneQuery('artist', query, options));
      }
      break;
      
    case 'song':
      endpoint = 'recording';
      if (query) {
          queryParts.push(constructLuceneQuery('recording', query, options));
      }
      if (artistId) {
          queryParts.push(`arid:${artistId}`);
      } else if (artist) {
          queryParts.push(`artist:"${artist}"`);
      }
      break;

    case 'album':
    default:
      endpoint = 'release-group';
      if (query) {
          queryParts.push(constructLuceneQuery('release-group', query, options));
      }
      if (artistId) {
          queryParts.push(`arid:${artistId}`);
      } else if (artist) {
          queryParts.push(`artist:"${artist}"`);
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

  if (queryParts.length === 0 && query) {
      // Fallback if type logic didn't catch it
      queryParts.push(query);
  }

  // Remove empty parts just in case
  const finalQuery = queryParts.filter(Boolean).join(' AND ');

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
    throw new Error('Invalid data from upstream');
  }

  let results: MediaItem[] = [];

  if (type === 'album' && parsed.data['release-groups']) {
      results = parsed.data['release-groups'].map(mapReleaseGroupToMediaItem);
  } else if (type === 'artist' && parsed.data.artists) {
      results = await Promise.all(parsed.data.artists.map(mapArtistToMediaItem));
  } else if (type === 'song' && parsed.data.recordings) {
      results = parsed.data.recordings.map(mapRecordingToMediaItem);
  }

  const totalCount = rawData.count || rawData['release-group-count'] || rawData['artist-count'] || rawData['recording-count'] || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return { results, page, totalPages, totalCount };
}

export async function getMediaDetails(id: string, type: MediaType): Promise<MediaDetails | { id: string; type: MediaType }> {
    try {
        if (type === 'album') {
            // 1. Find the "best" release for this release group (Official, earliest)
            // We use a search query for this to filter by status
            // Use 'rgid' field for Release Group ID in Release Index
            const query = `rgid:${id} AND status:official`;
            const searchRes = await fetch(
                `${MB_BASE_URL}/release/?query=${encodeURIComponent(query)}&limit=1&fmt=json`,
                { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
            );
            
            let release = null;
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.releases && searchData.releases.length > 0) {
                    release = searchData.releases[0];
                }
            }

            if (!release) {
                 const lookupRes = await fetch(
                    `${MB_BASE_URL}/release-group/${id}?inc=releases&fmt=json`,
                    { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
                );
                if (lookupRes.ok) {
                    const lookupData = await lookupRes.json();
                    if (lookupData.releases && lookupData.releases.length > 0) {
                        release = lookupData.releases[0];
                    }
                }
            }

            if (!release) return { id, type };

            const detailsRes = await fetch(
                `${MB_BASE_URL}/release/${release.id}?inc=recordings+media+labels&fmt=json`,
                { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
            );
            
            if (!detailsRes.ok) return { id, type };
            const data = await detailsRes.json();

            const tracks = data.media?.[0]?.tracks?.map((t: MBTrack) => ({
                id: t.recording?.id || t.id,
                position: t.position,
                title: t.title,
                length: t.length ? new Date(t.length).toISOString().substr(14, 5) : '--:--'
            })) || [];

            return {
                id,
                type: 'album',
                tracks,
                label: data['label-info']?.[0]?.label?.name,
                date: data.date,
                releaseId: release.id
            };
        } 
        
        if (type === 'artist') {
            const res = await fetch(
                `${MB_BASE_URL}/artist/${id}?inc=url-rels+tags&fmt=json`,
                { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
            );
            if (!res.ok) return { id, type };
            const data = await res.json();
            
            return {
                id,
                type: 'artist',
                tags: data.tags?.sort((a: MBTag, b: MBTag) => b.count - a.count).slice(0, 10).map((t: MBTag) => t.name) || [],
                area: data.area?.name,
                lifeSpan: {
                    begin: data['life-span']?.begin,
                    end: data['life-span']?.end,
                    ended: data['life-span']?.ended
                },
                urls: data.relations?.filter((r: MBRelation) => r.type === 'wikidata' || r.type === 'wikipedia' || r.type === 'youtube' || r.type === 'social network' || r.type === 'streaming').map((r: MBRelation) => ({
                    type: r.type,
                    url: r.url?.resource || ''
                }))
            };
        }

        if (type === 'song') {
             const res = await fetch(
                `${MB_BASE_URL}/recording/${id}?inc=releases+artist-credits+tags&fmt=json`,
                { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
            );
            if (!res.ok) return { id, type };
            const data = await res.json();

            return {
                id,
                type: 'song',
                tags: data.tags?.map((t: MBTag) => t.name) || [],
                length: data.length ? new Date(data.length).toISOString().substr(14, 5) : undefined,
                album: data.releases?.[0]?.title // Just first release as sample
            };
        }

        return { id, type };

    } catch (e) {
        console.error("Error fetching details", e);
        return { id, type };
    }
}