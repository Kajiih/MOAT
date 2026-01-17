/**
 * @file route.tsx
 * @description Dynamic Open Graph image generator for the Moat Tier List.
 * Uses Satori (@vercel/og) to render the OGBoard component to a PNG.
 * @module OGAPI
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { OGBoard } from '@/components/board/OGBoard';
import { TierDefinition, MediaItem } from '@/lib/types';

/**
 * We use the 'nodejs' runtime instead of 'edge' because it is more stable
 * when fetching external image assets from providers like fanart.tv.
 */
export const runtime = 'nodejs';

/**
 * GET handler for the OG image generator.
 * @param request - The incoming request with optional 'title' and 'id' params.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'My Awesome Tier List';

    // MOCK DATA FOR DEMONSTRATION
    // In the future, this will fetch from Moat Cloud using searchParams.get('id')
    const mockTiers: TierDefinition[] = [
      { id: '1', label: 'S', color: 'red' },
      { id: '2', label: 'A', color: 'orange' },
      { id: '3', label: 'B', color: 'yellow' },
    ];

    const headerColors = ['#3b82f6'];

    const fetchImage = async (url: string) => {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const b64 = Buffer.from(buffer).toString('base64');
        return `data:${res.headers.get('content-type') || 'image/jpeg'};base64,${b64}`;
      } catch (e) {
        console.error('OG: Failed to fetch OG image', e);
        return null;
      }
    };

    // Resolve one real image for demonstration
    // Using GitHub Avatar as a highly reliable fallback for testing
    const demoImageUrl = await fetchImage(
      'https://avatars.githubusercontent.com/u/10251060?s=200&v=4',
    );

    const mockItems: Record<string, MediaItem[]> = {
      '1': [
        { id: 'a', title: 'Abbey Road', type: 'album', imageUrl: demoImageUrl },
        {
          id: 'b',
          title: 'Dark Side of the Moon',
          type: 'album',
          imageUrl: 'https://placehold.co/200x200/png',
        },
      ],
      '2': [
        { id: 'c', title: 'Thriller', type: 'album', imageUrl: 'https://placehold.co/200x200/png' },
      ],
      '3': [],
    };

    return new ImageResponse(
      <OGBoard title={title} tiers={mockTiers} items={mockItems} headerColors={headerColors} />,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: unknown) {
    console.error('OG Generation Error:', e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
