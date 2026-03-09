/**
 * @file Provider Bootstrap
 * @description Central Node.js execution file instantiating API data adapters into the registry.
 */

import { RAWGDatabase } from './adapters/rawg';
import { registry } from './registry';

// Register all external data providers to the central registry
// This file should be imported once at the entry point of the server to ensure
// providers are globally available before any API route or component needs them.
registry.register(RAWGDatabase);
