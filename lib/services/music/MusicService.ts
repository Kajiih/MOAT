/**
 * @file MusicService.ts
 * @description Service provider for MusicBrainz integration.
 */

import { MusicFilters } from '@/lib/media-types/filters';
import { getMediaDetails } from '@/lib/services/musicbrainz/details';
import { searchMusicBrainz } from '@/lib/services/musicbrainz/search';
import { MediaDetails, MediaType, SearchResult } from '@/lib/types';

import { MediaService, SearchOptions } from '../types';

/**
 * Service adapter for MusicBrainz integration.
 * Wraps existing logic to implement the generic MediaService interface.
 */
export class MusicService implements MediaService<MusicFilters> {
  readonly category = 'music' as const;
  readonly id = 'musicbrainz';
  readonly label = 'MusicBrainz';

  async search(
    query: string,
    type: MediaType,
    options: SearchOptions<MusicFilters> = {},
  ): Promise<SearchResult> {
    // Adapter to map generic options to MusicBrainz specific params
    return searchMusicBrainz({
      ...options.filters,
      type,
      query,
      page: options.page || 1,
      fuzzy: options.fuzzy,
      wildcard: options.wildcard,
      options: {
        ...options,
        fuzzy: options.fuzzy ?? true,
        wildcard: options.wildcard ?? true,
      },
    });
  }

  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    const result = await getMediaDetails(id, type);
    // getMediaDetails returns either MediaDetails or a fallback object.
    // The interface expects MediaDetails, which covers both cases in current typing.
    return result as MediaDetails;
  }

  getSupportedTypes(): MediaType[] {
    return ['song', 'album', 'artist'];
  }
}
