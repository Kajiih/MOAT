/**
 * @file route.ts
 * @description API route to publish a board to cloud storage.
 */

import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { TierListSchema } from '@/lib/types';

/**
 * Publishes a board to the cloud storage.
 * Returns a unique short ID for sharing.
 * @param request - The incoming request containing the board state.
 * @returns A response containing the share ID and URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate the board state
    const validation = TierListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid board data', details: validation.error.format() },
        { status: 400 },
      );
    }

    // 2. Generate a short ID
    // 8 characters is enough for ~200 trillion combinations
    const shareId = nanoid(8);
    const key = `moat-shared-${shareId}`;

    // 3. Store in KV
    // We store the validated data
    await kv.set(key, validation.data);

    return NextResponse.json({ id: shareId, url: `/share/${shareId}` });
  } catch (error) {
    logger.error({ error }, 'Failed to publish board');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
