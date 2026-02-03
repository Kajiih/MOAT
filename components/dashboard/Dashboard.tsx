/**
 * @file Dashboard.tsx
 * @description The main entry point for the application.
 * Displays a grid of all created tier lists (boards) with their metadata.
 * Allows users to create new boards, delete existing ones, and navigate to them.
 * @module Dashboard
 */

'use client';

import { Book, Clapperboard, Disc, Layout, Mic2, Music, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { BrandLogo } from '@/components/ui/BrandLogo';
import { Footer } from '@/components/ui/Footer';
import { DEFAULT_BRAND_COLORS, getColorTheme } from '@/lib/colors';
import { useDynamicFavicon } from '@/lib/hooks';
import { useBoardRegistry } from '@/lib/hooks/useBoardRegistry';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';
import { failedImages } from '@/lib/image-cache';
import { logger } from '@/lib/logger';
import { BoardCategory, BoardMetadata, PreviewItem, TierPreview } from '@/lib/types';

// --- Sub-components for Dashboard ---

const CreateBoardCard = ({
  onCreate,
}: {
  onCreate: (title: string, category: BoardCategory) => void;
}) => {
  const [isCreating, setIsCreating] = React.useState(false);

  // Close the creation form when Escape is pressed
  useEscapeKey(() => setIsCreating(false), isCreating);

  if (!isCreating) {
    return (
      <button
        onClick={() => setIsCreating(true)}
        className="group flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-800 bg-neutral-900/50 transition-all hover:border-blue-500/50 hover:bg-neutral-900"
        title="New Tier List"
      >
        <div className="rounded-full bg-neutral-800 p-3 text-neutral-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
          <Plus size={32} />
        </div>
        <span className="mt-2 text-sm font-medium text-neutral-500 group-hover:text-neutral-300">
          Create Board
        </span>
      </button>
    );
  }

  const categories: { id: BoardCategory; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'music',
      label: 'Music',
      icon: <Music size={20} />,
      color: 'hover:bg-pink-500/10 hover:border-pink-500/50 hover:text-pink-400',
    },
    {
      id: 'cinema',
      label: 'Cinema',
      icon: <Clapperboard size={20} />,
      color: 'hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400',
    },
    {
      id: 'book',
      label: 'Books',
      icon: <Book size={20} />,
      color: 'hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-400',
    },
  ];

  return (
    <div className="flex h-48 flex-col rounded-xl border border-neutral-800 bg-neutral-900 p-4 ring-2 ring-blue-500/50 transition-all">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-neutral-300 uppercase">Select Type</h3>
        <button
          onClick={() => setIsCreating(false)}
          className="text-[10px] font-bold text-neutral-600 transition-colors hover:text-neutral-400"
        >
          Cancel
        </button>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCreate('', cat.id)}
            className={`group flex flex-col items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-2 text-xs font-bold text-neutral-400 transition-all ${cat.color}`}
          >
            <div className="transition-transform group-hover:scale-110">{cat.icon}</div>
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const DashboardItem = ({ item }: { item: PreviewItem }) => {
  const [error, setError] = React.useState(() =>
    item.imageUrl ? failedImages.has(item.imageUrl) : false,
  );

  const showImage = item.imageUrl && !error;

  return (
    <div className="relative aspect-square h-full border-r border-neutral-900 bg-neutral-900">
      {showImage ? (
        <Image
          src={item.imageUrl!}
          alt=""
          fill
          className="object-cover"
          unoptimized
          onError={() => {
            if (item.imageUrl) failedImages.add(item.imageUrl);
            setError(true);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5 text-neutral-600">
          {item.type === 'album' && <Disc size={10} className="mb-0.5 opacity-50" />}
          {item.type === 'artist' && <Mic2 size={10} className="mb-0.5 opacity-50" />}
          {item.type === 'song' && <Music size={10} className="mb-0.5 opacity-50" />}
          <span className="w-full truncate text-center text-[4px] leading-none font-bold uppercase opacity-20">
            {item.type}
          </span>
        </div>
      )}
    </div>
  );
};

const MiniatureTierList = ({ tiers }: { tiers: TierPreview[] }) => {
  return (
    <div className="flex h-full w-full flex-col bg-neutral-900">
      {tiers.map((tier) => {
        const theme = getColorTheme(tier.color);
        return (
          <div
            key={tier.id}
            className="flex min-h-0 flex-1 border-b border-neutral-950 last:border-0"
          >
            {/* Tier Label */}
            <div
              className={`flex w-8 items-center justify-center ${theme.bg} p-0.5 text-[6px] font-bold text-black uppercase`}
            >
              <span className="truncate">{tier.label}</span>
            </div>
            {/* Tier Items */}
            <div className="flex flex-1 items-center bg-neutral-800">
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
    <div className="relative flex h-full w-full items-center justify-center bg-neutral-800">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-neutral-900/80" />
      <Layout className="h-16 w-16 text-neutral-700" strokeWidth={1} />
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

  const handleCreate = async (title: string, category: BoardCategory) => {
    try {
      const id = await createBoard(title || 'Untitled Board', category);
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500">
        Loading registry...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 font-sans text-neutral-200">
      <main className="flex-1 p-8 pb-0">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BrandLogo colors={brandColors} variant="header" />
              <span className="hidden text-2xl font-bold text-neutral-400 sm:inline">
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
                className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-blue-500/50"
              >
                {/* Thumbnail / Icon Placeholder */}
                <div className="relative h-28 w-full overflow-hidden bg-neutral-800">
                  <BoardThumbnail board={board} />

                  {/* Item Count Badge */}
                  <div className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-neutral-400 backdrop-blur-sm">
                    {board.itemCount} items
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="line-clamp-1 text-lg font-bold text-neutral-200 transition-colors group-hover:text-blue-400">
                      {board.title}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      Modified {new Date(board.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Delete Action (Hidden by default) */}
                <button
                  onClick={(e) => handleDelete(e, board.id)}
                  className="absolute top-2 right-2 rounded-md bg-neutral-950/80 p-2 text-neutral-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-900/80 hover:text-red-200"
                  title="Delete Board"
                >
                  <Trash2 size={16} />
                </button>
              </Link>
            ))}
          </div>

          {boards.length === 0 && (
            <div className="mt-12 text-center text-neutral-600">
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
