/**
 * @file route.ts (api/details)
 * @description API Endpoint for fetching detailed metadata for a specific media item.
 * Proxies requests to the internal server-side `getMediaDetails` function.
 * @module ApiDetails
 */

import { NextResponse } from 'next/server';
import { MediaType } from '@/lib/types';
import { getMediaDetails } from '@/lib/server/musicbrainz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') as MediaType;

  if (!id || !type) {
    return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
  }

  try {
    const details = await getMediaDetails(id, type);
    return NextResponse.json(details);
  } catch (error) {
    console.error('Error in details API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
