/**
 * Standardized error codes for the database layer.
 */
export enum DatabaseErrorCode {
  /** The item was not found in the database */
  NOT_FOUND = 'NOT_FOUND',
  /** API key is missing or invalid */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Too many requests to the external service */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Data from the API did not match our Zod schemas */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** External service is currently down or unreachable */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** The request timed out or was aborted */
  TIMEOUT = 'TIMEOUT',
  /** A generic network or internal error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Standardized error class for the database layer.
 */
export class DatabaseError extends Error {
  constructor(
    public readonly code: DatabaseErrorCode,
    public readonly message: string,
    public readonly originalError?: unknown,
    public readonly databaseId?: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
