/**
 * @file utils.ts
 * @description Utility functions for the database layer, including error handling and filter applying.
 */

import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import { ProviderError, ProviderErrorCode } from './errors';
import { BaseFilterDefinition } from '@/search/schemas';

/**
 * Wraps any error into a standardized ProviderError.
 * @param error - The original error object.
 * @param databaseId - The identifier of the database where the error occurred.
 * @returns A standardized ProviderError.
 */
export function handleProviderError(error: unknown, databaseId: string): ProviderError {
  if (error instanceof ProviderError) return error;

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

  // 2. Handle Abort / Timeout errors
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ProviderError(ProviderErrorCode.TIMEOUT, 'The request timed out or was aborted', error, databaseId);
  }

  // 3. Handle API Errors via status codes
  const status = typeof error === 'object' && error !== null && 'status' in error 
    ? (error as { status: unknown }).status 
    : undefined;
  
  if (typeof status === 'number') {
    switch (status) {
      case 401:
      case 403: {
        return new ProviderError(ProviderErrorCode.AUTH_ERROR, 'Authentication failed or API key invalid', error, databaseId);
      }
      case 404: {
        return new ProviderError(ProviderErrorCode.NOT_FOUND, 'The requested item was not found', error, databaseId);
      }
      case 429: {
        return new ProviderError(ProviderErrorCode.RATE_LIMIT, 'Rate limit exceeded for this database', error, databaseId);
      }
      default: {
        if (status >= 500) {
          return new ProviderError(ProviderErrorCode.SERVICE_UNAVAILABLE, 'External service is currently unavailable', error, databaseId);
        }
      }
    }
  }

  // 4. Generic fallback
  const message = (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') 
    ? (error as { message: string }).message 
    : 'An unexpected error occurred in the database layer';
  return new ProviderError(ProviderErrorCode.INTERNAL_ERROR, message, error, databaseId);
}

/**
 * Automates the mapping of UI filter values to API parameters based on FilterDefinitions.
 * @param apiParams - The object to populate with API parameters.
 * @param filterValues - The current filter values from SearchParams.
 * @param definitions - The list of FilterDefinitions for the entity.
 */
export function applyFilters(
  apiParams: Record<string, string>,
  filterValues: Record<string, unknown> | undefined,
  definitions: BaseFilterDefinition<any, any>[]
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
            apiParams[key] = val.toString();
          }
        });
      } 
      // If transform returns a primitive and we have mapTo, we use it
      else if (def.mapTo && transformed !== undefined && transformed !== null) {
        apiParams[def.mapTo] = transformed.toString();
      }
    } 
    // Simple direct mapping
    else if (def.mapTo) {
      apiParams[def.mapTo] = value.toString();
    }
  }
}
