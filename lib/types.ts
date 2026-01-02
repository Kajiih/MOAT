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
 * Represents a single normalized media item in the application.
 * This structure unifies data from different MusicBrainz entities (Release Group, Artist, Recording).
 */
export type MediaItem = {
  /** Unique identifier (MusicBrainz ID) */
  id: string;
  /** The type of the media item */
  type: MediaType;
  /** The primary title (Album name, Artist name, or Song title) */
  title: string;
  /** The artist name. Undefined for 'artist' type items. */
  artist?: string;
  /** The album name. Only defined for 'song' type items. */
  album?: string;
  /** The release year or formation year. */
  year?: string;
  /** URL to the cover art or artist image. */
  imageUrl?: string;
  /** Disambiguation comment (mostly for artists with same names). */
  disambiguation?: string; 
};

/**
 * Represents the state of the tier list board.
 * Keys are tier labels (S, A, B...) and values are arrays of MediaItems.
 */
export type TierMap = Record<string, MediaItem[]>;

// --- Zod Schemas for MusicBrainz API ---

// Common
export const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
});

// 1. Release Group (Album)
export const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
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
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  releases: z.array(z.object({ 
    id: z.string(),
    title: z.string() 
  })).optional(), 
});

export const MusicBrainzSearchResponseSchema = z.object({
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).optional(),
  'artists': z.array(MusicBrainzArtistSchema).optional(),
  'recordings': z.array(MusicBrainzRecordingSchema).optional(),
});