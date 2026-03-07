/**
 * @file providers.ts
 * @description Provider manifest — the single source of truth for all database providers.
 *
 * To add a new database provider:
 * 1. Create your provider in `lib/services/` implementing `DatabaseProvider`
 * 2. Import and add it to the `providers` array below
 *
 * That's it. The registry will automatically bootstrap all listed providers
 * when this module is first imported.
 */

import { registry } from './registry';
import type { DatabaseProvider } from './types';

// --- Import all database providers ---
import { RAWGDatabase } from '../services/rawg';

/**
 * All known database providers.
 * Each is registered and initialized when this module loads.
 */
const providers: DatabaseProvider[] = [
  RAWGDatabase,
  // Add new providers here:
  // TMDBDatabase,
  // MusicBrainzDatabase,
];

// --- Auto-bootstrap on first import ---
for (const provider of providers) {
  registry.register(provider).catch((error) => {
    console.error(`Failed to bootstrap provider "${provider.id}":`, error);
  });
}
