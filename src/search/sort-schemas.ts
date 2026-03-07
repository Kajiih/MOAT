import { z } from 'zod';

/**
 * Supported sort directions.
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Definition for a sort option supported by the entity.
 */
export const SortDefinitionSchema = z.object({
  /** Unique ID for the sort option */
  id: z.string(),
  /** Human readable label for the UI (e.g. "Release Date") */
  label: z.string(),
  /** Default direction if this sort is selected. If omitted, the sort is considered non-directional (e.g. Relevance). */
  defaultDirection: z.enum(SortDirection).optional(),
  /** If true, the sort direction cannot be reversed (default: false). Only applies if defaultDirection is present. */
  isDirectionFixed: z.boolean().optional(),
});

export interface SortDefinition<TRaw = any> extends z.infer<typeof SortDefinitionSchema> {
  /** 
   * Extract the raw value for comparison in integration tests.
   * If not provided, the sort will not be tested.
   */
  extractValue?: (raw: TRaw) => string | number;
}

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
