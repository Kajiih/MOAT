/**
 * @file SharedBoardView.tsx
 * @description Client-side component for rendering a shared board.
 * Wraps the read-only tier list with necessary providers.
 */

'use client';

import Link from 'next/link';

import { TierList } from '@/components/board/TierList';
import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Footer } from '@/components/ui/Footer';
import { InteractionContext } from '@/components/ui/InteractionContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
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
  const brandColors = ['red', 'orange', 'amber', 'green', 'blue'];

  return (
    <ToastProvider>
      <MediaRegistryProvider>
        <InteractionContext.Provider value={{ setHoveredItem: () => {} }}>
          <div className="min-h-screen bg-neutral-950 font-sans text-neutral-200 antialiased">
            <main className="mx-auto max-w-5xl p-8">
              {/* Header */}
              <div className="mb-12 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <BrandLogo colors={brandColors} variant="header" />
                  <span className="text-xs font-mono tracking-widest text-neutral-600 uppercase">
                    Shared Board
                  </span>
                </div>
                <h1 className="text-center text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {board.title}
                </h1>
                <div className="h-1 w-24 rounded-full bg-blue-600/50" />
              </div>

              {/* Tier List - Read Only */}
              <TierList
                tiers={board.tierDefs}
                items={board.items}
                isExport={true}
                onRemoveItem={() => {}}
                onUpdateTier={() => {}}
                onDeleteTier={() => {}}
                onInfo={() => {}}
              />

              <div className="mt-16 flex flex-col items-center gap-4 border-t border-neutral-900 pt-8">
                <p className="text-sm text-neutral-500 italic">
                  Created with MOAT - The Music Tier List App
                </p>
                <Link
                  href="/"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Create Your Own Board
                </Link>
              </div>
            </main>
            <Footer colors={brandColors} className="opacity-40" />
          </div>
        </InteractionContext.Provider>
      </MediaRegistryProvider>
    </ToastProvider>
  );
}
