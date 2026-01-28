/**
 * @file route.ts (api/search)
 * @description API Endpoint for searching media items against MusicBrainz.
 * Handles parsing of all query parameters (filters, pagination, sorting options)
 * and proxies them to the internal `searchMusicBrainz` function.
 * Implements basic error handling for upstream 503s (Rate Limiting).
 * @module ApiSearch
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getMediaService } from '@/lib/services/factory';
import { BoardCategory, MediaType } from '@/lib/types';

/**
 * Handles GET requests to search for media items.
 * @param request - The incoming HTTP request containing search parameters.
 * @returns A JSON response with search results or an error message.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') as BoardCategory) || 'music';
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || '';
  const artistIdParam = searchParams.get('artistId');
  const albumIdParam = searchParams.get('albumId');
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');

  const albumPrimaryTypes = searchParams.getAll('albumPrimaryTypes');
  const albumSecondaryTypes = searchParams.getAll('albumSecondaryTypes');

  const artistType = searchParams.get('artistType');
  const artistCountry = searchParams.get('artistCountry');
  const tag = searchParams.get('tag');
  const minDuration = searchParams.get('minDuration');
  const maxDuration = searchParams.get('maxDuration');

  // Read Search Configuration (default to true if not specified)
  const fuzzy = searchParams.get('fuzzy') !== 'false';
  const wildcard = searchParams.get('wildcard') !== 'false';

  const page = Number.parseInt(searchParams.get('page') || '1', 10);

  // If no main filters, return empty
  if (
    !queryParam &&
    !artistIdParam &&
    !albumIdParam &&
    !minYear &&
    !maxYear &&
    albumPrimaryTypes.length === 0 &&
    albumSecondaryTypes.length === 0 &&
    !artistType &&
    !artistCountry &&
    !tag &&
    !minDuration &&
    !maxDuration
  ) {
    return NextResponse.json({ results: [], page, totalPages: 0 });
  }

  try {
    const service = getMediaService(category);
    const result = await service.search(queryParam, type, {
      page,
      fuzzy,
      wildcard,
      filters: {
        artistId: artistIdParam,
        albumId: albumIdParam,
        minYear,
        maxYear,
        albumPrimaryTypes,
        albumSecondaryTypes,
        artistType: artistType || undefined,
        artistCountry: artistCountry || undefined,
        tag: tag || undefined,
        minDuration: minDuration ? Number.parseInt(minDuration, 10) : undefined,
        maxDuration: maxDuration ? Number.parseInt(maxDuration, 10) : undefined,
      },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ error }, 'Error in search API');
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('503') ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? 'MusicBrainz rate limit reached' : `Search failed: ${message}` },
      { status },
    );
  }
}
