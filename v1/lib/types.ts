/**
 * @file types.ts
 * @description Legacy V1 types and schemas.
 */

import { z } from 'zod';

/**
 * Represents the type of item being handled (Legacy V1).
 */
export type ItemType =
  | 'album'
  | 'artist'
  | 'song'
  | 'movie'
  | 'tv'
  | 'person'
  | 'game'
  | 'book'
  | 'author'
  | 'developer'
  | 'franchise'
  | 'series';

/**
 * Common properties shared by all legacy item entities.
 */
export interface BaseLegacyItem {
  id: string;
  mbid: string;
  title: string;
  year?: string;
  date?: string;
  imageUrl?: string;
  details?: LegacyItemDetails;
  rating?: number;
  reviewCount?: number;
  notes?: string;
  serviceId?: string;
}

export interface AlbumItem extends BaseLegacyItem {
  type: 'album';
  artist: string;
  primaryType?: string;
  secondaryTypes?: string[];
}

export interface ArtistItem extends BaseLegacyItem {
  type: 'artist';
  disambiguation?: string;
}

export interface SongItem extends BaseLegacyItem {
  type: 'song';
  artist: string;
  album?: string;
  albumId?: string;
  duration?: number;
}

export interface MovieItem extends BaseLegacyItem { type: 'movie'; }
export interface TVItem extends BaseLegacyItem { type: 'tv'; }
export interface PersonItem extends BaseLegacyItem { type: 'person'; knownFor?: string; }
export interface GameItem extends BaseLegacyItem { type: 'game'; developer?: string; platforms?: string[]; }
export interface BookItem extends BaseLegacyItem { type: 'book'; author: string; }
export interface AuthorItem extends BaseLegacyItem { type: 'author'; }
export interface DeveloperItem extends BaseLegacyItem { type: 'developer'; }
export interface FranchiseItem extends BaseLegacyItem { type: 'franchise'; gameCount?: number; }
export interface SeriesItem extends BaseLegacyItem { type: 'series'; bookCount?: number; }

export interface ArtistSelection {
  id: string;
  name: string;
  imageUrl?: string;
  disambiguation?: string;
}

export interface AlbumSelection {
  id: string;
  name: string;
  artist: string;
  imageUrl?: string;
}

export type ItemSelection = ArtistSelection | AlbumSelection;

export interface TrackItem {
  id: string;
  position: string;
  title: string;
  length: string;
}

export interface LegacyItemDetails {
  id: string;
  mbid: string;
  type: ItemType;
  title?: string;
  tags?: string[];
  urls?: { type: string; url: string }[];
  date?: string;
  length?: string;
  imageUrl?: string;
  tracks?: TrackItem[];
  label?: string;
  releaseId?: string;
  area?: string;
  lifeSpan?: { begin?: string; end?: string; ended?: boolean };
  album?: string;
  albumId?: string;
  firstSentence?: string;
  places?: string[];
  developer?: string;
  publisher?: string;
  platforms?: string[];
  metacritic?: number;
  rating?: number;
  reviewCount?: number;
  description?: string;
  serviceId?: string;
}

// --- Zod Schemas ---

const BaseLegacyItemSchema = z.object({
  id: z.string(),
  mbid: z.string(),
  title: z.string(),
  year: z.string().optional(),
  date: z.string().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  notes: z.string().optional(),
  serviceId: z.string().optional(),
  details: z.any().optional(), // Metadata placeholder
});

export const LegacyItemSchema = z.discriminatedUnion('type', [
  BaseLegacyItemSchema.extend({
    type: z.literal('album'),
    artist: z.string(),
    primaryType: z.string().optional(),
    secondaryTypes: z.array(z.string()).optional(),
  }),
  BaseLegacyItemSchema.extend({
    type: z.literal('artist'),
    disambiguation: z.string().optional(),
  }),
  BaseLegacyItemSchema.extend({
    type: z.literal('song'),
    artist: z.string(),
    album: z.string().optional(),
    albumId: z.string().optional(),
    duration: z.number().optional(),
  }),
  BaseLegacyItemSchema.extend({ type: z.literal('movie') }),
  BaseLegacyItemSchema.extend({ type: z.literal('tv') }),
  BaseLegacyItemSchema.extend({
    type: z.literal('person'),
    knownFor: z.string().optional(),
  }),
  BaseLegacyItemSchema.extend({
    type: z.literal('game'),
    developer: z.string().optional(),
    platforms: z.array(z.string()).optional(),
  }),
  BaseLegacyItemSchema.extend({
    type: z.literal('book'),
    author: z.string(),
  }),
  BaseLegacyItemSchema.extend({ type: z.literal('author') }),
  BaseLegacyItemSchema.extend({ type: z.literal('developer') }),
  BaseLegacyItemSchema.extend({
    type: z.literal('franchise'),
    gameCount: z.number().optional(),
  }),
  BaseLegacyItemSchema.extend({
    type: z.literal('series'),
    bookCount: z.number().optional(),
  }),
]);

export type LegacyItem = z.infer<typeof LegacyItemSchema>;

// MusicBrainz API Schemas
export const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
  joinphrase: z.string().optional(),
});

export const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  'primary-type': z.string().optional(),
  'secondary-types': z.array(z.string()).optional(),
});

export const MusicBrainzArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  'life-span': z.object({ begin: z.string().optional() }).optional(),
  country: z.string().optional(),
  disambiguation: z.string().optional(),
});

export const MusicBrainzRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  length: z.number().optional(),
  'first-release-date': z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  releases: z.array(z.object({
    id: z.string(),
    title: z.string(),
    'release-group': z.object({ id: z.string() }).optional(),
  })).optional(),
});

export const MusicBrainzSearchResponseSchema = z.object({
  'release-groups': z.array(MusicBrainzReleaseGroupSchema).optional(),
  artists: z.array(MusicBrainzArtistSchema).optional(),
  recordings: z.array(MusicBrainzRecordingSchema).optional(),
  count: z.number().optional(),
});

export const PRIMARY_TYPES = ['Album', 'EP', 'Single', 'Broadcast', 'Other'] as const;
export const SECONDARY_TYPES = [
  'Compilation', 'Soundtrack', 'Spokenword', 'Interview', 'Audiobook', 
  'Audio drama', 'Live', 'Remix', 'DJ-mix', 'Mixtape/Street', 'Demo', 'Field recording'
] as const;
export const ARTIST_TYPES = ['Person', 'Group', 'Orchestra', 'Choir', 'Character', 'Other'] as const;
