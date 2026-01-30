/**
 * @file route.ts (api/search)
 * @description API endpoint for searching media items using the media type registry.
 * Parses query parameters and proxies them to the appropriate service.
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { FilterConfig, mediaTypeRegistry } from '@/lib/media-types';
import { getMediaService } from '@/lib/services/factory';
import { BoardCategory, MediaType } from '@/lib/types';

/**
 * Helper to parse range filters (years, duration).
 * @param filterDef - The filter configuration.
 * @param searchParams - The URL search parameters.
 * @param filters - The accumulator object for parsed filters.
 */
function parseRangeFilter(
  filterDef: FilterConfig,
  searchParams: URLSearchParams,
  filters: Record<string, unknown>,
) {
  if (filterDef.id === 'yearRange') {
    filters.minYear = searchParams.get('minYear') || undefined;
    filters.maxYear = searchParams.get('maxYear') || undefined;
  } else if (filterDef.id === 'durationRange') {
    const minDuration = searchParams.get('minDuration');
    const maxDuration = searchParams.get('maxDuration');
    filters.minDuration = minDuration ? Number.parseInt(minDuration, 10) : undefined;
    filters.maxDuration = maxDuration ? Number.parseInt(maxDuration, 10) : undefined;
  }
}

/**
 * Helper to parse a single filter definition.
 * @param filterDef - The filter configuration.
 * @param searchParams - The URL search parameters.
 * @param filters - The accumulator object for parsed filters.
 */
function parseFilter(
  filterDef: FilterConfig,
  searchParams: URLSearchParams,
  filters: Record<string, unknown>,
) {
  const paramName = filterDef.paramName || filterDef.id;

  if (filterDef.type === 'toggle-group') {
    // Multi-select filters
    const values = searchParams.getAll(paramName);
    if (values.length > 0) {
      filters[filterDef.id] = values;
    }
    return;
  }

  if (filterDef.type === 'range') {
    parseRangeFilter(filterDef, searchParams, filters);
    return;
  }

  // Text, select, picker filters
  const value = searchParams.get(paramName);
  if (value) {
    filters[filterDef.id] = value;
  }
}

/**
 * Parse search parameters into SearchOptions format.
 * @param searchParams - URL search parameters containing filter values
 * @param type - Media type to parse filters for
 * @returns Parsed search options including page, fuzzy, wildcard, and filters
 */
function parseSearchParams(searchParams: URLSearchParams, type: MediaType) {
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const fuzzy = searchParams.get('fuzzy') !== 'false';
  const wildcard = searchParams.get('wildcard') !== 'false';

  // Get all filters from the type definition
  const typeDefinition = mediaTypeRegistry.get(type);
  const filters: Record<string, unknown> = {};

  // Parse each filter based on its definition
  for (const filterDef of typeDefinition.filters) {
    parseFilter(filterDef, searchParams, filters);
  }

  // Always include sort
  filters.sort = searchParams.get('sort') || 'relevance';

  return { page, fuzzy, wildcard, filters };
}

/**
 * Handles GET requests to search for media items.
 * @param request - The incoming HTTP request containing search parameters.
 * @returns A JSON response with search results or an error message.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') as BoardCategory) || 'music';
  const type = (searchParams.get('type') as MediaType) || 'album';
  const query = searchParams.get('query') || '';

  try {
    const service = getMediaService(category);
    const options = parseSearchParams(searchParams, type);

    // Quick exit if no search intent
    const hasFilters = Object.entries(options.filters || {}).some(([key, v]) => {
      if (key === 'sort' || key === 'query') return false;
      return v && (!Array.isArray(v) || v.length > 0);
    });

    if (!query && !hasFilters) {
      return NextResponse.json({ results: [], page: options.page || 1, totalPages: 0 });
    }

    const result = await service.search(query, type, options);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ error }, 'Error in search API');
    const message = error instanceof Error ? error.message : '';
    let status = 500;
    let userMessage = `Search failed: ${message}`;

    if (message.includes('503')) {
      status = 503;
      userMessage = 'MusicBrainz rate limit reached. Please try again in a few seconds.';
    } else if (message.includes('504')) {
      status = 504;
      userMessage = 'MusicBrainz is currently timed out (504). The service might be overloaded.';
    }

    return NextResponse.json({ error: userMessage, details: message }, { status });
  }
}
