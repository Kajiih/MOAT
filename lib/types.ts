import { z } from 'zod';

// --- Domain Types ---

/**
 * Represents the type of media being handled.
 * - 'album': A music album (Release Group in MusicBrainz).
 * - 'artist': A musical artist or group.
 * - 'song': A single track (Recording in MusicBrainz).
 */
export type MediaType = 'album' | 'artist' | 'song';

export type SortOption = 'relevance' | 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc' | 'duration_desc' | 'duration_asc';

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

export interface AlbumItem extends BaseMediaItem {
  type: 'album';
  /** The artist name. */
  artist: string;
  /** Primary type (e.g., Album, Single, EP) */
  primaryType?: string;
  /** Secondary types (e.g., Live, Compilation, Remix) */
  secondaryTypes?: string[];
}

export interface ArtistItem extends BaseMediaItem {
  type: 'artist';
  /** Disambiguation comment (mostly for artists with same names). */
  disambiguation?: string;
}

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
 * Represents a simplified artist object used for selection state.
 */
export type ArtistSelection = {
  id: string;
  name: string;
  imageUrl?: string;
};

/**
 * Represents a simplified album object used for selection state.
 */
export type AlbumSelection = {
  id: string;
  name: string;
  artist: string;
  imageUrl?: string;
};

/**
 * Defines the metadata for a single tier row.
 */
export interface TierDefinition {
  id: string;
  label: string;
  color: string; // Semantic Color ID (e.g., 'red', 'blue'), mapped in lib/colors.ts
}

/**
 * Represents the state of the tier list board.
 * - tierDefs: Array defining the order and appearance of tiers.
 * - items: Record mapping tier IDs to their content.
 */
export interface TierListState {
  tierDefs: TierDefinition[];
  items: Record<string, MediaItem[]>;
}

export interface TrackItem {
  id: string;
  position: string;
  title: string;
  length: string; // formatted duration
}

export interface MediaDetails {
  id: string;
  type: MediaType;
  // Common
  tags?: string[];
  urls?: { type: string; url: string }[];
  date?: string;
  length?: string;
  imageUrl?: string;
  
  // Album specific
  tracks?: TrackItem[];
  label?: string;
  releaseId?: string;
  
  // Artist specific
  area?: string;
  lifeSpan?: { begin?: string; end?: string; ended?: boolean };

  // Song specific
  album?: string;
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
  releases: z.array(z.object({ 
    id: z.string(),
    title: z.string(),
    'release-group': z.object({
      id: z.string()
    }).optional()
  })).optional(), 
});

export const MusicBrainzSearchResponseSchema = z.object({
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).optional(),
  'artists': z.array(MusicBrainzArtistSchema).optional(),
  'recordings': z.array(MusicBrainzRecordingSchema).optional(),
});

// --- MusicBrainz Constants ---

export const PRIMARY_TYPES = [
  'Album',
  'EP',
  'Single',
  'Broadcast',
  'Other'
] as const;

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
  'Field recording'
] as const;

export const ARTIST_TYPES = [
  'Person',
  'Group',
  'Orchestra',
  'Choir',
  'Character',
  'Other'
] as const;

