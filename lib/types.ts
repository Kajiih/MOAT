/**
 * @file types.ts
 * @description Central definition of all domain types and Zod schemas used across the application.
 * Includes definitions for MediaItems (Album, Artist, Song), Tier definitions, and MusicBrainz API response schemas.
 * @module Types
 */

import { z } from 'zod';

// --- Domain Types ---

// --- Branding Helpers ---

/**
 * Branded type helper.
 */
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };

/** Branded identifier for a Board */
export type BoardId = Brand<string, 'BoardId'>;
/** Branded identifier for a Tier */
export type TierId = Brand<string, 'TierId'>;
/** Branded identifier for an Item (usually an MBID or standard UUID) */
export type ItemId = Brand<string, 'ItemId'>;

// --- Domain Types ---

/**
 * Represents the type of media being handled.
 */
export type MediaType =
  | 'album'
  | 'artist'
  | 'song'
  | 'movie'
  | 'tv'
  | 'person'
  | 'game'
  | 'book'
  | 'author';

/**
 * Broad category for a board, determining which service and UI to use.
 */
export type BoardCategory = 'music' | 'cinema' | 'game' | 'book';

/**
 * Standardized search result wrapper.
 */
export interface SearchResult {
  results: MediaItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  isServerSorted?: boolean;
}

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
  | 'duration_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'reviews_desc'
  | 'reviews_asc';

/**
 * Common properties shared by all media entities.
 */
export interface BaseMediaItem {
  /** Unique identifier (Application/Board ID) */
  id: string; // Keep as string for dnd-kit compatibility, but internal logic prefers ItemId
  /** MusicBrainz ID (Database ID) */
  mbid: string;
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
  /** Rating value (0-10 or 0-5 depending on source) */
  rating?: number;
  /** Number of reviews or popularity metric */
  reviewCount?: number;
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
 * Represents a movie.
 */
export interface MovieItem extends BaseMediaItem {
  type: 'movie';
}

/**
 * Represents a TV show.
 */
export interface TVItem extends BaseMediaItem {
  type: 'tv';
}

/**
 * Represents a person (actor/crew).
 */
export interface PersonItem extends BaseMediaItem {
  type: 'person';
  knownFor?: string;
}

/**
 * Represents a video game.
 */
export interface GameItem extends BaseMediaItem {
  type: 'game';
}

/**
 * Represents a book.
 */
export interface BookItem extends BaseMediaItem {
  type: 'book';
  /** The author(s) of the book. */
  author: string;
}

/**
 * Represents a book author.
 */
export interface AuthorItem extends BaseMediaItem {
  type: 'author';
}

/**
 * Represents a single normalized media item in the application.
 */
export type MediaItem =
  | AlbumItem
  | ArtistItem
  | SongItem
  | MovieItem
  | TVItem
  | PersonItem
  | GameItem
  | BookItem
  | AuthorItem;

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
  /** Broad category for the board. */
  category?: BoardCategory;
  /**
   * Optimized lookup map for item locations (itemId -> tierId).
   */
  itemLookup?: Record<string, string>;
}

/**
 * Represents a simplified item for the dashboard preview.
 */
export interface PreviewItem {
  type: MediaType;
  title: string;
  imageUrl?: string;
}

/**
 * Simplified tier data for the dashboard preview.
 */
export interface TierPreview {
  id: string;
  label: string;
  color: string;
  items: PreviewItem[];
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
  /** Structure for rendering a miniature tier list. */
  previewData?: TierPreview[];
  /** Total number of items on the board. */
  itemCount: number;
  /** Broad category. */
  category?: BoardCategory;
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
 * Deep metadata for a media item.
 */
export interface MediaDetails {
  /** Application/Board ID */
  id: string;
  /** MusicBrainz ID */
  mbid: string;
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

  /** Book specific: first sentence of the book. */
  firstSentence?: string;
  /** Book specific: settings/places. */
  places?: string[];

  /** General description or bio. */
  description?: string;
}

// --- Zod Schemas for State Validation ---

export const TierDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
});

/**
 * Standard base schema for all media items.
 */
const BaseMediaItemSchema = z.object({
  id: z.string(),
  mbid: z.string(),
  title: z.string(),
  year: z.string().optional(),
  date: z.string().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
});

/**
 * Strictly typed schema for MediaItem union.
 */
export const MediaItemSchema = z.discriminatedUnion('type', [
  BaseMediaItemSchema.extend({
    type: z.literal('album'),
    artist: z.string(),
    primaryType: z.string().optional(),
    secondaryTypes: z.array(z.string()).optional(),
  }),
  BaseMediaItemSchema.extend({
    type: z.literal('artist'),
    disambiguation: z.string().optional(),
  }),
  BaseMediaItemSchema.extend({
    type: z.literal('song'),
    artist: z.string(),
    album: z.string().optional(),
    albumId: z.string().optional(),
    duration: z.number().optional(),
  }),
  BaseMediaItemSchema.extend({ type: z.literal('movie') }),
  BaseMediaItemSchema.extend({ type: z.literal('tv') }),
  BaseMediaItemSchema.extend({
    type: z.literal('person'),
    knownFor: z.string().optional(),
  }),
  BaseMediaItemSchema.extend({ type: z.literal('game') }),
  BaseMediaItemSchema.extend({
    type: z.literal('book'),
    author: z.string(),
  }),
  BaseMediaItemSchema.extend({ type: z.literal('author') }),
]);

/**
 * Strictly validated TierList schema for persistence and sharing.
 */
export const TierListSchema = z.object({
  title: z.string(),
  tierDefs: z.array(TierDefinitionSchema),
  items: z.record(z.string(), z.array(MediaItemSchema)),
  itemLookup: z.record(z.string(), z.string()).optional(),
  category: z.enum(['music', 'cinema', 'game', 'book']).optional(),
});

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
  length: z.number().optional(),
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
  count: z.number().optional(),
});

// --- Utilities ---

/**
 * Helper to ensure exhaustive switches in TypeScript.
 * @param x - The value that should have been handled exhaustively.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}

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
