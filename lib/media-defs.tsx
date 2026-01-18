/**
 * @file media-defs.tsx
 * @description centralized configuration for UI representation of different media types.
 * Maps 'album', 'artist', 'song' to their respective icons, colors, and formatting logic.
 * @module MediaDefs
 */

import { Disc, LucideIcon, Music, User } from 'lucide-react';

import { AlbumItem, ArtistItem, MediaItem, MediaType, SongItem } from '@/lib/types';

interface MediaUIConfig {
  label: string;
  Icon: LucideIcon;
  colorClass: string; // Tailwind text color class
  getSubtitle: (item: MediaItem) => string;
  getTertiaryText: (item: MediaItem) => string;
}

export const MEDIA_CONFIG: Record<MediaType, MediaUIConfig> = {
  artist: {
    label: 'Artist',
    Icon: User,
    colorClass: 'text-purple-400',
    getSubtitle: (item) => (item as ArtistItem).disambiguation || '',
    getTertiaryText: (item) => (item.year ? `Est. ${item.year}` : 'Artist'),
  },
  album: {
    label: 'Album',
    Icon: Disc,
    colorClass: 'text-blue-400',
    getSubtitle: (item) => (item as AlbumItem).artist || 'Unknown',
    getTertiaryText: (item) => (item.year ? `(${item.year})` : ''),
  },
  song: {
    label: 'Song',
    Icon: Music,
    colorClass: 'text-green-400',
    getSubtitle: (item) => (item as SongItem).album || '',
    getTertiaryText: (item) => {
      const i = item as SongItem;
      const yearSuffix = i.year ? ` (${i.year})` : '';
      return `${i.artist || 'Unknown'}${yearSuffix}`;
    },
  },
};

/**
 * Helper to get the configuration for a given item's type.
 */
export function getMediaUI(type: MediaType) {
  return MEDIA_CONFIG[type];
}
