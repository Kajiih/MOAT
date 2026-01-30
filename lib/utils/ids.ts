/**
 * @file ids.ts
 * @description Utilities for handling application-specific ID generation and normalization.
 * Standardizes prefixes for search results and DOM elements.
 * @module IDUtils
 */

const SEARCH_PREFIX = 'search-';

/**
 * Attaches a 'search-' prefix to an item ID to distinguish it from a board item.
 * @param id - The raw item ID (e.g., MusicBrainz ID).
 * @returns The prefixed ID.
 */
export function toSearchId(id: string): string {
  if (id.startsWith(SEARCH_PREFIX)) return id;
  return `${SEARCH_PREFIX}${id}`;
}

/**
 * Removes the 'search-' prefix from an ID to retrieve the canonical item ID.
 * @param id - The potentially prefixed ID.
 * @returns The normalized canonical ID.
 */
export function fromSearchId(id: string): string {
  return id.replace(new RegExp(`^${SEARCH_PREFIX}`), '');
}

/**
 * Checks if a given ID is a search result ID.
 * @param id - The ID to check.
 * @returns True if it has the search prefix.
 */
export function isSearchId(id: string): boolean {
  return id.startsWith(SEARCH_PREFIX);
}

/**
 * Generates a consistent DOM ID for a media card.
 * @param id - The draggable/sortable ID of the item.
 * @returns The DOM element ID.
 */
export function toDomId(id: string): string {
  return `media-card-${id}`;
}
