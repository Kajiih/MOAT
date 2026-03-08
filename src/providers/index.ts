import { registry } from './registry';
import { RAWGDatabase } from './adapters/rawg';

// Register all external data providers to the central registry
// This file should be imported once at the entry point of the server to ensure
// providers are globally available before any API route or component needs them.
registry.register(RAWGDatabase);

export { registry };
