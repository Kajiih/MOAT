/**
 * @file Provider Bootstrap
 * @description Central Node.js execution file instantiating API data adapters into the registry.
 */

import { MusicBrainzProvider } from './adapters/musicbrainz';
import { RAWGProvider } from './adapters/rawg';
import { registry } from './registry';

// Register all external data providers to the central registry
// This file should be imported once at the entry point of the server to ensure
// providers are globally available before any API route or component needs them.
const rawgProvider = new RAWGProvider({
  apiKey: process.env.NEXT_PUBLIC_RAWG_API_KEY!,
});
const musicBrainzProvider = new MusicBrainzProvider();

registry.register(rawgProvider);
registry.register(musicBrainzProvider);
