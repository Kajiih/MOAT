import { SortDefinition } from './types';

/**
 * Helper to create a SortDefinition with correct types and defaults.
 */
export function createSort(config: SortDefinition): SortDefinition {
  return config;
}

/**
 * Determines if a sort option supports direction toggling in the UI.
 * A sort is reversible if:
 * 1. It is directional (has a defaultDirection)
 * 2. That direction is not explicitly marked as fixed
 */
export function isSortReversible(sort: SortDefinition): boolean {
  return !!sort.defaultDirection && !sort.isDirectionFixed;
}
