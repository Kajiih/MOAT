/**
 * @file mappers.ts
 * @description Utility functions for transforming raw API responses (Zod schemas) into internal domain types (MediaItem).
 * Handles the logic for extracting release years, formatting artist credits, and resolving the best available image URL (Cover Art Archive).
 * @module DataMappers
 */

import { z } from 'zod';

import { getArtistThumbnail } from '@/lib/server/images';
import {
  MediaItem,
  MusicBrainzArtistCreditSchema,
  MusicBrainzArtistSchema,
  MusicBrainzRecordingSchema,
  MusicBrainzReleaseGroupSchema,
} from '@/lib/types';

const COVER_ART_ARCHIVE_BASE_URL = 'https://coverartarchive.org';

/**
 * Helper to construct a Cover Art Archive URL.
 * @param id - The MusicBrainz ID (release-group or release).
 * @param type - The entity type ('release-group' or 'release').
 * @returns A formatted URL string.
 */
const getCoverArtUrl = (id: string, type: 'release-group' | 'release' = 'release-group') => {
  return `${COVER_ART_ARCHIVE_BASE_URL}/${type}/${id}/front-250`;
};

/**
 * Formats a list of artist credits into a single string.
 * Handles join phrases (e.g., " feat. ") correctly.
 * @param credits - Array of artist credits from MusicBrainz.
 * @returns A formatted string or 'Unknown' if empty.
 */
export const formatArtistCredit = (
  credits?: z.infer<typeof MusicBrainzArtistCreditSchema>[],
) => {
  if (!credits || credits.length === 0) return 'Unknown';
  return credits.map((c) => c.name + (c.joinphrase || '')).join('');
};

/**
 * Maps a raw MusicBrainz Release Group response to a simplified MediaItem.
 * Defaults the image to the Cover Art Archive front image.
 * @param item - The raw MusicBrainz Release Group response.
 * @returns A normalized MediaItem object.
 */
export function mapReleaseGroupToMediaItem(
  item: z.infer<typeof MusicBrainzReleaseGroupSchema>,
): MediaItem {
  return {
    id: item.id,
    type: 'album',
    title: item.title,
    artist: formatArtistCredit(item['artist-credit']),
    year: item['first-release-date']?.split('-')[0] || '',
    date: item['first-release-date'],
    imageUrl: getCoverArtUrl(item.id, 'release-group'),
    primaryType: item['primary-type'],
    secondaryTypes: item['secondary-types'],
  };
}

/**
 * Maps a raw MusicBrainz Artist response to a MediaItem.
 * Asynchronously fetches a thumbnail from Fanart.tv or Wikidata via the image service.
 * @param item - The raw MusicBrainz Artist response.
 * @returns A Promise resolving to a normalized MediaItem object.
 */
export async function mapArtistToMediaItem(
  item: z.infer<typeof MusicBrainzArtistSchema>,
): Promise<MediaItem> {
  const thumb = await getArtistThumbnail(item.id);
  return {
    id: item.id,
    type: 'artist',
    title: item.name,
    year: item['life-span']?.begin?.split('-')[0] || '',
    date: item['life-span']?.begin,
    imageUrl: thumb,
    disambiguation: item.disambiguation,
  };
}

/**
 * Maps a raw MusicBrainz Recording (Song) response to a MediaItem.
 * Attempts to resolve artwork from the release group or specific release.
 * @param item - The raw MusicBrainz Recording (Song) response.
 * @returns A normalized MediaItem object.
 */
export function mapRecordingToMediaItem(
  item: z.infer<typeof MusicBrainzRecordingSchema>,
): MediaItem {
  const release = item.releases?.[0];
  const albumId = release?.['release-group']?.id;
  const releaseId = release?.id;

  // Preference: Use release-group ID for image if available, otherwise fallback to release ID
  let imageUrl: string | undefined = undefined;
  if (albumId) {
    imageUrl = getCoverArtUrl(albumId, 'release-group');
  } else if (releaseId) {
    imageUrl = getCoverArtUrl(releaseId, 'release');
  }

  return {
    id: item.id,
    type: 'song',
    title: item.title,
    artist: formatArtistCredit(item['artist-credit']),
    album: release?.title,
    albumId: albumId,
    year: item['first-release-date']?.split('-')[0] || '',
    date: item['first-release-date'],
    imageUrl,
    duration: item.length,
  };
}
