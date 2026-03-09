import '@/providers/index'; // Ensure providers are registered in the Node environment

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { registry } from '@/providers/registry';
import { SortDirection } from '@/search/schemas';

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
      return NextResponse.json({ error: `Entity ${providerId}:${entityId} not found` }, { status: 404 });
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
      signal: request.signal
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ error, providerId, entityId }, 'V2 Search API Error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
