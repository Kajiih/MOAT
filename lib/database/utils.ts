import { z } from 'zod';
import { DatabaseError, DatabaseErrorCode, FilterDefinition } from './types';

/**
 * Wraps any error into a standardized DatabaseError.
 * 
 * @param error - The original error object.
 * @param databaseId - The identifier of the database where the error occurred.
 * @returns A standardized DatabaseError.
 */
export function handleDatabaseError(error: unknown, databaseId: string): DatabaseError {
  // If it's already a DatabaseError, just return it
  if (error instanceof DatabaseError) return error;

  // Handle Zod Validation Errors
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    const path = firstIssue?.path.join('.') || 'root';
    return new DatabaseError(
      DatabaseErrorCode.VALIDATION_ERROR,
      `Validation failed at ${path}: ${firstIssue?.message}`,
      error,
      databaseId
    );
  }

  // Handle API Errors (assuming they have a status)
  const err = error as { status?: number; message?: string };
  if (err.status === 401 || err.status === 403) {
    return new DatabaseError(DatabaseErrorCode.AUTH_ERROR, 'Authentication failed or API key invalid', error, databaseId);
  }
  if (err.status === 404) {
    return new DatabaseError(DatabaseErrorCode.NOT_FOUND, 'The requested item was not found', error, databaseId);
  }
  if (err.status === 429) {
    return new DatabaseError(DatabaseErrorCode.RATE_LIMIT, 'Rate limit exceeded for this database', error, databaseId);
  }
  if (err.status && err.status >= 500) {
    return new DatabaseError(DatabaseErrorCode.SERVICE_UNAVAILABLE, 'External service is currently unavailable', error, databaseId);
  }

  // Generic fallback
  return new DatabaseError(
    DatabaseErrorCode.INTERNAL_ERROR,
    err.message || 'An unexpected error occurred in the database layer',
    error,
    databaseId
  );
}

/**
 * Automates the mapping of UI filter values to API parameters based on FilterDefinitions.
 * 
 * @param apiParams - The object to populate with API parameters.
 * @param filterValues - The current filter values from SearchParams.
 * @param definitions - The list of FilterDefinitions for the entity.
 */
export function applyFilters(
  apiParams: Record<string, string>,
  filterValues: Record<string, unknown>,
  definitions: FilterDefinition<any, any>[]
): void {
  for (const def of definitions) {
    // Skip if there's no mapping defined
    if (!def.mapTo && !def.transform) continue;

    const value = filterValues[def.id];
    
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
