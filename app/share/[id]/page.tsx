/**
 * @file page.tsx
 * @description Public share page for a specific tier list.
 * Fetches the board data from the cloud and renders it in read-only mode.
 */

import { kv } from '@vercel/kv';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SharedBoardView } from '@/components/share/SharedBoardView';
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
    console.error('Failed to fetch shared board:', error);
    return null;
  }
}

/**
 * Generates dynamic metadata for the shared board page.
 * @param props - The props containing route parameters.
 * @returns Metadata object for the page.
 */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const board = await getSharedBoard(id);

  if (!board) return { title: 'Board Not Found - MOAT' };

  return {
    title: `${board.title} - Shared Tier List - MOAT`,
    description: `Check out this music tier list: ${board.title}`,
    openGraph: {
      title: board.title,
      description: 'Created with MOAT - Music Tier List',
      type: 'website',
    },
  };
}

/**
 * Server component for the public shared board page.
 * Fetches the board data from cloud storage and renders it.
 * @param props - The props containing route parameters.
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
