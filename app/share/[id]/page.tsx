/**
 * @file page.tsx
 * @description Public share page for a specific tier list.
 * Fetches the board data from the cloud and renders it in read-only mode.
 */

import { kv } from '@vercel/kv';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SharedBoardView } from '@/components/share/SharedBoardView';
import { logger } from '@/lib/logger';
import { TierListState } from '@/lib/types';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

async function getSharedBoard(id: string): Promise<TierListState | null> {
  try {
    const key = `moat-shared-${id}`;
    const data = await kv.get<TierListState>(key);
    return data;
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch shared board');
    return null;
  }
}

/**
 * Generates dynamic metadata for the shared board page.
 * @param props - The component props.
 * @param props.params - Promise resolving to the route parameters.
 * @returns Metadata object for the page.
 */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const board = await getSharedBoard(id);

  if (!board) return { title: 'Board Not Found - MOAT' };

  return {
    title: board.title,
    description: `Check out this tier list: ${board.title}`,
    openGraph: {
      title: board.title,
      description: 'Created with MOAT - Music Tier List',
      type: 'website',
      images: [
        {
          url: `/api/og?id=${id}`,
          width: 1200,
          height: 630,
          alt: `${board.title} Tier List`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: board.title,
      description: `Check out this tier list: ${board.title}`,
      images: [`/api/og?id=${id}`],
    },
  };
}

/**
 * Server component for the public shared board page.
 * Fetches the board data from cloud storage and renders it.
 * @param props - The component props.
 * @param props.params - Promise resolving to the route parameters.
 * @returns The rendered page or a 404 if not found.
 */
export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const board = await getSharedBoard(id);

  if (!board) {
    notFound();
  }

  return <SharedBoardView board={board} />;
}
