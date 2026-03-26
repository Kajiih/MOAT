/**
 * @file Provider Bootstrap
 * @description Central Node.js execution file instantiating API data adapters into the registry.
 */

import { MusicBrainzProvider } from '@/infra/providers/adapters/musicbrainz';
import { RAWGProvider } from '@/infra/providers/adapters/rawg';
import { TMDBProvider } from '@/infra/providers/adapters/tmdb';

import { registry } from './registry';

// Register all external data providers to the central registry
// This file should be imported once at the entry point of the server to ensure
// providers are globally available before any API route or component needs them.
const musicBrainzProvider = new MusicBrainzProvider();
const tmdbProvider = new TMDBProvider({
  apiKey: process.env.TMDB_API_KEY || '',
});
const rawgProvider = new RAWGProvider({
  apiKey: process.env.RAWG_API_KEY || '',
});

registry.register(musicBrainzProvider);
registry.register(tmdbProvider);
registry.register(rawgProvider);
