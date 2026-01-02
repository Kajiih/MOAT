import { z } from 'zod';

// --- Domain Types ---
export type Album = {
  id: string;
  title: string;
  artist: string;
  year?: string;
  imageUrl: string;
};

export type TierMap = Record<string, Album[]>;

// --- Zod Schemas for MusicBrainz API ---
// This ensures we only accept data that looks exactly like this
export const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
});

export const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
});

export const MusicBrainzSearchResponseSchema = z.object({
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).optional(),
});
