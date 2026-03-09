/**
 * @file Details API Route
 * @description Next.js API route securely fetching specific item details via registered providers.
 */

import '@/providers/bootstrap'; // Ensure registry loads in node environment

import { NextResponse } from 'next/server';

import { createErrorResponse } from '@/app/api/utils';
import { logger } from '@/lib/logger';
import { registry } from '@/providers/registry';

/**
 * HTTP GET handler for details provider resolution.
 * @param request - The incoming HTTP request.
 * @returns A JSON response with the entity details.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('providerId');
  const entityId = searchParams.get('entityId');
  const dbId = searchParams.get('dbId');
  
  if (!providerId || !entityId || !dbId) {
    return NextResponse.json({ error: 'Missing providerId, entityId, or dbId' }, { status: 400 });
  }

  try {
    const entity = registry.getEntity(providerId, entityId);
    if (!entity) {
      return NextResponse.json({ error: `Entity ${providerId}:${entityId} not found` }, { status: 404 });
    }

    await registry.waitUntilReady();

    const result = await entity.getDetails(dbId, { signal: request.signal });
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, providerId, entityId, dbId }, 'Details API Error');
    return createErrorResponse(error);
  }
}
