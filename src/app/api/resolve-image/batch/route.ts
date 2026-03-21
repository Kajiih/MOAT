/**
 * @file route.ts
 * @description Batch image resolver endpoint. Resolves multiple ReferenceImageSource entries in a single request.
 * @module BatchResolveImageAPI
 */

import '@/infra/providers/bootstrap';

import { NextRequest, NextResponse } from 'next/server';

import { createErrorResponse } from '@/app/api/utils';
import { logger } from '@/infra/logger';
import { registry } from '@/infra/providers/registry';

interface BatchResolveRequestItem {
  providerId: string;
  entityId: string;
  key: string;
}

/**
 * Handles POST requests to resolve multiple reference image sources in batch.
 * @param request - The NextRequest object containing the batched item payload.
 * @returns A NextResponse containing the dictionary of resolved URLs.
 */
export async function POST(request: NextRequest) {
  try {
    const items = (await request.json()) as BatchResolveRequestItem[];

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Body must be an array of items' }, { status: 400 });
    }

    await registry.waitUntilReady();

    const results: Record<string, string | null> = {};

    await Promise.all(
      items.map(async (item) => {
        const cacheKey = `${item.providerId}:${item.entityId}:${item.key}`;
        try {
          const url = await registry.resolveImageReference(
            item.providerId,
            item.entityId,
            item.key,
            { signal: AbortSignal.timeout(3500) },
          );
          results[cacheKey] = url || null;
        } catch (error) {
          logger.warn({ error, item }, 'Batch resolve individual item failure');
          results[cacheKey] = null;
        }
      }),
    );

    return NextResponse.json(
      { results },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      },
    );
  } catch (error) {
    logger.error({ error }, 'Batch Resolve Image API Error');
    return createErrorResponse(error);
  }
}
