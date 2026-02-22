/**
 * @file factories.ts
 * @description Centralized factories for generating mock domain objects for testing.
 * Provides sensible defaults while allowing easy overrides for specific test cases.
 */

import { faker } from '@faker-js/faker';

import {
  AlbumItem,
  ArtistItem,
  BookItem,
  MediaItem,
  SongItem,
  TierDefinition,
  TierListState,
} from '@/lib/types';

/**
 * Creates a mock TierDefinition.
 * @param overrides - Optional overrides for the tier definition.
 * @returns A tier definition object.
 */
export function createTierDef(overrides: Partial<TierDefinition> = {}): TierDefinition {
  return {
    id: faker.string.uuid(),
    label: faker.helpers.arrayElement(['S', 'A', 'B', 'C', 'D', 'F']),
    color: faker.helpers.arrayElement(['red', 'blue', 'green', 'yellow', 'purple']),
    ...overrides,
  };
}

/**
 * Creates a mock AlbumItem.
 * @param overrides - Optional overrides for the album item.
 * @returns An album item object.
 */
export function createAlbum(overrides: Partial<AlbumItem> = {}): AlbumItem {
  const id = overrides.id || faker.string.uuid();
  return {
    id,
    mbid: overrides.mbid || id,
    type: 'album',
    title: faker.music.album(),
    artist: faker.person.fullName(),
    year: faker.date.past().getFullYear().toString(),
    imageUrl: faker.image.url(),
    ...overrides,
  };
}

/**
 * Creates a mock SongItem.
 * @param overrides - Optional overrides for the song item.
 * @returns A song item object.
 */
export function createSong(overrides: Partial<SongItem> = {}): SongItem {
  const id = overrides.id || faker.string.uuid();
  return {
    id,
    mbid: overrides.mbid || id,
    type: 'song',
    title: faker.music.songName(),
    artist: faker.person.fullName(),
    album: faker.music.album(),
    imageUrl: faker.image.url(),
    ...overrides,
  };
}

/**
 * Creates a mock ArtistItem.
 * @param overrides - Optional overrides for the artist item.
 * @returns An artist item object.
 */
export function createArtist(overrides: Partial<ArtistItem> = {}): ArtistItem {
  const id = overrides.id || faker.string.uuid();
  return {
    id,
    mbid: overrides.mbid || id,
    type: 'artist',
    title: faker.person.fullName(),
    imageUrl: faker.image.url(),
    ...overrides,
  };
}

/**
 * Creates a mock BookItem.
 * @param overrides - Optional overrides for the book item.
 * @returns A book item object.
 */
export function createBook(overrides: Partial<BookItem> = {}): BookItem {
  const id = overrides.id || faker.string.uuid();
  return {
    id,
    mbid: overrides.mbid || id,
    type: 'book',
    title: faker.commerce.productName(),
    author: faker.person.fullName(),
    imageUrl: faker.image.url(),
    ...overrides,
  };
}

/**
 * Creates a list of mock MediaItems of a given type.
 * @param count - Number of items to create.
 * @param factory - Factory function to use.
 * @returns Array of media items.
 */
export function createMany<T extends MediaItem>(count: number, factory: (overrides?: Partial<T>) => T): T[] {
  return Array.from({ length: count }, () => factory());
}

/**
 * Creates a mock TierListState.
 * @param overrides - Optional overrides for the state.
 * @returns A tier list state object.
 */
export function createTierListState(overrides: Partial<TierListState> = {}): TierListState {
  const tier1 = createTierDef({ id: 'tier-1', label: 'S' });
  const tier2 = createTierDef({ id: 'tier-2', label: 'A' });

  return {
    title: faker.word.words(3),
    tierDefs: [tier1, tier2],
    items: {
      [tier1.id]: [],
      [tier2.id]: [],
    },
    ...overrides,
  };
}
