/**
 * @file route.ts
 * @description API route to retrieve a shared board by ID.
 */

import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { TierListState } from '@/lib/types';

/**
 * Retrieves a shared board from cloud storage.
 * @param _request - The incoming request object (unused).
 * @param context - The context object.
 * @param context.params - Promise resolving to the route parameters containing the board ID.
 * @returns A response containing the board data or an error message.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = `moat-shared-${id}`;

    const data = await kv.get<TierListState>(key);

    if (!data) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch shared board');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
