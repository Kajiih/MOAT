/**
 * @file Sort Schemas
 * @description Defines the structured data for sort definitions across the application.
 */

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

/**
 * A generic sort definition tailored for a specific provider payload Type `TRaw`.
 */
export interface SortDefinition<TRaw = unknown> extends z.infer<typeof SortDefinitionSchema> {
  /**
   * Extract the raw value for comparison in integration tests.
   * If not provided, the sort will not be tested.
   */
  extractValue?: (raw: TRaw) => string | number;
}

/**
 * Creates a suite of sort building functions that are statically bound
 * to the generic type `TRaw` of the expected Provider responses.
 *
 * This enables robust IDE autocompletion when defining `extractValue`.
 * @returns An object factory containing a strictly-typed `create` function.
 */
export function createSortSuite<TRaw>() {
  return {
    /**
     * Creates a fully-typed sort definition.
     * @param config The raw sort definition payload.
     * @returns The exact same configuration payload, but securely typed against TRaw.
     */
    create: (config: SortDefinition<TRaw>): SortDefinition<TRaw> => config,
  };
}

/**
 * Determines if a sort option supports direction toggling in the UI.
 * A sort is reversible if:
 * 1. It is directional (has a defaultDirection)
 * 2. That direction is not explicitly marked as fixed
 * @param sort The definition block to inspect.
 * @returns A boolean asserting logic direction reversibility.
 */
export function isSortReversible(sort: SortDefinition): boolean {
  return !!sort.defaultDirection && !sort.isDirectionFixed;
}
