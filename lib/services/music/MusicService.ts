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

  getUIConfig(type: MediaType): MediaUIConfig {
    return getMediaUI(type);
  }

  getFilters(type: MediaType): FilterDefinition[] {
    const filters: FilterDefinition[] = [];

    // Context Pickers (translated to 'picker' types)
    if (type !== 'artist') {
      filters.push({
        id: 'selectedArtist',
        paramName: 'artistId',
        label: 'Filter by Artist',
        type: 'picker',
        pickerType: 'artist',
      });

      if (type === 'song') {
        filters.push({
          id: 'selectedAlbum',
          paramName: 'albumId',
          label: 'Filter by Album',
          type: 'picker',
          pickerType: 'album',
        });
      }
    }

    // Common Filters
    filters.push({
      id: 'yearRange', // specialized ID for minYear/maxYear group
      label: type === 'artist' ? 'Born / Formed' : 'Release Year',
      type: 'range',
    }, {
      id: 'tag',
      label: 'Tag / Genre',
      type: 'text',
      placeholder: 'e.g. rock, jazz, 80s...',
    });

    // Type Specific
    if (type === 'artist') {
      filters.push({
        id: 'artistType',
        label: 'Artist Type',
        type: 'select',
        options: [
          { label: 'Any Type', value: '' },
          { label: 'Person', value: 'Person' },
          { label: 'Group', value: 'Group' },
          { label: 'Orchestra', value: 'Orchestra' },
          { label: 'Choir', value: 'Choir' },
          { label: 'Character', value: 'Character' },
          { label: 'Other', value: 'Other' },
        ],
      }, {
        id: 'artistCountry',
        label: 'Country',
        type: 'text',
        placeholder: 'e.g. US, GB, JP...',
      });
    }

    if (type === 'album') {
      filters.push({
        id: 'albumPrimaryTypes',
        label: 'Primary Types',
        type: 'toggle-group',
        options: [
          { label: 'Album', value: 'Album' },
          { label: 'EP', value: 'EP' },
          { label: 'Single', value: 'Single' },
          { label: 'Broadcast', value: 'Broadcast' },
          { label: 'Other', value: 'Other' },
        ],
        default: ['Album', 'EP'],
      });
    }

    if (type === 'song') {
      filters.push({
        id: 'durationRange',
        label: 'Duration (Seconds)',
        type: 'range',
        placeholder: 'Sec',
      });
    }

    return filters;
  }

  getDefaultFilters(type: MediaType): Record<string, unknown> {
    const defaults: Record<string, unknown> = {
      query: '',
    };

    if (type !== 'artist') {
      defaults.selectedArtist = null;
      if (type === 'song') {
        defaults.selectedAlbum = null;
      }
    }

    // Common
    defaults.minYear = '';
    defaults.maxYear = '';
    defaults.tag = '';

    if (type === 'artist') {
      defaults.artistType = '';
      defaults.artistCountry = '';
    }

    if (type === 'album') {
      defaults.albumPrimaryTypes = ['Album', 'EP'];
      defaults.albumSecondaryTypes = [];
    }

    if (type === 'song') {
      defaults.minDuration = '';
      defaults.maxDuration = '';
    }

    return defaults;
  }

  parseSearchOptions(params: URLSearchParams): SearchOptions {
    const page = Number.parseInt(params.get('page') || '1', 10);
    const fuzzy = params.get('fuzzy') !== 'false';
    const wildcard = params.get('wildcard') !== 'false';

    const filters: Record<string, unknown> = {
      artistId: params.get('artistId'),
      albumId: params.get('albumId'),
      minYear: params.get('minYear'),
      maxYear: params.get('maxYear'),
      albumPrimaryTypes: params.getAll('albumPrimaryTypes'),
      albumSecondaryTypes: params.getAll('albumSecondaryTypes'),
      artistType: params.get('artistType') || undefined,
      artistCountry: params.get('artistCountry') || undefined,
      tag: params.get('tag') || undefined,
      minDuration: params.get('minDuration') ? Number.parseInt(params.get('minDuration')!, 10) : undefined,
      maxDuration: params.get('maxDuration') ? Number.parseInt(params.get('maxDuration')!, 10) : undefined,
    };

    return {
      page,
      fuzzy,
      wildcard,
      filters,
    };
  }
}
