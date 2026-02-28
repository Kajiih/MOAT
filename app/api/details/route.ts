/**
 * @file route.ts (api/details)
 * @description API Endpoint for fetching detailed metadata for a specific media item.
 * Proxies requests to the appropriate MediaService based on the board category.
 * @module ApiDetails
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getMediaService } from '@/lib/services/factory';
import { BoardCategory, MediaType } from '@/lib/types';

/**
 * Handles GET requests to fetch detailed metadata for a media item.
 * @param request - The incoming HTTP request.
 * @returns A JSON response with media details or an error message.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') as MediaType;
  const category = (searchParams.get('category') as BoardCategory) || 'music';
  const serviceId = searchParams.get('service');

  if (!id || !type) {
    return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
  }

  try {
    const service = getMediaService(category, serviceId || undefined);
    const details = await service.getDetails(id, type);
    return NextResponse.json(details);
  } catch (error) {
    logger.error({ error }, 'Error in details API');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
