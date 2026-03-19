/**
 * @file Dashboard.tsx
 * @description The main entry point for the application.
 * Displays a grid of all created tier lists (boards) with their metadata.
 * Allows users to create new boards, delete existing ones, and navigate to them.
 * @module Dashboard
 */

'use client';

import { ImageOff, Layout, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { BrandLogo } from '@/app/_components/BrandLogo';
import { Footer } from '@/app/_components/Footer';
import { useBoardRegistry } from '@/board/hooks/useBoardRegistry';
import { useBrandColors } from '@/board/hooks/useBrandColors';
import { useDynamicFavicon } from '@/board/hooks/useDynamicFavicon';
import { BoardMetadata, PreviewItem, TierPreview } from '@/board/types';
import { DEFAULT_BRAND_COLORS, getColorTheme } from '@/lib/colors';
import { useResolvedImage } from '@/items/useResolvedImage';
import { logger } from '@/lib/logger';

// --- Sub-components for Dashboard ---

const CreateBoardCard = ({ onCreate }: { onCreate: (title: string) => void }) => {
  return (
    <button
      onClick={() => onCreate('')}
      className="group border-border bg-background hover:bg-surface flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all hover:border-blue-500/50"
      title="New Tier List"
    >
      <div className="bg-surface-hover text-secondary rounded-full p-3 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        <Plus size={32} />
      </div>
      <span className="text-muted group-hover:text-foreground mt-2 text-sm font-medium">
        Create Board
      </span>
    </button>
  );
};

const DashboardItem = ({ item }: { item: PreviewItem }) => {
  const sources = React.useMemo(
    () => (item.imageUrl ? [{ type: 'url' as const, url: item.imageUrl }] : []),
    [item.imageUrl],
  );

  const resolvedUrl = useResolvedImage(sources);
  const [error, setError] = React.useState(false);

  const showImage = resolvedUrl && !error;

  return (
    <div className="border-border bg-surface relative aspect-square h-full border-r">
      {showImage ? (
        <Image
          src={resolvedUrl}
          alt=""
          fill
          className="object-cover"
          unoptimized
          onError={() => {
            setError(true);
          }}
        />
      ) : (
        <div className="text-muted absolute inset-0 flex flex-col items-center justify-center p-0.5">
          <ImageOff size={10} className="mb-0.5 opacity-50" />
          <span className="text-indicator w-full truncate text-center leading-none font-bold uppercase opacity-20">
            {item.type}
          </span>
        </div>
      )}
    </div>
  );
};

const MiniatureTierList = ({ tiers }: { tiers: TierPreview[] }) => {
  return (
    <div className="bg-surface flex h-full w-full flex-col">
      {tiers.map((tier) => {
        const theme = getColorTheme(tier.color);
        return (
          <div key={tier.id} className="border-border flex min-h-0 flex-1 border-b last:border-0">
            {/* Tier Label */}
            <div
              className={`flex w-8 items-center justify-center ${theme.bg} text-indicator p-0.5 font-bold text-black uppercase`}
            >
              <span className="truncate">{tier.label}</span>
            </div>
            {/* Tier Items */}
            <div className="bg-surface-hover flex flex-1 items-center">
              {(tier.items || []).slice(0, 12).map((item, i) => (
                <DashboardItem key={`${item.title}-${i}`} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const BoardThumbnail = ({ board }: { board: BoardMetadata }) => {
  // 1. Miniature Tier List
  if (board.previewData && board.previewData.length > 0) {
    return <MiniatureTierList tiers={board.previewData} />;
  }

  // 2. Placeholder
  return (
    <div className="bg-surface-hover relative flex h-full w-full items-center justify-center">
      <div className="to-background/80 absolute inset-0 bg-gradient-to-br from-blue-900/20" />
      <Layout className="text-muted h-16 w-16" strokeWidth={1} />
    </div>
  );
};

/**
 * Renders the application dashboard, allowing users to manage their tier list boards.
 * @returns The rendered dashboard component.
 */
export function Dashboard() {
  const { boards, isLoading, createBoard, deleteBoard } = useBoardRegistry();
  const router = useRouter();
  const brandColors = useBrandColors([...DEFAULT_BRAND_COLORS]);

  // Ensure dashboard has the default favicon
  useDynamicFavicon([...DEFAULT_BRAND_COLORS]);

  const handleCreate = async (title: string) => {
    try {
      const id = await createBoard(title || 'Untitled Board');
      router.push(`/board/${id}`);
    } catch (error) {
      logger.error({ error }, 'Failed to create board');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      await deleteBoard(id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface text-secondary flex min-h-screen items-center justify-center">
        Loading registry...
      </div>
    );
  }

  return (
    <div className="bg-surface text-foreground flex min-h-screen flex-col font-sans">
      <main className="flex-1 p-8 pb-0">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BrandLogo colors={brandColors} variant="header" />
              <span className="text-secondary hidden text-2xl font-bold sm:inline">
                / Dashboard
              </span>
            </div>
          </div>

          {/* Board Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Create Card */}
            <CreateBoardCard onCreate={handleCreate} />
            {boards.map((board) => (
              <Link
                key={board.id}
                data-testid="board-card"
                href={`/board/${board.id}`}
                className="group border-border bg-surface relative flex flex-col overflow-hidden rounded-lg border transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-blue-500/50"
              >
                {/* Thumbnail / Icon Placeholder */}
                <div className="bg-surface-hover relative h-28 w-full overflow-hidden">
                  <BoardThumbnail board={board} />

                  {/* Item Count Badge */}
                  <div className="text-secondary absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs backdrop-blur-sm">
                    {board.itemCount} items
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="text-foreground line-clamp-1 text-lg font-bold transition-colors group-hover:text-blue-400">
                      {board.title}
                    </h3>
                    <p className="text-secondary mt-1 text-xs">
                      Modified {new Date(board.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Delete Action (Hidden by default) */}
                <button
                  onClick={(e) => handleDelete(e, board.id)}
                  className="bg-background/80 text-secondary absolute top-2 right-2 rounded-md p-2 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-900/80 hover:text-red-200"
                  title="Delete Board"
                >
                  <Trash2 size={16} />
                </button>
              </Link>
            ))}
          </div>

          {boards.length === 0 && (
            <div className="text-muted mt-12 text-center">
              <p>No boards found. Create one to get started!</p>
            </div>
          )}
        </div>
      </main>

      {/* Page Footer */}
      <Footer colors={brandColors} className="pt-4 pb-8 opacity-60" />
    </div>
  );
}
