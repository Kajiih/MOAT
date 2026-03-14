/**
 * @file SharedBoardView.tsx
 * @description Client-side component for rendering a shared board.
 * Wraps the read-only tier list with necessary providers.
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';

import { BrandLogo } from '@/app/_components/BrandLogo';
import { Footer } from '@/app/_components/Footer';
import { BoardTitle } from '@/board/BoardTitle';
import { useBrandColors } from '@/board/hooks/useBrandColors';
import { TierList } from '@/board/TierList';
import { Item, TierListState } from '@/board/types';
import { DetailsModal } from '@/items/DetailsModal';
import { InteractionContext } from '@/lib/ui/InteractionContext';
import { ToastProvider } from '@/lib/ui/ToastProvider';

interface SharedBoardViewProps {
  board: TierListState;
}

/**
 * Client-side component for rendering a shared board.
 * Wraps the read-only tier list with necessary providers.
 * @param props - The props for the component.
 * @param props.board - The state of the board to render.
 * @returns The rendered SharedBoardView component.
 */
export function SharedBoardView({ board: initialBoard }: SharedBoardViewProps) {
  // Use local state for the board to allow metadata enrichment (e.g. background image fetching)
  // to reflect in the UI without modifying the source data.
  const [board, setBoard] = useState(initialBoard);
  const [detailsItem, setDetailsItem] = useState<Item | null>(null);

  const handleUpdateMediaItem = (itemId: string, updates: Partial<Item>) => {
    setBoard((prev) => ({
      ...prev,
      itemEntities: {
        ...prev.itemEntities,
        [itemId]: { ...prev.itemEntities[itemId], ...updates } as Item,
      },
    }));
  };

  // Derive items array for TierList using normalized state
  const tierListItems = Object.fromEntries(
    Object.entries(board.tierLayout).map(([tierId, itemIds]) => [
      tierId,
      itemIds.map((id) => board.itemEntities[id]).filter(Boolean),
    ])
  );

  // Derive brand colors from the tier colors, similar to ExportBoard
  const tierColors = board.tierDefs.map((t) => t.color);
  const brandColors = useBrandColors(tierColors);

  return (
    <ToastProvider>
        <InteractionContext.Provider value={{ hoveredItem: null, setHoveredItem: () => {} }}>
          <div className="relative flex min-h-screen flex-col items-center bg-surface pt-8 pb-8 font-sans text-foreground antialiased">
            <div className="relative flex w-full max-w-[1200px] flex-col items-center px-4 md:px-8">
              {/* Header Section */}
              <div className="relative flex w-full flex-col items-center justify-center md:mb-12">
                {/* Logo: Absolute top-left on desktop, static centered on mobile */}
                <div className="mb-6 md:absolute md:top-1/2 md:left-0 md:mb-0 md:-translate-y-1/2">
                  <BrandLogo colors={brandColors} variant="header" />
                </div>

                {/* Title: Centered */}
                <div className="flex w-full justify-center">
                  <BoardTitle title={board.title} isExport={true} />
                </div>

                {/* Separator */}
                <div
                  className="mt-6 h-1 w-24 rounded-full opacity-80"
                  style={{ backgroundColor: brandColors[0] || '#3b82f6' }}
                />
              </div>

              {/* Tier List - Read Only */}
              <div className="w-full">
                <TierList
                  tiers={board.tierDefs}
                  items={tierListItems}
                  isExport={true}
                  onRemoveItem={() => {}}
                  onUpdateTier={() => {}}
                  onDeleteTier={() => {}}
                  onInfo={setDetailsItem}
                />
              </div>

              {/* CTA Section */}
              <div className="mt-8 flex w-full flex-col items-center gap-4">
                <p className="text-sm text-secondary italic">
                  Created with MOAT - The Music Tier List App
                </p>
                <Link
                  href="/"
                  className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-card shadow-primary/20 transition-all hover:bg-blue-500 active:scale-95"
                >
                  Create Your Own Tier List
                </Link>
              </div>

              <Footer colors={brandColors} className="pt-8 opacity-40" />
            </div>

            <DetailsModal
              item={detailsItem}
              isOpen={!!detailsItem}
              onClose={() => setDetailsItem(null)}
              onUpdateItem={handleUpdateMediaItem}
            />
          </div>
        </InteractionContext.Provider>
    </ToastProvider>
  );
}
