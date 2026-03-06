/**
 * @file MusicService.ts
 * @description Service provider for MusicBrainz integration.
 */

import { MusicFilters } from '@/lib/media-types/filters';
import { getLegacyItemDetails } from '@/lib/services/musicbrainz/details';
import { searchMusicBrainz } from '@/lib/services/musicbrainz/search';
import { ItemType, LegacyItemDetails, SearchResult } from '@/v1/lib/types';

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
    type: ItemType,
    options: SearchOptions<MusicFilters> = {},
  ): Promise<SearchResult> {
    const result = await searchMusicBrainz({
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

    // Populate serviceId for each search result
    result.results = result.results.map(item => ({
      ...item,
      serviceId: this.id
    }));

    return result;
  }

  async getDetails(id: string, type: ItemType): Promise<LegacyItemDetails> {
    const result = (await getLegacyItemDetails(id, type)) as LegacyItemDetails;
    return {
      ...result,
      serviceId: this.id
    };
  }

  getSupportedTypes(): ItemType[] {
    return ['song', 'album', 'artist'];
  }
}
