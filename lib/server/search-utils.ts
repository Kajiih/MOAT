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

const DATE_FIELD_MAP: Record<MediaType, string> = {
  artist: 'begin',
  album: 'firstreleasedate',
  song: 'firstreleasedate',
};

const LUCENE_FIELD_MAP: Record<MediaType, string> = {
  artist: 'artist',
  album: 'releasegroup',
  song: 'recording',
};

const ENDPOINT_MAP: Record<MediaType, string> = {
  artist: 'artist',
  album: 'release-group',
  song: 'recording',
};

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

    const endpoint = ENDPOINT_MAP[type];
    const dateField = DATE_FIELD_MAP[type];
    const luceneField = LUCENE_FIELD_MAP[type];

    const queryParts: string[] = [];

    if (query) {
        queryParts.push(constructLuceneQuery(luceneField, query, options));
    }

    // Artist grouping for music entities
    if (type !== 'artist') {
        if (artistId) {
            queryParts.push(`arid:${artistId}`);
        } else if (artist) {
            queryParts.push(`artist:"${artist}"`);
        }
    }

    // Album Specific Filters
    if (type === 'album') {
        if (albumPrimaryTypes.length > 0) {
            const typeQuery = albumPrimaryTypes.map(t => `"${t}"`).join(' OR ');
            queryParts.push(`primarytype:(${typeQuery})`);
        }
        
        if (albumSecondaryTypes.length > 0) {
            const typeQuery = albumSecondaryTypes.map(t => `"${t}"`).join(' OR ');
            queryParts.push(`secondarytype:(${typeQuery})`);
        } else {
            const forbiddenQuery = SECONDARY_TYPES.map(t => `"${t}"`).join(' OR ');
            queryParts.push(`NOT secondarytype:(${forbiddenQuery})`);
        }
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
    const finalQuery = joinedQuery;

    return { endpoint, query: finalQuery };
}
