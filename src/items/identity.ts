/**
 * @file Item Identity
 * @description Core identifying schemas and utility functions for canonical data.
 */

import { z } from 'zod';

/**
 * Identifies an entity within a specific provider.
 * This is the routing key used throughout the application.
 */
export const EntityIdentitySchema = z.object({
  /** The original ID in the source provider */
  dbId: z.string(),
  /** The identifier of the provider (e.g., 'rawg', 'musicbrainz') */
  databaseId: z.string(),
  /** The identifier of the entity type (e.g., 'game', 'album') */
  entityId: z.string(),
});

export type EntityIdentity = z.infer<typeof EntityIdentitySchema>;

/**
 * Derives a globally unique composite ID from an EntityIdentity.
 * Format: `${databaseId}:${entityId}:${dbId}`
 * @param identity
 */
export function toCompositeId(identity: EntityIdentity): string {
  return `${identity.databaseId}:${identity.entityId}:${identity.dbId}`;
}
