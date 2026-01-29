/**
 * @file MusicService.ts
 * @description Service provider for MusicBrainz integration.
 */

import { getMediaUI } from '@/lib/media-defs';
import { getMediaDetails } from '@/lib/services/musicbrainz/details';
import { searchMusicBrainz } from '@/lib/services/musicbrainz/search';
import { MediaDetails, MediaType, SearchResult } from '@/lib/types';

import { FilterDefinition, MediaService, MediaUIConfig, SearchOptions } from '../types';

/**
 * Service adapter for MusicBrainz integration.
 * Wraps existing logic to implement the generic MediaService interface.
 */
export class MusicService implements MediaService {
  readonly category = 'music' as const;
  
  async search(
    query: string,
    type: MediaType,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    // Adapter to map generic options to MusicBrainz specific params
    return searchMusicBrainz({
      type,
      query,
      artist: null,
      artistId: (options.filters?.artistId as string) || null,
      albumId: (options.filters?.albumId as string) || null,
      minYear: (options.filters?.minYear as string) || null,
      maxYear: (options.filters?.maxYear as string) || null,
      albumPrimaryTypes: (options.filters?.albumPrimaryTypes as string[]) || [],
      albumSecondaryTypes: (options.filters?.albumSecondaryTypes as string[]) || [],
      artistType: (options.filters?.artistType as string) || undefined,
      artistCountry: (options.filters?.artistCountry as string) || undefined,
      tag: (options.filters?.tag as string) || undefined,
      minDuration: (options.filters?.minDuration as number) || undefined,
      maxDuration: (options.filters?.maxDuration as number) || undefined,
      page: options.page || 1,
      fuzzy: options.fuzzy,
      wildcard: options.wildcard,
      options: {
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
