/**
 * @file route.tsx
 * @description Dynamic Open Graph image generator for the Moat Tier List.
 * Uses Satori (@vercel/og) to render the LegacyOGBoard component to a PNG.
 * @module OGAPI
 */

import { kv } from '@vercel/kv';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

import { OGBoard } from '@/board/OGBoard';
import { TierListState } from '@/board/types';
import { Item } from '@/items/items';
import { logger } from '@/lib/logger';
import { scrubBoardImages } from '@/lib/server/image-logic';

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
    const createMockItem = (id: string, color: string): Item => ({
      id,
      identity: { providerItemId: id, providerId: 'mock', entityId: id },
      title: `Mock ${id}`,
      images: [
        {
          type: 'url',
          url: `https://api.dicebear.com/7.x/shapes/png?seed=${id}&backgroundColor=${color}`,
        },
      ],
    });

    const items: Record<string, Item[]> = board
      ? Object.fromEntries(
          Object.entries(board.tierLayout).map(([tierId, itemIds]) => [
            tierId,
            itemIds.map((id) => board.itemEntities[id]).filter(Boolean) as Item[],
          ]),
        )
      : {
          '1': [createMockItem('1', 'ef4444')],
          '2': [createMockItem('2', 'f97316'), createMockItem('3', 'f97316')],
          '3': [
            createMockItem('4', 'eab308'),
            createMockItem('5', 'eab308'),
            createMockItem('6', 'eab308'),
            createMockItem('7', 'eab308'),
          ],
          '4': [
            createMockItem('8', '22c55e'),
            createMockItem('9', '22c55e'),
            createMockItem('10', '22c55e'),
          ],
          '5': [createMockItem('11', '3b82f6')],
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
