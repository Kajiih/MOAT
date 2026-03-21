/**
 * @file route.ts
 * @description Next.js API route for securely resolving provider image references on the server.
 * This prevents client-side CORS issues and allows backend utilization of private API keys and User-Agents
 * essential for services like Wikidata and Fanart.tv APIs that block browsers.
 */

import '@/infra/providers/bootstrap';

import { NextRequest, NextResponse } from 'next/server';

import { createErrorResponse } from '@/app/api/utils';
import { logger } from '@/infra/logger';
import { registry } from '@/infra/providers/registry';

/**
 * HTTP GET handler for proxied server-side image resolution.
 * @param request - The incoming Next.js request containing providerId and key.
 * @returns JSON response with the resolved URL.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const providerId = searchParams.get('providerId');
  const entityId = searchParams.get('entityId');
  const key = searchParams.get('key');

  if (!providerId || !entityId || !key) {
    return NextResponse.json({ error: 'Missing providerId, entityId, or key' }, { status: 400 });
  }

  try {
    await registry.waitUntilReady();
    const url = await registry.resolveImageReference(providerId, entityId, key);

    if (!url) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json(
      { url },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
    }
    logger.error({ error, providerId, key }, 'Resolve Image API Error');
    return createErrorResponse(error);
  }
}
