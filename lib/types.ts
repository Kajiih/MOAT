/**
 * @file types.ts
 * @description Central definition of all domain types and Zod schemas used across the application.
 * Includes definitions for MediaItems (Album, Artist, Song), Tier definitions, and MusicBrainz API response schemas.
 * @module Types
 */

import { z } from 'zod';

// --- Domain Types ---

/**
 * Represents the type of media being handled.
 * - 'album': A music album (Release Group in MusicBrainz).
 * - 'artist': A musical artist or group.
 * - 'song': A single track (Recording in MusicBrainz).
 */
export type MediaType = 'album' | 'artist' | 'song';

/**
 * Available sorting options for search results.
 */
export type SortOption =
  | 'relevance'
  | 'date_desc'
  | 'date_asc'
  | 'title_asc'
  | 'title_desc'
  | 'duration_desc'
  | 'duration_asc';

/**
 * Common properties shared by all media entities.
 */
export interface BaseMediaItem {
  /** Unique identifier (MusicBrainz ID) */
  id: string;
  /** The primary title (Album name, Artist name, or Song title) */
  title: string;
  /** The release year or formation year. */
  year?: string;
  /** The full release date (YYYY-MM-DD) or formation date. */
  date?: string;
  /** URL to the cover art or artist image. */
  imageUrl?: string;
  /** Deep metadata (stored in state for persistence) */
  details?: MediaDetails;
}

/**
 * Represents a musical album.
 */
export interface AlbumItem extends BaseMediaItem {
  type: 'album';
  /** The artist name. */
  artist: string;
  /** Primary type (e.g., Album, Single, EP) */
  primaryType?: string;
  /** Secondary types (e.g., Live, Compilation, Remix) */
  secondaryTypes?: string[];
}

/**
 * Represents a musical artist or group.
 */
export interface ArtistItem extends BaseMediaItem {
  type: 'artist';
  /** Disambiguation comment (mostly for artists with same names). */
  disambiguation?: string;
}

/**
 * Represents a single musical track.
 */
export interface SongItem extends BaseMediaItem {
  type: 'song';
  /** The artist name. */
  artist: string;
  /** The album name. */
  album?: string;
  /** The parent album (release-group) ID. */
  albumId?: string;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Represents a single normalized media item in the application.
 * This structure unifies data from different MusicBrainz entities (Release Group, Artist, Recording).
 */
export type MediaItem = AlbumItem | ArtistItem | SongItem;

/**
 * Represents a simplified artist object used for selection state in pickers.
 */
export interface ArtistSelection {
  /** MusicBrainz ID. */
  id: string;
  /** Artist name. */
  name: string;
  /** Image URL. */
  imageUrl?: string;
  /** Optional disambiguation string. */
  disambiguation?: string;
}

/**
 * Represents a simplified album object used for selection state in pickers.
 */
export interface AlbumSelection {
  /** MusicBrainz ID. */
  id: string;
  /** Album title. */
  name: string;
  /** Artist name. */
  artist: string;
  /** Image URL. */
  imageUrl?: string;
}

/**
 * Unified selection type for generic components (pickers).
 */
export type MediaSelection = ArtistSelection | AlbumSelection;

/**
 * Defines the metadata for a single tier row.
 */
export interface TierDefinition {
  /** Unique ID for the tier. */
  id: string;
  /** Label text (e.g., 'S', 'A'). */
  label: string;
  /** Semantic Color ID (e.g., 'red', 'blue'), mapped in lib/colors.ts. */
  color: string;
}

/**
 * Represents the state of the tier list board.
 */
export interface TierListState {
  /** The user-defined title of the board. */
  title: string;
  /** Array defining the order and appearance of tiers. */
  tierDefs: TierDefinition[];
  /** Map mapping tier IDs to their list of media items. */
  items: Record<string, MediaItem[]>;
}

/**
 * Simplified tier data for the dashboard preview.
 */
export interface TierPreview {
  id: string;
  label: string;
  color: string;
  imageUrls: string[];
}

/**
 * Metadata for a single board in the registry.
 */
export interface BoardMetadata {
  /** Unique board ID. */
  id: string;
  /** Board title. */
  title: string;
  /** Creation timestamp. */
  createdAt: number;
  /** Last modification timestamp. */
  lastModified: number;
  /** Optional preview image URL (legacy). */
  thumbnail?: string;
  /** Optional list of preview images for a collage (legacy). */
  previewImages?: string[];
  /** Structure for rendering a miniature tier list. */
  previewData?: TierPreview[];
  /** Total number of items on the board. */
  itemCount: number;
}

/**
 * Represents a single track in an album tracklist.
 */
export interface TrackItem {
  /** Recording ID. */
  id: string;
  /** Disc/Track position string (e.g., '1-1'). */
  position: string;
  /** Track title. */
  title: string;
  /** Formatted duration string (e.g., '03:45'). */
  length: string;
}

/**
 * Deep metadata for a media item, fetched on demand or enriched in background.
 */
export interface MediaDetails {
  /** MusicBrainz ID. */
  id: string;
  /** Entity type. */
  type: MediaType;
  /** Array of descriptive tags. */
  tags?: string[];
  /** External resource links. */
  urls?: { type: string; url: string }[];
  /** Formatted release date. */
  date?: string;
  /** Formatted duration. */
  length?: string;
  /** High-res image URL. */
  imageUrl?: string;

  /** Album specific: full tracklist. */
  tracks?: TrackItem[];
  /** Album specific: record label. */
  label?: string;
  /** Album specific: specific release ID. */
  releaseId?: string;

  /** Artist specific: geographic area. */
  area?: string;
  /** Artist specific: life span dates. */
  lifeSpan?: { begin?: string; end?: string; ended?: boolean };

  /** Song specific: parent album title. */
  album?: string;
  /** Song specific: parent album ID. */
  albumId?: string;
}

// --- Zod Schemas for MusicBrainz API ---

// Common
export const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
  joinphrase: z.string().optional(),
});

// 1. Release Group (Album)
export const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  'primary-type': z.string().optional(),
  'secondary-types': z.array(z.string()).optional(),
});

// 2. Artist
export const MusicBrainzArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  'life-span': z.object({ begin: z.string().optional() }).optional(),
  country: z.string().optional(),
  disambiguation: z.string().optional(),
});

// 3. Recording (Song)
export const MusicBrainzRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  length: z.number().optional(), // Duration in milliseconds
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  releases: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        'release-group': z
          .object({
            id: z.string(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export const MusicBrainzSearchResponseSchema = z.object({
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).optional(),
  artists: z.array(MusicBrainzArtistSchema).optional(),
  recordings: z.array(MusicBrainzRecordingSchema).optional(),
  'release-group-count': z.number().optional(),
  'artist-count': z.number().optional(),
  'recording-count': z.number().optional(),
  count: z.number().optional(),
});

// --- MusicBrainz Constants ---

export const PRIMARY_TYPES = ['Album', 'EP', 'Single', 'Broadcast', 'Other'] as const;

export const SECONDARY_TYPES = [
  'Compilation',
  'Soundtrack',
  'Spokenword',
  'Interview',
  'Audiobook',
  'Audio drama',
  'Live',
  'Remix',
  'DJ-mix',
  'Mixtape/Street',
  'Demo',
  'Field recording',
] as const;

export const ARTIST_TYPES = [
  'Person',
  'Group',
  'Orchestra',
  'Choir',
  'Character',
  'Other',
] as const;
