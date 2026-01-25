/**
 * @file media-defs.tsx
 * @description centralized configuration for UI representation of different media types.
 * Maps 'album', 'artist', 'song' to their respective icons, colors, and formatting logic.
 * @module MediaDefs
 */

import { Clapperboard, Disc, LucideIcon, Music, Tv, User } from 'lucide-react';

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
  movie: {
    label: 'Movie',
    Icon: Clapperboard,
    colorClass: 'text-amber-400',
    getSubtitle: (item) => item.year || '',
    getTertiaryText: (_item) => 'Movie',
  },
  tv: {
    label: 'TV Show',
    Icon: Tv,
    colorClass: 'text-pink-400',
    getSubtitle: (item) => item.year || '',
    getTertiaryText: (_item) => 'TV Series',
  },
  person: {
    label: 'Person',
    Icon: User,
    colorClass: 'text-teal-400',
    getSubtitle: (_item) => 'Person',
    getTertiaryText: (_item) => 'Actor/Crew',
  },
  game: {
    label: 'Game',
    Icon: Disc,
    colorClass: 'text-purple-400',
    getSubtitle: (_item) => '',
    getTertiaryText: (_item) => '',
  },
  book: {
    label: 'Book',
    Icon: Disc,
    colorClass: 'text-blue-400',
    getSubtitle: (_item) => '',
    getTertiaryText: (_item) => '',
  },
};

/**
 * Helper to get the configuration for a given item's type.
 * @param type - The type of media.
 * @returns The UI configuration object for the given media type.
 */
export function getMediaUI(type: MediaType) {
  return MEDIA_CONFIG[type];
}
