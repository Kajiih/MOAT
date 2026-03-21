/**
 * @file Search API Route
 * @description Next.js API route orchestrating cross-provider generic search proxying.
 */

import '@/providers/bootstrap'; // Ensure registry loads in node environment

import { NextResponse } from 'next/server';

import { createErrorResponse } from '@/app/api/utils';
import { logger } from '@/lib/logger';
import { registry } from '@/providers/registry';
import { SortDirection } from '@/presentation/search/sort-schemas';

/**
 * HTTP GET handler for global generic search proxying.
 * @param request - The incoming HTTP request.
 * @returns A JSON response containing the search results.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('providerId');
  const entityId = searchParams.get('entityId');

  if (!providerId || !entityId) {
    return NextResponse.json({ error: 'Missing providerId or entityId' }, { status: 400 });
  }

  const query = searchParams.get('query') || '';
  const page = Number(searchParams.get('page')) || 1;
  const cursor = searchParams.get('cursor') || undefined;
  const sort = searchParams.get('sort') || undefined;
  const sortDirection = (searchParams.get('sortDirection') as SortDirection) || undefined;

  const filtersData = searchParams.get('filters');
  const filters = filtersData ? JSON.parse(filtersData) : {};

  try {
    const entity = registry.getEntity(providerId, entityId);
    if (!entity) {
      return NextResponse.json(
        { error: `Entity ${providerId}:${entityId} not found` },
        { status: 404 },
      );
    }

    await registry.waitUntilReady();

    const result = await entity.search({
      query,
      page,
      limit: 20,
      cursor,
      sort,
      sortDirection,
      filters,
      signal: request.signal,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
    }
    logger.error({ error, providerId, entityId }, 'Search API Error');
    return createErrorResponse(error);
  }
}
