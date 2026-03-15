/**
 * @file utils.ts
 * @description Utility functions for the provider layer, including error handling and filter applying.
 */

import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import { EntityLink } from '@/items/items';
import { isObject } from '@/lib/type-guards';
import {
  ArrayValueSchema,
  BooleanValueSchema,
  FilterDefinition,
  FilterValues,
  NumberValueSchema,
  RangeValueSchema,
  TextValueSchema,
} from '@/search/filter-schemas';

import { ProviderError, ProviderErrorCode } from './errors';

/**
 * Handles error thrown by providers, converting them predictably into structured logs and standard errors.
 * @param error The emitted error payload.
 * @param providerId The ID of the provider throwing the error.
 * @returns The structured standard formatting Error.
 */
export function handleProviderError(error: unknown, providerId: string): ProviderError {
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
      providerId,
    );
  }

  // 2. Handle Abort / Timeout errors natively
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ProviderError(
      ProviderErrorCode.TIMEOUT,
      'The request timed out or was aborted',
      error,
      providerId,
    );
  }

  // 3. Handle API Errors via status codes
  if (isObject(error) && typeof error.status === 'number') {
    switch (error.status) {
      case 401:
      case 403: {
        return new ProviderError(
          ProviderErrorCode.AUTH_ERROR,
          'Authentication failed or API key invalid',
          error,
          providerId,
        );
      }
      case 404: {
        return new ProviderError(
          ProviderErrorCode.NOT_FOUND,
          'The requested item was not found',
          error,
          providerId,
        );
      }
      case 429: {
        return new ProviderError(
          ProviderErrorCode.RATE_LIMIT,
          'Rate limit exceeded for this provider',
          error,
          providerId,
        );
      }
      default: {
        if (error.status >= 500) {
          return new ProviderError(
            ProviderErrorCode.SERVICE_UNAVAILABLE,
            'External service is currently unavailable',
            error,
            providerId,
          );
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

  return new ProviderError(ProviderErrorCode.INTERNAL_ERROR, message, error, providerId);
}



function applyTransform<TRaw>(
  def: FilterDefinition<TRaw>,
  rawValue: NonNullable<FilterValues[string]>,
): Record<string, string> | undefined {
  try {
    switch (def.type) {
      case 'text':
      case 'select':
      case 'async-select':
      case 'date': {
        const parsed = TextValueSchema.parse(rawValue);
        return def.transform(parsed);
      }
      case 'number': {
        const parsed = NumberValueSchema.parse(rawValue);
        return def.transform(parsed);
      }
      case 'boolean': {
        const parsed = BooleanValueSchema.parse(rawValue);
        return def.transform(parsed);
      }
      case 'multiselect':
      case 'async-multiselect': {
        const parsed = ArrayValueSchema.parse(rawValue);
        return def.transform(parsed);
      }
      case 'range': {
        const parsed = RangeValueSchema.parse(rawValue);
        return def.transform(parsed);
      }
      default: {
        return undefined;
      }
    }
  } catch {
    // If a filter value completely fails structural validation, safely ignore it.
    // E.g., a URL parameter that should be a number was passed as "abc".
    return undefined;
  }
}

/**
 * Orchestrates iterating through filter definitions to parse and transform standard payloads
 * into exact API query objects for external APIs.
 * @param filterValues The current UI payload mapping filter ID to specific string payload.
 * @param definitions The standard filter configurations to parse payloads with.
 * @returns Serialized map of precise URL values.
 */
export function applyFilters<TRaw>(
  filterValues: FilterValues | undefined,
  definitions: FilterDefinition<TRaw>[],
): Record<string, string> {
  let apiParams: Record<string, string> = {};
  const values = filterValues || {};

  for (const def of definitions) {
    const rawValue = values[def.id];

    // Skip if value is "empty" (null, undefined, or empty string)
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    // Parse it securely through Zod based on the filter type
    const transformedParams = applyTransform(def, rawValue);

    // If parsing failed (returned undefined), skip the filter entirely
    if (transformedParams === undefined) continue;

    apiParams = { ...apiParams, ...transformedParams };
  }

  return apiParams;
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
  filterFn?: (item: T) => boolean,
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
  mappingFn: (item: T) => EntityLink,
): EntityLink[] {
  if (!sourceList || !Array.isArray(sourceList)) return [];
  return sourceList.map((val) => mappingFn(val));
}
