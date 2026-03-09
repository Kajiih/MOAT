/**
 * @file Provider Errors
 * @description Centralized error types and enums mirroring standard HTTP mappings.
 */

/**
 * Standardized error codes for the provider layer.
 */
export enum ProviderErrorCode {
  /** The item was not found in the provider */
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
 * Standardized error class for the provider layer.
 */
export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    public readonly message: string,
    public readonly originalError?: unknown,
    public readonly databaseId?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
