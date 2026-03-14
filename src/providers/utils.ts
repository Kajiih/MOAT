/**
 * @file utils.ts
 * @description Utility functions for the provider layer, including error handling and filter applying.
 */

import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import { EntityLink } from '@/items/items';
import { isObject } from '@/lib/type-guards';
import { BaseFilterDefinition, FilterValues } from '@/search/filter-schemas';

import { ProviderError, ProviderErrorCode } from './errors';

/**
 * Wraps any error into a standardized ProviderError.
 * @param error - The original error object.
 * @param databaseId - The identifier of the provider where the error occurred.
 * @returns A standardized ProviderError.
 */
export function handleProviderError(error: unknown, databaseId: string): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  // 1. Handle Zod Validation Errors
  if (error instanceof z.ZodError) {
    const validationError = fromZodError(error);
    return new ProviderError(
      ProviderErrorCode.VALIDATION_ERROR,
      validationError.message,
      error,
      databaseId
    );
  }

  // 2. Handle Abort / Timeout errors natively
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ProviderError(ProviderErrorCode.TIMEOUT, 'The request timed out or was aborted', error, databaseId);
  }

  // 3. Handle API Errors via status codes
  if (isObject(error) && typeof error.status === 'number') {
    switch (error.status) {
      case 401:
      case 403: {
        return new ProviderError(ProviderErrorCode.AUTH_ERROR, 'Authentication failed or API key invalid', error, databaseId);
      }
      case 404: {
        return new ProviderError(ProviderErrorCode.NOT_FOUND, 'The requested item was not found', error, databaseId);
      }
      case 429: {
        return new ProviderError(ProviderErrorCode.RATE_LIMIT, 'Rate limit exceeded for this provider', error, databaseId);
      }
      default: {
        if (error.status >= 500) {
          return new ProviderError(ProviderErrorCode.SERVICE_UNAVAILABLE, 'External service is currently unavailable', error, databaseId);
        }
      }
    }
  }

  // 4. Generic fallback
  let message = 'An unexpected error occurred in the provider layer';

  if (error instanceof Error) {
    message = error.message;
  } else if (isObject(error) && typeof error.message === 'string') {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return new ProviderError(ProviderErrorCode.INTERNAL_ERROR, message, error, databaseId);
}

/**
 * Automates the mapping of UI filter values to API parameters based on FilterDefinitions.
 * @param apiParams - The object to populate with API parameters.
 * @param filterValues - The current filter values from SearchParams.
 * @param definitions - The list of FilterDefinitions for the entity.
 */
export function applyFilters<TRaw>(
  apiParams: Record<string, string>,
  filterValues: FilterValues | undefined,
  definitions: BaseFilterDefinition<unknown, TRaw>[]
): void {
  const values = filterValues || {};
  for (const def of definitions) {
    // Skip if there's no mapping defined
    if (!def.mapTo && !def.transform) continue;

    const value = values[def.id];
    
    // Skip if value is "empty" (null, undefined, or empty string)
    if (value === undefined || value === null || value === '') continue;

    if (def.transform) {
      const transformed = def.transform(value);
      
      // If transform returns an object, we merge it into apiParams (for complex mappings)
      if (typeof transformed === 'object' && transformed !== null) {
        Object.entries(transformed).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            apiParams[key] = String(val);
          }
        });
      } 
      // If transform returns a primitive and we have mapTo, we use it
      else if (def.mapTo && transformed !== undefined && transformed !== null) {
        apiParams[def.mapTo] = String(transformed);
      }
    } 
    // Simple direct mapping
    else if (def.mapTo) {
      apiParams[def.mapTo] = String(value);
    }
  }
}

/**
 * Standard utility to safely extract tags from raw entity responses.
 * @param sourceList - Array of objects containing tags/genres.
 * @param nameExtractor - Function to extract the tag string from the object.
 * @param filterFn - Optional function to filter the objects before extracting.
 * @returns Array of unique tag strings, up to 10.
 */
export function extractTags<T>(
  sourceList: T[] | null | undefined,
  nameExtractor: (item: T) => string,
  filterFn?: (item: T) => boolean
): string[] {
  if (!sourceList || !Array.isArray(sourceList)) return [];

  let filtered = sourceList;
  if (filterFn) {
    filtered = sourceList.filter((f) => filterFn(f));
  }

  // Use Set to ensure uniqueness, then limit to top 10
  const uniqueTags = new Set(filtered.map((d) => nameExtractor(d)).filter(Boolean));
  return [...uniqueTags].slice(0, 10);
}

/**
 * Standard utility to safely map related entities from raw responses.
 * @param sourceList - Array of related raw objects (e.g., developers, publishers).
 * @param mappingFn - Function to map the raw object to the EntityLink schema shape.
 * @returns Array of valid EntityLink objects.
 */
export function extractRelatedEntities<T>(
  sourceList: T[] | null | undefined,
  mappingFn: (item: T) => EntityLink
): EntityLink[] {
  if (!sourceList || !Array.isArray(sourceList)) return [];
  return sourceList.map((val) => mappingFn(val));
}
