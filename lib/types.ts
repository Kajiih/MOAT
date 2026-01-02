import { z } from 'zod';

// --- Domain Types ---
export type MediaType = 'album' | 'artist' | 'song';

export type MediaItem = {
  id: string;
  type: MediaType;
  title: string;       // Name for artists
  artist?: string;     // Empty/undefined for artists
  album?: string;      // Only for songs
  year?: string;
  imageUrl?: string;
};

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
});

// 3. Recording (Song)
export const MusicBrainzRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  releases: z.array(z.object({ title: z.string() })).optional(), // To get album name
});

export const MusicBrainzSearchResponseSchema = z.object({
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).optional(),
  'artists': z.array(MusicBrainzArtistSchema).optional(),
  'recordings': z.array(MusicBrainzRecordingSchema).optional(),
});