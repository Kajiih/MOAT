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
  const query = searchParams.get('query') || '';

  try {
    const service = getMediaService(category);
    const options = service.parseSearchOptions(searchParams);
    
    // Quick exit if no search intent
    if (!query && Object.values(options.filters || {}).every(v => !v || (Array.isArray(v) && v.length === 0))) {
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
