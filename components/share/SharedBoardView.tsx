/**
 * @file SharedBoardView.tsx
 * @description Client-side component for rendering a shared board.
 * Wraps the read-only tier list with necessary providers.
 */

'use client';

import Link from 'next/link';

import { BoardTitle } from '@/components/board/BoardTitle';
import { TierList } from '@/components/board/TierList';
import { MediaRegistryProvider } from '@/components/providers/MediaRegistryProvider';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Footer } from '@/components/ui/Footer';
import { InteractionContext } from '@/components/ui/InteractionContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { TierListState } from '@/lib/types';

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
export function SharedBoardView({ board }: SharedBoardViewProps) {
  // Derive brand colors from the tier colors, similar to ExportBoard
  const tierColors = board.tierDefs.map((t) => t.color);
  const brandColors = useBrandColors(tierColors);

  return (
    <ToastProvider>
      <MediaRegistryProvider>
        <InteractionContext.Provider value={{ setHoveredItem: () => {} }}>
          <div className="min-h-screen bg-neutral-950 font-sans text-neutral-200 antialiased relative flex flex-col items-center pt-8 pb-8">
            <div className="w-full max-w-[1200px] relative flex flex-col items-center px-4 md:px-8">
              {/* Header Section */}
              <div className="relative flex w-full flex-col items-center justify-center md:mb-12">
                {/* Logo: Absolute top-left on desktop, static centered on mobile */}
                <div className="mb-6 md:absolute md:left-0 md:top-1/2 md:mb-0 md:-translate-y-1/2">
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
                  items={board.items}
                  isExport={true}
                  onRemoveItem={() => {}}
                  onUpdateTier={() => {}}
                  onDeleteTier={() => {}}
                  onInfo={() => {}}
                />
              </div>

              {/* CTA Section */}
              <div className="mt-8 flex flex-col items-center gap-4 w-full">
                <p className="text-sm text-neutral-500 italic">
                  Created with MOAT - The Music Tier List App
                </p>
                <Link
                  href="/"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Create Your Own Tier List
                </Link>
              </div>

              <Footer colors={brandColors} className="pt-8 opacity-40" />
            </div>
          </div>
        </InteractionContext.Provider>
      </MediaRegistryProvider>
    </ToastProvider>
  );
}
