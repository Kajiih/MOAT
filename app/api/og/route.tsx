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
import { logger } from '@/lib/logger';
import { scrubBoardImages } from '@/lib/server/image-logic';
import { MediaItem, TierListState } from '@/lib/types';

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
        
        if (board) {
          // SCRUB BROKEN IMAGES: Satori crashes if an <img> src returns a 404 or non-image content.
          // We pre-validate the images that will be shown in the OG board.
          board = await scrubBoardImages(board);
        }
      } catch (kvError) {
        logger.error({ error: kvError }, 'OG: Failed to fetch board from KV');
      }
    }

    // Default / Fallback data if board not found
    const title = board?.title || titleParam || 'MOAT - Rank Your Music';
    const tiers = board?.tierDefs || [
      { id: '1', label: 'S', color: 'red' },
      { id: '2', label: 'A', color: 'orange' },
      { id: '3', label: 'B', color: 'yellow' },
      { id: '4', label: 'C', color: 'green' },
      { id: '5', label: 'D', color: 'blue' },
    ];

    // provide some mock items for the default view to make it look like a real tier list
    const items: Record<string, MediaItem[]> = board?.items || {
      '1': [
        { id: 'm1', mbid: 'm1', type: 'album', title: 'Mock 1', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=1&backgroundColor=ef4444' } as MediaItem,
      ],
      '2': [
        { id: 'm2', mbid: 'm2', type: 'album', title: 'Mock 2', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=2&backgroundColor=f97316' } as MediaItem,
        { id: 'm3', mbid: 'm3', type: 'album', title: 'Mock 3', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=3&backgroundColor=f97316' } as MediaItem,
      ],
      '3': [
        { id: 'm4', mbid: 'm4', type: 'album', title: 'Mock 4', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=4&backgroundColor=eab308' } as MediaItem,
        { id: 'm5', mbid: 'm5', type: 'album', title: 'Mock 5', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=5&backgroundColor=eab308' } as MediaItem,
        { id: 'm6', mbid: 'm6', type: 'album', title: 'Mock 6', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=6&backgroundColor=eab308' } as MediaItem,
        { id: 'm7', mbid: 'm7', type: 'album', title: 'Mock 7', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=7&backgroundColor=eab308' } as MediaItem,
      ],
      '4': [
        { id: 'm8', mbid: 'm8', type: 'album', title: 'Mock 8', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=8&backgroundColor=22c55e' } as MediaItem,
        { id: 'm9', mbid: 'm9', type: 'album', title: 'Mock 9', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=9&backgroundColor=22c55e' } as MediaItem,
        { id: 'm10', mbid: 'm10', type: 'album', title: 'Mock 10', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=10&backgroundColor=22c55e' } as MediaItem,
      ],
      '5': [
        { id: 'm11', mbid: 'm11', type: 'album', title: 'Mock 11', imageUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=11&backgroundColor=3b82f6' } as MediaItem,
      ],
    };
    const headerColors = ['#3b82f6'];

    return new ImageResponse(
      <OGBoard title={title} tiers={tiers} items={items} headerColors={headerColors} />,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    logger.error({ error }, 'OG Generation Error');
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
