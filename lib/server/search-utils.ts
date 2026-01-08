import { MediaType, SECONDARY_TYPES } from '@/lib/types';
import { constructLuceneQuery, SearchOptions, escapeLucene } from '@/lib/utils/search';

interface QueryBuilderParams {
    type: MediaType;
    query: string;
    artist: string | null;
    artistId: string | null;
    minYear: string | null;
    maxYear: string | null;
    albumPrimaryTypes: string[];
    albumSecondaryTypes: string[];
    options: SearchOptions;
}

interface BuiltQuery {
    endpoint: string;
    query: string;
}

/**
 * Constructs the final MusicBrainz API endpoint and Lucene query string based on search parameters.
 */
export function buildMusicBrainzQuery(params: QueryBuilderParams): BuiltQuery {
    const { 
        type, 
        query, 
        artist, 
        artistId, 
        minYear, 
        maxYear, 
        albumPrimaryTypes, 
        albumSecondaryTypes, 
        options 
    } = params;

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
            const typeQuery = albumSecondaryTypes.map(t => `"${t}"`).join(' OR ');
            queryParts.push(`secondarytype:(${typeQuery})`);
        } else {
            // Default (Clean) Mode: If no types are selected, exclude ALL known secondary types.
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
        queryParts.push(escapeLucene(query));
    }
  
    // Remove empty parts just in case
    const joinedQuery = queryParts.filter(Boolean).join(' AND ');
    // If the query starts with 'NOT ' (e.g. only negative filters), prepend a generic match-all
    const finalQuery = joinedQuery.startsWith('NOT ') ? `*:* AND ${joinedQuery}` : joinedQuery;

    return { endpoint, query: finalQuery };
}
