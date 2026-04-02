/**
 * @file route.ts
 * @description Permissive image proxy for screenshot export reliability.
 * This route allows the client to fetch external images with proper CORS headers,
 * bypassing Next.js Image Optimization's strict domain validation and 400 errors.
 * It is primarily used by the screenshot engine to resolve images into Data URLs.
 * @module ProxyImageAPI
 */

import '@/infra/providers/bootstrap';

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/infra/logger';
import { registry } from '@/infra/providers/registry';


/**
 * GET handler for the image proxy.
 * @param request - The incoming Next.js request.
 * @returns A NextResponse containing the image data or an error message.
 * @example
 * // Fetch an image via proxy
 * fetch('/api/proxy-image?url=https://assets.fanart.tv/...')
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let url = searchParams.get('url');
  const providerId = searchParams.get('providerId');
  const entityId = searchParams.get('entityId');
  const key = searchParams.get('key');

  // 1. Resolve Reference dynamically if queried
  if (providerId && entityId && key) {
    try {
      await registry.waitUntilReady();
      const resolved = await registry.resolveImageReference(providerId, entityId, key);
      if (resolved) {
        url = resolved;
      }
    } catch (error) {
      logger.error({ error, providerId, key }, 'Proxy: Failed to resolve reference');
    }
  }

  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // Security check: Only proxy from trusted domains of registered providers
  await registry.waitUntilReady();
  const allowedHosts = registry.getAllowedImageHosts();
  allowedHosts.add('placehold.co'); // Default fallback for tests and system placeholders

  if (!allowedHosts.has(targetUrl.hostname)) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    // Return the image data with permissive caching and content-type
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Proxy error');
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
