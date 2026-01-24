/**
 * @file route.tsx
 * @description Dynamic Open Graph image generator for the Moat Tier List.
 * Uses Satori (@vercel/og) to render the OGBoard component to a PNG.
 * @module OGAPI
 */

import { kv } from '@vercel/kv';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

import { OGBoard } from '@/components/board/OGBoard';
import { TierListState } from '@/lib/types';

/**
 * We use the 'nodejs' runtime instead of 'edge' because it is more stable
 * when fetching external image assets from providers like fanart.tv.
 */
export const runtime = 'nodejs';

/**
 * GET handler for the OG image generator.
 * @param request - The incoming request with optional 'title' and 'id' params.
 * @returns An ImageResponse containing the generated Open Graph image or a standard Response on error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const titleParam = searchParams.get('title'); // Fallback title if needed

    let board: TierListState | null = null;

    if (id) {
      try {
        const key = `moat-shared-${id}`;
        board = await kv.get<TierListState>(key);
      } catch (kvError) {
        console.error('OG: Failed to fetch board from KV', kvError);
      }
    }

    // Default / Fallback data if board not found
    const title = board?.title || titleParam || 'My Awesome Tier List';
    const tiers = board?.tierDefs || [
      { id: '1', label: 'S', color: 'red' },
      { id: '2', label: 'A', color: 'orange' },
      { id: '3', label: 'B', color: 'yellow' },
    ];
    const items = board?.items || {};
    const headerColors = ['#3b82f6'];

    return new ImageResponse(
      <OGBoard title={title} tiers={tiers} items={items} headerColors={headerColors} />,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error('OG Generation Error:', error);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
