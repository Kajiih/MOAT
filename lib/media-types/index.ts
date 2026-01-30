/**
 * @file media-types/index.ts
 * @description Entry point for the media type system.
 * Registers all definitions and exports the configured registry.
 */

import { authorDefinition,bookDefinition } from './definitions/books';
import { movieDefinition, personDefinition, tvDefinition } from './definitions/cinema';
import { albumDefinition, artistDefinition, songDefinition } from './definitions/music';
import { mediaTypeRegistry } from './registry';

// Register all media type definitions
mediaTypeRegistry.registerMany([
  // Music
  songDefinition,
  albumDefinition,
  artistDefinition,
  
  // Cinema
  movieDefinition,
  tvDefinition,
  personDefinition,
  
  // Books
  bookDefinition,
  authorDefinition,
]);

// Register category configurations
mediaTypeRegistry.registerCategory({
  id: 'music',
  label: 'Music',
  labelPlural: 'Music',
  primaryTypes: ['song', 'album', 'artist'],
  secondaryTypes: [],
});

mediaTypeRegistry.registerCategory({
  id: 'cinema',
  label: 'Cinema',
  labelPlural: 'Cinema',
  primaryTypes: ['movie', 'tv'],
  secondaryTypes: ['person'],
});

mediaTypeRegistry.registerCategory({
  id: 'book',
  label: 'Books',
  labelPlural: 'Books',
  primaryTypes: ['book'],
  secondaryTypes: ['author'],
});

// Export the configured registry
export { mediaTypeRegistry } from './registry';
export * from './types';
