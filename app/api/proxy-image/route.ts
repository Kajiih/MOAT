/**
 * @file route.ts
 * @description Permissive image proxy for screenshot export reliability.
 * This route allows the client to fetch external images with proper CORS headers,
 * bypassing Next.js Image Optimization's strict domain validation and 400 errors.
 * It is primarily used by the screenshot engine to resolve images into Data URLs.
 * @module ProxyImageAPI
 */

import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * List of external hostnames that this proxy is allowed to fetch from.
 * These match the primary metadata and image providers for the application.
 */
const ALLOWED_HOSTS = new Set([
  'assets.fanart.tv',
  'coverartarchive.org',
  'placehold.co',
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'i.scdn.co', // Spotify
]);

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
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // Security check: Only proxy from trusted domains
  if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TierListApp/1.0',
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
